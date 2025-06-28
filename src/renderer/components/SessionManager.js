/**
 * SessionManager - Session management UI component
 * 
 * Provides a user-friendly interface for managing saved terminal sessions
 */

export class SessionManager {
  constructor() {
    this.isOpen = false;
    this.sessions = [];
    this.selectedSession = null;
    this.sortBy = 'date'; // date, name, size
    this.sortOrder = 'desc'; // asc, desc
    this.filter = '';
    
    this.init();
  }

  init() {
    // Load CSS if not already loaded
    this.loadStyles();
    
    // Make SessionManager globally accessible
    window.sessionManager = this;
  }

  loadStyles() {
    if (!document.querySelector('#session-manager-styles')) {
      const style = document.createElement('style');
      style.id = 'session-manager-styles';
      style.textContent = `
        .session-manager-container {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 10001;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .session-manager-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.6);
        }

        .session-manager-window {
          position: relative;
          width: 90%;
          max-width: 800px;
          height: 80%;
          max-height: 600px;
          background: var(--background-color, #1e1e1e);
          border: 1px solid var(--border-color, #333);
          border-radius: 8px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .session-manager-header {
          padding: 20px;
          border-bottom: 1px solid var(--border-color, #333);
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .session-manager-title {
          font-size: 20px;
          font-weight: 600;
          color: var(--text-color, #ccc);
          margin: 0;
        }

        .session-manager-close {
          background: none;
          border: none;
          color: var(--text-color, #ccc);
          font-size: 24px;
          cursor: pointer;
          padding: 4px 8px;
          line-height: 1;
          opacity: 0.7;
          transition: opacity 0.2s;
        }

        .session-manager-close:hover {
          opacity: 1;
        }

        .session-manager-toolbar {
          padding: 12px 20px;
          border-bottom: 1px solid var(--border-color, #333);
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .session-search {
          flex: 1;
          background: var(--input-background, #2d2d2d);
          border: 1px solid var(--border-color, #333);
          border-radius: 4px;
          padding: 6px 12px;
          color: var(--text-color, #ccc);
          font-size: 13px;
        }

        .session-search:focus {
          outline: none;
          border-color: var(--accent-color, #007acc);
        }

        .session-sort {
          background: var(--input-background, #2d2d2d);
          border: 1px solid var(--border-color, #333);
          border-radius: 4px;
          padding: 6px 12px;
          color: var(--text-color, #ccc);
          font-size: 13px;
          cursor: pointer;
        }

        .session-list {
          flex: 1;
          overflow-y: auto;
          padding: 12px;
        }

        .session-empty {
          text-align: center;
          color: var(--text-color-dim, #666);
          padding: 60px 20px;
          font-size: 14px;
        }

        .session-item {
          background: var(--item-background, #2d2d2d);
          border: 1px solid var(--border-color, #333);
          border-radius: 6px;
          padding: 16px;
          margin-bottom: 8px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .session-item:hover {
          background: var(--item-hover-background, #363636);
          border-color: var(--accent-color, #007acc);
        }

        .session-item.selected {
          background: var(--item-selected-background, #3d3d3d);
          border-color: var(--accent-color, #007acc);
        }

        .session-item-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 8px;
        }

        .session-item-title {
          font-weight: 600;
          color: var(--text-color, #ccc);
          font-size: 14px;
        }

        .session-item-date {
          color: var(--text-color-dim, #666);
          font-size: 12px;
        }

        .session-item-info {
          display: flex;
          gap: 16px;
          font-size: 12px;
          color: var(--text-color-dim, #666);
        }

        .session-item-info span {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .session-footer {
          padding: 16px 20px;
          border-top: 1px solid var(--border-color, #333);
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .session-footer-info {
          color: var(--text-color-dim, #666);
          font-size: 12px;
        }

        .session-footer-actions {
          display: flex;
          gap: 8px;
        }

        .session-button {
          padding: 6px 16px;
          border: 1px solid var(--border-color, #333);
          border-radius: 4px;
          background: var(--button-background, #2d2d2d);
          color: var(--text-color, #ccc);
          font-size: 13px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .session-button:hover {
          background: var(--button-hover-background, #363636);
        }

        .session-button.primary {
          background: var(--accent-color, #007acc);
          border-color: var(--accent-color, #007acc);
          color: white;
        }

        .session-button.primary:hover {
          background: var(--accent-hover-color, #0062a3);
        }

        .session-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .badge.coming-soon {
          display: inline-block;
          background: #666;
          color: white;
          font-size: 10px;
          padding: 2px 6px;
          border-radius: 3px;
          margin-left: 8px;
          font-weight: 500;
          text-transform: uppercase;
        }
      `;
      document.head.appendChild(style);
    }
  }

