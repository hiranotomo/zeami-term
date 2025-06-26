/**
 * Script-based PTY implementation
 * Uses the 'script' command available on macOS/Linux to create a proper PTY
 */

const { spawn } = require('child_process');
const { EventEmitter } = require('events');
const os = require('os');
const fs = require('fs');
const path = require('path');

class ScriptPty extends EventEmitter {
  constructor(options = {}) {
    super();
    this.shell = options.shell || process.env.SHELL || '/bin/bash';
    this.cwd = options.cwd || process.env.HOME || os.homedir();
    this.env = options.env || process.env;
    this.cols = options.cols || 80;
    this.rows = options.rows || 30;
    this.process = null;
    this.isRunning = false;
    
    // Create a temporary file for script output
    this.tempFile = path.join(os.tmpdir(), `zeami-pty-${Date.now()}.txt`);
  }

  spawn() {
    // Platform-specific script command
    let scriptCmd, scriptArgs;
    
    if (process.platform === 'darwin') {
      // macOS - use unbuffer or fallback to direct shell
      // script command on macOS doesn't work well for interactive use
      this.useDirect = true;
      this.spawnDirect();
      return this;
    } else if (process.platform === 'linux') {
      // Linux
      scriptCmd = 'script';
      scriptArgs = ['-q', '-c', this.shell, '/dev/null'];
    } else {
      // Fallback to regular spawn for Windows
      this.spawnFallback();
      return this;
    }
    
    // Set up environment with terminal info
    const env = {
      ...this.env,
      TERM: 'xterm-256color',
      LINES: this.rows.toString(),
      COLUMNS: this.cols.toString(),
      // Disable command history for cleaner output
      HISTFILE: '/dev/null'
    };
    
    // Spawn script command
    this.process = spawn(scriptCmd, scriptArgs, {
      cwd: this.cwd,
      env,
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    this.isRunning = true;
    this.setupHandlers();
    
    // Send initial size info
    this.resize(this.cols, this.rows);
    
    return this;
  }
  
  spawnDirect() {
    // Direct shell spawn with PTY emulation via environment
    const args = ['-i'];
    
    // On macOS, we can use 'expect' to create a PTY
    if (process.platform === 'darwin') {
      const expectScript = `
set timeout -1
spawn ${this.shell} -i
interact
`;
      
      this.process = spawn('expect', ['-c', expectScript], {
        cwd: this.cwd,
        env: {
          ...this.env,
          TERM: 'xterm-256color',
          LINES: this.rows.toString(),
          COLUMNS: this.cols.toString()
        },
        stdio: ['pipe', 'pipe', 'pipe']
      });
    } else {
      // Fallback to direct shell
      this.process = spawn(this.shell, args, {
        cwd: this.cwd,
        env: {
          ...this.env,
          TERM: 'xterm-256color',
          LINES: this.rows.toString(),
          COLUMNS: this.cols.toString()
        }
      });
    }
    
    this.isRunning = true;
    this.setupHandlers();
    
    return this;
  }
  
  spawnFallback() {
    // Fallback for Windows or when script is not available
    const args = process.platform === 'win32' ? [] : ['-i'];
    
    this.process = spawn(this.shell, args, {
      cwd: this.cwd,
      env: {
        ...this.env,
        TERM: 'xterm-256color',
        LINES: this.rows.toString(),
        COLUMNS: this.cols.toString()
      }
    });
    
    this.isRunning = true;
    this.setupHandlers();
    
    return this;
  }
  
  setupHandlers() {
    if (!this.process) return;
    
    let buffer = '';
    
    // Handle stdout
    this.process.stdout.on('data', (data) => {
      const text = data.toString();
      
      // Filter out script command artifacts
      const filtered = text
        .replace(/\r\n/g, '\n')  // Normalize line endings
        .replace(/\x08/g, '');   // Remove backspaces
      
      // Buffer partial lines
      buffer += filtered;
      
      // Emit complete lines or after timeout
      if (buffer.includes('\n') || buffer.length > 1024) {
        this.emit('data', buffer);
        buffer = '';
      } else {
        // Emit partial output after a short delay
        clearTimeout(this.bufferTimeout);
        this.bufferTimeout = setTimeout(() => {
          if (buffer) {
            this.emit('data', buffer);
            buffer = '';
          }
        }, 50);
      }
    });
    
    // Handle stderr
    this.process.stderr.on('data', (data) => {
      // Script command may output some info to stderr, filter it
      const text = data.toString();
      if (!text.includes('Script started') && !text.includes('Script done')) {
        this.emit('data', text);
      }
    });
    
    // Handle process exit
    this.process.on('exit', (code, signal) => {
      this.isRunning = false;
      clearTimeout(this.bufferTimeout);
      
      // Clean up temp file
      try {
        if (fs.existsSync(this.tempFile)) {
          fs.unlinkSync(this.tempFile);
        }
      } catch (e) {
        // Ignore cleanup errors
      }
      
      this.emit('exit', { code, signal });
    });
    
    // Handle errors
    this.process.on('error', (error) => {
      this.isRunning = false;
      this.emit('error', error);
    });
  }
  
  write(data) {
    if (this.process && this.process.stdin && this.isRunning) {
      try {
        this.process.stdin.write(data);
      } catch (error) {
        console.error('Write error:', error);
        this.emit('error', error);
      }
    }
  }
  
  resize(cols, rows) {
    this.cols = cols;
    this.rows = rows;
    
    if (this.process && this.isRunning && process.platform !== 'win32') {
      // Send terminal size change signal
      try {
        process.kill(this.process.pid, 'SIGWINCH');
      } catch (error) {
        // Ignore errors
      }
      
      // Also try to set size using escape sequences
      this.write(`\x1b[8;${rows};${cols}t`);
    }
  }
  
  kill(signal = 'SIGTERM') {
    if (this.process && this.isRunning) {
      try {
        // Kill the entire process group
        if (process.platform === 'win32') {
          spawn('taskkill', ['/pid', this.process.pid.toString(), '/f', '/t']);
        } else {
          // Kill process group
          process.kill(-this.process.pid, signal);
        }
      } catch (error) {
        // Fallback to killing just the process
        try {
          this.process.kill(signal);
        } catch (e) {
          console.error('Kill error:', e);
        }
      }
      this.isRunning = false;
    }
  }
  
  get pid() {
    return this.process ? this.process.pid : -1;
  }
}

module.exports = { ScriptPty };