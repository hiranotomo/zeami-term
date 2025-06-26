// Simple Claude input mode for ZeamiTerm
// This provides a minimal input area that doesn't interfere with terminal operation

class ClaudeInput {
  constructor() {
    this.isVisible = false;
    this.container = null;
    this.textarea = null;
    this.onSendCallback = null;
  }

  initialize() {
    // Create container
    this.container = document.createElement('div');
    this.container.id = 'claude-input-container';
    this.container.style.cssText = `
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      background: #252526;
      border-top: 1px solid #464647;
      padding: 10px;
      display: none;
      z-index: 1000;
    `;

    // Create textarea
    this.textarea = document.createElement('textarea');
    this.textarea.id = 'claude-input';
    this.textarea.placeholder = 'Type a message for Claude... (Enter to send, Shift+Enter for new line)';
    this.textarea.style.cssText = `
      width: 100%;
      height: 80px;
      background: #1e1e1e;
      border: 1px solid #464647;
      color: #cccccc;
      padding: 8px;
      font-family: 'Consolas', 'Monaco', monospace;
      font-size: 13px;
      resize: none;
      outline: none;
    `;

    // Add to container
    this.container.appendChild(this.textarea);
    document.body.appendChild(this.container);

    // Setup event listeners
    this.setupEventListeners();
  }

  setupEventListeners() {
    // Keyboard shortcut to toggle
    document.addEventListener('keydown', (e) => {
      // Ctrl/Cmd + Shift + C to toggle Claude input
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'C') {
        e.preventDefault();
        this.toggle();
      }
    });

    // Handle textarea input
    this.textarea.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.send();
      }
      
      // Escape to hide
      if (e.key === 'Escape') {
        this.hide();
      }
    });
  }

  toggle() {
    if (this.isVisible) {
      this.hide();
    } else {
      this.show();
    }
  }

  show() {
    this.isVisible = true;
    this.container.style.display = 'block';
    this.textarea.focus();
    
    // Adjust terminal container height
    const terminalContainer = document.getElementById('terminal-container');
    if (terminalContainer) {
      terminalContainer.style.bottom = '120px';
    }
    
    // Resize terminals after adjustment
    if (window.terminalManager) {
      setTimeout(() => {
        window.terminalManager.resizeAllTerminals();
      }, 100);
    }
  }

  hide() {
    this.isVisible = false;
    this.container.style.display = 'none';
    
    // Reset terminal container height
    const terminalContainer = document.getElementById('terminal-container');
    if (terminalContainer) {
      terminalContainer.style.bottom = '0';
    }
    
    // Resize terminals after adjustment
    if (window.terminalManager) {
      setTimeout(() => {
        window.terminalManager.resizeAllTerminals();
      }, 100);
    }
    
    // Focus back to terminal
    if (window.terminalManager) {
      window.terminalManager.focusActiveTerminal();
    }
  }

  send() {
    const message = this.textarea.value.trim();
    if (!message) return;

    // Send to terminal
    if (this.onSendCallback) {
      this.onSendCallback(message);
    }

    // Clear and hide
    this.textarea.value = '';
    this.hide();
  }

  onSend(callback) {
    this.onSendCallback = callback;
  }
}

// Export
window.ClaudeInput = ClaudeInput;