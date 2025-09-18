import React, { useState, useEffect, useRef } from 'react';
import {
  Folder,
  File,
  ChevronUp,
  Download,
  Upload,
  Trash2,
  RefreshCw,
  FolderPlus,
  Copy,
  ExternalLink,
  RotateCcw
} from 'lucide-react';
import './FilePanel.css';

const FilePanel = ({
  title,
  type,
  currentPath,
  setCurrentPath,
  files,
  setFiles,
  otherFiles,
  setOtherFiles,
  sshConnection,
  otherPath,
  setOtherPath,
  basePath,
  otherBasePath,
  selectedFile,
  setSelectedFile,
  otherSelectedFile,
  setOtherSelectedFile
}) => {
  const [loading, setLoading] = useState(false);
  const [pathInput, setPathInput] = useState(currentPath);
  const fileListRef = useRef(null);

  useEffect(() => {
    loadFiles();
  }, [currentPath, sshConnection]);

  useEffect(() => {
    setPathInput(currentPath);
  }, [currentPath]);

  // Function to scroll to selected file
  const scrollToSelectedFile = (file) => {
    if (!fileListRef.current || !file) return;

    const fileIndex = files.indexOf(file);
    if (fileIndex === -1) return;

    // Find the file row element by its index
    const fileRows = fileListRef.current.querySelectorAll('.file-row');
    const selectedRow = fileRows[fileIndex];

    if (selectedRow) {
      selectedRow.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'nearest'
      });
    }
  };

  // Scroll to selected file when selection changes
  useEffect(() => {
    if (selectedFile) {
      scrollToSelectedFile(selectedFile);
    }
  }, [selectedFile]);

  const loadFiles = async () => {
    if (type === 'remote' && !sshConnection) {
      setFiles([]);
      return;
    }

    setLoading(true);
    try {
      let fileList;
      if (type === 'local') {
        fileList = await window.electronAPI.getLocalFiles(currentPath);
      } else {
        // Remote file loading with retry logic
        let retries = 3;
        while (retries > 0) {
          try {
            fileList = await window.electronAPI.getRemoteFiles(sshConnection.connectionId, currentPath);
            break; // Success, exit retry loop
          } catch (error) {
            retries--;
            console.error(`Failed to load remote files (${3 - retries}/3):`, error);
            if (retries > 0) {
              await new Promise(resolve => setTimeout(resolve, 1000 * (4 - retries))); // Exponential backoff
            } else {
              throw error; // Re-throw the last error after all retries
            }
          }
        }
      }
      setFiles(fileList);
    } catch (error) {
      console.error('Failed to load files:', error);
      alert(`Failed to load files: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleFileDoubleClick = (file) => {
    if (file.isDirectory) {
      const newPath = file.path;

      // MAJOR DEBUG LOGGING BEFORE ANYTHING ELSE
      console.log(`🟢🟢🟢 STARTING ${type.toUpperCase()} NAVIGATION 🟢🟢🟢`);
      console.log('📁 file.name:', file.name);
      console.log('📁 file.path:', file.path);
      console.log('📁 newPath:', newPath);
      console.log('📍 currentPath BEFORE:', currentPath);
      console.log('🔧 Props check:');
      console.log('  basePath:', basePath);
      console.log('  otherBasePath:', otherBasePath);
      console.log('  setOtherPath type:', typeof setOtherPath);
      console.log('  setOtherPath exists:', !!setOtherPath);

      setCurrentPath(newPath);
      console.log('✅ setCurrentPath called with:', newPath);

      // Sync paths when navigating if we have base paths configured
      if (basePath && otherBasePath && setOtherPath) {
        try {
          console.log('🔄 Starting path sync...');

          // Normalize paths to ensure consistent comparison
          const normalizedBasePath = basePath.replace(/\/+$/, ''); // Remove trailing slashes
          const normalizedNewPath = newPath.replace(/\/+$/, '');

          console.log('📂 Base path:', normalizedBasePath);
          console.log('📁 New path:', normalizedNewPath);
          console.log('🎯 Other base:', otherBasePath);

          // Calculate relative path between base directories
          let relativePath;

          if (normalizedNewPath.startsWith(normalizedBasePath)) {
            // Standard case: within base path
            relativePath = normalizedNewPath.replace(normalizedBasePath, '').replace(/^\/+/, '');
            console.log('📍 Relative path (within base):', relativePath);
          } else {
            // User navigated outside base - try to find common structure
            const baseName = normalizedBasePath.split('/').pop();
            const newPathParts = normalizedNewPath.split(/[\/\\]/);
            const baseIndex = newPathParts.indexOf(baseName);

            if (baseIndex !== -1) {
              relativePath = newPathParts.slice(baseIndex + 1).join('/');
              console.log('📍 Relative path (reconstructed):', relativePath);
            } else {
              console.log('⚠️ Cannot determine relative path, using folder name');
              relativePath = normalizedNewPath.split('/').pop();
            }
          }

          // No automatic duplicate removal - use exact relative path
          // The base paths should be configured correctly in servers.js

          let newOtherPath;
          if (type === 'local') {
            // Local to remote path sync - use POSIX path joining
            if (relativePath) {
              // Manual POSIX path join for cross-platform compatibility
              newOtherPath = otherBasePath + '/' + relativePath;
              newOtherPath = newOtherPath.replace(/\/+/g, '/'); // Remove double slashes
            } else {
              newOtherPath = otherBasePath;
            }
          } else {
            // Remote to local path sync - use local path joining
            if (relativePath) {
              // Manual local path join
              const separator = '/'; // Always use forward slash on macOS
              newOtherPath = otherBasePath + separator + relativePath.replace(/\//g, separator);
            } else {
              newOtherPath = otherBasePath;
            }
          }

          console.log(`🚀🚀🚀 ATTEMPTING SYNC ${type.toUpperCase()} -> OTHER 🚀🚀🚀`);
          console.log(`  From: ${normalizedNewPath}`);
          console.log(`  To: ${newOtherPath}`);
          console.log(`  Relative: ${relativePath}`);
          console.log(`🔥 CALLING setOtherPath(${newOtherPath})`);

          const beforeSync = Date.now();
          setOtherPath(newOtherPath);
          console.log(`⏱️ setOtherPath called at ${beforeSync}`);

          // Check if the call actually happened
          setTimeout(() => {
            console.log(`🔍 Sync check after 100ms - other panel should be at: ${newOtherPath}`);
          }, 100);
        } catch (error) {
          console.error('❌ Path sync failed:', error);
        }
      } else {
        console.log('❌ Sync conditions not met:');
        console.log('  basePath:', !!basePath);
        console.log('  otherBasePath:', !!otherBasePath);
        console.log('  setOtherPath:', !!setOtherPath);
      }
    }
  };

  const handleGoUp = () => {
    // Manual dirname implementation for cross-platform compatibility
    let parentPath;
    if (type === 'remote') {
      parentPath = currentPath.split('/').slice(0, -1).join('/') || '/';
    } else {
      // For local paths, manually implement dirname
      const pathParts = currentPath.split('/');
      pathParts.pop(); // Remove last part
      parentPath = pathParts.join('/') || '/';
    }
    setCurrentPath(parentPath);

    // Debug logging for Go Up
    console.log(`=== FilePanel ${type} Go Up Debug ===`);
    console.log('parentPath:', parentPath);
    console.log('basePath:', basePath);
    console.log('otherBasePath:', otherBasePath);

    // Sync paths when going up if we have base paths configured
    if (basePath && otherBasePath && setOtherPath) {
      try {
        console.log('Starting go up path sync...');

        // Normalize paths to ensure consistent comparison
        const normalizedBasePath = basePath.replace(/\/+$/, '');
        const normalizedParentPath = parentPath.replace(/\/+$/, '');

        // If we're at or going up from within the base path, sync to other side
        if (normalizedParentPath.startsWith(normalizedBasePath)) {
          // Calculate relative path from base path
          let relativePath = normalizedParentPath.replace(normalizedBasePath, '').replace(/^\/+/, '');
          console.log('relativePath:', relativePath);

          // No automatic duplicate removal - use exact relative path
          // The base paths should be configured correctly in servers.js

          let newOtherPath;
          if (type === 'local') {
            // Local to remote path sync - use POSIX path joining
            if (relativePath) {
              newOtherPath = otherBasePath + '/' + relativePath;
              newOtherPath = newOtherPath.replace(/\/+/g, '/'); // Remove double slashes
            } else {
              newOtherPath = otherBasePath;
            }
          } else {
            // Remote to local path sync - use local path joining
            if (relativePath) {
              const separator = '/'; // Always use forward slash on macOS
              newOtherPath = otherBasePath + separator + relativePath.replace(/\//g, separator);
            } else {
              newOtherPath = otherBasePath;
            }
          }

          console.log(`✅ Syncing ${type} go up:`);
          console.log(`  From: ${normalizedParentPath}`);
          console.log(`  To: ${newOtherPath}`);

          setOtherPath(newOtherPath);
        } else {
          console.log('❌ Parent path not within base path, skipping sync');
        }
      } catch (error) {
        console.error('Path sync failed on go up:', error);
      }
    } else {
      console.log('❌ Go up sync conditions not met');
    }
  };

  const handleDelete = async (file) => {
    const fileType = file.isDirectory ? 'folder' : 'file';
    const warningMessage = file.isDirectory
      ? `Are you sure you want to delete the folder "${file.name}" and all its contents? This action cannot be undone.`
      : `Are you sure you want to delete the file "${file.name}"? This action cannot be undone.`;

    if (!confirm(warningMessage)) {
      return;
    }

    setLoading(true);
    try {
      if (type === 'local') {
        await window.electronAPI.deleteLocalFile(file.path);
      } else {
        try {
          // Try SFTP delete first
          await window.electronAPI.deleteRemoteFile(sshConnection.connectionId, file.path);
        } catch (sftpError) {
          console.log('SFTP delete failed, trying SSH exec method:', sftpError.message);

          // If SFTP fails (especially for directories), try SSH exec method
          if (sftpError.message.includes('Channel open failure') ||
              sftpError.message.includes('SFTP error') ||
              file.isDirectory) {
            await window.electronAPI.deleteRemoteFileExec(sshConnection.connectionId, file.path);
          } else {
            throw sftpError; // Re-throw if it's not a connection issue
          }
        }
      }
      await loadFiles(); // Reload the file list
      alert(`${fileType} "${file.name}" deleted successfully.`);
    } catch (error) {
      console.error('Delete error:', error);
      alert(`Failed to delete ${fileType}: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteFromBoth = async (file) => {
    const fileType = file.isDirectory ? 'folder' : 'file';
    const warningMessage = file.isDirectory
      ? `Are you sure you want to delete the folder "${file.name}" from BOTH local and remote locations? This action cannot be undone.`
      : `Are you sure you want to delete the file "${file.name}" from BOTH local and remote locations? This action cannot be undone.`;

    if (!confirm(warningMessage)) {
      return;
    }

    setLoading(true);
    let localSuccess = false;
    let remoteSuccess = false;
    const errors = [];

    try {
      // Determine corresponding paths
      let localFilePath, remoteFilePath;

      if (type === 'local') {
        localFilePath = file.path;
        // Calculate corresponding remote path
        if (basePath && otherBasePath) {
          const relativePath = localFilePath.replace(basePath, '').replace(/^\/+/, '');
          let cleanRelativePath = relativePath;

          // Use exact relative path - no duplicate removal

          remoteFilePath = otherBasePath + '/' + cleanRelativePath;
          remoteFilePath = remoteFilePath.replace(/\/+/g, '/');
        } else {
          remoteFilePath = otherPath + '/' + file.name;
        }
      } else {
        remoteFilePath = file.path;
        // Calculate corresponding local path
        if (basePath && otherBasePath) {
          const relativePath = remoteFilePath.replace(basePath, '').replace(/^\/+/, '');
          let cleanRelativePath = relativePath;

          // Use exact relative path - no duplicate removal

          localFilePath = otherBasePath + '/' + cleanRelativePath;
        } else {
          localFilePath = otherPath + '/' + file.name;
        }
      }

      console.log(`Deleting from both: Local: ${localFilePath}, Remote: ${remoteFilePath}`);

      // Delete from local
      try {
        await window.electronAPI.deleteLocalFile(localFilePath);
        localSuccess = true;
        console.log('Local delete successful');
      } catch (error) {
        console.error('Local delete failed:', error);
        errors.push(`Local: ${error.message}`);
      }

      // Delete from remote
      try {
        try {
          await window.electronAPI.deleteRemoteFile(sshConnection.connectionId, remoteFilePath);
          remoteSuccess = true;
          console.log('Remote delete successful');
        } catch (sftpError) {
          console.log('SFTP delete failed, trying SSH exec method:', sftpError.message);
          if (sftpError.message.includes('Channel open failure') ||
              sftpError.message.includes('SFTP error') ||
              file.isDirectory) {
            await window.electronAPI.deleteRemoteFileExec(sshConnection.connectionId, remoteFilePath);
            remoteSuccess = true;
            console.log('Remote delete successful via SSH exec');
          } else {
            throw sftpError;
          }
        }
      } catch (error) {
        console.error('Remote delete failed:', error);
        errors.push(`Remote: ${error.message}`);
      }

      // Reload both file lists with retry logic
      try {
        await loadFiles();
      } catch (error) {
        console.error('Failed to reload current panel:', error);
      }

      if (setOtherFiles) {
        try {
          // Add delay before reloading to allow connection to stabilize
          await new Promise(resolve => setTimeout(resolve, 1000));

          if (type === 'local') {
            // Retry remote file loading with exponential backoff
            let retries = 3;
            while (retries > 0) {
              try {
                const remoteFiles = await window.electronAPI.getRemoteFiles(sshConnection.connectionId, otherPath);
                setOtherFiles(remoteFiles);
                break; // Success, exit retry loop
              } catch (error) {
                retries--;
                console.error(`Failed to reload remote files (${3 - retries}/3):`, error);
                if (retries > 0) {
                  await new Promise(resolve => setTimeout(resolve, 2000 * (4 - retries))); // Exponential backoff
                } else {
                  console.error('All retries failed for remote file reload');
                }
              }
            }
          } else {
            const localFiles = await window.electronAPI.getLocalFiles(otherPath);
            setOtherFiles(localFiles);
          }
        } catch (error) {
          console.error('Failed to reload other panel:', error);
        }
      }

      // Show result message
      if (localSuccess && remoteSuccess) {
        alert(`${fileType} "${file.name}" deleted successfully from both locations.`);
      } else if (localSuccess || remoteSuccess) {
        const successLocation = localSuccess ? 'local' : 'remote';
        const failedLocation = localSuccess ? 'remote' : 'local';
        alert(`${fileType} "${file.name}" deleted from ${successLocation} but failed to delete from ${failedLocation}.\n\nErrors: ${errors.join(', ')}`);
      } else {
        alert(`Failed to delete ${fileType} "${file.name}" from both locations.\n\nErrors: ${errors.join(', ')}`);
      }

    } catch (error) {
      console.error('Delete from both error:', error);
      alert(`Failed to delete ${fileType} from both locations: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async (file, direction) => {
    try {
      if (direction === 'upload' && type === 'local') {
        // Upload from local to remote
        const remotePath = otherPath + '/' + file.name;
        await window.electronAPI.syncFileToRemote(sshConnection.connectionId, file.path, remotePath);
        // Refresh remote files
        const remoteFiles = await window.electronAPI.getRemoteFiles(sshConnection.connectionId, otherPath);
        setOtherFiles(remoteFiles);
      } else if (direction === 'download' && type === 'remote') {
        // Download from remote to local
        const localPath = otherPath + '/' + file.name;
        await window.electronAPI.syncFileToLocal(sshConnection.connectionId, file.path, localPath);
        // Refresh local files
        const localFiles = await window.electronAPI.getLocalFiles(otherPath);
        setOtherFiles(localFiles);
      }
      alert('Sync completed successfully!');
    } catch (error) {
      alert(`Sync failed: ${error.message}`);
    }
  };

  const handleCreateFolder = async () => {
    const folderName = prompt('Enter folder name:');
    if (!folderName) return;

    try {
      const newFolderPath = currentPath + '/' + folderName;

      if (type === 'local') {
        await window.electronAPI.createLocalDirectory(newFolderPath);
      } else {
        // For remote, we would need to implement mkdir in the main process
        alert('Remote folder creation not yet implemented');
        return;
      }

      loadFiles();
    } catch (error) {
      alert(`Failed to create folder: ${error.message}`);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString() + ' ' + new Date(date).toLocaleTimeString();
  };

  const handlePathInputChange = (e) => {
    setPathInput(e.target.value);
  };

  const handlePathNavigate = async () => {
    const newPath = pathInput.trim();
    if (!newPath || newPath === currentPath) return;

    console.log(`🧭 NAVIGATING VIA PATH INPUT: ${type.toUpperCase()}`);
    console.log(`  From: ${currentPath}`);
    console.log(`  To: ${newPath}`);

    // Validate path exists before navigating
    try {
      setLoading(true);
      if (type === 'local') {
        await window.electronAPI.getLocalFiles(newPath);
      } else {
        if (!sshConnection) {
          alert('No SSH connection available');
          return;
        }
        await window.electronAPI.getRemoteFiles(sshConnection.connectionId, newPath);
      }

      // Path is valid, navigate
      setCurrentPath(newPath);

      // Sync to other panel if base paths are configured
      if (basePath && otherBasePath && setOtherPath) {
        try {
          console.log(`🔄 SYNCING PATH INPUT NAVIGATION`);
          console.log(`  Base: ${basePath}`);
          console.log(`  Other Base: ${otherBasePath}`);

          const normalizedBasePath = basePath.replace(/\/+$/, '');
          const normalizedNewPath = newPath.replace(/\/+$/, '');

          if (normalizedNewPath.startsWith(normalizedBasePath)) {
            const relativePath = normalizedNewPath.replace(normalizedBasePath, '').replace(/^\/+/, '');
            console.log(`  Relative: ${relativePath}`);

            let newOtherPath;
            if (relativePath) {
              newOtherPath = otherBasePath + '/' + relativePath;
              newOtherPath = newOtherPath.replace(/\/+/g, '/');
            } else {
              newOtherPath = otherBasePath;
            }

            console.log(`  Syncing to: ${newOtherPath}`);
            setOtherPath(newOtherPath);
          } else {
            console.log(`⚠️ Path not within base, no sync`);
          }
        } catch (error) {
          console.error('Path sync failed:', error);
        }
      }

    } catch (error) {
      console.error('Path validation failed:', error);
      alert(`Invalid path: ${error.message}`);
      // Reset input to current path
      setPathInput(currentPath);
    } finally {
      setLoading(false);
    }
  };

  const handlePathInputKeyPress = (e) => {
    if (e.key === 'Enter') {
      handlePathNavigate();
    }
  };

  const handleCopyPath = async () => {
    try {
      await navigator.clipboard.writeText(currentPath);
      // Show brief feedback
      const originalTitle = document.title;
      document.title = `📋 Path copied: ${currentPath}`;
      setTimeout(() => {
        document.title = originalTitle;
      }, 2000);
    } catch (error) {
      console.error('Failed to copy path:', error);
      alert('Failed to copy path to clipboard');
    }
  };

  const handleFileSelect = (file) => {
    const fileIndex = files.indexOf(file);
    console.log(`🎯 SELECTING FILE: ${file.name} (index: ${fileIndex}) in ${type.toUpperCase()}`);

    setSelectedFile(file);

    // Sync selection to other panel
    if (setOtherSelectedFile && otherFiles && otherFiles.length > 0) {
      console.log(`🔄 SYNCING SELECTION TO OTHER PANEL`);

      // Try to find the same file by name in the other panel
      const matchingFile = otherFiles.find(otherFile => otherFile.name === file.name);

      if (matchingFile) {
        console.log(`✅ Found matching file: ${matchingFile.name}`);
        setOtherSelectedFile(matchingFile);
      } else {
        // Fallback: select by index, or last item if index is out of bounds
        const targetIndex = Math.min(fileIndex, otherFiles.length - 1);
        const fallbackFile = otherFiles[targetIndex];
        console.log(`📍 File not found, selecting by index ${targetIndex}: ${fallbackFile.name}`);
        setOtherSelectedFile(fallbackFile);
      }
    }
  };

  return (
    <div className="file-panel">
      <div className="panel-header">
        <h2>{title}</h2>
        <div className="panel-controls">
          <button className="btn btn-small" onClick={handleCreateFolder} disabled={type === 'remote' && !sshConnection}>
            <FolderPlus size={14} />
          </button>
          <button className="btn btn-small" onClick={loadFiles}>
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      <div className="path-bar">
        <div className="path-input-container">
          <input
            type="text"
            value={pathInput}
            onChange={handlePathInputChange}
            onKeyPress={handlePathInputKeyPress}
            className="path-input"
            placeholder="Enter path and press Enter"
            disabled={loading}
          />
          <button
            className="btn btn-small"
            onClick={handlePathNavigate}
            disabled={loading || pathInput === currentPath}
            title="Navigate to path"
          >
            <ExternalLink size={14} />
          </button>
          <button
            className="btn btn-small"
            onClick={handleCopyPath}
            title="Copy current path"
          >
            <Copy size={14} />
          </button>
        </div>
        <button className="btn btn-small" onClick={handleGoUp}>
          <ChevronUp size={14} />
          Up
        </button>
      </div>

      <div className="file-list" ref={fileListRef}>
        {loading ? (
          <div className="loading">Loading...</div>
        ) : type === 'remote' && !sshConnection ? (
          <div className="no-connection">No SSH connection</div>
        ) : (
          <div className="file-table">
            <div className="file-header">
              <div className="file-name">Name</div>
              <div className="file-size">Size</div>
              <div className="file-modified">Modified</div>
              <div className="file-actions">Actions</div>
            </div>
            {files.map((file, index) => (
              <div
                key={index}
                className={`file-row ${selectedFile === file ? 'selected' : ''}`}
                onClick={() => handleFileSelect(file)}
                onDoubleClick={() => handleFileDoubleClick(file)}
              >
                <div className="file-name">
                  {file.isDirectory ? <Folder size={16} /> : <File size={16} />}
                  <span>{file.name}</span>
                </div>
                <div className="file-size">
                  {file.isDirectory ? '-' : formatFileSize(file.size)}
                </div>
                <div className="file-modified">
                  {formatDate(file.modified)}
                </div>
                <div className="file-actions">
                  {!file.isDirectory && sshConnection && (
                    <>
                      {type === 'local' && (
                        <button
                          className="btn btn-small"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSync(file, 'upload');
                          }}
                          title="Upload to remote"
                        >
                          <Upload size={12} />
                        </button>
                      )}
                      {type === 'remote' && (
                        <button
                          className="btn btn-small"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSync(file, 'download');
                          }}
                          title="Download to local"
                        >
                          <Download size={12} />
                        </button>
                      )}
                    </>
                  )}
                  <button
                    className="btn btn-small btn-danger"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(file);
                    }}
                    title="Delete (this panel only)"
                  >
                    <Trash2 size={12} />
                  </button>
                  {sshConnection && basePath && otherBasePath && (
                    <button
                      className="btn btn-small btn-danger delete-both-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteFromBoth(file);
                      }}
                      title="Delete from Both Local and Remote"
                    >
                      <RotateCcw size={12} />
                      <Trash2 size={8} style={{ position: 'absolute', top: '2px', right: '2px' }} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default FilePanel;