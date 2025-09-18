# Remote File Explorer

A powerful dual-pane file manager built with React and Electron, featuring SSH/SFTP connectivity for seamless remote file management. Navigate local and remote directories side-by-side with secure server connections and real-time synchronization.

## 🚀 What Makes This App Unique

This file explorer stands out with its **intelligent synchronization features** that create a truly unified file management experience:

### 🔄 **Synchronized Path Navigation**
- **Automatic Path Mirroring**: When you navigate to a folder on the local side, the remote side automatically navigates to the corresponding path (and vice versa)
- **Intelligent Path Mapping**: Maintains relative path relationships between your configured local and remote folders
- **Seamless Experience**: No need to manually navigate both sides - change directory once, and both panes stay in sync

### 🎯 **Synchronized File Selection**
- **Cross-Pane Selection Sync**: Select a file or folder on one side, and the corresponding item automatically gets selected on the other side
- **Visual Consistency**: Both panes highlight the same relative items, making it easy to see relationships between local and remote files
- **Multi-Selection Support**: Select multiple items and see the corresponding selections mirror across both panes

### 🗑️ **Unified File Deletion**
- **Dual-Location Delete**: Delete a file from either the local or remote pane, and it gets removed from both locations simultaneously
- **Safety First**: Built-in confirmation dialogs prevent accidental deletions
- **Status Feedback**: Real-time visual feedback shows deletion progress on both local and remote systems

These features eliminate the manual coordination typically required when working with dual-pane file managers, creating a fluid, synchronized experience that feels like working with a single, unified file system across local and remote locations.

## Features

### 🌟 Core Functionality
- **Dual-Pane Interface**: Side-by-side local and remote file browsing
- **SSH/SFTP Support**: Secure connections to remote servers
- **File Synchronization**: Bidirectional file sync between local and remote
- **Real-time Updates**: Live file system monitoring and updates
- **Cross-Platform**: Works on macOS, Windows, and Linux

### 🔐 Security & Configuration
- **Secure Credential Storage**: Server configurations stored outside source code
- **SSH Key Authentication**: Support for private key and password authentication
- **Database Tunnel Support**: SSH tunnel commands for secure database connections
- **Gitignore Protection**: Sensitive data automatically excluded from version control

### 📁 File Operations
- **File Management**: Create, delete, copy, and move files/folders
- **Directory Navigation**: Intuitive folder browsing with breadcrumb navigation
- **File Selection**: Multi-select support with visual feedback
- **Permissions Display**: File permissions and metadata visibility

### ⚙️ Advanced Features
- **Server Management**: In-app server configuration editing
- **Multiple Connections**: Manage multiple server connections simultaneously
- **Development Mode**: Browser fallback for development environments
- **Error Handling**: Comprehensive error reporting and recovery

## Screenshot

![Main Interface](@screenshots/main-interface.png)
*Dual-pane interface showing synchronized local and remote file management with intelligent path mirroring, selection sync, and unified file operations*

## Installation

### Prerequisites
- **Node.js** (v14 or higher)
- **npm** or **yarn**
- **Git**

### Clone the Repository
```bash
git clone https://github.com/yourusername/remote-file-explorer.git
cd remote-file-explorer
```

### Install Dependencies
```bash
npm install
```

## Configuration

### Server Setup

1. **Create the `.servers` file** in the project root directory:
```bash
touch .servers
```

2. **Add your server configurations** using the following JSON format:
```json
# Remote File Explorer - Server Configuration
# This file stores server configurations securely outside of source code
#
# Format: JSON with comments (will be stripped when parsing)
# Each server should have:
# - id: unique identifier
# - name: display name
# - host: server hostname/IP
# - port: SSH port (usually 22 or 1022)
# - username: SSH username
# - privateKey: path to private key file OR password: password string
# - localFolder: local directory path
# - remoteFolder: remote directory path
# - database: database connection info (optional)

[
  {
    "id": "production-server",
    "name": "Production Server",
    "host": "your-server.com",
    "port": 22,
    "username": "your-username",
    "privateKey": "/Users/your-username/.ssh/id_rsa",
    "localFolder": "/Users/your-username/projects/myapp",
    "remoteFolder": "/var/www/myapp",
    "database": {
      "name": "myapp_db",
      "username": "db_user",
      "password": "db_password",
      "localPort": 3306
    }
  },
  {
    "id": "staging-server",
    "name": "Staging Server",
    "host": "staging.your-server.com",
    "port": 1022,
    "username": "staging-user",
    "password": "your-password",
    "localFolder": "/Users/your-username/projects/staging",
    "remoteFolder": "/home/staging-user/app",
    "database": {
      "name": "staging_db",
      "username": "staging_user",
      "password": "staging_password",
      "localPort": 3307
    }
  }
]
```

