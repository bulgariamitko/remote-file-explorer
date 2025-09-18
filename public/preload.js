const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Local file operations
  getLocalFiles: (dirPath) => ipcRenderer.invoke('get-local-files', dirPath),
  deleteLocalFile: (filePath) => ipcRenderer.invoke('delete-local-file', filePath),
  createLocalDirectory: (dirPath) => ipcRenderer.invoke('create-local-directory', dirPath),

  // Remote SSH/SFTP operations
  connectSSH: (config) => ipcRenderer.invoke('connect-ssh', config),
  getRemoteFiles: (connectionId, remotePath) => ipcRenderer.invoke('get-remote-files', connectionId, remotePath),
  deleteRemoteFile: (connectionId, remotePath) => ipcRenderer.invoke('delete-remote-file', connectionId, remotePath),
  deleteRemoteFileExec: (connectionId, remotePath) => ipcRenderer.invoke('delete-remote-file-exec', connectionId, remotePath),
  syncFileToRemote: (connectionId, localPath, remotePath) => ipcRenderer.invoke('sync-file-to-remote', connectionId, localPath, remotePath),
  syncFileToLocal: (connectionId, remotePath, localPath) => ipcRenderer.invoke('sync-file-to-local', connectionId, remotePath, localPath),
  disconnectSSH: (connectionId) => ipcRenderer.invoke('disconnect-ssh', connectionId),

  // Dialogs
  showSaveDialog: (options) => ipcRenderer.invoke('show-save-dialog', options),
  showOpenDialog: (options) => ipcRenderer.invoke('show-open-dialog', options),

  // Server configuration
  loadServers: () => ipcRenderer.invoke('load-servers'),
  saveServers: (servers) => ipcRenderer.invoke('save-servers', servers)
});