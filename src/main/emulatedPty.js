/**
 * Emulated PTY - Works without real PTY support
 * Simulates PTY behavior for environments where true PTY is not available
 */

const { spawn } = require('child_process');
const { EventEmitter } = require('events');
const os = require('os');
const readline = require('readline');

class EmulatedPty extends EventEmitter {
  constructor(options = {}) {
    super();
    this.shell = options.shell || process.env.SHELL || '/bin/bash';
    this.cwd = options.cwd || process.env.HOME || os.homedir();
    this.env = options.env || process.env;
    this.cols = options.cols || 80;
    this.rows = options.rows || 30;
    this.process = null;
    this.isRunning = false;
    this.currentLine = '';
    this.history = [];
  }

  spawn() {
    console.log('[EmulatedPty] Starting emulated terminal with shell:', this.shell);
    
    const env = {
      ...this.env,
      TERM: 'dumb', // Use dumb terminal to avoid escape sequences
      COLUMNS: this.cols.toString(),
      LINES: this.rows.toString(),
      // Disable fancy prompts and colors
      PS1: '$ ',
      PS2: '> ',
      NO_COLOR: '1',
      TERM_PROGRAM: 'ZeamiTerm'
    };
    
    // Start the shell in non-interactive mode but with command execution
    this.process = spawn(this.shell, ['-s'], {
      cwd: this.cwd,
      env: env,
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    this.isRunning = true;
    this.setupHandlers();
    
    // Initialize with a prompt
    setTimeout(() => {
      this.emit('data', `ZeamiTerm - Connected to ${this.shell}\r\n`);
      this.emit('data', '$ ');
    }, 100);
    
    return this;
  }
  
  setupHandlers() {
    if (!this.process) return;
    
    // Create readline interface for stdout
    const rlOut = readline.createInterface({
      input: this.process.stdout,
      crlfDelay: Infinity
    });
    
    rlOut.on('line', (line) => {
      this.emit('data', line + '\r\n');
      // Don't emit prompt here - wait for command completion
    });
    
    // Create readline interface for stderr
    const rlErr = readline.createInterface({
      input: this.process.stderr,
      crlfDelay: Infinity
    });
    
    rlErr.on('line', (line) => {
      this.emit('data', line + '\r\n');
    });
    
    // Handle raw data for prompt detection
    let outputBuffer = '';
    let promptTimer = null;
    
    this.process.stdout.on('data', (data) => {
      outputBuffer += data.toString();
      
      // Clear existing timer
      if (promptTimer) clearTimeout(promptTimer);
      
      // If no more data comes in 50ms, assume command is complete
      promptTimer = setTimeout(() => {
        if (outputBuffer.trim()) {
          // Command produced output, show a new prompt
          this.emit('data', '$ ');
        }
        outputBuffer = '';
      }, 50);
    });
    
    this.process.on('exit', (code, signal) => {
      console.log('[EmulatedPty] Process exited:', code, signal);
      this.isRunning = false;
      this.emit('data', `\r\nProcess exited with code ${code}\r\n`);
      this.emit('exit', { code, signal });
    });
    
    this.process.on('error', (error) => {
      console.error('[EmulatedPty] Process error:', error);
      this.isRunning = false;
      this.emit('data', `\r\nError: ${error.message}\r\n`);
      this.emit('error', error);
    });
    
    // Prevent EPIPE errors
    this.process.stdin.on('error', () => {});
  }
  
  write(data) {
    if (!this.process || !this.isRunning || !this.process.stdin) {
      return;
    }
    
    // Handle character by character for line editing
    for (const char of data) {
      if (char === '\r' || char === '\n') {
        // Execute command
        if (this.currentLine.trim()) {
          // Don't echo here - the shell will echo
          this.emit('data', '\r\n');
          
          // Send to shell
          try {
            this.process.stdin.write(this.currentLine + '\n');
            this.history.push(this.currentLine);
          } catch (error) {
            console.error('[EmulatedPty] Write error:', error);
          }
        } else {
          // Empty line, just show new prompt
          this.emit('data', '\r\n$ ');
        }
        this.currentLine = '';
      } else if (char === '\b' || char === '\x7f') {
        // Backspace
        if (this.currentLine.length > 0) {
          this.currentLine = this.currentLine.slice(0, -1);
          // Don't emit backspace visually - already handled by renderer
        }
      } else if (char >= ' ' && char <= '~') {
        // Printable character
        this.currentLine += char;
        // Don't echo here - already displayed by renderer
      }
    }
  }
  
  resize(cols, rows) {
    this.cols = cols;
    this.rows = rows;
    // Emulated PTY doesn't support real resize
  }
  
  kill(signal = 'SIGTERM') {
    if (this.process && this.isRunning) {
      try {
        this.process.kill(signal);
      } catch (error) {
        console.error('[EmulatedPty] Kill error:', error);
      }
      this.isRunning = false;
    }
  }
  
  get pid() {
    return this.process ? this.process.pid : -1;
  }
}

module.exports = { EmulatedPty };