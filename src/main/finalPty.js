/**
 * Final PTY implementation - Simple and working
 * Uses available system commands without complex PTY handling
 */

const { spawn } = require('child_process');
const { EventEmitter } = require('events');
const os = require('os');

class FinalPty extends EventEmitter {
  constructor(options = {}) {
    super();
    this.shell = options.shell || process.env.SHELL || '/bin/bash';
    this.cwd = options.cwd || process.env.HOME || os.homedir();
    this.env = options.env || process.env;
    this.cols = options.cols || 80;
    this.rows = options.rows || 30;
    this.process = null;
    this.isRunning = false;
    this.inputBuffer = '';
    this.bufferTimer = null;
  }

  spawn() {
    console.log('[FinalPty] Starting shell:', this.shell);
    
    const env = {
      ...this.env,
      TERM: 'xterm-256color',
      COLUMNS: this.cols.toString(),
      LINES: this.rows.toString(),
      // Disable command line editing that requires TTY
      TERM_PROGRAM: 'ZeamiTerm',
      NO_COLOR: '0',
      FORCE_COLOR: '1'
    };
    
    // Use a wrapper to handle PTY requirements
    const shellCommand = process.platform === 'darwin' 
      ? this.getDarwinCommand()
      : this.getLinuxCommand();
    
    console.log('[FinalPty] Shell command:', shellCommand);
    
    this.process = spawn('sh', ['-c', shellCommand], {
      cwd: this.cwd,
      env: env,
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    this.isRunning = true;
    this.setupHandlers();
    
    // Initialize the shell
    setTimeout(() => {
      if (this.isRunning) {
        // Send initial commands to set up the environment
        this.writeRaw('export PS1="$ "\n');
        this.writeRaw('clear\n');
      }
    }, 100);
    
    return this;
  }
  
  getDarwinCommand() {
    // On macOS, use script with specific flags
    return `exec script -q /dev/null ${this.shell} -i`;
  }
  
  getLinuxCommand() {
    // On Linux, use script with different syntax
    return `exec script -qefc "${this.shell} -i" /dev/null`;
  }
  
  setupHandlers() {
    if (!this.process) return;
    
    let buffer = '';
    let flushTimer = null;
    
    const processOutput = (data) => {
      const text = data.toString();
      buffer += text;
      
      // Clear any existing timer
      if (flushTimer) clearTimeout(flushTimer);
      
      // Flush after a short delay to batch output
      flushTimer = setTimeout(() => {
        if (buffer) {
          // Clean up the output
          let cleaned = buffer;
          
          // Remove script command artifacts
          cleaned = cleaned.replace(/^Script started[^\n]*\n/, '');
          cleaned = cleaned.replace(/\r\nScript done[^\n]*\n?$/, '');
          cleaned = cleaned.replace(/\rScript done[^\n]*\n?$/, '');
          
          // Handle backspaces
          while (cleaned.includes('\b')) {
            cleaned = cleaned.replace(/[^\b]\b/g, '');
            cleaned = cleaned.replace(/^\b/g, '');
          }
          
          this.emit('data', cleaned);
          buffer = '';
        }
      }, 10);
    };
    
    this.process.stdout.on('data', processOutput);
    this.process.stderr.on('data', processOutput);
    
    this.process.on('exit', (code, signal) => {
      console.log('[FinalPty] Process exited:', code, signal);
      if (flushTimer) clearTimeout(flushTimer);
      if (buffer) {
        this.emit('data', buffer);
      }
      this.isRunning = false;
      this.emit('exit', { code, signal });
    });
    
    this.process.on('error', (error) => {
      console.error('[FinalPty] Process error:', error);
      this.isRunning = false;
      this.emit('error', error);
    });
    
    // Handle stdin errors
    this.process.stdin.on('error', (err) => {
      if (err.code !== 'EPIPE') {
        console.error('[FinalPty] Stdin error:', err);
      }
    });
  }
  
  write(data) {
    if (!this.isRunning) return;
    
    // Buffer input to avoid overwhelming the process
    this.inputBuffer += data;
    
    // Clear existing timer
    if (this.bufferTimer) {
      clearTimeout(this.bufferTimer);
    }
    
    // For single characters, send with a small delay
    // For larger inputs (like paste), send immediately
    const delay = data.length === 1 ? 50 : 0;
    
    this.bufferTimer = setTimeout(() => {
      if (this.inputBuffer && this.isRunning) {
        this.writeRaw(this.inputBuffer);
        this.inputBuffer = '';
      }
    }, delay);
  }
  
  writeRaw(data) {
    if (this.process && this.process.stdin && !this.process.stdin.destroyed) {
      try {
        const written = this.process.stdin.write(data);
        if (!written) {
          // Handle backpressure
          this.process.stdin.once('drain', () => {
            console.log('[FinalPty] Stdin drained');
          });
        }
      } catch (error) {
        if (error.code !== 'EPIPE') {
          console.error('[FinalPty] Write error:', error);
        }
      }
    }
  }
  
  resize(cols, rows) {
    this.cols = cols;
    this.rows = rows;
    
    if (this.process && this.isRunning && process.platform !== 'win32') {
      try {
        // Send terminal resize sequence
        this.writeRaw(`\x1b[8;${rows};${cols}t`);
      } catch (error) {
        // Ignore
      }
    }
  }
  
  kill(signal = 'SIGTERM') {
    if (this.bufferTimer) {
      clearTimeout(this.bufferTimer);
    }
    
    if (this.process && this.isRunning) {
      try {
        this.process.kill(signal);
      } catch (error) {
        console.error('[FinalPty] Kill error:', error);
      }
      this.isRunning = false;
    }
  }
  
  get pid() {
    return this.process ? this.process.pid : -1;
  }
}

module.exports = { FinalPty };