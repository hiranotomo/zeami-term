/**
 * LogPanel - Terminal log display component
 * Displays terminal output, errors, and status messages
 */

export class LogPanel {
  constructor() {
    try {
      this.panel = document.getElementById('log-panel');
      this.content = document.getElementById('log-content');
      this.toggleBtn = document.getElementById('log-toggle');
      this.clearBtn = document.getElementById('log-clear');
      this.filterBtn = document.getElementById('log-filter');
      this.logCount = document.getElementById('log-count');
      
      this.isOpen = false;
      this.logs = [];
      this.unreadCount = 0;
      this.maxLogs = 1000;
      this.filters = {
        info: true,
        warn: true,
        error: true,
        debug: true
      };
      
      // Check if all required elements are found
      if (!this.panel || !this.content) {
        console.error('[LogPanel] Required DOM elements not found:', {
          panel: !!this.panel,
          content: !!this.content,
          toggleBtn: !!this.toggleBtn,
          clearBtn: !!this.clearBtn,
          filterBtn: !!this.filterBtn,
          logCount: !!this.logCount
        });
        // Don't throw error, just skip initialization
        this.initialized = false;
        return;
      }
      
      this.initialized = true;
      this.initializeEventListeners();
      this.setupIPCListeners();
    } catch (error) {
      console.error('[LogPanel] Error during initialization:', error);
      this.initialized = false;
    }
  }
  
  initializeEventListeners() {
    // Toggle button click
    if (this.toggleBtn) {
      this.toggleBtn.addEventListener('click', () => {
        this.toggle();
      });
    }
    
    // Clear button
    if (this.clearBtn) {
      this.clearBtn.addEventListener('click', () => {
        this.clear();
      });
    }
    
    // Filter button (placeholder for future implementation)
    if (this.filterBtn) {
      this.filterBtn.addEventListener('click', () => {
        // TODO: Show filter menu
        console.log('Filter functionality coming soon');
      });
    }
  }
  
  setupIPCListeners() {
    // Check if electronAPI is available
    if (!window.electronAPI) {
      console.warn('[LogPanel] electronAPI not available, skipping IPC listeners');
      return;
    }
    
    // Listen for log messages from main process
    if (window.electronAPI.onLogMessage) {
      window.electronAPI.onLogMessage((event, data) => {
        this.addLog(data);
      });
    }
    
    // Listen for terminal output that might contain errors
    if (window.electronAPI.onTerminalData) {
      window.electronAPI.onTerminalData((event, { id, data }) => {
        // Parse terminal data for errors or important messages
        const parsed = this.parseTerminalData(data);
        if (parsed) {
          this.addLog(parsed);
        }
      });
    }
    
    // Listen for pattern detection
    if (window.electronAPI.onPatternDetected) {
      window.electronAPI.onPatternDetected((event, { type, message, data }) => {
        this.addLog({
          type: type === 'error' ? 'error' : 'info',
          message: message,
          timestamp: new Date().toISOString(),
          source: 'pattern-detector',
          data: data
        });
      });
    }
  }
  
  parseTerminalData(data) {
    // Look for common error patterns
    const errorPatterns = [
      /error:/i,
      /failed:/i,
      /exception:/i,
      /warning:/i,
      /npm err!/i,
      /traceback/i,
      /syntaxerror/i,
      /typeerror/i
    ];
    
    const dataStr = data.toString();
    
    for (const pattern of errorPatterns) {
      if (pattern.test(dataStr)) {
        const type = /warning:/i.test(dataStr) ? 'warn' : 'error';
        return {
          type: type,
          message: dataStr.trim(),
          timestamp: new Date().toISOString(),
          source: 'terminal'
        };
      }
    }
    
    // Also capture important status messages
    if (/\[main\]/i.test(dataStr) || /\[zeami\]/i.test(dataStr)) {
      return {
        type: 'info',
        message: dataStr.trim(),
        timestamp: new Date().toISOString(),
        source: 'system'
      };
    }
    
    return null;
  }
  
  addLog(logData) {
    // Ensure log has required fields
    const log = {
      type: logData.type || 'info',
      message: logData.message || '',
      timestamp: logData.timestamp || new Date().toISOString(),
      source: logData.source || 'unknown',
      data: logData.data || null
    };
    
    // Add to logs array
    this.logs.push(log);
    
    // Trim if exceeding max logs
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }
    
    // Update unread count if panel is closed
    if (!this.isOpen) {
      this.unreadCount++;
      this.updateUnreadCount();
    }
    
    // Add to display if filter allows
    if (this.filters[log.type]) {
      this.renderLog(log);
    }
  }
  
  renderLog(log) {
    const entry = document.createElement('div');
    entry.className = `log-entry ${log.type}`;
    
    const timestamp = document.createElement('span');
    timestamp.className = 'log-timestamp';
    timestamp.textContent = new Date(log.timestamp).toLocaleTimeString();
    
    const message = document.createElement('span');
    message.className = 'log-message';
    message.textContent = log.message;
    
    entry.appendChild(timestamp);
    entry.appendChild(message);
    
    this.content.appendChild(entry);
    
    // Auto-scroll to bottom
    this.content.scrollTop = this.content.scrollHeight;
  }
  
  toggle() {
    if (!this.initialized || !this.panel) {
      console.warn('[LogPanel] Cannot toggle - not initialized');
      return;
    }
    
    this.isOpen = !this.isOpen;
    
    if (this.isOpen) {
      this.panel.classList.add('open');
      if (this.toggleBtn) {
        this.toggleBtn.classList.add('active');
      }
      this.unreadCount = 0;
      this.updateUnreadCount();
    } else {
      this.panel.classList.remove('open');
      if (this.toggleBtn) {
        this.toggleBtn.classList.remove('active');
      }
    }
  }
  
  clear() {
    this.logs = [];
    this.content.innerHTML = '';
    this.unreadCount = 0;
    this.updateUnreadCount();
  }
  
  updateUnreadCount() {
    if (this.unreadCount > 0) {
      this.logCount.textContent = this.unreadCount > 99 ? '99+' : this.unreadCount;
      this.logCount.style.display = 'inline-block';
    } else {
      this.logCount.style.display = 'none';
    }
  }
  
  applyFilter(type, enabled) {
    this.filters[type] = enabled;
    this.refresh();
  }
  
  refresh() {
    this.content.innerHTML = '';
    this.logs.forEach(log => {
      if (this.filters[log.type]) {
        this.renderLog(log);
      }
    });
  }
}