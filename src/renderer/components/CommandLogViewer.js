/**
 * Command Log Viewer Component
 * Displays command execution history with statistics
 */

class CommandLogViewer {
  constructor() {
    this.logs = [];
    this.maxLogs = 1000;
    this.element = this.createElement();
    this.shellIntegration = null;
    
    // Auto-update stats every second
    this.statsInterval = setInterval(() => this.updateStats(), 1000);
  }
  
  createElement() {
    const viewer = document.createElement('div');
    viewer.className = 'command-log-viewer';
    viewer.innerHTML = `
      <div class="log-header">
        <h3>Command Execution Log</h3>
        <div class="log-actions">
          <button class="btn-export" title="Export logs">📥</button>
          <button class="btn-clear" title="Clear logs">🗑️</button>
          <button class="btn-toggle" title="Toggle view">👁️</button>
        </div>
      </div>
      
      <div class="log-stats">
        <div class="stat-item">
          <span class="stat-label">Total:</span>
          <span class="stat-value" id="stat-total">0</span>
        </div>
        <div class="stat-item success">
          <span class="stat-label">Success:</span>
          <span class="stat-value" id="stat-success">0</span>
        </div>
        <div class="stat-item error">
          <span class="stat-label">Failed:</span>
          <span class="stat-value" id="stat-error">0</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Avg Time:</span>
          <span class="stat-value" id="stat-avg-time">0ms</span>
        </div>
      </div>
      
      <div class="log-filters">
        <input type="search" class="filter-search" placeholder="Filter commands...">
        <select class="filter-status">
          <option value="">All Status</option>
          <option value="success">Success Only</option>
          <option value="error">Errors Only</option>
        </select>
      </div>
      
      <div class="log-entries"></div>
    `;
    
    this.setupEventListeners();
    
    return viewer;
  }
  
  setupEventListeners() {
    // Clear button
    this.element.querySelector('.btn-clear').addEventListener('click', () => {
      this.clearLogs();
    });
    
    // Export button
    this.element.querySelector('.btn-export').addEventListener('click', () => {
      this.exportLogs();
    });
    
    // Toggle button
    this.element.querySelector('.btn-toggle').addEventListener('click', () => {
      this.element.classList.toggle('collapsed');
    });
    
    // Search filter
    this.element.querySelector('.filter-search').addEventListener('input', (e) => {
      this.filterLogs(e.target.value);
    });
    
    // Status filter
    this.element.querySelector('.filter-status').addEventListener('change', (e) => {
      this.filterByStatus(e.target.value);
    });
  }
  
  setShellIntegration(addon) {
    this.shellIntegration = addon;
    
    // Listen to command events
    addon.onCommandStart = (command) => {
      this.addPendingCommand(command);
    };
    
    addon.onCommandEnd = (command) => {
      this.updateCommand(command);
    };
    
    addon.onCwdChange = (data) => {
      this.addCwdChange(data);
    };
  }
  
  addPendingCommand(commandData) {
    const log = {
      id: commandData.id,
      type: 'command',
      command: commandData.command,
      startTime: commandData.startTime,
      cwd: commandData.cwd,
      status: 'running',
      element: null
    };
    
    this.logs.unshift(log);
    
    // Trim logs if necessary
    if (this.logs.length > this.maxLogs) {
      this.logs.pop();
    }
    
    // Create and add element
    const element = this.createLogElement(log);
    log.element = element;
    
    const container = this.element.querySelector('.log-entries');
    container.insertBefore(element, container.firstChild);
    
    this.updateStats();
  }
  
  updateCommand(commandData) {
    const log = this.logs.find(l => l.id === commandData.id);
    if (!log) return;
    
    // Update log data
    Object.assign(log, {
      endTime: commandData.endTime,
      duration: commandData.duration,
      exitCode: commandData.exitCode,
      status: commandData.status
    });
    
    // Update element
    if (log.element) {
      this.updateLogElement(log.element, log);
    }
    
    this.updateStats();
  }
  
  addCwdChange(data) {
    const log = {
      id: Date.now().toString(),
      type: 'cwd',
      oldPath: data.oldPath,
      newPath: data.newPath,
      timestamp: Date.now()
    };
    
    this.logs.unshift(log);
    
    const element = this.createCwdElement(log);
    const container = this.element.querySelector('.log-entries');
    container.insertBefore(element, container.firstChild);
  }
  
