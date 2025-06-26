const { EventEmitter } = require('events');
const { SimplestPty } = require('./simplestPty');

/**
 * TerminalBackend - High-level terminal interface
 * Manages PTY binding and provides clean API for terminal operations
 */
class TerminalBackend extends EventEmitter {
  constructor(options = {}) {
    super();
    this.options = {
      shell: options.shell,
      args: options.args || [],
      cwd: options.cwd,
      env: options.env,
      cols: options.cols || 80,
      rows: options.rows || 30
    };
    this.pty = null;
    this.isReady = false;
  }

  spawn() {
    // Create PTY binding using SimplestPty
    this.pty = new SimplestPty(this.options);

    // Set up event forwarding
    this.pty.on('data', (data) => {
      this.emit('data', data);
    });

    this.pty.on('exit', (exitInfo) => {
      this.isReady = false;
      this.emit('exit', exitInfo);
    });

    this.pty.on('error', (error) => {
      this.emit('error', error);
    });

    // Start the terminal
    this.pty.spawn();
    this.isReady = true;

    return this;
  }

  write(data) {
    console.log('[BACKEND] write called with:', data);
    if (this.pty && this.isReady) {
      console.log('[BACKEND] PTY is ready, writing data');
      this.pty.write(data);
      console.log('[BACKEND] Data written to PTY');
    } else {
      console.log('[BACKEND] PTY not ready. pty:', !!this.pty, 'isReady:', this.isReady);
    }
  }

  resize(cols, rows) {
    if (this.pty) {
      this.pty.resize(cols, rows);
    }
  }

  kill() {
    if (this.pty) {
      this.pty.kill();
      this.pty = null;
      this.isReady = false;
    }
  }

  get pid() {
    return this.pty ? this.pty.pid : -1;
  }
}

module.exports = { TerminalBackend };