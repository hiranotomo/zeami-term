// Message Input Manager - Handles the hybrid input system
class MessageInputManager {
  constructor() {
    this.currentMode = 'terminal'; // 'terminal' or 'claude'
    this.messageInput = null;
    this.inputArea = null;
    this.modeIndicator = null;
    this.inputWrapper = null;
    this.sendButton = null;
    this.snippetButton = null;
    this.modeSwitchButton = null;
    this.onSendCallback = null;
    this.commandHistory = [];
    this.historyIndex = -1;
  }

  initialize() {
    // Get DOM elements
    this.inputArea = document.getElementById('message-input-area');
    this.messageInput = document.getElementById('message-input');
    this.modeIndicator = this.inputArea.querySelector('.input-mode-indicator');
    this.inputWrapper = this.inputArea.querySelector('.message-input-wrapper');
    this.sendButton = document.getElementById('send-btn');
    this.snippetButton = document.getElementById('snippet-btn');
    this.modeSwitchButton = document.getElementById('mode-switch-btn');

    // Set up event listeners
    this.setupEventListeners();

    // Initialize in terminal mode
    this.setMode('terminal');
  }

  setupEventListeners() {
    // Mode switch button
    this.modeSwitchButton.addEventListener('click', () => {
      this.toggleMode();
    });

    // Send button
    this.sendButton.addEventListener('click', () => {
      this.sendMessage();
    });

    // Message input keyboard events
    this.messageInput.addEventListener('keydown', (e) => {
      this.handleInputKeydown(e);
    });

    // Snippet button
    this.snippetButton.addEventListener('click', () => {
      this.showSnippetMenu();
    });

    // Global keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      // Ctrl/Cmd + M to toggle mode
      if ((e.ctrlKey || e.metaKey) && e.key === 'm') {
        e.preventDefault();
        this.toggleMode();
      }
      
      // Ctrl/Cmd + L to focus input in Claude mode
      if ((e.ctrlKey || e.metaKey) && e.key === 'l' && this.currentMode === 'claude') {
        e.preventDefault();
        this.focusInput();
      }
    });
  }

  handleInputKeydown(e) {
    // Enter to send (without Shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      this.sendMessage();
    }
    
    // Up/Down for history navigation (only for single line)
    if (!this.messageInput.value.includes('\n')) {
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        this.navigateHistory(-1);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        this.navigateHistory(1);
      }
    }
    
    // Escape to blur
    if (e.key === 'Escape') {
      this.messageInput.blur();
    }
  }

  setMode(mode) {
    this.currentMode = mode;
    
    if (mode === 'terminal') {
      // Terminal mode - minimize input area
      this.inputArea.classList.remove('expanded', 'claude-mode');
      this.inputArea.classList.add('minimized', 'terminal-mode');
      this.inputWrapper.style.display = 'none';
      
      // Update indicator
      this.modeIndicator.querySelector('.mode-icon').textContent = '💻';
      this.modeIndicator.querySelector('.mode-label span:last-child').textContent = 
        'Terminal Mode - Direct input enabled';
      this.modeSwitchButton.textContent = 'Switch to Claude Mode (Ctrl+M)';
      
      // Enable terminal input with a small delay to ensure DOM is ready
      requestAnimationFrame(() => {
        if (window.terminalManager) {
          window.terminalManager.enableDirectInput(true);
        }
      });
    } else {
      // Claude mode - expand input area
      this.inputArea.classList.remove('minimized', 'terminal-mode');
      this.inputArea.classList.add('expanded', 'claude-mode');
      this.inputWrapper.style.display = 'flex';
      
      // Update indicator
      this.modeIndicator.querySelector('.mode-icon').textContent = '💬';
      this.modeIndicator.querySelector('.mode-label span:last-child').textContent = 
        'Claude Mode - Multi-line input enabled';
      this.modeSwitchButton.textContent = 'Switch to Terminal Mode (Ctrl+M)';
      
      // Disable terminal input and focus message input
      if (window.terminalManager) {
        window.terminalManager.enableDirectInput(false);
      }
      requestAnimationFrame(() => this.focusInput());
    }
  }

  toggleMode() {
    this.setMode(this.currentMode === 'terminal' ? 'claude' : 'terminal');
  }

  focusInput() {
    if (this.currentMode === 'claude') {
      this.messageInput.focus();
    }
  }

  sendMessage() {
    const message = this.messageInput.value.trim();
    if (!message) return;

    // Add to history
    this.commandHistory.push(message);
    this.historyIndex = this.commandHistory.length;

    // Send via callback
    if (this.onSendCallback) {
      this.onSendCallback(message, this.currentMode);
    }

    // Clear input
    this.messageInput.value = '';
    
    // Auto-switch to terminal mode for commands
    if (message.startsWith('/') || message.startsWith('$')) {
      this.setMode('terminal');
    }
  }

  navigateHistory(direction) {
    const newIndex = this.historyIndex + direction;
    
    if (newIndex >= 0 && newIndex < this.commandHistory.length) {
      this.historyIndex = newIndex;
      this.messageInput.value = this.commandHistory[newIndex];
    } else if (newIndex >= this.commandHistory.length) {
      this.historyIndex = this.commandHistory.length;
      this.messageInput.value = '';
    }
  }

  showSnippetMenu() {
    // TODO: Implement snippet menu
    const snippets = [
      { label: 'Code Block', value: '```\n\n```' },
      { label: 'Fix Error', value: '@claude Please fix the last error' },
      { label: 'Explain', value: '@claude Can you explain what this does?' },
      { label: 'Current Dir', value: 'pwd' },
      { label: 'List Files', value: 'ls -la' }
    ];

    // For now, just insert a code block
    const cursorPos = this.messageInput.selectionStart;
    const text = this.messageInput.value;
    const snippet = '```\n\n```';
    
    this.messageInput.value = text.slice(0, cursorPos) + snippet + text.slice(cursorPos);
    this.messageInput.selectionStart = cursorPos + 4;
    this.messageInput.selectionEnd = cursorPos + 4;
    this.messageInput.focus();
  }

  onSend(callback) {
    this.onSendCallback = callback;
  }

  // Smart mode detection based on input
  detectSmartMode(input) {
    // Auto-switch to Claude mode for certain patterns
    if (input.startsWith('@claude') || input.startsWith('?')) {
      this.setMode('claude');
      return true;
    }
    return false;
  }
}

// Export for use in main renderer
window.MessageInputManager = MessageInputManager;