### Authentication Methods

#### SSH Key Authentication (Recommended)
```json
{
  "privateKey": "/Users/your-username/.ssh/id_rsa"
}
```

#### Password Authentication
```json
{
  "password": "your-password"
}
```

### Database Tunneling

The app automatically generates SSH tunnel commands for secure database connections:

```bash
ssh -f -N -L 3306:localhost:3306 -p 22 username@your-server.com
```

Access your remote database locally via `localhost:3306` after establishing the tunnel.

## Usage

### Development Mode
```bash
# Start React development server
npm start

# In another terminal, start Electron
npm run electron-dev
```

### Production Build
```bash
# Build React app
npm run build

# Start Electron with built app
npm run electron
```

### Building Distributables
```bash
# Build for current platform
npm run build

# Create Electron distributables
npm run dist
```

## File Structure

```
remote-file-explorer/
├── public/
│   ├── electron.js          # Electron main process
│   ├── preload.js           # Electron preload script
│   └── index.html
├── src/
│   ├── components/
│   │   ├── FileExplorer.js  # Main file explorer component
│   │   ├── ServerSelector.js # Server selection dialog
│   │   └── FilePanel.js     # Individual file panel
│   ├── config/
│   │   └── servers.js       # Server configuration utilities
│   ├── styles/
│   │   └── *.css           # Component styles
│   └── App.js              # Main React component
├── .servers                # Server configurations (create this)
├── .gitignore             # Excludes .servers from version control
├── package.json
└── README.md
```

## Development

### Architecture

- **Frontend**: React with functional components and hooks
- **Backend**: Electron main process with IPC communication
- **File Operations**: Node.js fs-extra for local files
- **SSH/SFTP**: ssh2 library for remote connections
- **Security**: Electron context isolation and preload scripts

### Key Components

#### `FileExplorer.js`
Main application component managing dual-pane interface and server connections.

#### `ServerSelector.js`
Server selection and configuration dialog with in-app editing capabilities.

#### `electron.js`
Electron main process handling file operations, SSH connections, and IPC communication.

#### `preload.js`
Secure bridge between Electron main process and renderer process.

### Adding New Features

1. **Server Configuration**: Add new fields to the `.servers` JSON schema
2. **File Operations**: Extend IPC handlers in `electron.js`
3. **UI Components**: Create new React components in `src/components/`
4. **Styling**: Add CSS files following the existing naming convention

## Security Considerations

### Credential Protection
- ✅ Server credentials stored in `.servers` file (excluded from Git)
- ✅ No hardcoded passwords or keys in source code
- ✅ Electron context isolation enabled
- ✅ Node integration disabled in renderer process

### Best Practices
- Use SSH key authentication when possible
- Regularly rotate passwords and keys
- Limit SSH user permissions on remote servers
- Use strong, unique passwords for each server

## Troubleshooting

### Common Issues

#### "No servers found" message
- Ensure `.servers` file exists in project root
- Check JSON syntax in `.servers` file
- Verify file permissions (should be readable)

#### SSH connection failures
- Verify server hostname and port
- Check SSH key permissions (`chmod 600 ~/.ssh/id_rsa`)
- Confirm username and authentication method
- Test connection manually: `ssh username@hostname -p port`

#### File operation errors
- Check local directory permissions
- Verify remote directory exists and is writable
- Ensure sufficient disk space on both local and remote

#### "No handler registered" errors
- Restart the Electron app
- Check console for detailed error messages
- Verify `.servers` file is valid JSON

### Debug Mode

Enable debug logging by starting with:
```bash
DEBUG=* npm run electron-dev
```

## Contributing

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'Add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

### Development Guidelines
- Follow existing code style and conventions
- Add comments for complex logic
- Test on multiple platforms when possible
- Update documentation for new features

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [Electron](https://www.electronjs.org/) - Cross-platform desktop app framework
- [React](https://reactjs.org/) - UI library
- [ssh2](https://github.com/mscdex/ssh2) - SSH/SFTP client
- [Lucide React](https://lucide.dev/) - Beautiful icons
- [fs-extra](https://github.com/jprichardson/node-fs-extra) - Enhanced file system operations

## Support

If you encounter any issues or have questions:

1. Check the [Troubleshooting](#troubleshooting) section
2. Search existing [Issues](https://github.com/yourusername/remote-file-explorer/issues)
3. Create a new issue with detailed information

---

**Made with ❤️ for developers who work with remote servers**