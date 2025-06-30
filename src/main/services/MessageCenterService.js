/**
 * MessageCenterService - Central message routing and management service
 */

const { EventEmitter } = require('events');
const { BrowserWindow } = require('electron');

class MessageCenterService extends EventEmitter {
  constructor() {
    super();
    this.messages = [];
    this.routes = new Map();
    this.windows = new Map();
    this.messageCenterWindow = null;
    this.notificationHandlers = new Map();
  }
  
  // Initialize with Message Center window reference
  initialize(messageCenterWindow) {
    this.messageCenterWindow = messageCenterWindow;
    console.log('[MessageCenterService] Initialized with Message Center window');
  }
  
  // Register a window
  registerWindow(windowId, window) {
    this.windows.set(windowId, window);
    console.log(`[MessageCenterService] Registered window: ${windowId}`);
  }
  
  // Unregister a window
  unregisterWindow(windowId) {
    this.windows.delete(windowId);
    // Also remove all routes for this window
    this.routes.forEach((route, key) => {
      if (route.windowId === windowId) {
        this.routes.delete(key);
      }
    });
    console.log(`[MessageCenterService] Unregistered window: ${windowId}`);
  }
  
  // Register a terminal for message routing
  registerTerminal(windowId, terminalId, terminalName) {
    const routeKey = `${windowId}-${terminalId}`;
    this.routes.set(routeKey, {
      windowId,
      terminalId,
      terminalName,
      registeredAt: Date.now()
    });
    
    // Register with Message Center window
    if (this.messageCenterWindow) {
      this.messageCenterWindow.registerTerminal(windowId, terminalId, terminalName);
    }
    
    console.log(`[MessageCenterService] Registered terminal: ${routeKey}`);
  }
  
  // Unregister a terminal
  unregisterTerminal(windowId, terminalId) {
    const routeKey = `${windowId}-${terminalId}`;
    this.routes.delete(routeKey);
    
    // Unregister from Message Center window
    if (this.messageCenterWindow) {
      this.messageCenterWindow.unregisterTerminal(windowId, terminalId);
    }
    
    console.log(`[MessageCenterService] Unregistered terminal: ${routeKey}`);
  }
  
  // Forward a notification to Message Center (integrates with existing notification system)
  forwardNotification(message) {
    // Ensure message has required fields
    const enrichedMessage = {
      id: message.id || `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: message.type || 'notification',
      timestamp: message.timestamp || Date.now(),
      source: message.source || { windowId: 'system' },
      data: message.data,
      notification: message.notification
    };
    
    // Add to local history
    this.addMessage(enrichedMessage);
    
    // Forward to Message Center window
    if (this.messageCenterWindow) {
      this.messageCenterWindow.addMessage(enrichedMessage);
    }
    
    // Emit event for any listeners
    this.emit('notification', enrichedMessage);
    
    return enrichedMessage;
  }
  
  // Send a message to a specific terminal
  sendToTerminal(targetWindowId, targetTerminalId, message) {
    const window = this.windows.get(targetWindowId) || BrowserWindow.fromId(targetWindowId);
    
    if (window && !window.isDestroyed()) {
      const fullMessage = {
        id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: 'terminal-message',
        timestamp: Date.now(),
        targetWindowId,
        targetTerminalId,
        ...message
      };
      
      // Send to target window
      window.webContents.send('terminal:message', {
        targetId: targetTerminalId,
        message: fullMessage
      });
      
      // Add to history
      this.addMessage(fullMessage);
      
      // Forward to Message Center
      if (this.messageCenterWindow) {
        this.messageCenterWindow.addMessage(fullMessage);
      }
      
      return { success: true, messageId: fullMessage.id };
    }
    
    return { success: false, error: 'Target window not found or destroyed' };
  }
  
  // Broadcast a message to all terminals
  broadcastMessage(message) {
    const fullMessage = {
      id: `broadcast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'broadcast',
      timestamp: Date.now(),
      ...message
    };
    
    let successCount = 0;
    
    // Send to all windows
    this.windows.forEach((window, windowId) => {
      if (!window.isDestroyed()) {
        window.webContents.send('terminal:broadcast', fullMessage);
        successCount++;
      }
    });
    
    // Also check all BrowserWindows (in case some aren't registered)
    BrowserWindow.getAllWindows().forEach(window => {
      if (!window.isDestroyed() && !this.windows.has(window.id)) {
        window.webContents.send('terminal:broadcast', fullMessage);
        successCount++;
      }
    });
    
    // Add to history
    this.addMessage(fullMessage);
    
    // Forward to Message Center
    if (this.messageCenterWindow) {
      this.messageCenterWindow.addMessage(fullMessage);
    }
    
    return { success: true, messageId: fullMessage.id, recipientCount: successCount };
  }
  
  // Add a message to local history
  addMessage(message) {
    this.messages.unshift(message);
    
    // Keep only last 1000 messages in service
    if (this.messages.length > 1000) {
      this.messages = this.messages.slice(0, 1000);
    }
  }
  
  // Get message history
  getMessageHistory(limit = 100) {
    return this.messages.slice(0, limit);
  }
  
  // Clear message history
  clearHistory() {
    this.messages = [];
    if (this.messageCenterWindow) {
      this.messageCenterWindow.clearHistory();
    }
  }
  
  // Get all active routes
  getActiveRoutes() {
    const routes = [];
    this.routes.forEach((route, key) => {
      routes.push({
        key,
        ...route
      });
    });
    return routes;
  }
  
  // Set notification handler for specific conditions
  setNotificationHandler(type, handler) {
    this.notificationHandlers.set(type, handler);
  }
  
  // Process notification rules
  async processNotificationRules(message) {
    // Check if any handlers apply
    for (const [type, handler] of this.notificationHandlers) {
      if (message.type === type || (message.data && message.data.type === type)) {
        const result = await handler(message);
        if (result && result.preventDefault) {
          return false; // Don't show notification
        }
      }
    }
    return true; // Show notification
  }
}

module.exports = { MessageCenterService };