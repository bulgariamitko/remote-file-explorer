import React, { useState } from 'react';
import { X, Server, Key, User, Globe } from 'lucide-react';
import './ConnectionDialog.css';

const ConnectionDialog = ({ onConnect, onCancel }) => {
  const [config, setConfig] = useState({
    host: '',
    port: 22,
    username: '',
    password: '',
    privateKey: ''
  });
  const [authMethod, setAuthMethod] = useState('password');
  const [connecting, setConnecting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setConnecting(true);

    try {
      const connectionConfig = {
        ...config,
        privateKey: authMethod === 'key' ? config.privateKey : undefined,
        password: authMethod === 'password' ? config.password : undefined
      };

      await onConnect(connectionConfig);
    } catch (error) {
      console.error('Connection failed:', error);
    } finally {
      setConnecting(false);
    }
  };

  const selectPrivateKey = async () => {
    try {
      const result = await window.electronAPI.showOpenDialog({
        title: 'Select Private Key File',
        properties: ['openFile'],
        filters: [
          { name: 'SSH Keys', extensions: ['pem', 'key', 'pub'] },
          { name: 'All Files', extensions: ['*'] }
        ]
      });

      if (!result.canceled && result.filePaths.length > 0) {
        setConfig(prev => ({ ...prev, privateKey: result.filePaths[0] }));
      }
    } catch (error) {
      console.error('Failed to select private key:', error);
    }
  };

  return (
    <div className="dialog-overlay">
      <div className="dialog">
        <div className="dialog-header">
          <div className="dialog-title">
            <Server size={20} />
            Connect to SSH Server
          </div>
          <button className="dialog-close" onClick={onCancel}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="dialog-content">
          <div className="form-group">
            <label>
              <Globe size={16} />
              Hostname or IP Address
            </label>
            <input
              type="text"
              value={config.host}
              onChange={(e) => setConfig(prev => ({ ...prev, host: e.target.value }))}
              placeholder="192.168.1.100 or server.example.com"
              required
            />
          </div>

          <div className="form-group">
            <label>Port</label>
            <input
              type="number"
              value={config.port}
              onChange={(e) => setConfig(prev => ({ ...prev, port: parseInt(e.target.value) }))}
              min="1"
              max="65535"
              required
            />
          </div>

          <div className="form-group">
            <label>
              <User size={16} />
              Username
            </label>
            <input
              type="text"
              value={config.username}
              onChange={(e) => setConfig(prev => ({ ...prev, username: e.target.value }))}
              placeholder="your-username"
              required
            />
          </div>

          <div className="form-group">
            <label>Authentication Method</label>
            <div className="auth-method-tabs">
              <button
                type="button"
                className={`auth-tab ${authMethod === 'password' ? 'active' : ''}`}
                onClick={() => setAuthMethod('password')}
              >
                Password
              </button>
              <button
                type="button"
                className={`auth-tab ${authMethod === 'key' ? 'active' : ''}`}
                onClick={() => setAuthMethod('key')}
              >
                Private Key
              </button>
            </div>
          </div>

          {authMethod === 'password' ? (
            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                value={config.password}
                onChange={(e) => setConfig(prev => ({ ...prev, password: e.target.value }))}
                placeholder="your-password"
                required
              />
            </div>
          ) : (
            <div className="form-group">
              <label>
                <Key size={16} />
                Private Key File
              </label>
              <div className="key-input-group">
                <input
                  type="text"
                  value={config.privateKey}
                  onChange={(e) => setConfig(prev => ({ ...prev, privateKey: e.target.value }))}
                  placeholder="Path to private key file"
                  required
                />
                <button type="button" className="btn btn-secondary" onClick={selectPrivateKey}>
                  Browse
                </button>
              </div>
            </div>
          )}

          <div className="dialog-actions">
            <button type="button" className="btn btn-secondary" onClick={onCancel}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={connecting}
            >
              {connecting ? 'Connecting...' : 'Connect'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ConnectionDialog;