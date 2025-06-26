const { contextBridge, ipcRenderer } = require('electron');

// Modern API for xterm.js integration
contextBridge.exposeInMainWorld('electronAPI', {
  // Terminal management
  createTerminal: (options) => ipcRenderer.invoke('terminal:create', options),
  killTerminal: (id) => ipcRenderer.invoke('terminal:kill', { id }),
  
  // Terminal I/O
  sendInput: (id, data) => ipcRenderer.invoke('terminal:input', { id, data }),
  resizeTerminal: (id, cols, rows) => ipcRenderer.invoke('terminal:resize', { id, cols, rows }),
  
  // Terminal events
  onTerminalData: (callback) => {
    ipcRenderer.on('terminal:data', (event, data) => callback(data));
  },
  onTerminalExit: (callback) => {
    ipcRenderer.on('terminal:exit', (event, data) => callback(data));
  },
  
  // Menu actions
  onMenuAction: (callback) => {
    ipcRenderer.on('menu-action', (event, action) => callback(action));
  },
  
  // Remove listeners
  removeListener: (channel, callback) => {
    ipcRenderer.removeListener(channel, callback);
  },
  removeAllListeners: (channel) => {
    ipcRenderer.removeAllListeners(channel);
  },
  
  // Session management
  saveSession: (sessionData) => ipcRenderer.invoke('session:save', sessionData),
  loadSession: () => ipcRenderer.invoke('session:load'),
  clearSession: () => ipcRenderer.invoke('session:clear'),
  
  // Session events
  onSessionRestore: (callback) => {
    ipcRenderer.on('session:restore', (event, data) => callback(data));
  },
  onSessionSaveRequest: (callback) => {
    ipcRenderer.on('session:request-save', (event) => callback());
  }
});

// Legacy API for backward compatibility with existing code
contextBridge.exposeInMainWorld('zeamiAPI', {
  // Terminal session management
  startSession: async (options) => {
    const result = await ipcRenderer.invoke('terminal:create', options);
    if (result.success) {
      return {
        success: true,
        sessionId: result.id,
        pid: result.pid,
        shell: result.shell,
        cwd: result.cwd
      };
    }
    return result;
  },
  
  endSession: (sessionId) => ipcRenderer.invoke('terminal:kill', { id: sessionId }),
  
  // Terminal I/O - using send instead of invoke for performance
  sendInput: (sessionId, data) => {
    // Use invoke for consistency and error handling
    return ipcRenderer.invoke('terminal:input', { id: sessionId, data });
  },
  
  onTerminalData: (callback) => {
    // Remove old listeners to prevent memory leaks
    ipcRenderer.removeAllListeners('terminal:data');
    ipcRenderer.on('terminal:data', (event, data) => {
      // Convert to legacy format
      callback({ sessionId: data.id, data: data.data });
    });
  },
  
  // Terminal control
  resizeTerminal: (sessionId, cols, rows) => 
    ipcRenderer.invoke('terminal:resize', { id: sessionId, cols, rows }),
  
  // Zeami integration (placeholder for future implementation)
  requestContext: (sessionId) => ipcRenderer.invoke('zeami:context', sessionId),
  
  onPatternDetected: (callback) => {
    ipcRenderer.removeAllListeners('zeami:pattern');
    ipcRenderer.on('zeami:pattern', (event, data) => callback(data));
  },
  
  onActionSuggested: (callback) => {
    ipcRenderer.removeAllListeners('zeami:action');
    ipcRenderer.on('zeami:action', (event, data) => callback(data));
  },
  
  // Cleanup
  removeAllListeners: () => {
    ipcRenderer.removeAllListeners('terminal:data');
    ipcRenderer.removeAllListeners('terminal:exit');
    ipcRenderer.removeAllListeners('zeami:pattern');
    ipcRenderer.removeAllListeners('zeami:action');
  }
});