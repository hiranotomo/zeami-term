/**
 * Preload script for Message Center window
 * Provides secure IPC communication between renderer and main process
 */

const { contextBridge, ipcRenderer } = require('electron');

// Expose protected APIs to the renderer
contextBridge.exposeInMainWorld('messageCenterAPI', {
  // Send messages to main process
  send: (channel, ...args) => {
    const validChannels = [
      'message:request-history',
      'message:clear-history',
      'message:send',
      'message:broadcast',
      'command:clear-history',
      'command:show-details',
      'messageCenter:requestData'
    ];
    
    if (validChannels.includes(channel)) {
      ipcRenderer.send(channel, ...args);
    }
  },
  
  // Invoke and wait for response
  invoke: async (channel, ...args) => {
    const validChannels = [
      'command:get-executions',
      'command:get-statistics',
      'command:export',
      'command:execution-complete',
      'messageCenter:sendToTerminal',
      'messageCenter:broadcast',
      'messageCenter:resendNotification',
      'messageCenter:clearHistory',
      'messageCenter:getFiltered'
    ];
    
    if (validChannels.includes(channel)) {
      return await ipcRenderer.invoke(channel, ...args);
    }
  },
  
  // Receive messages from main process
  on: (channel, listener) => {
    const validChannels = [
      'message:new',
      'history:load',
      'history:clear',
      'routes:update',
      'command:execution-added',
      'command:execution-updated',
      'command:history-cleared',
      'statistics-updated',
      'terminal:output'  // NEW: For real-time terminal output
    ];
    
    if (validChannels.includes(channel)) {
      // Remove the event parameter from the listener
      const subscription = (event, ...args) => listener(event, ...args);
      ipcRenderer.on(channel, subscription);
      
      // Return a function to remove the listener
      return () => {
        ipcRenderer.removeListener(channel, subscription);
      };
    }
  },
  
  // Remove listener
  off: (channel, listener) => {
    const validChannels = [
      'message:new',
      'history:load',
      'history:clear',
      'routes:update',
      'command:execution-added',
      'command:execution-updated',
      'command:history-cleared',
      'statistics-updated',
      'terminal:output'  // NEW: For real-time terminal output
    ];
    
    if (validChannels.includes(channel)) {
      ipcRenderer.removeListener(channel, listener);
    }
  },
  
  // Legacy callback-based methods for compatibility
  onNewMessage: (callback) => {
    ipcRenderer.on('message:new', (event, message) => callback(message));
  },
  
  onHistoryLoad: (callback) => {
    ipcRenderer.on('history:load', (event, data) => callback(data));
  },
  
  onRoutesUpdate: (callback) => {
    ipcRenderer.on('routes:update', (event, routes) => callback(routes));
  },
  
  onHistoryClear: (callback) => {
    ipcRenderer.on('history:clear', () => callback());
  },
  
  // Legacy invoke methods
  sendToTerminal: async (targetWindowId, targetTerminalId, message) => {
    return await ipcRenderer.invoke('messageCenter:sendToTerminal', {
      targetWindowId,
      targetTerminalId,
      message
    });
  },
  
  broadcastMessage: async (message) => {
    return await ipcRenderer.invoke('messageCenter:broadcast', message);
  },
  
  resendNotification: async (messageId) => {
    return await ipcRenderer.invoke('messageCenter:resendNotification', messageId);
  },
  
  clearHistory: async () => {
    return await ipcRenderer.invoke('messageCenter:clearHistory');
  },
  
  getFilteredMessages: async (filter) => {
    return await ipcRenderer.invoke('messageCenter:getFiltered', filter);
  },
  
  requestInitialData: () => {
    ipcRenderer.send('messageCenter:requestData');
  }
});