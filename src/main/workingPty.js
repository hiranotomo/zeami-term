/**
 * Working PTY implementation without native dependencies
 * Based on VS Code's approach but using available system commands
 */

const { spawn } = require('child_process');
const { EventEmitter } = require('events');
const os = require('os');
const fs = require('fs');
const path = require('path');

class WorkingPty extends EventEmitter {
  constructor(options = {}) {
    super();
    this.shell = options.shell || process.env.SHELL || '/bin/bash';
    this.cwd = os.homedir(); // Always start in home directory
    this.env = options.env || process.env;
    this.cols = options.cols || 80;
    this.rows = options.rows || 30;
    this.process = null;
    this.isRunning = false;
    this.pythonScriptPath = null;
  }

  spawn() {
    console.log('[WorkingPty] Starting terminal...');
    
    // Create Python script that properly handles PTY
    this.createPythonScript();
    
    const env = {
      ...this.env,
      TERM: 'xterm-256color',
      COLORTERM: 'truecolor',
      COLUMNS: this.cols.toString(),
      LINES: this.rows.toString(),
      LANG: process.env.LANG || 'en_US.UTF-8',
      LC_ALL: process.env.LC_ALL || 'en_US.UTF-8',
      TERM_PROGRAM: 'ZeamiTerm',
      TERM_PROGRAM_VERSION: '0.1.2'
    };
    
    // Run the Python script
    this.process = spawn('python3', [this.pythonScriptPath, this.shell], {
      cwd: this.cwd,
      env: env,
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    this.isRunning = true;
    this.setupHandlers();
    
    return this;
  }
  
  createPythonScript() {
    // Create a temporary Python script file
    const tmpDir = os.tmpdir();
    this.pythonScriptPath = path.join(tmpDir, `zeami-pty-${Date.now()}.py`);
    
    const pythonCode = `#!/usr/bin/env python3
import os
import sys
import pty
import select
import termios
import tty
import struct
import fcntl
import signal
import time

def set_size(fd, rows, cols):
    size = struct.pack('HHHH', rows, cols, 0, 0)
    fcntl.ioctl(fd, termios.TIOCSWINSZ, size)

# Global variable to store master_fd for resize handling
master_fd_global = None

def handle_usr1(signum, frame):
    """Handle SIGUSR1 signal to read and apply new terminal size"""
    global master_fd_global
    if master_fd_global:
        try:
            # Read resize info from environment variables
            cols = int(os.environ.get('ZEAMI_RESIZE_COLS', '80'))
            rows = int(os.environ.get('ZEAMI_RESIZE_ROWS', '30'))
            set_size(master_fd_global, rows, cols)
        except:
            pass

def main():
    shell = sys.argv[1] if len(sys.argv) > 1 else '/bin/bash'
    
    # Create pseudo-terminal
    master_fd, slave_fd = pty.openpty()
    
    # Set terminal size
    set_size(slave_fd, ${this.rows}, ${this.cols})
    
    # Fork child process
    pid = os.fork()
    
    if pid == 0:  # Child
        os.close(master_fd)
        os.setsid()
        
        # Make slave PTY the controlling terminal
        fcntl.ioctl(slave_fd, termios.TIOCSCTTY, 0)
        
        # Duplicate slave to stdin/stdout/stderr
        os.dup2(slave_fd, 0)
        os.dup2(slave_fd, 1)
        os.dup2(slave_fd, 2)
        os.close(slave_fd)
        
        # Set proper terminal settings
        os.environ['TERM'] = 'xterm-256color'
        os.environ['COLORTERM'] = 'truecolor'
        
        # Execute shell with proper terminal settings
        # For zsh/bash, use login shell to load RC files
        if 'zsh' in shell or 'bash' in shell:
            # Set ZDOTDIR to load our custom config for zsh
            if 'zsh' in shell:
                os.environ['ZDOTDIR'] = os.environ.get('HOME', '') + '/develop/Zeami-1/projects/zeami-term'
            # Add explicit bracketed paste mode support
            os.environ['BRACKETED_PASTE_MODE'] = '1'
            os.execvp(shell, [shell, '-l', '-i'])
        else:
            os.execvp(shell, [shell, '-i'])
    else:  # Parent
        os.close(slave_fd)
        
        # Store master_fd globally for resize handling
        global master_fd_global
        master_fd_global = master_fd
        
        # Set up SIGUSR1 handler for resize
        signal.signal(signal.SIGUSR1, handle_usr1)
        
        # Note: Master PTY attributes are usually handled by the slave side
        # We don't need to set attributes on the master FD
        # The shell process will handle echo and other terminal settings
        
        # Set raw mode for stdin only if it's a terminal
        old_tty = None
        if os.isatty(sys.stdin.fileno()):
            try:
                old_tty = termios.tcgetattr(sys.stdin)
                # Don't use tty.setraw as it disables too many features
                # Instead, configure terminal minimally
                new_tty = termios.tcgetattr(sys.stdin)
                # Disable canonical mode and echo
                new_tty[3] = new_tty[3] & ~termios.ICANON & ~termios.ECHO
                # Set VMIN and VTIME for immediate input
                new_tty[6][termios.VMIN] = 1
                new_tty[6][termios.VTIME] = 0
                termios.tcsetattr(sys.stdin, termios.TCSANOW, new_tty)
            except:
                pass
        
        try:
            # Make master non-blocking
            fcntl.fcntl(master_fd, fcntl.F_SETFL, os.O_NONBLOCK)
            # Keep stdin blocking for proper input handling
            
            input_buffer = b''
            
            while True:
                try:
                    # Wait for data with small timeout for responsiveness
                    rfds, _, _ = select.select([sys.stdin, master_fd], [], [], 0.01)
                    
                    # Read from stdin and write to PTY
                    if sys.stdin in rfds:
                        try:
                            # Read available data (up to 65536 bytes for large pastes)
                            data = os.read(sys.stdin.fileno(), 65536)
                            if data:
                                # Check for resize command
                                data_str = data.decode('utf-8', errors='ignore')
                                if data_str.startswith('RESIZE:'):
                                    # Parse resize command
                                    parts = data_str.strip().split(':')
                                    if len(parts) == 3:
                                        try:
                                            new_cols = int(parts[1])
                                            new_rows = int(parts[2])
                                            set_size(master_fd, new_rows, new_cols)
                                            # Send SIGWINCH to the shell
                                            os.kill(pid, signal.SIGWINCH)
                                        except:
                                            pass
                                else:
                                    # Write normal data to PTY
                                    os.write(master_fd, data)
                        except OSError as e:
                            if e.errno != 11:  # Ignore EAGAIN
                                pass
                    
                    # Read from PTY and write to stdout
                    if master_fd in rfds:
                        try:
                            data = os.read(master_fd, 65536)
                            if data:
                                # Pass through all data including escape sequences
                                sys.stdout.buffer.write(data)
                                sys.stdout.buffer.flush()
                        except OSError as e:
                            if e.errno != 11:  # Ignore EAGAIN
                                break
                            
                    # Check if child process is still alive
                    try:
                        wpid, status = os.waitpid(pid, os.WNOHANG)
                        if wpid != 0:
                            break
                    except:
                        break
                        
                except select.error:
                    break
                except KeyboardInterrupt:
                    break
                    
        finally:
            # Restore terminal settings if we changed them
            if old_tty:
                try:
                    termios.tcsetattr(sys.stdin, termios.TCSADRAIN, old_tty)
                except:
                    pass
            os.close(master_fd)
            try:
                os.kill(pid, signal.SIGTERM)
                os.waitpid(pid, 0)
            except:
                pass

if __name__ == '__main__':
    main()
`;
    
    fs.writeFileSync(this.pythonScriptPath, pythonCode, { mode: 0o755 });
  }
  
  setupHandlers() {
    if (!this.process) return;
    
    // Direct output without buffering to avoid character loss
    this.process.stdout.on('data', (data) => {
      // Debug log for output
      console.log('[WorkingPty] Output received:', data.length, 'bytes');
      // Emit data immediately as UTF-8 string
      this.emit('data', data.toString('utf8'));
    });
    
    this.process.stderr.on('data', (data) => {
      console.error('[WorkingPty] Stderr:', data.toString());
    });
    
    this.process.on('exit', (code, signal) => {
      console.log('[WorkingPty] Process exited:', code, signal);
      this.isRunning = false;
      this.cleanup();
      this.emit('exit', { code, signal });
    });
    
    this.process.on('error', (error) => {
      console.error('[WorkingPty] Process error:', error);
      this.isRunning = false;
      this.cleanup();
      this.emit('error', error);
    });
    
    // Handle stdin errors silently
    this.process.stdin.on('error', (err) => {
      console.log('[WorkingPty] Stdin error (normal during shutdown):', err.code);
    });
  }
  
  write(data) {
    if (!this.process || !this.isRunning || !this.process.stdin) {
      console.log('[WorkingPty] Cannot write - process not ready');
      return;
    }
    
    try {
      // Debug log for received data
      console.log('[WorkingPty] Received input:', data.split('').map(c => {
        const code = c.charCodeAt(0);
        if (code < 32 || code === 127) return `\\x${code.toString(16).padStart(2, '0')}`;
        return c;
      }).join(''));
      
      // Write data to Python script's stdin
      this.process.stdin.write(data);
    } catch (error) {
      console.error('[WorkingPty] Write error:', error);
    }
  }
  
  resize(cols, rows) {
    this.cols = cols;
    this.rows = rows;
    
    if (this.process && this.isRunning) {
      try {
        // Write resize command directly to Python process stdin
        const resizeCmd = `RESIZE:${cols}:${rows}\n`;
        this.process.stdin.write(resizeCmd);
        
        console.log(`[WorkingPty] Sent resize command: ${cols}x${rows}`);
      } catch (error) {
        console.error('[WorkingPty] Resize error:', error);
      }
    }
  }
  
  kill(signal = 'SIGTERM') {
    if (!this.process) return;
    
    this.isRunning = false;
    
    try {
      // First try to close stdin
      if (this.process.stdin && !this.process.stdin.destroyed) {
        this.process.stdin.end();
      }
      
      // Then kill the process
      if (!this.process.killed) {
        this.process.kill(signal);
      }
    } catch (error) {
      // Only log unexpected errors
      if (error.code !== 'ESRCH' && error.code !== 'EPIPE') {
        console.error('[WorkingPty] Kill error:', error);
      }
    }
    
    // Always cleanup
    this.cleanup();
  }
  
  cleanup() {
    // Remove temporary Python script
    if (this.pythonScriptPath && fs.existsSync(this.pythonScriptPath)) {
      try {
        fs.unlinkSync(this.pythonScriptPath);
      } catch (error) {
        // Ignore cleanup errors
      }
    }
  }
  
  get pid() {
    return this.process ? this.process.pid : -1;
  }
}

module.exports = { WorkingPty };