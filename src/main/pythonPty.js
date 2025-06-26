/**
 * Python-based PTY implementation
 * Uses Python's built-in pty module for proper pseudo-terminal support
 */

const { spawn } = require('child_process');
const { EventEmitter } = require('events');
const os = require('os');
const path = require('path');

class PythonPty extends EventEmitter {
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
    // Python script for PTY handling
    const pythonScript = `
import os
import sys
import pty
import select
import subprocess
import signal
import struct
import fcntl
import termios

# Get shell and environment
shell = '${this.shell}'
cols = ${this.cols}
rows = ${this.rows}

# Create PTY
master, slave = pty.openpty()

# Set terminal size
TIOCSWINSZ = 0x5414 if sys.platform == 'linux' else 0x80087468
size = struct.pack('HHHH', rows, cols, 0, 0)
fcntl.ioctl(slave, TIOCSWINSZ, size)

# Fork process
pid = os.fork()

if pid == 0:  # Child
    os.close(master)
    os.setsid()
    os.dup2(slave, 0)
    os.dup2(slave, 1)
    os.dup2(slave, 2)
    if slave > 2:
        os.close(slave)
    
    # Set environment
    os.environ['TERM'] = 'xterm-256color'
    os.environ['LINES'] = str(rows)
    os.environ['COLUMNS'] = str(cols)
    
    # Execute shell
    os.execv(shell, [shell, '-i'])
else:  # Parent
    os.close(slave)
    
    # Set non-blocking
    import fcntl
    flags = fcntl.fcntl(master, fcntl.F_GETFL)
    fcntl.fcntl(master, fcntl.F_SETFL, flags | os.O_NONBLOCK)
    
    # Handle SIGWINCH for terminal resize
    def handle_resize(signum, frame):
        pass
    signal.signal(signal.SIGWINCH, handle_resize)
    
    try:
        while True:
            r, w, e = select.select([sys.stdin.buffer.raw, master], [], [], 0.01)
            
            if sys.stdin.buffer.raw in r:
                try:
                    data = os.read(sys.stdin.buffer.raw.fileno(), 1024)
                    if data:
                        os.write(master, data)
                    else:
                        break
                except:
                    break
            
            if master in r:
                try:
                    data = os.read(master, 4096)
                    if data:
                        sys.stdout.buffer.write(data)
                        sys.stdout.buffer.flush()
                except OSError:
                    pass
    except:
        pass
    finally:
        try:
            os.kill(pid, signal.SIGTERM)
            os.waitpid(pid, 0)
        except:
            pass
        os.close(master)
`;

    // Spawn Python with the PTY script
    this.process = spawn('python3', ['-u', '-c', pythonScript], {
      cwd: this.cwd,
      env: this.env,
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    this.isRunning = true;
    this.setupHandlers();
    
    return this;
  }
  
  setupHandlers() {
    if (!this.process) return;
    
    // Handle stdout
    this.process.stdout.on('data', (data) => {
      this.emit('data', data.toString());
    });
    
    // Handle stderr
    this.process.stderr.on('data', (data) => {
      // Python errors
      console.error('Python PTY error:', data.toString());
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
      // Send resize command through stdin
      // This would need to be handled in the Python script
      // For now, just store the new size
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

module.exports = { PythonPty };