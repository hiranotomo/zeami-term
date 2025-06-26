/**
 * Unbuffer-based PTY implementation for macOS
 * Simple and reliable PTY using unbuffer command
 */

const { spawn } = require('child_process');
const { EventEmitter } = require('events');
const os = require('os');
const { exec } = require('child_process');

class UnbufferPty extends EventEmitter {
  constructor(options = {}) {
    super();
    this.shell = options.shell || process.env.SHELL || '/bin/bash';
    this.cwd = options.cwd || process.env.HOME || os.homedir();
    this.env = options.env || process.env;
    this.cols = options.cols || 80;
    this.rows = options.rows || 30;
    this.process = null;
    this.isRunning = false;
  }

  spawn() {
    // Try direct spawn first to avoid expect issues
    console.log('[PTY] Spawning terminal');
    this.spawnDirect();
    return this;
  }
  
  spawnWithUnbuffer() {
    console.log('Using unbuffer for PTY');
    
    const env = {
      ...this.env,
      TERM: 'xterm-256color',
      LINES: this.rows.toString(),
      COLUMNS: this.cols.toString()
    };
    
    this.process = spawn('unbuffer', [this.shell, '-i'], {
      cwd: this.cwd,
      env,
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    this.isRunning = true;
    this.setupHandlers();
  }
  
  spawnWithExpect() {
    console.log('[PTY] Using expect for PTY');
    
    const env = {
      ...this.env,
      TERM: 'xterm-256color',
      LINES: this.rows.toString(),
      COLUMNS: this.cols.toString()
    };
    
    // Use script command on macOS to get a proper PTY
    if (process.platform === 'darwin') {
      console.log('[PTY] Using script command for macOS');
      this.process = spawn('script', ['-q', '/dev/null', this.shell], {
        cwd: this.cwd,
        env,
        stdio: ['pipe', 'pipe', 'pipe']
      });
    } else {
      // Fallback to direct spawn
      this.spawnDirect();
      return;
    }
    
    console.log('[PTY] Process spawned with PID:', this.process.pid);
    this.isRunning = true;
    this.setupHandlers();
  }
  
  spawnDirect() {
    console.log('Using direct shell spawn (no PTY)');
    
    const env = {
      ...this.env,
      TERM: 'xterm-256color',
      LINES: this.rows.toString(),
      COLUMNS: this.cols.toString(),
      // Force color output even without TTY
      FORCE_COLOR: '1',
      CLICOLOR_FORCE: '1'
    };
    
    // Use shell with forced interactive mode
    const args = ['-i'];
    if (this.shell.includes('zsh')) {
      args.push('--no-globalrcs'); // Skip global RC files that might check for TTY
    }
    
    this.process = spawn(this.shell, args, {
      cwd: this.cwd,
      env,
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    this.isRunning = true;
    this.setupHandlers();
    
    // Force a prompt by sending a newline after a short delay
    setTimeout(() => {
      if (this.isRunning && this.process.stdin) {
        this.process.stdin.write('\n');
      }
    }, 100);
  }
  
  setupHandlers() {
    if (!this.process) return;
    
    // Handle stdout
    this.process.stdout.on('data', (data) => {
      console.log('[PTY] stdout data received:', data.length, 'bytes');
      this.emit('data', data.toString());
    });
    
    // Handle stderr
    this.process.stderr.on('data', (data) => {
      this.emit('data', data.toString());
    });
    
    // Handle process exit
    this.process.on('exit', (code, signal) => {
      this.isRunning = false;
      this.emit('exit', { code, signal });
    });
    
    // Handle errors
    this.process.on('error', (error) => {
      this.isRunning = false;
      this.emit('error', error);
    });
    
    // Handle stdin errors
    this.process.stdin.on('error', (error) => {
      console.error('Stdin error:', error);
    });
  }
  
  write(data) {
    console.log('[PTY] write called with:', JSON.stringify(data), 'length:', data.length);
    if (this.process && this.process.stdin && this.isRunning) {
      try {
        console.log('[PTY] Writing to stdin');
        const result = this.process.stdin.write(data);
        console.log('[PTY] stdin.write returned:', result);
      } catch (error) {
        console.error('[PTY] Write error:', error);
        this.emit('error', error);
      }
    } else {
      console.log('[PTY] Cannot write - process:', !!this.process, 'stdin:', !!(this.process && this.process.stdin), 'isRunning:', this.isRunning);
    }
  }
  
  resize(cols, rows) {
    this.cols = cols;
    this.rows = rows;
    
    if (this.process && this.isRunning && process.platform !== 'win32') {
      try {
        // Send SIGWINCH signal
        process.kill(this.process.pid, 'SIGWINCH');
      } catch (error) {
        // Ignore errors
      }
    }
  }
  
  kill(signal = 'SIGTERM') {
    if (this.process && this.isRunning) {
      try {
        this.process.kill(signal);
      } catch (error) {
        console.error('Kill error:', error);
      }
      this.isRunning = false;
    }
  }
  
  get pid() {
    return this.process ? this.process.pid : -1;
  }
}

module.exports = { UnbufferPty };