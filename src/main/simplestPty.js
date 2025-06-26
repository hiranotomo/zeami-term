/**
 * Simplest working PTY implementation
 * Focus on getting basic functionality working
 */

const { spawn } = require('child_process');
const { EventEmitter } = require('events');
const os = require('os');

class SimplestPty extends EventEmitter {
  constructor(options = {}) {
    super();
    this.shell = options.shell || process.env.SHELL || '/bin/bash';
    this.cwd = options.cwd || process.env.HOME || os.homedir();
    this.env = options.env || process.env;
    this.process = null;
    this.isRunning = false;
  }

  spawn() {
    console.log('[SimplestPty] Starting shell:', this.shell);
    
    // Simple environment
    const env = {
      ...this.env,
      TERM: 'dumb',
      PS1: '\\w $ '  // Show current directory in prompt
    };
    
    // Start shell process
    this.process = spawn(this.shell, [], {
      cwd: this.cwd,
      env: env,
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    this.isRunning = true;
    
    // Handle output
    this.process.stdout.on('data', (data) => {
      this.emit('data', data.toString());
    });
    
    this.process.stderr.on('data', (data) => {
      this.emit('data', data.toString());
    });
    
    // Handle exit
    this.process.on('exit', (code, signal) => {
      console.log('[SimplestPty] Process exited:', code, signal);
      this.isRunning = false;
      this.emit('exit', { code, signal });
    });
    
    // Handle errors
    this.process.on('error', (error) => {
      console.error('[SimplestPty] Error:', error);
      this.isRunning = false;
      this.emit('error', error);
    });
    
    // Send initial commands to set up
    setTimeout(() => {
      if (this.isRunning) {
        // Force a simple prompt
        this.process.stdin.write('export PS1="\\w $ "\n');
        this.process.stdin.write('clear\n');
      }
    }, 100);
    
    return this;
  }
  
  write(data) {
    if (this.process && this.process.stdin && this.isRunning) {
      try {
        this.process.stdin.write(data);
      } catch (error) {
        console.error('[SimplestPty] Write error:', error);
      }
    }
  }
  
  resize(cols, rows) {
    // Not implemented for simple PTY
  }
  
  kill(signal = 'SIGTERM') {
    if (this.process && this.isRunning) {
      try {
        this.process.kill(signal);
      } catch (error) {
        console.error('[SimplestPty] Kill error:', error);
      }
      this.isRunning = false;
    }
  }
  
  get pid() {
    return this.process ? this.process.pid : -1;
  }
}

module.exports = { SimplestPty };