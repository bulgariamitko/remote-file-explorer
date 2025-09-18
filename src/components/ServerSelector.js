import React, { useState, useEffect } from 'react';
import { Server, Database, FolderOpen, Copy, Terminal, Key, Edit3, Save, X } from 'lucide-react';
import { PREDEFINED_SERVERS, generateSSHTunnelCommand, updateServer, initializeServers } from '../config/servers';
import './ServerSelector.css';

const ServerSelector = ({ onSelectServer, onCancel }) => {
  const [selectedServer, setSelectedServer] = useState(null);
  const [showTunnelCommand, setShowTunnelCommand] = useState(null);
  const [editingServer, setEditingServer] = useState(null);
  const [editedServer, setEditedServer] = useState(null);
  const [servers, setServers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load servers on component mount
  useEffect(() => {
    const loadServers = async () => {
      try {
        const loadedServers = await initializeServers();
        setServers(loadedServers);
        setLoading(false);
      } catch (error) {
        console.error('Failed to load servers:', error);
        setLoading(false);
      }
    };

    loadServers();
  }, []);

  const handleConnect = async () => {
    if (!selectedServer) return;

    try {
      await onSelectServer(selectedServer);
    } catch (error) {
      console.error('Failed to connect:', error);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
  };

  const handleEditServer = (server) => {
    setEditingServer(server.id);
    setEditedServer({ ...server });
  };

  const handleCancelEdit = () => {
    setEditingServer(null);
    setEditedServer(null);
  };

  const handleSaveServer = async () => {
    const success = await updateServer(editedServer);
    if (success) {
      // Update local state
      setServers(servers.map(s => s.id === editedServer.id ? editedServer : s));
      setEditingServer(null);
      setEditedServer(null);
      alert('Server configuration saved to .servers file!');
    } else {
      alert('Failed to save server configuration. Check console for errors.');
    }
  };

  const updateEditedServer = (field, value) => {
    setEditedServer(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const updateEditedDatabase = (field, value) => {
    setEditedServer(prev => ({
      ...prev,
      database: {
        ...prev.database,
        [field]: value
      }
    }));
  };

  return (
    <div className="dialog-overlay">
      <div className="server-selector-dialog">
        <div className="dialog-header">
          <div className="dialog-title">
            <Server size={20} />
            {editingServer ? 'Edit Server Configuration' : 'Select Server'}
          </div>
          <button className="dialog-close" onClick={editingServer ? handleCancelEdit : onCancel}>
            ×
          </button>
        </div>

        <div className="server-list">
          {loading && (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
              Loading servers...
            </div>
          )}

          {!loading && servers.length === 0 && (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
              {typeof window !== 'undefined' && window.electronAPI
                ? 'No servers found. Add servers to .servers file.'
                : 'Browser mode - servers only available in Electron app'
              }
            </div>
          )}

          {!loading && servers.length > 0 && servers.map((server) => {
            const isEditing = editingServer === server.id;
            const currentServer = isEditing ? editedServer : server;

            return (
              <div
                key={server.id}
                className={`server-card ${selectedServer?.id === server.id ? 'selected' : ''} ${isEditing ? 'editing' : ''}`}
                onClick={() => !isEditing && setSelectedServer(server)}
              >
                <div className="server-header">
                  <div className="server-title-row">
                    {isEditing ? (
                      <input
                        type="text"
                        value={currentServer.name}
                        onChange={(e) => updateEditedServer('name', e.target.value)}
                        className="edit-input"
                        placeholder="Server Name"
                      />
                    ) : (
                      <h3>{server.name}</h3>
                    )}
                    {!isEditing && (
                      <button
                        className="btn btn-small edit-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditServer(server);
                        }}
                      >
                        <Edit3 size={12} />
                        Edit
                      </button>
                    )}
                  </div>

                  <div className="server-connection">
                    {isEditing ? (
                      <div className="edit-connection">
                        <input
                          type="text"
                          value={currentServer.username}
                          onChange={(e) => updateEditedServer('username', e.target.value)}
                          className="edit-input"
                          placeholder="Username"
                        />
                        <span>@</span>
                        <input
                          type="text"
                          value={currentServer.host}
                          onChange={(e) => updateEditedServer('host', e.target.value)}
                          className="edit-input"
                          placeholder="Host"
                        />
                        <span>:</span>
                        <input
                          type="number"
                          value={currentServer.port}
                          onChange={(e) => updateEditedServer('port', parseInt(e.target.value))}
                          className="edit-input port-input"
                          placeholder="Port"
                        />
                      </div>
                    ) : (
                      <div className="server-host">
                        {server.username}@{server.host}:{server.port}
                      </div>
                    )}
                  </div>

                  <div className="auth-info">
                    <Key size={14} />
                    {isEditing ? (
                      <input
                        type="text"
                        value={currentServer.privateKey || currentServer.password || ''}
                        onChange={(e) => {
                          if (currentServer.privateKey) {
                            updateEditedServer('privateKey', e.target.value);
                          } else {
                            updateEditedServer('password', e.target.value);
                          }
                        }}
                        className="edit-input"
                        placeholder={currentServer.privateKey ? "Private Key Path" : "Password"}
                      />
                    ) : (
                      <span>{server.privateKey ? `Key: ${server.privateKey}` : 'Password Auth'}</span>
                    )}
                  </div>
                </div>

                <div className="server-paths">
                  <div className="path-item">
                    <FolderOpen size={16} />
                    <div>
                      <div className="path-label">Local:</div>
                      {isEditing ? (
                        <input
                          type="text"
                          value={currentServer.localFolder}
                          onChange={(e) => updateEditedServer('localFolder', e.target.value)}
                          className="edit-input path-input"
                          placeholder="Local Folder Path"
                        />
                      ) : (
                        <div className="path-value">{server.localFolder}</div>
                      )}
                    </div>
                  </div>
                  <div className="path-item">
                    <Server size={16} />
                    <div>
                      <div className="path-label">Remote:</div>
                      {isEditing ? (
                        <input
                          type="text"
                          value={currentServer.remoteFolder}
                          onChange={(e) => updateEditedServer('remoteFolder', e.target.value)}
                          className="edit-input path-input"
                          placeholder="Remote Folder Path"
                        />
                      ) : (
                        <div className="path-value">{server.remoteFolder}</div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="database-info">
                  <div className="database-header">
                    <Database size={16} />
                    <span>Database Info</span>
                    {!isEditing && (
                      <button
                        className="btn btn-small tunnel-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowTunnelCommand(showTunnelCommand === server.id ? null : server.id);
                        }}
                      >
                        <Terminal size={12} />
                        SSH Tunnel
                      </button>
                    )}
                  </div>

                  <div className="database-details">
                    <div className="db-item">
                      <span>Database:</span>
                      {isEditing ? (
                        <input
                          type="text"
                          value={currentServer.database.name}
                          onChange={(e) => updateEditedDatabase('name', e.target.value)}
                          className="edit-input db-input"
                          placeholder="Database Name"
                        />
                      ) : (
                        <span>{server.database.name}</span>
                      )}
                    </div>
                    <div className="db-item">
                      <span>User:</span>
                      {isEditing ? (
                        <input
                          type="text"
                          value={currentServer.database.username}
                          onChange={(e) => updateEditedDatabase('username', e.target.value)}
                          className="edit-input db-input"
                          placeholder="DB Username"
                        />
                      ) : (
                        <span>{server.database.username}</span>
                      )}
                    </div>
                    <div className="db-item">
                      <span>Password:</span>
                      {isEditing ? (
                        <input
                          type="password"
                          value={currentServer.database.password}
                          onChange={(e) => updateEditedDatabase('password', e.target.value)}
                          className="edit-input db-input"
                          placeholder="DB Password"
                        />
                      ) : (
                        <span>••••••••</span>
                      )}
                    </div>
                    <div className="db-item">
                      <span>Local Port:</span>
                      {isEditing ? (
                        <input
                          type="number"
                          value={currentServer.database.localPort}
                          onChange={(e) => updateEditedDatabase('localPort', parseInt(e.target.value))}
                          className="edit-input db-input port-input"
                          placeholder="Port"
                        />
                      ) : (
                        <span>{server.database.localPort}</span>
                      )}
                    </div>
                  </div>

                  {!isEditing && showTunnelCommand === server.id && (
                    <div className="tunnel-command">
                      <div className="command-label">SSH Tunnel Command:</div>
                      <div className="command-text">
                        <code>{generateSSHTunnelCommand(server)}</code>
                        <button
                          className="btn btn-small copy-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            copyToClipboard(generateSSHTunnelCommand(server));
                          }}
                        >
                          <Copy size={12} />
                        </button>
                      </div>
                    </div>
                  )}

                  {isEditing && (
                    <div className="edit-actions">
                      <button
                        className="btn btn-small btn-secondary"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCancelEdit();
                        }}
                      >
                        <X size={12} />
                        Cancel
                      </button>
                      <button
                        className="btn btn-small btn-primary"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSaveServer();
                        }}
                      >
                        <Save size={12} />
                        Save
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {!editingServer && (
          <div className="dialog-actions">
            <button className="btn btn-secondary" onClick={onCancel}>
              Cancel
            </button>
            <button
              className="btn btn-primary"
              onClick={handleConnect}
              disabled={!selectedServer}
            >
              Connect to {selectedServer?.name || 'Server'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ServerSelector;