/**
 * PTY Binding - Platform-specific terminal implementation
 * Inspired by VS Code's terminal implementation
 */

const { EventEmitter } = require('events');
const { spawn } = require('child_process');
const os = require('os');

class PtyBinding extends EventEmitter {
  constructor(options = {}) {
    super();
    this.shell = options.shell || this.getDefaultShell();
    this.args = options.args || [];
    this.cwd = options.cwd || process.env.HOME || os.homedir();
    this.env = options.env || process.env;
    this.cols = options.cols || 80;
    this.rows = options.rows || 30;
    this.process = null;
    this.isRunning = false;
  }

  getDefaultShell() {
    if (process.platform === 'win32') {
      // Windows: Try PowerShell first, then cmd
      return process.env.COMSPEC || 'powershell.exe';
    }
    // Unix-like: Use SHELL env var or default to bash
    return process.env.SHELL || '/bin/bash';
  }

  spawn() {
    const shellArgs = this.getShellArgs();
    
    // Set up environment with terminal info
    const env = {
      ...this.env,
      TERM: 'xterm-256color',
      COLORTERM: 'truecolor',
      TERM_PROGRAM: 'ZeamiTerm',
      TERM_PROGRAM_VERSION: '0.1.0',
      LINES: this.rows.toString(),
      COLUMNS: this.cols.toString()
    };

    // Spawn the shell process
    this.process = spawn(this.shell, [...shellArgs, ...this.args], {
      cwd: this.cwd,
      env,
      windowsHide: true
    });

    this.isRunning = true;
    this.setupHandlers();
    
    // Send initial setup
    if (process.platform !== 'win32') {
      // Don't send clear screen, let the shell show its natural prompt
    }

    return this;
  }

  getShellArgs() {
    if (process.platform === 'win32') {
      // Windows PowerShell/cmd args
      if (this.shell.includes('powershell')) {
        return ['-NoLogo', '-NoProfile'];
      }
      return [];
    }
    // Unix shell args - interactive login shell
    return ['-i', '-l'];
  }

  setupHandlers() {
    if (!this.process) return;

    // Handle stdout
    this.process.stdout.on('data', (data) => {
      const output = data.toString();
      console.log('PTY stdout:', JSON.stringify(output));
      this.emit('data', output);
    });

    // Handle stderr  
    this.process.stderr.on('data', (data) => {
      const output = data.toString();
      console.log('PTY stderr:', JSON.stringify(output));
      this.emit('data', output);
    });
    
    // Send a newline to trigger prompt
    setTimeout(() => {
      if (this.isRunning && this.process.stdin) {
        console.log('Sending initial newline to trigger prompt');
        this.process.stdin.write('\n');
      }
    }, 100);

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

    // Handle stdin close
    this.process.stdin.on('error', (error) => {
      console.error('Stdin error:', error);
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
    
    if (this.process && this.isRunning) {
      // Update environment
      process.env.LINES = rows.toString();
      process.env.COLUMNS = cols.toString();
      
      // Send SIGWINCH on Unix-like systems
      if (process.platform !== 'win32') {
        try {
          process.kill(this.process.pid, 'SIGWINCH');
        } catch (error) {
          // Ignore errors, process might have exited
        }
      }
      
      // Send resize escape sequence
      this.emit('data', `\x1b[8;${rows};${cols}t`);
    }
  }

  kill(signal = 'SIGTERM') {
    if (this.process && this.isRunning) {
      try {
        if (process.platform === 'win32') {
          // On Windows, use taskkill
          spawn('taskkill', ['/pid', this.process.pid.toString(), '/f', '/t']);
        } else {
          this.process.kill(signal);
        }
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

module.exports = { PtyBinding };