/**
 * MessageCenterService - Central message routing and management service
 */

const { EventEmitter } = require('events');
const { BrowserWindow } = require('electron');
const { CommandExecutionModel } = require('../models/CommandExecutionModel');
const fs = require('fs').promises;
const path = require('path');

class MessageCenterService extends EventEmitter {
  constructor() {
    super();
    this.messages = [];
    this.commandExecutions = new Map(); // コマンド実行履歴
    this.routes = new Map();
    this.windows = new Map();
    this.messageCenterWindow = null;
    this.notificationHandlers = new Map();
    
    // 統計情報
    this.statistics = {
      byTerminal: new Map(),
      byExecutor: new Map(),
      byCategory: new Map(),
      global: {
        totalCommands: 0,
        successCount: 0,
        errorCount: 0,
        totalDuration: 0
      }
    };
    
    // データ永続化設定
    this.dataPath = null;
    this.saveInterval = null;
    this.initializeDataPath();
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
  
  // Initialize data persistence path
  async initializeDataPath() {
    const { app } = require('electron');
    this.dataPath = path.join(app.getPath('userData'), 'command-intelligence');
    
    try {
      await fs.mkdir(this.dataPath, { recursive: true });
      
      // Load existing data
      await this.loadPersistedData();
      
      // Set up auto-save every 30 seconds
      this.saveInterval = setInterval(() => {
        this.saveData().catch(console.error);
      }, 30000);
    } catch (error) {
      console.error('[MessageCenterService] Failed to initialize data path:', error);
    }
  }
  
  // Register command execution
  async registerCommandExecution(executionData) {
    try {
      // Create CommandExecutionModel instance if not already
      const model = executionData instanceof CommandExecutionModel 
        ? executionData 
        : new CommandExecutionModel(executionData);
      
      // Validate
      const validation = model.validate();
      if (!validation.valid) {
        console.warn('[MessageCenterService] Invalid command execution:', validation.errors);
        return { success: false, errors: validation.errors };
      }
      
      // Store
      this.commandExecutions.set(model.id, model);
      
      // Update statistics
      this.updateStatistics(model);
      
      // Convert to legacy format for compatibility
      const legacyMessage = model.toLegacyFormat();
      this.addMessage(legacyMessage);
      
      // Forward to Message Center window
      if (this.messageCenterWindow) {
        this.messageCenterWindow.addCommandExecution(model.toJSON());
      }
      
      // Emit event
      this.emit('command-execution', model);
      
      // Check notification rules
      if (model.execution.status === 'error' || model.execution.duration > 30000) {
        this.forwardNotification({
          type: 'command-execution',
          data: model.toJSON(),
          notification: {
            title: `コマンド${model.execution.status === 'error' ? 'エラー' : '完了'}`,
            body: `${model.command.raw} (${this.formatDuration(model.execution.duration)})`
          }
        });
      }
      
      console.log('[MessageCenterService] Command execution registered:', model.id);
      
      // Save data immediately
      this.saveData().catch(console.error);
      
      return { success: true, id: model.id };
    } catch (error) {
      console.error('[MessageCenterService] Failed to register command execution:', error);
      return { success: false, error: error.message };
    }
  }
  
  // Update statistics
  updateStatistics(model) {
    // Global stats
    this.statistics.global.totalCommands++;
    this.statistics.global.totalDuration += model.execution.duration || 0;
    if (model.execution.status === 'success') {
      this.statistics.global.successCount++;
    } else if (model.execution.status === 'error') {
      this.statistics.global.errorCount++;
    }
    
    // By terminal - fix window.id to avoid [object Object]
    const windowId = typeof model.context.window.id === 'object' 
      ? (model.context.window.index || '0')
      : model.context.window.id;
    const terminalKey = `window-${windowId}-${model.context.terminal.id}`;
    if (!this.statistics.byTerminal.has(terminalKey)) {
      this.statistics.byTerminal.set(terminalKey, {
        totalCommands: 0,
        successCount: 0,
        errorCount: 0,
        totalDuration: 0
      });
    }
    const terminalStats = this.statistics.byTerminal.get(terminalKey);
    terminalStats.totalCommands++;
    terminalStats.totalDuration += model.execution.duration || 0;
    if (model.execution.status === 'success') {
      terminalStats.successCount++;
    } else if (model.execution.status === 'error') {
      terminalStats.errorCount++;
    }
    
    // By executor
    const executorType = model.executor.type;
    if (!this.statistics.byExecutor.has(executorType)) {
      this.statistics.byExecutor.set(executorType, {
        totalCommands: 0,
        successCount: 0,
        errorCount: 0,
        totalDuration: 0
      });
    }
    const executorStats = this.statistics.byExecutor.get(executorType);
    executorStats.totalCommands++;
    executorStats.totalDuration += model.execution.duration || 0;
    if (model.execution.status === 'success') {
      executorStats.successCount++;
    } else if (model.execution.status === 'error') {
      executorStats.errorCount++;
    }
    
    // By category
    const category = model.command.category;
    if (!this.statistics.byCategory.has(category)) {
      this.statistics.byCategory.set(category, {
        totalCommands: 0,
        successCount: 0,
        errorCount: 0,
        totalDuration: 0
      });
    }
    const categoryStats = this.statistics.byCategory.get(category);
    categoryStats.totalCommands++;
    categoryStats.totalDuration += model.execution.duration || 0;
    if (model.execution.status === 'success') {
      categoryStats.successCount++;
    } else if (model.execution.status === 'error') {
      categoryStats.errorCount++;
    }
  }
  
  // Get command executions with filters
  getCommandExecutions(filters = {}) {
    let executions = Array.from(this.commandExecutions.values());
    
    // Apply filters
    if (filters.windowId) {
      executions = executions.filter(e => e.context.window.id === filters.windowId);
    }
    if (filters.terminalId) {
      executions = executions.filter(e => e.context.terminal.id === filters.terminalId);
    }
    if (filters.executorType) {
      executions = executions.filter(e => e.executor.type === filters.executorType);
    }
    if (filters.status) {
      executions = executions.filter(e => e.execution.status === filters.status);
    }
    if (filters.category) {
      executions = executions.filter(e => e.command.category === filters.category);
    }
    if (filters.timeRange) {
      const { start, end } = filters.timeRange;
      executions = executions.filter(e => 
        e.timestamp >= start && e.timestamp <= end
      );
    }
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      executions = executions.filter(e => 
        e.command.raw.toLowerCase().includes(searchLower)
      );
    }
    
    // Sort
    const sortBy = filters.sortBy || 'timestamp';
    const sortOrder = filters.sortOrder || 'desc';
    executions.sort((a, b) => {
      let aVal = a[sortBy];
      let bVal = b[sortBy];
      
      // Handle nested properties
      if (sortBy.includes('.')) {
        const parts = sortBy.split('.');
        aVal = parts.reduce((obj, key) => obj?.[key], a);
        bVal = parts.reduce((obj, key) => obj?.[key], b);
      }
      
      if (sortOrder === 'desc') {
        return bVal - aVal;
      }
      return aVal - bVal;
    });
    
    // Limit
    if (filters.limit) {
      executions = executions.slice(0, filters.limit);
    }
    
    return executions.map(e => e.toJSON());
  }
  