  async open() {
    if (this.isOpen) return;
    
    this.isOpen = true;
    await this.loadSessions();
    this.render();
  }

  close() {
    if (!this.isOpen) return;
    
    this.isOpen = false;
    const container = document.querySelector('.session-manager-container');
    if (container) {
      container.remove();
    }
  }

  async loadSessions() {
    try {
      // Request sessions from main process
      if (window.electronAPI && window.electronAPI.listSessions) {
        const sessions = await window.electronAPI.listSessions();
        this.sessions = sessions || [];
      } else {
        // Mock data for development
        this.sessions = [
          {
            id: 'session-1',
            name: 'Claude Code Session',
            date: new Date().toISOString(),
            duration: 3600000, // 1 hour
            size: 1024 * 1024 * 2, // 2MB
            commandCount: 156,
            path: '~/.zeami-term/sessions/session-1.log'
          },
          {
            id: 'session-2',
            name: 'Development Session',
            date: new Date(Date.now() - 86400000).toISOString(), // Yesterday
            duration: 7200000, // 2 hours
            size: 1024 * 1024 * 5, // 5MB
            commandCount: 342,
            path: '~/.zeami-term/sessions/session-2.log'
          }
        ];
      }
      
      this.sortSessions();
    } catch (error) {
      console.error('[SessionManager] Failed to load sessions:', error);
      this.sessions = [];
    }
  }

  sortSessions() {
    const sorted = [...this.sessions];
    
    sorted.sort((a, b) => {
      let compareValue = 0;
      
      switch (this.sortBy) {
        case 'name':
          compareValue = a.name.localeCompare(b.name);
          break;
        case 'size':
          compareValue = a.size - b.size;
          break;
        case 'date':
        default:
          compareValue = new Date(a.date) - new Date(b.date);
      }
      
      return this.sortOrder === 'asc' ? compareValue : -compareValue;
    });
    
    this.sessions = sorted;
  }

  filterSessions() {
    if (!this.filter) return this.sessions;
    
    const filterLower = this.filter.toLowerCase();
    return this.sessions.filter(session => 
      session.name.toLowerCase().includes(filterLower) ||
      session.path.toLowerCase().includes(filterLower)
    );
  }

