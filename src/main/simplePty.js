/**
 * Simple PTY implementation using Unix commands
 * Avoids complex expect scripts that can freeze
 */

const { spawn } = require('child_process');
const { EventEmitter } = require('events');
const os = require('os');
const fs = require('fs');
const path = require('path');

class SimplePty extends EventEmitter {
  constructor(options = {}) {
    super();
    this.shell = options.shell || process.env.SHELL || '/bin/bash';
    this.cwd = options.cwd || process.env.HOME || os.homedir();
    this.env = options.env || process.env;
    this.cols = options.cols || 80;
    this.rows = options.rows || 30;
    this.process = null;
    this.isRunning = false;
    this.fifoPath = null;
  }

  spawn() {
    console.log('[SimplePty] Starting with shell:', this.shell);
    
    const env = {
      ...this.env,
      TERM: 'xterm-256color',
      LINES: this.rows.toString(),
      COLUMNS: this.cols.toString(),
      PS1: '$ ' // Simple prompt
    };
    
    // Create a unique FIFO for this session
    const tmpDir = os.tmpdir();
    this.fifoPath = path.join(tmpDir, `zeami-pty-${Date.now()}`);
    
    try {
      // Use Python's pty module which is more reliable
      const pythonScript = `
import pty
import os
import sys
import select
import termios
import tty

# Create a pty
master, slave = pty.openpty()

# Spawn the shell
pid = os.fork()
if pid == 0:  # Child
    os.close(master)
    os.setsid()
    os.dup2(slave, 0)
    os.dup2(slave, 1)
    os.dup2(slave, 2)
    os.execvpe('${this.shell}', ['${this.shell}', '-i'], os.environ)
else:  # Parent
    os.close(slave)
    
    # Set the terminal to raw mode
    old_settings = termios.tcgetattr(sys.stdin)
    try:
        # Make master non-blocking
        import fcntl
        flags = fcntl.fcntl(master, fcntl.F_GETFL)
        fcntl.fcntl(master, fcntl.F_SETFL, flags | os.O_NONBLOCK)
        
        while True:
            # Check for data from master
            r, w, e = select.select([master, sys.stdin], [], [], 0.01)
            
            if master in r:
                try:
                    data = os.read(master, 1024)
                    if data:
                        sys.stdout.buffer.write(data)
                        sys.stdout.flush()
                except OSError:
                    break
                    
            if sys.stdin in r:
                data = sys.stdin.buffer.read(1024)
                if data:
                    os.write(master, data)
                    
    except KeyboardInterrupt:
        pass
    finally:
        os.close(master)
        os.waitpid(pid, 0)
`;
      
      this.process = spawn('python3', ['-c', pythonScript], {
        cwd: this.cwd,
        env,
        stdio: ['pipe', 'pipe', 'pipe']
      });
      
      this.isRunning = true;
      this.setupHandlers();
      
    } catch (error) {
      console.error('[SimplePty] Failed to spawn:', error);
      this.emit('error', error);
    }
    
    return this;
  }
  
  setupHandlers() {
    if (!this.process) return;
    
    // Handle stdout
    this.process.stdout.on('data', (data) => {
      // Log first few bytes for debugging
      const preview = data.toString().slice(0, 50).replace(/\n/g, '\\n').replace(/\r/g, '\\r');
      console.log('[SimplePty] Stdout data preview:', preview);
      this.emit('data', data.toString());
    });
    
    // Handle stderr
    this.process.stderr.on('data', (data) => {
      console.log('[SimplePty] Stderr:', data.toString());
      this.emit('data', data.toString());
    });
    
    // Handle process exit
    this.process.on('exit', (code, signal) => {
      console.log('[SimplePty] Process exited:', code, signal);
      this.isRunning = false;
      this.cleanup();
      this.emit('exit', { code, signal });
    });
    
    // Handle errors
    this.process.on('error', (error) => {
      console.error('[SimplePty] Process error:', error);
      this.isRunning = false;
      this.cleanup();
      this.emit('error', error);
    });
  }
  
  write(data) {
    if (this.process && this.process.stdin && this.isRunning) {
      try {
        console.log('[SimplePty] Writing data:', data.replace(/\n/g, '\\n').replace(/\r/g, '\\r'));
        const written = this.process.stdin.write(data);
        console.log('[SimplePty] Write result:', written);
      } catch (error) {
        console.error('[SimplePty] Write error:', error);
        this.emit('error', error);
      }
    } else {
      console.log('[SimplePty] Cannot write - process not ready');
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
        console.error('[SimplePty] Kill error:', error);
      }
      this.isRunning = false;
      this.cleanup();
    }
  }
  
  cleanup() {
    // Clean up FIFO if it exists
    if (this.fifoPath && fs.existsSync(this.fifoPath)) {
      try {
        fs.unlinkSync(this.fifoPath);
      } catch (error) {
        // Ignore cleanup errors
      }
    }
  }
  
  get pid() {
    return this.process ? this.process.pid : -1;
  }
}

module.exports = { SimplePty };