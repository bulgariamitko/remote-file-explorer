const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const os = require('os');
const isDev = require('electron-is-dev');
const fs = require('fs-extra');
const { Client } = require('ssh2');
const chokidar = require('chokidar');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  mainWindow.loadURL(
    isDev
      ? 'http://localhost:3000'
      : `file://${path.join(__dirname, '../build/index.html')}`
  );

  if (isDev) {
    mainWindow.webContents.openDevTools();
  }
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Helper function to expand tilde paths
const expandTildePath = (filePath) => {
  if (filePath && filePath.startsWith('~/')) {
    return path.join(os.homedir(), filePath.slice(2));
  }
  return filePath;
};

// Local file operations
ipcMain.handle('get-local-files', async (event, dirPath) => {
  try {
    // Path is already absolute, no need to expand
    const items = await fs.readdir(dirPath, { withFileTypes: true });
    const files = [];

    for (const item of items) {
      const fullPath = path.join(dirPath, item.name);
      const stats = await fs.stat(fullPath);

      files.push({
        name: item.name,
        path: fullPath,
        isDirectory: item.isDirectory(),
        size: stats.size,
        modified: stats.mtime,
        permissions: stats.mode
      });
    }

    return files.sort((a, b) => {
      if (a.isDirectory && !b.isDirectory) return -1;
      if (!a.isDirectory && b.isDirectory) return 1;
      return a.name.localeCompare(b.name);
    });
  } catch (error) {
    throw new Error(`Failed to read directory: ${error.message}`);
  }
});

ipcMain.handle('delete-local-file', async (event, filePath) => {
  try {
    await fs.remove(filePath);
    return { success: true };
  } catch (error) {
    throw new Error(`Failed to delete file: ${error.message}`);
  }
});

ipcMain.handle('create-local-directory', async (event, dirPath) => {
  try {
    await fs.ensureDir(dirPath);
    return { success: true };
  } catch (error) {
    throw new Error(`Failed to create directory: ${error.message}`);
  }
});

// Remote SSH/SFTP operations
const sshConnections = new Map();
const connectionConfigs = new Map();

ipcMain.handle('connect-ssh', async (event, config) => {
  const connectionId = `${config.host}:${config.port}:${config.username}`;

  // Store config for potential reconnection
  const configWithId = { ...config, connectionId };
  connectionConfigs.set(connectionId, configWithId);

  try {
    const conn = await createSSHConnection(configWithId);
    sshConnections.set(connectionId, conn);
    return { connectionId, success: true };
  } catch (error) {
    connectionConfigs.delete(connectionId);
    throw error;
  }
});

// Helper function to create a new SSH connection
const createSSHConnection = (config) => {
  return new Promise((resolve, reject) => {
    const conn = new Client();

    conn.on('ready', () => {
      console.log('SSH connection established:', config.connectionId);
      resolve(conn);
    });

    conn.on('error', (err) => {
      console.error('SSH connection error:', err.message);
      reject(new Error(`SSH connection failed: ${err.message}`));
    });

    conn.on('end', () => {
      console.log('SSH connection ended:', config.connectionId);
      sshConnections.delete(config.connectionId);
    });

    conn.on('close', () => {
      console.log('SSH connection closed:', config.connectionId);
      sshConnections.delete(config.connectionId);
    });

    // Prepare connection options with stronger keep-alive and connection pooling
    const connectionOptions = {
      host: config.host,
      port: config.port || 22,
      username: config.username,
      keepaliveInterval: 15000, // More frequent keep-alive
      keepaliveCountMax: 5,     // More retries
      readyTimeout: 30000,      // Longer timeout
      tryKeyboard: false,       // Disable keyboard-interactive to prevent hanging
      debug: false,
      algorithms: {
        serverHostKey: ['ssh-rsa', 'ecdsa-sha2-nistp256', 'ecdsa-sha2-nistp384', 'ecdsa-sha2-nistp521', 'ssh-ed25519'],
        kex: ['ecdh-sha2-nistp256', 'ecdh-sha2-nistp384', 'ecdh-sha2-nistp521', 'diffie-hellman-group14-sha256'],
        cipher: ['aes128-ctr', 'aes192-ctr', 'aes256-ctr', 'aes128-gcm', 'aes256-gcm'],
        hmac: ['hmac-sha2-256', 'hmac-sha2-512', 'hmac-sha1']
      }
    };

    if (config.privateKey) {
      try {
        connectionOptions.privateKey = fs.readFileSync(config.privateKey);
      } catch (error) {
        reject(new Error(`Failed to read private key: ${error.message}`));
        return;
      }
    } else if (config.password) {
      connectionOptions.password = config.password;
    } else {
      reject(new Error('Either privateKey or password must be provided'));
      return;
    }

    conn.connect(connectionOptions);
  });
};

