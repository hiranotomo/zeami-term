/**
 * Node-pty based PTY implementation
 * Proper pseudo-terminal support with native bindings
 */

const { EventEmitter } = require('events');
const os = require('os');

class NodePty extends EventEmitter {
  constructor(options = {}) {
    super();
    this.shell = options.shell || process.env.SHELL || '/bin/bash';
    this.cwd = options.cwd || process.env.HOME || os.homedir();
    this.env = options.env || process.env;
    this.cols = options.cols || 80;
    this.rows = options.rows || 30;
    this.ptyProcess = null;
    this.isRunning = false;
  }

  spawn() {
    console.log('[NodePTY] Spawning terminal with node-pty');
    
    try {
      // Try to load node-pty
      const pty = require('node-pty');
      
      const env = {
        ...this.env,
        TERM: 'xterm-256color',
        COLORTERM: 'truecolor'
      };
      
      // Spawn the PTY
      this.ptyProcess = pty.spawn(this.shell, [], {
        name: 'xterm-256color',
        cols: this.cols,
        rows: this.rows,
        cwd: this.cwd,
        env
      });
      
      console.log('[NodePTY] PTY spawned with PID:', this.ptyProcess.pid);
      this.isRunning = true;
      
      // Handle data with error protection
      this.ptyProcess.onData((data) => {
        try {
          console.log('[NodePTY] Data received:', data.length, 'bytes');
          // Use setImmediate to prevent blocking
          setImmediate(() => {
            this.emit('data', data);
          });
        } catch (error) {
          console.error('[NodePTY] Error handling data:', error);
        }
      });
      
      // Handle exit
      this.ptyProcess.onExit(({ exitCode, signal }) => {
        console.log('[NodePTY] Process exited:', exitCode, signal);
        this.isRunning = false;
        this.emit('exit', { code: exitCode, signal });
      });
      
    } catch (error) {
      console.error('[NodePTY] Failed to load node-pty:', error);
      // Fall back to UnbufferPty
      const { UnbufferPty } = require('./unbufferPty');
      const fallback = new UnbufferPty(this.options);
      
      // Forward all events
      fallback.on('data', (data) => this.emit('data', data));
      fallback.on('exit', (exitInfo) => {
        this.isRunning = false;
        this.emit('exit', exitInfo);
      });
      fallback.on('error', (error) => this.emit('error', error));
      
      fallback.spawn();
      this.ptyProcess = fallback;
      this.isRunning = true;
    }
    
    return this;
  }
  
  write(data) {
    console.log('[NodePTY] write called with:', JSON.stringify(data));
    if (this.ptyProcess && this.isRunning) {
      try {
        if (this.ptyProcess.write) {
          console.log('[NodePTY] Writing to PTY');
          // Use setImmediate to prevent blocking
          setImmediate(() => {
            try {
              this.ptyProcess.write(data);
              console.log('[NodePTY] Write completed');
            } catch (writeError) {
              console.error('[NodePTY] Write failed:', writeError);
            }
          });
        } else {
          console.error('[NodePTY] PTY process has no write method');
        }
      } catch (error) {
        console.error('[NodePTY] Write error:', error);
        this.emit('error', error);
      }
    } else {
      console.log('[NodePTY] Cannot write - ptyProcess:', !!this.ptyProcess, 'isRunning:', this.isRunning);
    }
  }
  
  resize(cols, rows) {
    this.cols = cols;
    this.rows = rows;
    
    if (this.ptyProcess && this.isRunning && this.ptyProcess.resize) {
      try {
        console.log('[NodePTY] Resizing to:', cols, 'x', rows);
        this.ptyProcess.resize(cols, rows);
      } catch (error) {
        console.error('[NodePTY] Resize error:', error);
      }
    }
  }
  
  kill(signal = 'SIGTERM') {
    if (this.ptyProcess && this.isRunning) {
      try {
        console.log('[NodePTY] Killing process with signal:', signal);
        if (this.ptyProcess.kill) {
          this.ptyProcess.kill(signal);
        } else if (this.ptyProcess.process) {
          this.ptyProcess.process.kill(signal);
        }
      } catch (error) {
        console.error('[NodePTY] Kill error:', error);
      }
      this.isRunning = false;
    }
  }
  
  get pid() {
    if (this.ptyProcess) {
      return this.ptyProcess.pid || this.ptyProcess.process?.pid || -1;
    }
    return -1;
  }
}

module.exports = { NodePty };