  render() {
    const container = document.createElement('div');
    container.className = 'session-manager-container';
    
    const filteredSessions = this.filterSessions();
    
    container.innerHTML = `
      <div class="session-manager-overlay"></div>
      <div class="session-manager-window">
        <div class="session-manager-header">
          <h1 class="session-manager-title">Session Manager</h1>
          <button class="session-manager-close">×</button>
        </div>
        <div class="session-manager-toolbar">
          <input type="text" 
                 class="session-search" 
                 placeholder="Search sessions..." 
                 value="${this.filter}">
          <select class="session-sort">
            <option value="date-desc" ${this.sortBy === 'date' && this.sortOrder === 'desc' ? 'selected' : ''}>
              Newest First
            </option>
            <option value="date-asc" ${this.sortBy === 'date' && this.sortOrder === 'asc' ? 'selected' : ''}>
              Oldest First
            </option>
            <option value="name-asc" ${this.sortBy === 'name' && this.sortOrder === 'asc' ? 'selected' : ''}>
              Name (A-Z)
            </option>
            <option value="name-desc" ${this.sortBy === 'name' && this.sortOrder === 'desc' ? 'selected' : ''}>
              Name (Z-A)
            </option>
            <option value="size-desc" ${this.sortBy === 'size' && this.sortOrder === 'desc' ? 'selected' : ''}>
              Largest First
            </option>
            <option value="size-asc" ${this.sortBy === 'size' && this.sortOrder === 'asc' ? 'selected' : ''}>
              Smallest First
            </option>
          </select>
        </div>
        <div class="session-list">
          ${filteredSessions.length === 0 ? `
            <div class="session-empty">
              ${this.filter ? 'No sessions match your search.' : 'No saved sessions yet.'}
            </div>
          ` : filteredSessions.map(session => this.renderSessionItem(session)).join('')}
        </div>
        <div class="session-footer">
          <div class="session-footer-info">
            ${this.sessions.length} session${this.sessions.length !== 1 ? 's' : ''} 
            ${this.filter ? `(${filteredSessions.length} shown)` : ''}
          </div>
          <div class="session-footer-actions">
            <button class="session-button" id="session-delete" 
                    ${!this.selectedSession ? 'disabled' : ''}>
              Delete
            </button>
            <button class="session-button" id="session-export" 
                    ${!this.selectedSession ? 'disabled' : ''}>
              Export
            </button>
            <button class="session-button primary" id="session-play" 
                    ${!this.selectedSession ? 'disabled' : ''}>
              Play Session
            </button>
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(container);
    this.attachEventListeners();
  }

  renderSessionItem(session) {
    const isSelected = this.selectedSession === session.id;
    const date = new Date(session.date);
    const dateStr = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    const duration = this.formatDuration(session.duration);
    const size = this.formatSize(session.size);
    
    return `
      <div class="session-item ${isSelected ? 'selected' : ''}" 
           data-session-id="${session.id}">
        <div class="session-item-header">
          <div class="session-item-title">${session.name}</div>
          <div class="session-item-date">${dateStr}</div>
        </div>
        <div class="session-item-info">
          <span>⏱ ${duration}</span>
          <span>📊 ${session.commandCount} commands</span>
          <span>💾 ${size}</span>
        </div>
      </div>
    `;
  }

  formatDuration(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }

  formatSize(bytes) {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  }

  attachEventListeners() {
    const container = document.querySelector('.session-manager-container');
    
    // Close button and overlay
    container.querySelector('.session-manager-close').addEventListener('click', () => this.close());
    container.querySelector('.session-manager-overlay').addEventListener('click', () => this.close());
    
    // Search input
    const searchInput = container.querySelector('.session-search');
    searchInput.addEventListener('input', (e) => {
      this.filter = e.target.value;
      this.updateSessionList();
    });
    
    // Sort dropdown
    const sortSelect = container.querySelector('.session-sort');
    sortSelect.addEventListener('change', (e) => {
      const [sortBy, sortOrder] = e.target.value.split('-');
      this.sortBy = sortBy;
      this.sortOrder = sortOrder;
      this.sortSessions();
      this.updateSessionList();
    });
    
    // Session selection
    container.addEventListener('click', (e) => {
      const sessionItem = e.target.closest('.session-item');
      if (sessionItem) {
        this.selectSession(sessionItem.dataset.sessionId);
      }
    });
    
    // Action buttons
    container.querySelector('#session-play').addEventListener('click', () => {
      if (this.selectedSession) {
        this.playSession(this.selectedSession);
      }
    });
    
    container.querySelector('#session-delete').addEventListener('click', () => {
      if (this.selectedSession) {
        this.deleteSession(this.selectedSession);
      }
    });
    
    container.querySelector('#session-export').addEventListener('click', () => {
      if (this.selectedSession) {
        this.exportSession(this.selectedSession);
      }
    });
  }

  updateSessionList() {
    const listContainer = document.querySelector('.session-list');
    const filteredSessions = this.filterSessions();
    
    if (filteredSessions.length === 0) {
      listContainer.innerHTML = `
        <div class="session-empty">
          ${this.filter ? 'No sessions match your search.' : 'No saved sessions yet.'}
        </div>
      `;
    } else {
      listContainer.innerHTML = filteredSessions
        .map(session => this.renderSessionItem(session))
        .join('');
    }
    
    // Update footer
    const footerInfo = document.querySelector('.session-footer-info');
    footerInfo.textContent = `${this.sessions.length} session${this.sessions.length !== 1 ? 's' : ''} ${this.filter ? `(${filteredSessions.length} shown)` : ''}`;
  }

  selectSession(sessionId) {
    this.selectedSession = sessionId;
    
    // Update UI
    document.querySelectorAll('.session-item').forEach(item => {
      item.classList.toggle('selected', item.dataset.sessionId === sessionId);
    });
    
    // Enable/disable action buttons
    const playButton = document.querySelector('#session-play');
    const deleteButton = document.querySelector('#session-delete');
    const exportButton = document.querySelector('#session-export');
    
    playButton.disabled = !sessionId;
    deleteButton.disabled = !sessionId;
    exportButton.disabled = !sessionId;
  }

  async playSession(sessionId) {
    const session = this.sessions.find(s => s.id === sessionId);
    if (!session) return;
    
    console.log(`[SessionManager] Playing session: ${session.name}`);
    
    // Close the manager
    this.close();
    
    // Request main process to play the session
    if (window.electronAPI && window.electronAPI.playSession) {
      try {
        await window.electronAPI.playSession(session.path);
      } catch (error) {
        console.error('[SessionManager] Failed to play session:', error);
        alert(`Failed to play session: ${error.message}`);
      }
    } else {
      // For development
      alert(`Playing session: ${session.name}\n\nThis feature requires the Electron API.`);
    }
  }

  async deleteSession(sessionId) {
    const session = this.sessions.find(s => s.id === sessionId);
    if (!session) return;
    
    if (!confirm(`Delete session "${session.name}"?\n\nThis action cannot be undone.`)) {
      return;
    }
    
    console.log(`[SessionManager] Deleting session: ${session.name}`);
    
    if (window.electronAPI && window.electronAPI.deleteSession) {
      try {
        await window.electronAPI.deleteSession(session.path);
        
        // Remove from list and refresh
        this.sessions = this.sessions.filter(s => s.id !== sessionId);
        this.selectedSession = null;
        this.updateSessionList();
        
        // Update button states
        this.selectSession(null);
      } catch (error) {
        console.error('[SessionManager] Failed to delete session:', error);
        alert(`Failed to delete session: ${error.message}`);
      }
    } else {
      // For development
      this.sessions = this.sessions.filter(s => s.id !== sessionId);
      this.selectedSession = null;
      this.updateSessionList();
      this.selectSession(null);
    }
  }

  async exportSession(sessionId) {
    const session = this.sessions.find(s => s.id === sessionId);
    if (!session) return;
    
    console.log(`[SessionManager] Exporting session: ${session.name}`);
    
    if (window.electronAPI && window.electronAPI.exportSession) {
      try {
        const result = await window.electronAPI.exportSession(session.path);
        if (result.success) {
          alert(`Session exported to: ${result.path}`);
        }
      } catch (error) {
        console.error('[SessionManager] Failed to export session:', error);
        alert(`Failed to export session: ${error.message}`);
      }
    } else {
      // For development
      alert(`Exporting session: ${session.name}\n\nThis feature requires the Electron API.`);
    }
  }
}

// Initialize SessionManager when the module is loaded
new SessionManager();