  // Get statistics
  getStatistics(filters = {}) {
    if (filters.terminalId) {
      const key = `${filters.windowId || 'any'}-${filters.terminalId}`;
      return this.statistics.byTerminal.get(key) || {
        totalCommands: 0,
        successCount: 0,
        errorCount: 0,
        totalDuration: 0
      };
    }
    
    if (filters.executorType) {
      return this.statistics.byExecutor.get(filters.executorType) || {
        totalCommands: 0,
        successCount: 0,
        errorCount: 0,
        totalDuration: 0
      };
    }
    
    if (filters.category) {
      return this.statistics.byCategory.get(filters.category) || {
        totalCommands: 0,
        successCount: 0,
        errorCount: 0,
        totalDuration: 0
      };
    }
    
    // Return all statistics
    return {
      global: this.statistics.global,
      byTerminal: Object.fromEntries(this.statistics.byTerminal),
      byExecutor: Object.fromEntries(this.statistics.byExecutor),
      byCategory: Object.fromEntries(this.statistics.byCategory)
    };
  }
  
  // Save data to disk
  async saveData() {
    if (!this.dataPath) return;
    
    try {
      // Prepare data
      const data = {
        version: 1,
        timestamp: Date.now(),
        commandExecutions: Array.from(this.commandExecutions.entries()).map(([id, model]) => ({
          id,
          data: model.toJSON()
        })),
        statistics: {
          global: this.statistics.global,
          byTerminal: Array.from(this.statistics.byTerminal.entries()),
          byExecutor: Array.from(this.statistics.byExecutor.entries()),
          byCategory: Array.from(this.statistics.byCategory.entries())
        }
      };
      
      // Write to file
      const filePath = path.join(this.dataPath, 'command-executions.json');
      await fs.writeFile(filePath, JSON.stringify(data, null, 2));
      
      console.log('[MessageCenterService] Data saved successfully');
    } catch (error) {
      console.error('[MessageCenterService] Failed to save data:', error);
    }
  }
  
  // Load persisted data
  async loadPersistedData() {
    if (!this.dataPath) return;
    
    try {
      const filePath = path.join(this.dataPath, 'command-executions.json');
      const data = await fs.readFile(filePath, 'utf-8');
      const parsed = JSON.parse(data);
      
      // Restore command executions
      if (parsed.commandExecutions) {
        for (const { id, data } of parsed.commandExecutions) {
          const model = CommandExecutionModel.fromJSON(data);
          this.commandExecutions.set(id, model);
        }
      }
      
      // Restore statistics
      if (parsed.statistics) {
        this.statistics.global = parsed.statistics.global || this.statistics.global;
        
        if (parsed.statistics.byTerminal) {
          this.statistics.byTerminal = new Map(parsed.statistics.byTerminal);
        }
        if (parsed.statistics.byExecutor) {
          this.statistics.byExecutor = new Map(parsed.statistics.byExecutor);
        }
        if (parsed.statistics.byCategory) {
          this.statistics.byCategory = new Map(parsed.statistics.byCategory);
        }
      }
      
      console.log(`[MessageCenterService] Loaded ${this.commandExecutions.size} command executions`);
    } catch (error) {
      // File might not exist on first run
      if (error.code !== 'ENOENT') {
        console.error('[MessageCenterService] Failed to load persisted data:', error);
      }
    }
  }
  
  // Clear command history
  clearCommandHistory() {
    this.commandExecutions.clear();
    
    // Reset statistics
    this.statistics = {
      byTerminal: new Map(),
      byExecutor: new Map(),
      byCategory: new Map(),
      global: {
        totalCommands: 0,
        successCount: 0,
        errorCount: 0,
        totalDuration: 0
      }
    };
    
    // Save cleared state
    this.saveData().catch(console.error);
    
    if (this.messageCenterWindow) {
      this.messageCenterWindow.clearCommandHistory();
    }
  }
  
  // Format duration for display
  formatDuration(ms) {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}秒`;
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}分${seconds}秒`;
  }
  
  // Clean up on shutdown
  shutdown() {
    if (this.saveInterval) {
      clearInterval(this.saveInterval);
      this.saveInterval = null;
    }
    
    // Final save
    this.saveData().catch(console.error);
  }
}

module.exports = { MessageCenterService };