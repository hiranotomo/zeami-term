/**
 * Preload script for Message Center window
 */

const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('messageCenterAPI', {
  // Receive messages
  onNewMessage: (callback) => {
    ipcRenderer.on('message:new', (event, message) => callback(message));
  },
  
  // Receive history
  onHistoryLoad: (callback) => {
    ipcRenderer.on('history:load', (event, data) => callback(data));
  },
  
  // Receive route updates
  onRoutesUpdate: (callback) => {
    ipcRenderer.on('routes:update', (event, routes) => callback(routes));
  },
  
  // History cleared
  onHistoryClear: (callback) => {
    ipcRenderer.on('history:clear', () => callback());
  },
  
  // Send message to terminal
  sendToTerminal: async (targetWindowId, targetTerminalId, message) => {
    return await ipcRenderer.invoke('messageCenter:sendToTerminal', {
      targetWindowId,
      targetTerminalId,
      message
    });
  },
  
  // Broadcast message
  broadcastMessage: async (message) => {
    return await ipcRenderer.invoke('messageCenter:broadcast', message);
  },
  
  // Resend notification
  resendNotification: async (messageId) => {
    return await ipcRenderer.invoke('messageCenter:resendNotification', messageId);
  },
  
  // Clear history
  clearHistory: async () => {
    return await ipcRenderer.invoke('messageCenter:clearHistory');
  },
  
  // Get filtered messages
  getFilteredMessages: async (filter) => {
    return await ipcRenderer.invoke('messageCenter:getFiltered', filter);
  },
  
  // Request initial data
  requestInitialData: () => {
    ipcRenderer.send('messageCenter:requestData');
  }
});