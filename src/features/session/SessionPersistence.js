/**
 * SessionPersistence - Terminal session persistence manager
 * 
 * Features:
 * - Save/restore terminal buffer content
 * - Save/restore working directory
 * - Save/restore scroll position
 * - Command history tracking
 * - Session metadata management
 */

export class SessionPersistence {
  constructor() {
    this.sessionData = new Map();
    this.autoSaveInterval = null;
    this.autoSaveEnabled = false;
    this.sessionStorageKey = 'zeami-terminal-sessions';
    this.maxBufferLines = 10000; // Limit buffer size for performance
  }

  /**
   * Save terminal session data
   * @param {string} terminalId - Terminal identifier
   * @param {Terminal} terminal - xterm.js terminal instance
   * @param {Object} processInfo - Process information (cwd, env, etc.)
   */
  saveSession(terminalId, terminal, processInfo = {}) {
    const sessionData = {
      id: terminalId,
      timestamp: Date.now(),
      buffer: this.extractBuffer(terminal),
      scrollPosition: this.getScrollPosition(terminal),
      workingDirectory: processInfo.cwd || process.cwd(),
      environment: this.sanitizeEnvironment(processInfo.env || {}),
      dimensions: {
        cols: terminal.cols,
        rows: terminal.rows
      },
      commandHistory: this.extractCommandHistory(terminal),
      metadata: {
        version: '1.0',
        terminalType: processInfo.shell || 'unknown',
        platform: window.electronAPI?.platform || 'unknown'
      }
    };

    this.sessionData.set(terminalId, sessionData);
    this.persistToStorage();
    
    return sessionData;
  }

  /**
   * Restore terminal session
   * @param {string} terminalId - Terminal identifier  
   * @param {Terminal} terminal - xterm.js terminal instance
   * @returns {Object} Restored session data
   */
  restoreSession(terminalId, terminal) {
    const saved = this.loadFromStorage();
    const sessionData = saved[terminalId];
    
    if (!sessionData) {
      console.log(`[SessionPersistence] No saved session found for ${terminalId}`);
      return null;
    }

    // Check if session is too old (24 hours)
    const age = Date.now() - sessionData.timestamp;
    if (age > 24 * 60 * 60 * 1000) {
      console.log(`[SessionPersistence] Session too old, skipping restore`);
      return null;
    }

    try {
      // Restore buffer content
      if (sessionData.buffer && sessionData.buffer.length > 0) {
        terminal.write('\x1b[2J\x1b[H'); // Clear screen
        terminal.write('=== Restored Session ===\r\n');
        terminal.write(`Last active: ${new Date(sessionData.timestamp).toLocaleString()}\r\n`);
        terminal.write(`Working directory: ${sessionData.workingDirectory}\r\n`);
        terminal.write('=' .repeat(40) + '\r\n\r\n');
        
        // Write buffer content
        sessionData.buffer.forEach(line => {
          terminal.writeln(line);
        });
        
        // Restore scroll position
        if (sessionData.scrollPosition !== undefined) {
          terminal.scrollToLine(sessionData.scrollPosition);
        }
      }

      // Return session info for further processing
      return {
        workingDirectory: sessionData.workingDirectory,
        environment: sessionData.environment,
        commandHistory: sessionData.commandHistory || [],
        dimensions: sessionData.dimensions
      };
      
    } catch (error) {
      console.error('[SessionPersistence] Error restoring session:', error);
      return null;
    }
  }

  /**
   * Extract buffer content from terminal
   * @param {Terminal} terminal - xterm.js terminal instance
   * @returns {Array<string>} Buffer lines
   */
  extractBuffer(terminal) {
    const buffer = terminal.buffer.active;
    const lines = [];
    const startLine = Math.max(0, buffer.length - this.maxBufferLines);
    
    for (let i = startLine; i < buffer.length; i++) {
      const line = buffer.getLine(i);
      if (line) {
        const text = line.translateToString(true);
        // Skip empty lines at the end
        if (text.trim() || lines.length > 0) {
          lines.push(text);
        }
      }
    }
    
    // Trim trailing empty lines
    while (lines.length > 0 && !lines[lines.length - 1].trim()) {
      lines.pop();
    }
    
    return lines;
  }

  /**
   * Get current scroll position
   * @param {Terminal} terminal - xterm.js terminal instance
   * @returns {number} Current scroll line
   */
  getScrollPosition(terminal) {
    return terminal.buffer.active.viewportY;
  }

