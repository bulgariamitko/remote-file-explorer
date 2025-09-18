import React, { useState } from 'react';
import './App.css';
import FilePanel from './components/FilePanel';
import ConnectionDialog from './components/ConnectionDialog';
import ServerSelector from './components/ServerSelector';
import { Folder, Server, Settings, List } from 'lucide-react';
import { expandTildePath } from './config/servers';
import './mockElectronAPI'; // Import mock API for browser testing

function App() {
  const [localPath, setLocalPath] = useState(process.env.HOME || '/Users');
  const [remotePath, setRemotePath] = useState('/');
  const [sshConnection, setSshConnection] = useState(null);
  const [showConnectionDialog, setShowConnectionDialog] = useState(false);
  const [showServerSelector, setShowServerSelector] = useState(false);
  const [localFiles, setLocalFiles] = useState([]);
  const [remoteFiles, setRemoteFiles] = useState([]);
  const [currentServer, setCurrentServer] = useState(null);
  const [baseLocalPath, setBaseLocalPath] = useState('');
  const [baseRemotePath, setBaseRemotePath] = useState('');
  const [localSelectedFile, setLocalSelectedFile] = useState(null);
  const [remoteSelectedFile, setRemoteSelectedFile] = useState(null);

  // DEBUG: Track path changes and clear selections when changing directories
  const debugSetLocalPath = (newPath) => {
    console.log(`🏠 APP.JS: setLocalPath called with: ${newPath}`);
    console.log(`🏠 APP.JS: localPath changing from ${localPath} to ${newPath}`);
    setLocalPath(newPath);
    // Clear selections when changing directories
    setLocalSelectedFile(null);
    setRemoteSelectedFile(null);
  };

  const debugSetRemotePath = (newPath) => {
    console.log(`🌐 APP.JS: setRemotePath called with: ${newPath}`);
    console.log(`🌐 APP.JS: remotePath changing from ${remotePath} to ${newPath}`);
    setRemotePath(newPath);
    // Clear selections when changing directories
    setLocalSelectedFile(null);
    setRemoteSelectedFile(null);
  };

  const handleSSHConnect = async (connectionInfo) => {
    try {
      const result = await window.electronAPI.connectSSH(connectionInfo);
      setSshConnection(result);
      setShowConnectionDialog(false);
      // Load initial remote files
      const files = await window.electronAPI.getRemoteFiles(result.connectionId, remotePath);
      setRemoteFiles(files);
    } catch (error) {
      alert('Connection failed: ' + error.message);
    }
  };

  const handleServerSelect = async (server) => {
    try {
      setShowServerSelector(false);

      // Set up local and remote paths from predefined server
      // No need to expand paths since they are already absolute
      setLocalPath(server.localFolder);
      setRemotePath(server.remoteFolder);
      setCurrentServer(server);

      // Store base paths for sync navigation
      console.log('=== App.js Server Selection Debug ===');
      console.log('server.localFolder:', server.localFolder);
      console.log('server.remoteFolder:', server.remoteFolder);
      setBaseLocalPath(server.localFolder);
      setBaseRemotePath(server.remoteFolder);
      console.log('Base paths set for sync navigation');

      // Connect to SSH using private key
      const connectionInfo = {
        host: server.host,
        port: server.port,
        username: server.username,
        privateKey: server.privateKey // Already absolute path
      };

      const result = await window.electronAPI.connectSSH(connectionInfo);
      setSshConnection(result);

      // Load files for both local and remote
      const localFiles = await window.electronAPI.getLocalFiles(server.localFolder);
      setLocalFiles(localFiles);

      const remoteFiles = await window.electronAPI.getRemoteFiles(result.connectionId, server.remoteFolder);
      setRemoteFiles(remoteFiles);

    } catch (error) {
      alert('Connection failed: ' + error.message);
      setCurrentServer(null);
    }
  };

  const handleDisconnect = async () => {
    if (sshConnection) {
      await window.electronAPI.disconnectSSH(sshConnection.connectionId);
      setSshConnection(null);
      setRemoteFiles([]);
      setCurrentServer(null);
      setBaseLocalPath('');
      setBaseRemotePath('');
    }
  };

  return (
    <div className="app">
      <div className="app-header">
        <div className="header-left">
          <Folder className="app-icon" size={24} />
          <h1>Remote File Explorer</h1>
          {currentServer && (
            <div className="current-server">
              <span className="server-badge">{currentServer.name}</span>
            </div>
          )}
        </div>
        <div className="header-right">
          <button
            className="btn btn-primary"
            onClick={() => setShowServerSelector(true)}
            disabled={sshConnection}
          >
            <List size={16} />
            Servers
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => setShowConnectionDialog(true)}
            disabled={sshConnection}
          >
            <Server size={16} />
            Add Server
          </button>
          {sshConnection && (
            <button
              className="btn btn-danger"
              onClick={handleDisconnect}
            >
              Disconnect
            </button>
          )}
        </div>
      </div>

      <div className="file-explorer">
        <FilePanel
          title="Local Files"
          type="local"
          currentPath={localPath}
          setCurrentPath={debugSetLocalPath}
          files={localFiles}
          setFiles={setLocalFiles}
          otherFiles={remoteFiles}
          setOtherFiles={setRemoteFiles}
          sshConnection={sshConnection}
          otherPath={remotePath}
          setOtherPath={debugSetRemotePath}
          basePath={baseLocalPath}
          otherBasePath={baseRemotePath}
          selectedFile={localSelectedFile}
          setSelectedFile={setLocalSelectedFile}
          otherSelectedFile={remoteSelectedFile}
          setOtherSelectedFile={setRemoteSelectedFile}
        />

        <FilePanel
          title="Remote Files"
          type="remote"
          currentPath={remotePath}
          setCurrentPath={debugSetRemotePath}
          files={remoteFiles}
          setFiles={setRemoteFiles}
          otherFiles={localFiles}
          setOtherFiles={setLocalFiles}
          sshConnection={sshConnection}
          otherPath={localPath}
          setOtherPath={debugSetLocalPath}
          basePath={baseRemotePath}
          otherBasePath={baseLocalPath}
          selectedFile={remoteSelectedFile}
          setSelectedFile={setRemoteSelectedFile}
          otherSelectedFile={localSelectedFile}
          setOtherSelectedFile={setLocalSelectedFile}
        />
      </div>


      {showServerSelector && (
        <ServerSelector
          onSelectServer={handleServerSelect}
          onCancel={() => setShowServerSelector(false)}
        />
      )}

      {showConnectionDialog && (
        <ConnectionDialog
          onConnect={handleSSHConnect}
          onCancel={() => setShowConnectionDialog(false)}
        />
      )}
    </div>
  );
}

export default App;