// Simplified connection validation without aggressive health checks
const validateConnection = async (connectionId) => {
  let conn = sshConnections.get(connectionId);

  if (!conn) {
    // Try to reconnect only if connection doesn't exist
    const config = connectionConfigs.get(connectionId);
    if (!config) {
      throw new Error('SSH connection not found and no config available for reconnection');
    }

    console.log('Attempting to reconnect SSH connection:', connectionId);
    try {
      conn = await createSSHConnection(config);
      sshConnections.set(connectionId, conn);
      console.log('SSH reconnection successful:', connectionId);
    } catch (error) {
      throw new Error(`SSH reconnection failed: ${error.message}`);
    }
  }

  return conn;
};

// Rate limiting to prevent overwhelming the SSH server
const operationQueue = new Map(); // connectionId -> lastOperationTime
const MIN_OPERATION_INTERVAL = 100; // Minimum 100ms between operations

const rateLimitOperation = async (connectionId) => {
  const lastOperation = operationQueue.get(connectionId) || 0;
  const timeSinceLastOp = Date.now() - lastOperation;

  if (timeSinceLastOp < MIN_OPERATION_INTERVAL) {
    const waitTime = MIN_OPERATION_INTERVAL - timeSinceLastOp;
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }

  operationQueue.set(connectionId, Date.now());
};

ipcMain.handle('get-remote-files', async (event, connectionId, remotePath) => {
  try {
    // Rate limit operations to prevent overwhelming the SSH server
    await rateLimitOperation(connectionId);

    const conn = await validateConnection(connectionId);

    return new Promise((resolve, reject) => {
      conn.sftp((err, sftp) => {
        if (err) {
          reject(new Error(`SFTP error: ${err.message}`));
          return;
        }

        sftp.readdir(remotePath, (err, list) => {
          if (err) {
            reject(new Error(`Failed to read remote directory: ${err.message}`));
            return;
          }

          const files = list.map(item => ({
            name: item.filename,
            path: path.posix.join(remotePath, item.filename),
            isDirectory: item.attrs.isDirectory(),
            size: item.attrs.size,
            modified: new Date(item.attrs.mtime * 1000),
            permissions: item.attrs.mode
          }));

          files.sort((a, b) => {
            if (a.isDirectory && !b.isDirectory) return -1;
            if (!a.isDirectory && b.isDirectory) return 1;
            return a.name.localeCompare(b.name);
          });

          resolve(files);
        });
      });
    });
  } catch (error) {
    throw error;
  }
});

