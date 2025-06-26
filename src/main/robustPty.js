/**
 * Robust PTY implementation that works without node-pty
 * Uses different strategies based on platform availability
 */

const { spawn } = require('child_process');
const { EventEmitter } = require('events');
const os = require('os');
const pty = require('child_pty');

class RobustPty extends EventEmitter {
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
    console.log('[RobustPty] Starting terminal with shell:', this.shell);
    
    // Environment setup
    const env = {
      ...this.env,
      TERM: 'xterm-256color',
      COLUMNS: this.cols.toString(),
      LINES: this.rows.toString(),
      // Force interactive mode
      PS1: '$ ',
      FORCE_COLOR: '1'
    };
    
    try {
      // Strategy 1: Try child_pty first (pure JS implementation)
      this.spawnWithChildPty(env);
    } catch (e1) {
      console.log('[RobustPty] child_pty failed:', e1.message);
      try {
        // Strategy 2: Use Python pty module
        this.spawnWithPython(env);
      } catch (e2) {
        console.log('[RobustPty] Python pty failed:', e2.message);
        // Strategy 3: Fallback to direct spawn with PTY emulation
        this.spawnWithEmulation(env);
      }
    }
    
    return this;
  }
  
  spawnWithChildPty(env) {
    console.log('[RobustPty] Attempting child_pty spawn...');
    
    this.process = pty.spawn(this.shell, ['-i'], {
      cwd: this.cwd,
      env: env,
      cols: this.cols,
      rows: this.rows
    });
    
    this.isRunning = true;
    this.setupChildPtyHandlers();
  }
  
  spawnWithPython(env) {
    console.log('[RobustPty] Attempting Python pty spawn...');
    
    // Simpler Python script that handles PTY properly
    const pythonScript = `
import os, pty, sys, select, struct, fcntl, termios

# Set up the terminal size
cols, rows = ${this.cols}, ${this.rows}

# Create a PTY
master, slave = pty.openpty()

# Set terminal size
size = struct.pack("HHHH", rows, cols, 0, 0)
fcntl.ioctl(slave, termios.TIOCSWINSZ, size)

# Fork a child process
pid = os.fork()

if pid == 0:  # Child process
    os.close(master)
    os.setsid()
    os.dup2(slave, 0)
    os.dup2(slave, 1) 
    os.dup2(slave, 2)
    os.close(slave)
    
    # Execute the shell
    os.execvpe('${this.shell}', ['${this.shell}', '-i'], os.environ)
else:  # Parent process
    os.close(slave)
    
    # Make stdin/stdout non-blocking
    import fcntl
    flags = fcntl.fcntl(sys.stdin.fileno(), fcntl.F_GETFL)
    fcntl.fcntl(sys.stdin.fileno(), fcntl.F_SETFL, flags | os.O_NONBLOCK)
    
    flags = fcntl.fcntl(master, fcntl.F_GETFL)
    fcntl.fcntl(master, fcntl.F_SETFL, flags | os.O_NONBLOCK)
    
    try:
        while True:
            # Use select to wait for input
            r, w, e = select.select([sys.stdin.fileno(), master], [], [], 0.1)
            
            # Read from stdin and write to PTY
            if sys.stdin.fileno() in r:
                try:
                    data = os.read(sys.stdin.fileno(), 1024)
                    if data:
                        os.write(master, data)
                except:
                    pass
            
            # Read from PTY and write to stdout
            if master in r:
                try:
                    data = os.read(master, 1024)
                    if data:
                        sys.stdout.buffer.write(data)
                        sys.stdout.flush()
                    else:
                        break
                except:
                    break
                    
    except KeyboardInterrupt:
        pass
    finally:
        os.close(master)
        os.waitpid(pid, 0)
`;
    
    this.process = spawn('python3', ['-u', '-c', pythonScript], {
      cwd: this.cwd,
      env: env,
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    this.isRunning = true;
    this.setupHandlers();
  }
  
  spawnWithEmulation(env) {
    console.log('[RobustPty] Using PTY emulation mode...');
    
    // Use a wrapper script to provide PTY-like behavior
    const wrapperScript = `#!/bin/bash
export TERM=xterm-256color
export COLUMNS=${this.cols}
export LINES=${this.rows}

# Use stdbuf to disable buffering
exec stdbuf -i0 -o0 -e0 ${this.shell} -i 2>&1`;
    
    this.process = spawn('bash', ['-c', wrapperScript], {
      cwd: this.cwd,
      env: env,
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    this.isRunning = true;
    this.setupHandlers();
    
    // Send initial commands to set up the terminal
    setTimeout(() => {
      if (this.isRunning) {
        this.write('stty -echo\n'); // Disable local echo
        this.write('export PS1="$ "\n'); // Set simple prompt
        this.write('clear\n'); // Clear screen
      }
    }, 100);
  }
  
  setupChildPtyHandlers() {
    if (!this.process) return;
    
    this.process.on('data', (data) => {
      this.emit('data', data.toString());
    });
    
    this.process.on('exit', (code, signal) => {
      console.log('[RobustPty] Process exited:', code, signal);
      this.isRunning = false;
      this.emit('exit', { code, signal });
    });
    
    this.process.on('error', (error) => {
      console.error('[RobustPty] Process error:', error);
      this.isRunning = false;
      this.emit('error', error);
    });
  }
  
  setupHandlers() {
    if (!this.process) return;
    
    // Create a buffer to handle partial outputs
    let outputBuffer = '';
    
    this.process.stdout.on('data', (data) => {
      const str = data.toString();
      outputBuffer += str;
      
      // Emit complete lines immediately
      const lines = outputBuffer.split('\n');
      if (lines.length > 1) {
        // Keep the last incomplete line in buffer
        outputBuffer = lines[lines.length - 1];
        // Emit all complete lines
        const completeData = lines.slice(0, -1).join('\n') + '\n';
        this.emit('data', completeData);
      }
      
      // If buffer gets too large or contains prompt, flush it
      if (outputBuffer.length > 100 || outputBuffer.match(/[$#>]\s*$/)) {
        this.emit('data', outputBuffer);
        outputBuffer = '';
      }
    });
    
    this.process.stderr.on('data', (data) => {
      // Treat stderr as normal output for shells
      this.emit('data', data.toString());
    });
    
    this.process.on('exit', (code, signal) => {
      console.log('[RobustPty] Process exited:', code, signal);
      // Flush any remaining buffer
      if (outputBuffer) {
        this.emit('data', outputBuffer);
      }
      this.isRunning = false;
      this.emit('exit', { code, signal });
    });
    
    this.process.on('error', (error) => {
      console.error('[RobustPty] Process error:', error);
      this.isRunning = false;
      this.emit('error', error);
    });
  }
  
  write(data) {
    if (!this.process || !this.isRunning) {
      console.log('[RobustPty] Cannot write - process not running');
      return;
    }
    
    try {
      if (this.process.write) {
        // child_pty mode
        this.process.write(data);
      } else if (this.process.stdin && !this.process.stdin.destroyed) {
        // Regular spawn mode
        this.process.stdin.write(data);
      }
    } catch (error) {
      console.error('[RobustPty] Write error:', error);
      this.emit('error', error);
    }
  }
  
  resize(cols, rows) {
    this.cols = cols;
    this.rows = rows;
    
    if (this.process && this.isRunning) {
      if (this.process.resize) {
        // child_pty mode
        this.process.resize(cols, rows);
      } else if (process.platform !== 'win32') {
        // Send SIGWINCH for regular processes
        try {
          process.kill(this.process.pid, 'SIGWINCH');
        } catch (error) {
          // Ignore
        }
      }
    }
  }
  
  kill(signal = 'SIGTERM') {
    if (this.process && this.isRunning) {
      try {
        if (this.process.kill) {
          this.process.kill(signal);
        } else {
          process.kill(this.process.pid, signal);
        }
      } catch (error) {
        console.error('[RobustPty] Kill error:', error);
      }
      this.isRunning = false;
    }
  }
  
  get pid() {
    return this.process ? this.process.pid : -1;
  }
}

// Try to load child_pty if available
let pty = null;
try {
  pty = require('child_pty');
  console.log('[RobustPty] child_pty module loaded successfully');
} catch (e) {
  console.log('[RobustPty] child_pty not available, will use fallback');
}

module.exports = { RobustPty };