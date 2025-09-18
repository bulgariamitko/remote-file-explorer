// Mock Electron API for browser testing
const mockElectronAPI = {
  getLocalFiles: async (path) => {
    console.log('Mock getLocalFiles called with:', path);
    // Return mock local files
    return [
      {
        name: 'Documents',
        path: path + '/Documents',
        isDirectory: true,
        size: 0,
        modified: new Date(),
        permissions: 755
      },
      {
        name: 'Downloads',
        path: path + '/Downloads',
        isDirectory: true,
        size: 0,
        modified: new Date(),
        permissions: 755
      },
      {
        name: 'test.txt',
        path: path + '/test.txt',
        isDirectory: false,
        size: 1024,
        modified: new Date(),
        permissions: 644
      },
      {
        name: 'README.md',
        path: path + '/README.md',
        isDirectory: false,
        size: 2048,
        modified: new Date(),
        permissions: 644
      }
    ];
  },

  getRemoteFiles: async (connectionId, path) => {
    console.log('Mock getRemoteFiles called with:', connectionId, path);
    // Return mock remote files
    return [
      {
        name: 'public_html',
        path: path + '/public_html',
        isDirectory: true,
        size: 0,
        modified: new Date(),
        permissions: 755
      },
      {
        name: 'logs',
        path: path + '/logs',
        isDirectory: true,
        size: 0,
        modified: new Date(),
        permissions: 755
      },
      {
        name: 'config.php',
        path: path + '/config.php',
        isDirectory: false,
        size: 3072,
        modified: new Date(),
        permissions: 644
      },
      {
        name: 'index.html',
        path: path + '/index.html',
        isDirectory: false,
        size: 4096,
        modified: new Date(),
        permissions: 644
      }
    ];
  },

  connectSSH: async (config) => {
    console.log('Mock connectSSH called with:', config);
    // Simulate connection delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    return {
      connectionId: 'mock-connection-123',
      success: true
    };
  },

  disconnectSSH: async (connectionId) => {
    console.log('Mock disconnectSSH called with:', connectionId);
    return { success: true };
  },

  deleteLocalFile: async (filePath) => {
    console.log('Mock deleteLocalFile called with:', filePath);
    return { success: true };
  },

  deleteRemoteFile: async (connectionId, filePath) => {
    console.log('Mock deleteRemoteFile called with:', connectionId, filePath);
    return { success: true };
  },

  deleteRemoteFileExec: async (connectionId, filePath) => {
    console.log('Mock deleteRemoteFileExec called with:', connectionId, filePath);
    return { success: true };
  },

  createLocalDirectory: async (dirPath) => {
    console.log('Mock createLocalDirectory called with:', dirPath);
    return { success: true };
  },

  syncFileToRemote: async (connectionId, localPath, remotePath) => {
    console.log('Mock syncFileToRemote called with:', connectionId, localPath, remotePath);
    return { success: true };
  },

  syncFileToLocal: async (connectionId, remotePath, localPath) => {
    console.log('Mock syncFileToLocal called with:', connectionId, remotePath, localPath);
    return { success: true };
  }
};

// Add mock API to window if it doesn't exist (browser environment)
if (typeof window !== 'undefined' && !window.electronAPI) {
  window.electronAPI = mockElectronAPI;
  console.log('🔧 Mock Electron API loaded for browser testing');
}

export default mockElectronAPI;