ipcMain.handle('delete-remote-file', async (event, connectionId, remotePath) => {
  try {
    // Rate limit operations to prevent overwhelming the SSH server
    await rateLimitOperation(connectionId);

    const conn = await validateConnection(connectionId);

    return new Promise((resolve, reject) => {
      // Add timeout to prevent hanging
      const timeout = setTimeout(() => {
        reject(new Error('Delete operation timed out after 30 seconds'));
      }, 30000);

      conn.sftp((err, sftp) => {
        if (err) {
          clearTimeout(timeout);
          reject(new Error(`SFTP error: ${err.message}`));
          return;
        }

        // Helper function to recursively delete directory contents with better error handling
        const deleteRecursively = (dirPath, callback) => {
          sftp.readdir(dirPath, (err, list) => {
            if (err) {
              // If we can't read the directory, try to remove it directly (might be empty)
              sftp.rmdir(dirPath, (rmdirErr) => {
                if (rmdirErr) {
                  callback(new Error(`Failed to read directory contents and unable to remove: ${err.message}`));
                } else {
                  callback(null);
                }
              });
              return;
            }

            if (list.length === 0) {
              // Directory is empty, safe to delete
              sftp.rmdir(dirPath, callback);
              return;
            }

            let completed = 0;
            let hasError = false;

            const checkComplete = (err) => {
              if (hasError) return;
              if (err) {
                hasError = true;
                callback(err);
                return;
              }

              completed++;
              if (completed === list.length) {
                // All items deleted, now delete the directory
                sftp.rmdir(dirPath, callback);
              }
            };

            // Process items one by one to avoid overwhelming the connection
            const processNext = (index) => {
              if (index >= list.length) return;

              const item = list[index];
              const itemPath = require('path').posix.join(dirPath, item.filename);

              if (item.attrs.isDirectory()) {
                deleteRecursively(itemPath, (err) => {
                  checkComplete(err);
                  if (!err && !hasError) {
                    // Small delay to prevent overwhelming the connection
                    setTimeout(() => processNext(index + 1), 100);
                  }
                });
              } else {
                sftp.unlink(itemPath, (err) => {
                  checkComplete(err);
                  if (!err && !hasError) {
                    // Small delay to prevent overwhelming the connection
                    setTimeout(() => processNext(index + 1), 50);
                  }
                });
              }
            };

            // Start processing items sequentially
            processNext(0);
          });
        };

        // Check if it's a directory first
        sftp.stat(remotePath, (err, stats) => {
          if (err) {
            clearTimeout(timeout);
            reject(new Error(`Failed to stat remote file: ${err.message}`));
            return;
          }

          if (stats.isDirectory()) {
            deleteRecursively(remotePath, (err) => {
              clearTimeout(timeout);
              if (err) {
                reject(new Error(`Failed to delete remote directory: ${err.message}`));
                return;
              }
              resolve({ success: true });
            });
          } else {
            sftp.unlink(remotePath, (err) => {
              clearTimeout(timeout);
              if (err) {
                reject(new Error(`Failed to delete remote file: ${err.message}`));
                return;
              }
              resolve({ success: true });
            });
          }
        });
      });
    });
  } catch (error) {
    throw error;
  }
});

ipcMain.handle('sync-file-to-remote', async (event, connectionId, localPath, remotePath) => {
  // Rate limit operations to prevent overwhelming the SSH server
  await rateLimitOperation(connectionId);

  return new Promise((resolve, reject) => {
    const conn = sshConnections.get(connectionId);
    if (!conn) {
      reject(new Error('SSH connection not found'));
      return;
    }

    conn.sftp((err, sftp) => {
      if (err) {
        reject(new Error(`SFTP error: ${err.message}`));
        return;
      }

      sftp.fastPut(localPath, remotePath, (err) => {
        if (err) {
          reject(new Error(`Failed to sync file to remote: ${err.message}`));
          return;
        }
        resolve({ success: true });
      });
    });
  });
});

ipcMain.handle('sync-file-to-local', async (event, connectionId, remotePath, localPath) => {
  // Rate limit operations to prevent overwhelming the SSH server
  await rateLimitOperation(connectionId);

  return new Promise((resolve, reject) => {
    const conn = sshConnections.get(connectionId);
    if (!conn) {
      reject(new Error('SSH connection not found'));
      return;
    }

    conn.sftp((err, sftp) => {
      if (err) {
        reject(new Error(`SFTP error: ${err.message}`));
        return;
      }

      sftp.fastGet(remotePath, localPath, (err) => {
        if (err) {
          reject(new Error(`Failed to sync file to local: ${err.message}`));
          return;
        }
        resolve({ success: true });
      });
    });
  });
});

