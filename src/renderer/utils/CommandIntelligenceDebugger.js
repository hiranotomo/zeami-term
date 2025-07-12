/**
 * Command Intelligence Debugger
 * Debug utility for Command Intelligence Hub
 */

export class CommandIntelligenceDebugger {
  constructor() {
    this.enabled = localStorage.getItem('zeami:debug:command-intelligence') === 'true';
    this.logs = [];
    this.maxLogs = 1000;
  }

  enable() {
    this.enabled = true;
    localStorage.setItem('zeami:debug:command-intelligence', 'true');
    console.log('[CommandIntelligenceDebugger] Debugging enabled');
  }

  disable() {
    this.enabled = false;
    localStorage.removeItem('zeami:debug:command-intelligence');
    console.log('[CommandIntelligenceDebugger] Debugging disabled');
  }

  toggle() {
    if (this.enabled) {
      this.disable();
    } else {
      this.enable();
    }
    return this.enabled;
  }

  log(category, message, data = {}) {
    if (!this.enabled) return;

    const logEntry = {
      timestamp: new Date().toISOString(),
      category,
      message,
      data,
      stack: new Error().stack
    };

    this.logs.push(logEntry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // Console output with styling
    const style = this.getCategoryStyle(category);
    console.log(
      `%c[CI-Debug:${category}] ${message}`,
      style,
      data
    );
  }

  getCategoryStyle(category) {
    const styles = {
      'osc': 'color: #4CAF50; font-weight: bold;',
      'ipc': 'color: #2196F3; font-weight: bold;',
      'command': 'color: #FF9800; font-weight: bold;',
      'error': 'color: #F44336; font-weight: bold;',
      'ui': 'color: #9C27B0; font-weight: bold;',
      'data': 'color: #00BCD4; font-weight: bold;',
      'default': 'color: #757575;'
    };
    return styles[category] || styles.default;
  }

  // Specific logging methods
  logOSC(sequence, data) {
    this.log('osc', `OSC ${sequence} received`, { sequence, data });
  }

  logCommand(action, command) {
    this.log('command', `Command ${action}`, { command });
  }

  logIPC(channel, data, result) {
    this.log('ipc', `IPC ${channel}`, { data, result });
  }

  logError(error, context) {
    this.log('error', error.message, { error, context });
  }

  logUI(component, action, data) {
    this.log('ui', `${component}: ${action}`, data);
  }

  // Get debug report
  getReport() {
    const report = {
      enabled: this.enabled,
      logCount: this.logs.length,
      logs: this.logs,
      summary: this.getSummary()
    };
    return report;
  }

  getSummary() {
    const summary = {
      byCategory: {},
      recentErrors: [],
      commandCount: 0
    };

    this.logs.forEach(log => {
      summary.byCategory[log.category] = (summary.byCategory[log.category] || 0) + 1;
      
      if (log.category === 'error') {
        summary.recentErrors.push({
          time: log.timestamp,
          message: log.message
        });
      }
      
      if (log.category === 'command') {
        summary.commandCount++;
      }
    });

    summary.recentErrors = summary.recentErrors.slice(-10);
    return summary;
  }

  // Export logs as JSON
  exportLogs() {
    const data = JSON.stringify(this.getReport(), null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `command-intelligence-debug-${new Date().toISOString()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Clear logs
  clear() {
    this.logs = [];
    console.log('[CommandIntelligenceDebugger] Logs cleared');
  }
}

// Create singleton instance
export const ciDebugger = new CommandIntelligenceDebugger();

// Add global shortcut
if (typeof window !== 'undefined') {
  window.zeamiCommandDebugger = ciDebugger;
  
  // Add keyboard shortcut (Ctrl/Cmd + Shift + D)
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'D') {
      const enabled = ciDebugger.toggle();
      console.log(`Command Intelligence Debugging: ${enabled ? 'ON' : 'OFF'}`);
    }
  });
}