  createLogElement(log) {
    const div = document.createElement('div');
    div.className = `log-entry ${log.status}`;
    div.dataset.id = log.id;
    
    const time = new Date(log.startTime).toLocaleTimeString();
    
    div.innerHTML = `
      <div class="log-time">${time}</div>
      <div class="log-status">
        <span class="status-icon">${this.getStatusIcon(log.status)}</span>
      </div>
      <div class="log-content">
        <div class="log-command">${this.escapeHtml(log.command)}</div>
        <div class="log-meta">
          <span class="log-cwd" title="${log.cwd}">${this.shortenPath(log.cwd)}</span>
          <span class="log-duration">${log.status === 'running' ? 'Running...' : ''}</span>
        </div>
      </div>
    `;
    
    // Click to copy command
    div.querySelector('.log-command').addEventListener('click', () => {
      navigator.clipboard.writeText(log.command);
      this.showToast('Command copied!');
    });
    
    return div;
  }
  
  updateLogElement(element, log) {
    element.className = `log-entry ${log.status}`;
    
    const statusIcon = element.querySelector('.status-icon');
    statusIcon.textContent = this.getStatusIcon(log.status);
    
    const duration = element.querySelector('.log-duration');
    if (log.duration !== undefined) {
      duration.textContent = this.formatDuration(log.duration);
      
      if (log.exitCode !== 0) {
        duration.textContent += ` (exit: ${log.exitCode})`;
      }
    }
  }
  
  createCwdElement(log) {
    const div = document.createElement('div');
    div.className = 'log-entry cwd-change';
    
    const time = new Date(log.timestamp).toLocaleTimeString();
    
    div.innerHTML = `
      <div class="log-time">${time}</div>
      <div class="log-status">
        <span class="status-icon">📁</span>
      </div>
      <div class="log-content">
        <div class="log-cwd-change">
          <span class="old-path">${this.shortenPath(log.oldPath)}</span>
          <span class="arrow">→</span>
          <span class="new-path">${this.shortenPath(log.newPath)}</span>
        </div>
      </div>
    `;
    
    return div;
  }
  
  getStatusIcon(status) {
    switch (status) {
      case 'running': return '⏱️';
      case 'success': return '✅';
      case 'error': return '❌';
      default: return '❓';
    }
  }
  
  formatDuration(ms) {
    if (ms < 1000) {
      return `${ms}ms`;
    } else if (ms < 60000) {
      return `${(ms / 1000).toFixed(1)}s`;
    } else {
      const minutes = Math.floor(ms / 60000);
      const seconds = ((ms % 60000) / 1000).toFixed(0);
      return `${minutes}m ${seconds}s`;
    }
  }
  
  shortenPath(path) {
    const home = process.env.HOME || '/home/user';
    if (path.startsWith(home)) {
      return path.replace(home, '~');
    }
    
    // Shorten very long paths
    if (path.length > 50) {
      const parts = path.split('/');
      if (parts.length > 4) {
        return `${parts[0]}/${parts[1]}/.../${parts[parts.length - 2]}/${parts[parts.length - 1]}`;
      }
    }
    
    return path;
  }
  
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
  
  updateStats() {
    if (!this.shellIntegration) return;
    
    const stats = this.shellIntegration.getStatistics();
    
    document.getElementById('stat-total').textContent = stats.totalCommands;
    document.getElementById('stat-success').textContent = stats.successCount;
    document.getElementById('stat-error').textContent = stats.errorCount;
    document.getElementById('stat-avg-time').textContent = 
      stats.averageDuration ? this.formatDuration(stats.averageDuration) : '0ms';
  }
  
  filterLogs(searchText) {
    const entries = this.element.querySelectorAll('.log-entry');
    const search = searchText.toLowerCase();
    
    entries.forEach(entry => {
      const command = entry.querySelector('.log-command');
      if (command) {
        const matches = command.textContent.toLowerCase().includes(search);
        entry.style.display = matches ? '' : 'none';
      }
    });
  }
  
  filterByStatus(status) {
    const entries = this.element.querySelectorAll('.log-entry');
    
    entries.forEach(entry => {
      if (!status || entry.classList.contains(status)) {
        entry.style.display = '';
      } else {
        entry.style.display = 'none';
      }
    });
  }
  
  clearLogs() {
    if (confirm('Clear all command logs?')) {
      this.logs = [];
      this.element.querySelector('.log-entries').innerHTML = '';
      
      if (this.shellIntegration) {
        this.shellIntegration.clearHistory();
      }
      
      this.updateStats();
    }
  }
  
  exportLogs() {
    const data = this.logs
      .filter(log => log.type === 'command')
      .map(log => ({
        command: log.command,
        startTime: new Date(log.startTime).toISOString(),
        duration: log.duration,
        exitCode: log.exitCode,
        status: log.status,
        cwd: log.cwd
      }));
    
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `zeamiterm-commands-${Date.now()}.json`;
    a.click();
    
    URL.revokeObjectURL(url);
    this.showToast('Logs exported!');
  }
  
  showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 2000);
  }
  
  dispose() {
    if (this.statsInterval) {
      clearInterval(this.statsInterval);
    }
  }
}

module.exports = { CommandLogViewer };