  /**
   * Extract command history from shell integration
   * @param {Terminal} terminal - xterm.js terminal instance
   * @returns {Array<Object>} Command history
   */
  extractCommandHistory(terminal) {
    // If shell integration addon is available, extract command history
    if (terminal._shellIntegrationHistory) {
      return terminal._shellIntegrationHistory.slice(-100); // Last 100 commands
    }
    
    // Fallback: try to extract from buffer (less reliable)
    const history = [];
    const promptPattern = /^(\$|>|#|\w+@\w+:)/;
    const buffer = this.extractBuffer(terminal);
    
    buffer.forEach((line, index) => {
      if (promptPattern.test(line.trim())) {
        const command = line.replace(promptPattern, '').trim();
        if (command) {
          history.push({
            command,
            line: index,
            timestamp: null // Can't determine from buffer alone
          });
        }
      }
    });
    
    return history;
  }

  /**
   * Sanitize environment variables (remove sensitive data)
   * @param {Object} env - Environment variables
   * @returns {Object} Sanitized environment
   */
  sanitizeEnvironment(env) {
    const sanitized = {};
    const sensitiveKeys = ['PASSWORD', 'TOKEN', 'KEY', 'SECRET', 'CREDENTIAL'];
    
    Object.keys(env).forEach(key => {
      const isSensitive = sensitiveKeys.some(sensitive => 
        key.toUpperCase().includes(sensitive)
      );
      
      if (!isSensitive) {
        sanitized[key] = env[key];
      }
    });
    
    return sanitized;
  }

  /**
   * Enable auto-save functionality
   * @param {number} intervalMs - Auto-save interval in milliseconds
   */
  enableAutoSave(intervalMs = 30000) { // Default: 30 seconds
    this.autoSaveEnabled = true;
    
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
    }
    
    this.autoSaveInterval = setInterval(() => {
      if (this.sessionData.size > 0) {
        this.persistToStorage();
        console.log(`[SessionPersistence] Auto-saved ${this.sessionData.size} sessions`);
      }
    }, intervalMs);
  }

  /**
   * Disable auto-save
   */
  disableAutoSave() {
    this.autoSaveEnabled = false;
    
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
      this.autoSaveInterval = null;
    }
  }

  /**
   * Persist sessions to storage
   */
  persistToStorage() {
    try {
      const sessions = {};
      this.sessionData.forEach((data, id) => {
        sessions[id] = data;
      });
      
      // Use localStorage for web, or file system for Electron
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(this.sessionStorageKey, JSON.stringify(sessions));
      } else if (window.electronAPI) {
        // Save to file via Electron API
        window.electronAPI.saveSessionData(sessions);
      }
    } catch (error) {
      console.error('[SessionPersistence] Error persisting sessions:', error);
    }
  }

  /**
   * Load sessions from storage
   * @returns {Object} Saved sessions
   */
  loadFromStorage() {
    try {
      let sessions = {};
      
      if (typeof localStorage !== 'undefined') {
        const saved = localStorage.getItem(this.sessionStorageKey);
        if (saved) {
          sessions = JSON.parse(saved);
        }
      } else if (window.electronAPI) {
        // Load from file via Electron API
        sessions = window.electronAPI.loadSessionData() || {};
      }
      
      // Populate session data map
      Object.keys(sessions).forEach(id => {
        this.sessionData.set(id, sessions[id]);
      });
      
      return sessions;
    } catch (error) {
      console.error('[SessionPersistence] Error loading sessions:', error);
      return {};
    }
  }

  /**
   * Clear session data
   * @param {string} terminalId - Terminal identifier (optional)
   */
  clearSession(terminalId = null) {
    if (terminalId) {
      this.sessionData.delete(terminalId);
    } else {
      this.sessionData.clear();
    }
    
    this.persistToStorage();
  }

  /**
   * Get all saved sessions
   * @returns {Array<Object>} Session list
   */
  listSessions() {
    const sessions = [];
    this.sessionData.forEach((data, id) => {
      sessions.push({
        id,
        timestamp: data.timestamp,
        workingDirectory: data.workingDirectory,
        terminalType: data.metadata.terminalType,
        bufferSize: data.buffer.length
      });
    });
    
    return sessions.sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Export session data
   * @param {string} terminalId - Terminal identifier
   * @returns {string} JSON string of session data
   */
  exportSession(terminalId) {
    const sessionData = this.sessionData.get(terminalId);
    if (!sessionData) {
      throw new Error(`Session ${terminalId} not found`);
    }
    
    return JSON.stringify(sessionData, null, 2);
  }

  /**
   * Import session data
   * @param {string} jsonData - JSON string of session data
   * @returns {Object} Imported session data
   */
  importSession(jsonData) {
    try {
      const sessionData = JSON.parse(jsonData);
      
      // Validate session data
      if (!sessionData.id || !sessionData.buffer || !sessionData.timestamp) {
        throw new Error('Invalid session data format');
      }
      
      // Generate new ID to avoid conflicts
      const newId = `imported-${Date.now()}`;
      sessionData.id = newId;
      sessionData.timestamp = Date.now();
      
      this.sessionData.set(newId, sessionData);
      this.persistToStorage();
      
      return sessionData;
    } catch (error) {
      throw new Error(`Failed to import session: ${error.message}`);
    }
  }
}