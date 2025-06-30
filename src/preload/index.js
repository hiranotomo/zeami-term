const { contextBridge, ipcRenderer } = require('electron');
// Version is now passed from main process via IPC

// Modern API for xterm.js integration
contextBridge.exposeInMainWorld('electronAPI', {
  // Platform and app information
  platform: process.platform,
  getAppVersion: () => ipcRenderer.invoke('app:getVersion'),
  
  // Terminal management
  createTerminal: (options) => ipcRenderer.invoke('terminal:create', options),
  killTerminal: (id) => ipcRenderer.invoke('terminal:kill', { id }),
  
  // Terminal I/O
  sendInput: (id, data) => ipcRenderer.invoke('terminal:input', { id, data }),
  resizeTerminal: (id, cols, rows) => ipcRenderer.invoke('terminal:resize', { id, cols, rows }),
  
  // Terminal events
  onTerminalData: (callback) => {
    console.log('[Preload] Registering terminal:data listener');
    ipcRenderer.on('terminal:data', (event, data) => {
      console.log('[Preload] Received terminal:data event:', data);
      callback(data);
    });
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
  },
  
  // Auto update events
  onUpdateStatus: (callback) => {
    ipcRenderer.on('update-status', (event, data) => callback(data.event, data.data));
  },
  
  // Error recording
  recordError: (errorData) => ipcRenderer.invoke('record-error', errorData),
  
  // Window controls
  toggleFullscreen: () => ipcRenderer.send('toggle-fullscreen'),
  createNewWindow: () => ipcRenderer.send('create-new-window'),
  
  // Profile management
  getProfiles: () => ipcRenderer.invoke('profiles:get'),
  addProfile: (profile) => ipcRenderer.invoke('profiles:add', profile),
  updateProfile: (id, updates) => ipcRenderer.invoke('profiles:update', { id, updates }),
  deleteProfile: (id) => ipcRenderer.invoke('profiles:delete', id),
  setDefaultProfile: (id) => ipcRenderer.invoke('profiles:setDefault', id),
  
  // File operations
  openFile: (options) => ipcRenderer.invoke('file:open', options),
  saveFile: (options) => ipcRenderer.invoke('file:save', options),
  openExternal: (url) => ipcRenderer.invoke('shell:openExternal', url),
  
  // Terminal focus event
  onTerminalFocus: (callback) => {
    ipcRenderer.on('terminal:focus', (event, terminalId) => callback(terminalId));
  },
  
  // Command tracking for long-running command notifications
  trackCommandStart: (commandId, commandLine) => ipcRenderer.invoke('command:trackStart', { commandId, commandLine }),
  trackCommandEnd: (commandId, exitCode) => ipcRenderer.invoke('command:trackEnd', { commandId, exitCode }),
  
  
  // File size helper
  getFileSize: (filename) => ipcRenderer.invoke('file:getSize', filename),
  
  // Window state events
  onWindowStateChange: (callback) => {
    ipcRenderer.on('window:stateChange', (event, state) => callback(state));
  },
  
  // Update dialog event
  onShowUpdateDialog: (callback) => {
    ipcRenderer.on('show-update-dialog', (event, updateInfo) => callback(updateInfo));
  },
  
  // Show notification with sound
  showNotification: (options) => ipcRenderer.invoke('show-notification', options),
  
  // Message Center API
  sendToMessageCenter: (message) => ipcRenderer.invoke('sendToMessageCenter', message),
  getWindowId: () => ipcRenderer.invoke('getWindowId'),
  openMessageCenter: () => ipcRenderer.send('messageCenter:open'),
  
  // Terminal messaging
  onTerminalMessage: (callback) => {
    ipcRenderer.on('terminal:incomingMessage', (event, data) => callback(data));
  },
  onTerminalBroadcast: (callback) => {
    ipcRenderer.on('terminal:broadcast', (event, message) => callback(message));
  },
  
  // Shell integration
  shellIntegration: {
    check: (shellPath) => ipcRenderer.invoke('shellIntegration:check', shellPath),
    install: (shellPath) => ipcRenderer.invoke('shellIntegration:install', shellPath),
    getCommand: (shellPath) => ipcRenderer.invoke('shellIntegration:getCommand', shellPath)
  }
});

// Expose api object for new components
contextBridge.exposeInMainWorld('api', {
  shellIntegration: {
    check: (shellPath) => ipcRenderer.invoke('shellIntegration:check', shellPath),
    install: (shellPath) => ipcRenderer.invoke('shellIntegration:install', shellPath),
    getCommand: (shellPath) => ipcRenderer.invoke('shellIntegration:getCommand', shellPath)
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