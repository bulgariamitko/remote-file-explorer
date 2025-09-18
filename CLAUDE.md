# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Key Commands

### Development
- `npm run electron-dev` - Start development mode (React dev server + Electron)
- `npm start` - Start React development server only
- `npm run electron` - Run Electron with built React app

### Building and Distribution
- `npm run build` - Build React app for production
- `npm run electron-pack` - Build React app and create Electron distributables
- `npx electron-builder --mac` - Create Mac app bundle and DMG installer
- `npx electron-builder --mac --publish=never` - Build Mac app without publishing

### Testing
- `npm test` - Run React tests

## Architecture Overview

This is an Electron-based dual-pane file manager with unique synchronization features between local and remote file systems via SSH/SFTP.

### Core Architecture

**Electron Main Process** (`public/electron.js`)
- Handles all file system operations (local and remote)
- Manages SSH/SFTP connections using ssh2 library
- Implements IPC handlers for communication with renderer process
- Reads server configurations from `~/.servers` file in user's home directory (NOT project directory)

**React Renderer Process** (`src/`)
- Dual-pane interface with synchronized navigation and selection
- Mock API (`src/mockElectronAPI.js`) for browser testing when Electron APIs unavailable
- Main app state managed in `App.js` with synchronized local/remote paths and selections

### Unique Synchronization Features

1. **Path Synchronization**: When navigating directories in one pane, the other pane automatically navigates to the corresponding relative path
2. **Selection Synchronization**: Selecting files in one pane automatically selects corresponding files in the other pane
3. **Unified File Operations**: File deletions remove files from both local and remote locations simultaneously

### Key Components

**FilePanel** (`src/components/FilePanel.js`)
- Handles individual pane rendering and file operations
- Manages file selection, navigation, and context operations
- Implements synchronized behavior with the other pane

**ServerSelector** (`src/components/ServerSelector.js`)
- Server selection dialog with in-app configuration editing
- Loads servers from `~/.servers` file via IPC

**ConnectionDialog** (`src/components/ConnectionDialog.js`)
- SSH connection status and management interface

### Configuration System

Server configurations are stored in `~/.servers` JSON file in the user's home directory. This file contains:
- SSH connection details (host, port, username, authentication)
- Local and remote folder mappings
- Optional database tunnel configurations

The app looks for this file at `os.homedir() + '/.servers'`, NOT in the project directory, allowing it to work when installed in Applications.

### IPC Communication

Critical IPC handlers in electron.js:
- `load-servers` / `save-servers` - Server configuration management
- `connect-ssh` / `disconnect-ssh` - SSH connection lifecycle
- `get-local-files` / `get-remote-files` - File listing operations
- `sync-file-to-remote` / `sync-file-to-local` - File synchronization
- `delete-local-file` / `delete-remote-file` - File deletion operations

### Development vs Production

- **Development**: React dev server (localhost:3000) + Electron connects to it
- **Production**: Electron loads built React app from `build/` directory
- **Browser Fallback**: Mock API provides browser-compatible testing when Electron APIs unavailable

### Security Architecture

- Electron context isolation enabled with preload script
- No node integration in renderer process
- Server credentials stored outside source code in user's home directory
- SSH key and password authentication supported