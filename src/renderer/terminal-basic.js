// Basic terminal implementation without external dependencies
class BasicTerminal {
  constructor(container) {
    this.container = container;
    this.lines = [];
    this.currentLine = '';
    this.cursorPosition = 0;
    this.sessionId = null;
    this.isComposing = false;
    this.lastOutputLine = null;
    this.inputBuffer = '';
    this.inputTimer = null;
    
    this.setupUI();
    this.setupEventHandlers();
  }
  
  setupUI() {
    this.container.innerHTML = `
      <div class="terminal-basic disconnected">
        <div class="terminal-output" id="terminal-output"></div>
        <div class="terminal-input-line">
          <span class="terminal-prompt">$ </span>
          <span class="terminal-input" id="terminal-input"></span>
          <span class="terminal-cursor" id="terminal-cursor">█</span>
        </div>
      </div>
    `;
    
    this.terminalElement = this.container.querySelector('.terminal-basic');
    
    // Add styles
    const style = document.createElement('style');
    style.textContent = `
      .terminal-basic {
        height: 100%;
        background: #1e1e1e;
        color: #cccccc;
        font-family: 'Menlo', 'Monaco', 'Courier New', monospace;
        font-size: 14px;
        padding: 10px;
        overflow-y: auto;
        cursor: text;
      }
      
      .terminal-output {
        white-space: pre-wrap;
        word-wrap: break-word;
        margin-bottom: 5px;
      }
      
      .terminal-output .line {
        min-height: 1.2em;
        line-height: 1.4;
      }
      
      .terminal-output .prompt-line {
        color: #4a9eff;
        font-weight: 500;
      }
      
      .terminal-input-line {
        display: flex;
        align-items: center;
      }
      
      .terminal-prompt {
        color: #0dbc79;
        margin-right: 5px;
      }
      
      .terminal-input {
        flex: 1;
        outline: none;
      }
      
      .terminal-cursor {
        animation: blink 1s infinite;
        color: #ffffff;
        margin-left: 2px;
      }
      
      @keyframes blink {
        0%, 50% { opacity: 1; }
        51%, 100% { opacity: 0; }
      }
      
      .error { color: #cd3131; }
      .success { color: #0dbc79; }
      .info { color: #2472c8; }
      .warning { color: #e5e510; }
    `;
    document.head.appendChild(style);
    
    this.outputElement = document.getElementById('terminal-output');
    this.inputElement = document.getElementById('terminal-input');
    this.cursorElement = document.getElementById('terminal-cursor');
  }
  
