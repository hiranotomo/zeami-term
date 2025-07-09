/**
 * LoggingService - Centralized logging service for main process
 * Captures and routes log messages to renderer process
 */

const { BrowserWindow } = require('electron');
const { IPC_CHANNELS } = require('../../common/ipcChannels');

class LoggingService {
  constructor() {
    this.logs = [];
    this.maxLogs = 5000;
    this.windows = new Set();
    
    // Hook into console methods
    this.setupConsoleHooks();
    
    // Hook into process events
    this.setupProcessHooks();
  }
  
  setupConsoleHooks() {
    const originalLog = console.log;
    const originalWarn = console.warn;
    const originalError = console.error;
    
    console.log = (...args) => {
      originalLog.apply(console, args);
      this.log('info', args.join(' '), 'console');
    };
    
    console.warn = (...args) => {
      originalWarn.apply(console, args);
      this.log('warn', args.join(' '), 'console');
    };
    
    console.error = (...args) => {
      originalError.apply(console, args);
      this.log('error', args.join(' '), 'console');
    };
  }
  
  setupProcessHooks() {
    process.on('uncaughtException', (error) => {
      this.log('error', `Uncaught Exception: ${error.message}\n${error.stack}`, 'process');
    });
    
    process.on('unhandledRejection', (reason, promise) => {
      this.log('error', `Unhandled Promise Rejection: ${reason}`, 'process');
    });
  }
  
  addWindow(window) {
    this.windows.add(window);
    
    window.on('closed', () => {
      this.windows.delete(window);
    });
  }
  
  log(type, message, source = 'unknown') {
    const logEntry = {
      type: type,
      message: message,
      timestamp: new Date().toISOString(),
      source: source
    };
    
    // Store log
    this.logs.push(logEntry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }
    
    // Send to all windows
    this.broadcast(logEntry);
  }
  
  broadcast(logEntry) {
    for (const window of this.windows) {
      if (!window.isDestroyed()) {
        window.webContents.send(IPC_CHANNELS.LOG_MESSAGE, logEntry);
      }
    }
  }
  
  // Public methods for explicit logging
  info(message, source) {
    this.log('info', message, source);
  }
  
  warn(message, source) {
    this.log('warn', message, source);
  }
  
  error(message, source) {
    this.log('error', message, source);
  }
  
  debug(message, source) {
    this.log('debug', message, source);
  }
  
  // Get recent logs
  getRecentLogs(count = 100) {
    return this.logs.slice(-count);
  }
  
  // Clear logs
  clear() {
    this.logs = [];
  }
}

// Singleton instance
let instance = null;

module.exports = {
  getLoggingService: () => {
    if (!instance) {
      instance = new LoggingService();
    }
    return instance;
  },
  LoggingService
};