// Alternative delete method using SSH exec command for problematic directories
ipcMain.handle('delete-remote-file-exec', async (event, connectionId, remotePath) => {
  try {
    // Rate limit operations to prevent overwhelming the SSH server
    await rateLimitOperation(connectionId);

    const conn = await validateConnection(connectionId);

    return new Promise((resolve, reject) => {
      // Use SSH exec with rm -rf for more reliable deletion
      // Properly escape the path to handle spaces and special characters
      const escapedPath = remotePath.replace(/'/g, "'\"'\"'");
      const command = `rm -rf '${escapedPath}'`;

      conn.exec(command, (err, stream) => {
        if (err) {
          reject(new Error(`SSH exec error: ${err.message}`));
          return;
        }

        let stderr = '';

        stream.on('close', (code, signal) => {
          if (code === 0) {
            resolve({ success: true });
          } else {
            reject(new Error(`Delete failed with exit code ${code}: ${stderr || 'Unknown error'}`));
          }
        }).on('data', (data) => {
          // stdout - usually empty for rm command
        }).stderr.on('data', (data) => {
          stderr += data;
        });
      });
    });
  } catch (error) {
    throw error;
  }
});

ipcMain.handle('disconnect-ssh', async (event, connectionId) => {
  const conn = sshConnections.get(connectionId);
  if (conn) {
    conn.end();
    sshConnections.delete(connectionId);
  }
  return { success: true };
});

ipcMain.handle('show-save-dialog', async (event, options) => {
  const result = await dialog.showSaveDialog(mainWindow, options);
  return result;
});

ipcMain.handle('show-open-dialog', async (event, options) => {
  const result = await dialog.showOpenDialog(mainWindow, options);
  return result;
});

// Server configuration handlers
ipcMain.handle('load-servers', async () => {
  try {
    const serversFilePath = path.join(os.homedir(), '.servers');

    if (fs.existsSync(serversFilePath)) {
      const fileContent = await fs.readFile(serversFilePath, 'utf8');
      // Remove comments (lines starting with #)
      const jsonContent = fileContent
        .split('\n')
        .filter(line => !line.trim().startsWith('#'))
        .join('\n');

      return JSON.parse(jsonContent);
    }

    console.warn('.servers file not found at:', serversFilePath);
    return [];
  } catch (error) {
    console.error('Failed to load servers from .servers file:', error);
    return [];
  }
});

ipcMain.handle('save-servers', async (event, servers) => {
  try {
    const serversFilePath = path.join(os.homedir(), '.servers');

    // Create the content with comments
    let fileContent = `# Remote File Explorer - Server Configuration
# This file stores server configurations securely outside of source code
#
# Format: JSON with comments (will be stripped when parsing)
# Each server should have:
# - id: unique identifier
# - name: display name
# - host: server hostname/IP
# - port: SSH port (usually 22 or 1022)
# - username: SSH username
# - privateKey: path to SSH private key (optional)
# - password: SSH password (optional, use either privateKey OR password)
# - localFolder: local directory path
# - remoteFolder: remote directory path
# - database: (optional) database connection info
#   - name: database name
#   - username: database username
#   - password: database password
#   - localPort: local port for SSH tunnel

`;

    fileContent += JSON.stringify(servers, null, 2);

    fileContent += `

# Example of adding a new server manually:
# {
#   "id": "my_new_server",
#   "name": "My New Server",
#   "host": "example.com",
#   "port": 22,
#   "username": "myuser",
#   "privateKey": "/Users/dimitarklaturov/.ssh/my_key",
#   "localFolder": "/Users/dimitarklaturov/my_project",
#   "remoteFolder": "/var/www/html",
#   "database": {
#     "name": "my_database",
#     "username": "db_user",
#     "password": "secure_password",
#     "localPort": 3306
#   }
# }`;

    await fs.writeFile(serversFilePath, fileContent, 'utf8');
    console.log('Servers saved to .servers file');
    return true;
  } catch (error) {
    console.error('Failed to save servers to .servers file:', error);
    return false;
  }
});