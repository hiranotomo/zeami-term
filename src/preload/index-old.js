const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process
// to use ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('zeamiAPI', {
  // Session management
  startSession: (options) => ipcRenderer.invoke('zeami:start-session', options),
  sendInput: (sessionId, data) => ipcRenderer.send('zeami:send-input', { sessionId, data }),
  requestContext: (sessionId) => ipcRenderer.invoke('zeami:request-context', sessionId),
  
  // Event listeners
  onTerminalData: (callback) => {
    ipcRenderer.on('zeami:terminal-data', (event, data) => callback(data));
  },
  
  onPatternDetected: (callback) => {
    ipcRenderer.on('zeami:pattern-detected', (event, data) => callback(data));
  },
  
  onSuggestAction: (callback) => {
    ipcRenderer.on('zeami:suggest-action', (event, data) => callback(data));
  },
  
  // Cleanup
  removeAllListeners: () => {
    ipcRenderer.removeAllListeners('zeami:terminal-data');
    ipcRenderer.removeAllListeners('zeami:pattern-detected');
    ipcRenderer.removeAllListeners('zeami:suggest-action');
  }
});