  setupEventHandlers() {
    // Click to focus
    this.container.addEventListener('click', () => {
      console.log('Terminal clicked, focusing...');
      this.focus();
    });
    
    // Make container focusable
    this.container.setAttribute('tabindex', '0');
    
    // Handle composition events for IME (Japanese input)
    document.addEventListener('compositionstart', () => {
      this.isComposing = true;
      console.log('Composition started');
    });
    
    document.addEventListener('compositionend', (e) => {
      this.isComposing = false;
      console.log('Composition ended:', e.data);
      if (e.data && this.sessionId && window.zeamiAPI) {
        window.zeamiAPI.sendInput(this.sessionId, e.data);
      }
    });
    
    // Keyboard input
    document.addEventListener('keydown', (e) => {
      console.log('Key pressed:', e.key, 'Active element:', document.activeElement);
      
      // Accept input when terminal is focused or body is active
      if (!this.container.contains(document.activeElement) && 
          document.activeElement !== document.body &&
          document.activeElement !== this.container) {
        console.log('Ignoring key - terminal not focused');
        return;
      }
      
      if (e.key === 'Enter') {
        console.log('Enter pressed');
        e.preventDefault();
        this.handleEnter();
      } else if (e.key === 'Backspace') {
        console.log('Backspace pressed');
        e.preventDefault();
        this.handleBackspace();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        this.moveCursor(-1);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        this.moveCursor(1);
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault();
        // TODO: Command history
      } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !this.isComposing) {
        console.log('Character pressed:', e.key);
        e.preventDefault();
        this.handleChar(e.key);
      }
    });
  }
  
  focus() {
    // Visual focus indicator
    this.container.focus();
    console.log('Terminal focused');
  }
  
  handleChar(char) {
    console.log('[RENDERER] handleChar called with:', char, 'at', new Date().toISOString());
    this.currentLine = 
      this.currentLine.slice(0, this.cursorPosition) + 
      char + 
      this.currentLine.slice(this.cursorPosition);
    this.cursorPosition++;
    this.updateInput();
    
    // Don't send individual chars - buffer until Enter
  }
  
  handleBackspace() {
    if (this.cursorPosition > 0) {
      this.currentLine = 
        this.currentLine.slice(0, this.cursorPosition - 1) + 
        this.currentLine.slice(this.cursorPosition);
      this.cursorPosition--;
      this.updateInput();
      
      // Don't send backspace to backend
    }
  }
  
  handleEnter() {
    const command = this.currentLine.trim();
    
    // Send to backend
    if (this.sessionId && window.zeamiAPI) {
      // Echo the command locally
      this.addLine('$ ' + this.currentLine);
      
      // Send to shell
      window.zeamiAPI.sendInput(this.sessionId, this.currentLine + '\n');
      
      // Clear input
      this.currentLine = '';
      this.cursorPosition = 0;
      this.updateInput();
    } else {
      // Local echo for testing when not connected
      this.addLine('$ ' + this.currentLine);
      this.handleLocalCommand(command);
      this.currentLine = '';
      this.cursorPosition = 0;
      this.updateInput();
    }
  }
  
  handleLocalCommand(command) {
    // Simple local commands for testing
    if (command === 'help') {
      this.addLine('Available commands:', 'info');
      this.addLine('  help     - Show this help message');
      this.addLine('  clear    - Clear the terminal');
      this.addLine('  version  - Show version information');
      this.addLine('  connect  - Connect to terminal backend');
    } else if (command === 'clear') {
      this.clear();
    } else if (command === 'version') {
      this.addLine('ZeamiTerm v0.1.0', 'success');
      this.addLine('Enhanced terminal for Claude Code');
    } else if (command === 'connect') {
      this.connect();
    } else if (command) {
      this.addLine(`Command not found: ${command}`, 'error');
    }
  }
  
  moveCursor(direction) {
    const newPosition = this.cursorPosition + direction;
    if (newPosition >= 0 && newPosition <= this.currentLine.length) {
      this.cursorPosition = newPosition;
      this.updateInput();
    }
  }
  
  updateInput() {
    this.inputElement.textContent = this.currentLine;
    // Position cursor
    const beforeCursor = this.currentLine.slice(0, this.cursorPosition);
    const afterCursor = this.currentLine.slice(this.cursorPosition);
    this.inputElement.innerHTML = 
      beforeCursor + 
      '<span id="terminal-cursor">█</span>' + 
      afterCursor;
  }
  
  addLine(text, className = '') {
    const line = document.createElement('div');
    line.className = 'line ' + className;
    line.textContent = text;
    this.outputElement.appendChild(line);
    this.scrollToBottom();
  }
  
  write(text) {
    // Process the output more intelligently
    let processed = text;
    
    // Handle backspace characters
    while (processed.includes('\b')) {
      processed = processed.replace(/.\x08/g, ''); // Character followed by backspace
    }
    
    // Split by newlines but preserve carriage returns for proper handling
    const parts = processed.split(/\n/);
    
    parts.forEach((part, index) => {
      if (part.includes('\r')) {
        // Carriage return - might be updating the same line
        const subparts = part.split('\r');
        subparts.forEach((subpart, subindex) => {
          if (subindex === 0) {
            // First part - append to current output
            this.processOutput(subpart, index === parts.length - 1);
          } else {
            // After CR - overwrite current line
            if (this.lastOutputLine) {
              this.lastOutputLine.textContent = this.stripAnsi(subpart);
            } else {
              this.processOutput(subpart, index === parts.length - 1);
            }
          }
        });
      } else {
        // Normal text
        this.processOutput(part, index === parts.length - 1 && !part.endsWith('\n'));
      }
    });
  }
  
  processOutput(text, isPartial) {
    const cleaned = this.stripAnsi(text);
    
    if (!isPartial && cleaned) {
      // Complete line
      this.addLine(cleaned);
      this.lastOutputLine = null;
    } else if (cleaned) {
      // Partial line - might be a prompt
      // Check if it looks like a prompt
      const isPrompt = cleaned.match(/[$#>]\s*$/) || cleaned.includes('% ');
      
      if (isPrompt) {
        // Create a new line for the prompt
        const line = document.createElement('div');
        line.className = 'line prompt-line';
        line.textContent = cleaned;
        this.outputElement.appendChild(line);
        this.lastOutputLine = line;
        this.scrollToBottom();
      } else if (this.lastOutputLine) {
        this.lastOutputLine.textContent += cleaned;
      } else {
        const line = document.createElement('div');
        line.className = 'line';
        line.textContent = cleaned;
        this.outputElement.appendChild(line);
        this.lastOutputLine = line;
        this.scrollToBottom();
      }
    }
  }
  
  stripAnsi(text) {
    return text
      .replace(/\x1b\[[0-9;]*m/g, '')     // Color codes
      .replace(/\x1b\[[0-9;]*[HJKDABC]/g, '') // Cursor movement
      .replace(/\x1b\[\?[0-9;]*[hl]/g, '') // Mode changes
      .replace(/\x1b\[[0-9;]*n/g, '')     // Device status
      .replace(/\x1b\[=[0-9;]*[hl]/g, '') // Screen modes
      .replace(/\x1b\[[0-9;]*[X]/g, '')   // Erase characters
      .replace(/\x07/g, '');              // Bell
  }
  
  clear() {
    this.outputElement.innerHTML = '';
    this.lines = [];
  }
  
  scrollToBottom() {
    this.container.scrollTop = this.container.scrollHeight;
  }
  
  async connect() {
    if (window.zeamiAPI) {
      this.addLine('Connecting to terminal backend...', 'info');
      try {
        const result = await window.zeamiAPI.startSession({});
        if (result.success) {
          this.sessionId = result.sessionId;
          this.addLine('Connected! Session: ' + result.sessionId, 'success');
          
          // Show current directory
          this.addLine('Working directory: ' + (result.cwd || 'unknown'));
          
          // Keep input line visible
          this.currentLine = '';
          this.cursorPosition = 0;
          this.updateInput();
          
          // Setup IPC listeners
          window.zeamiAPI.onTerminalData((data) => {
            console.log('[RENDERER] Received terminal data:', data.data.length, 'bytes');
            if (data.sessionId === this.sessionId) {
              this.write(data.data);
            }
          });
        } else {
          this.addLine('Connection failed: ' + result.error, 'error');
        }
      } catch (error) {
        this.addLine('Connection error: ' + error.message, 'error');
      }
    } else {
      this.addLine('Terminal API not available', 'error');
    }
  }
}

// Initialize terminal when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('terminal');
  if (container) {
    const terminal = new BasicTerminal(container);
    
    // Welcome message
    terminal.addLine('ZeamiTerm - Enhanced Terminal for Claude Code', 'success');
    terminal.addLine('Type "help" for available commands');
    terminal.addLine('');
    
    // Auto-connect if API is available
    if (window.zeamiAPI) {
      setTimeout(() => terminal.connect(), 500);
    }
    
    // Focus terminal
    terminal.focus();
    
    // Make terminal globally accessible for debugging
    window.terminal = terminal;
  }
});