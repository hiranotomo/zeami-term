/**
 * MessageCenterWindow - Centralized message management window
 */

const { BrowserWindow } = require('electron');
const path = require('path');

class MessageCenterWindow {
  constructor() {
    this.window = null;
    this.messageHistory = [];
    this.messageRoutes = new Map();
    this.maxHistorySize = 1000; // Maximum number of messages to keep
  }
  
  create() {
    if (this.window && !this.window.isDestroyed()) {
      this.window.focus();
      return;
    }
    
    console.log('[MessageCenterWindow] Creating new Message Center window');
    
    this.window = new BrowserWindow({
      width: 900,
      height: 700,
      minWidth: 600,
      minHeight: 400,
      title: 'ZeamiTerm Message Center',
      webPreferences: {
        preload: path.join(__dirname, '../preload/messageCenter.js'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true
      },
      backgroundColor: '#1e1e1e',
      show: false,
      icon: path.join(__dirname, '../../assets/icon.png')
    });
    
    // Show window when ready
    this.window.once('ready-to-show', () => {
      this.window.show();
      // Send initial history
      this.sendHistory();
    });
    
    // Load the HTML file
    this.window.loadFile(path.join(__dirname, '../renderer/messageCenter.html'));
    
    // Handle window closed
    this.window.on('closed', () => {
      this.window = null;
    });
  }
  
  // Add a new message to history and broadcast to UI
  addMessage(message) {
    // Add unique ID and timestamp if not present
    if (!message.id) {
      message.id = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
    if (!message.timestamp) {
      message.timestamp = Date.now();
    }
    
    // Add to history
    this.messageHistory.unshift(message);
    
    // Trim history if too large
    if (this.messageHistory.length > this.maxHistorySize) {
      this.messageHistory = this.messageHistory.slice(0, this.maxHistorySize);
    }
    
    // Send to UI if window is open
    if (this.window && !this.window.isDestroyed()) {
      this.window.webContents.send('message:new', message);
    }
    
    return message;
  }
  
  // Register a terminal for routing
  registerTerminal(windowId, terminalId, terminalName) {
    const routeId = `${windowId}-${terminalId}`;
    this.messageRoutes.set(routeId, {
      windowId,
      terminalId,
      terminalName,
      registeredAt: Date.now()
    });
    
    // Notify UI of new route
    if (this.window && !this.window.isDestroyed()) {
      this.window.webContents.send('routes:update', this.getRoutes());
    }
  }
  
  // Unregister a terminal
  unregisterTerminal(windowId, terminalId) {
    const routeId = `${windowId}-${terminalId}`;
    this.messageRoutes.delete(routeId);
    
    // Notify UI of route removal
    if (this.window && !this.window.isDestroyed()) {
      this.window.webContents.send('routes:update', this.getRoutes());
    }
  }
  
  // Get all registered routes
  getRoutes() {
    const routes = [];
    this.messageRoutes.forEach((route, id) => {
      routes.push({
        id,
        ...route
      });
    });
    return routes;
  }
  
  // Send message history to UI
  sendHistory() {
    if (this.window && !this.window.isDestroyed()) {
      this.window.webContents.send('history:load', {
        messages: this.messageHistory,
        routes: this.getRoutes()
      });
    }
  }
  
  // Clear message history
  clearHistory() {
    this.messageHistory = [];
    if (this.window && !this.window.isDestroyed()) {
      this.window.webContents.send('history:clear');
    }
  }
  
  // Get filtered messages
  getFilteredMessages(filter) {
    switch (filter) {
      case 'notifications':
        return this.messageHistory.filter(m => m.type === 'notification' || m.type === 'command-notification');
      case 'messages':
        return this.messageHistory.filter(m => m.type === 'terminal-message');
      case 'errors':
        return this.messageHistory.filter(m => m.type === 'error' || (m.data && m.data.exitCode !== 0));
      default:
        return this.messageHistory;
    }
  }
}

module.exports = { MessageCenterWindow };