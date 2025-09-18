// Load servers from .servers file
const loadServersFromFile = async () => {
  // Check if we're in Electron context
  if (typeof window !== 'undefined' && window.electronAPI) {
    try {
      // Use the Electron API to load servers
      const servers = await window.electronAPI.loadServers();
      return servers;
    } catch (error) {
      console.warn('Failed to load servers from .servers file:', error);
    }
  }

  // If not in Electron context, warn user and return empty array
  console.warn('⚠️  Running in browser mode - servers can only be loaded in Electron app');
  console.warn('📁 Server data is stored in .servers file and requires Electron to access');
  return [];
};

// Initialize servers as empty array, will be loaded asynchronously
export let PREDEFINED_SERVERS = [];

// Initialize servers from file
export const initializeServers = async () => {
  PREDEFINED_SERVERS = await loadServersFromFile();
  return PREDEFINED_SERVERS;
};

// Save servers to .servers file
export const saveServersToFile = async (servers) => {
  if (typeof window !== 'undefined' && window.electronAPI) {
    try {
      const success = await window.electronAPI.saveServers(servers);
      if (success) {
        console.log('Servers saved to .servers file');
      }
      return success;
    } catch (error) {
      console.error('Failed to save servers to .servers file:', error);
      return false;
    }
  }

  console.warn('⚠️  Cannot save servers - not in Electron context');
  return false;
};

// Update a server in the list and save to file
export const updateServer = async (updatedServer) => {
  const serverIndex = PREDEFINED_SERVERS.findIndex(s => s.id === updatedServer.id);
  if (serverIndex !== -1) {
    PREDEFINED_SERVERS[serverIndex] = { ...updatedServer };
    return await saveServersToFile(PREDEFINED_SERVERS);
  }
  return false;
};

// Add a new server to the list and save to file
export const addServer = async (newServer) => {
  PREDEFINED_SERVERS.push(newServer);
  return await saveServersToFile(PREDEFINED_SERVERS);
};

export const generateSSHTunnelCommand = (server) => {
  return `ssh -f -N -L ${server.database.localPort}:localhost:3306 -p ${server.port} ${server.username}@${server.host}`;
};

export const expandTildePath = (filePath) => {
  // All paths are now absolute, so just return as-is
  return filePath;
};