#!/usr/bin/env python3
"""
PTY wrapper for ZeamiTerm
Provides pseudo-terminal functionality using Python's pty module
"""

import os
import sys
import pty
import select
import subprocess
import json
import signal
import termios
import tty

def main():
    # Get shell from environment or use default
    shell = os.environ.get('SHELL', '/bin/bash')
    
    # Create a pseudo-terminal
    master_fd, slave_fd = pty.openpty()
    
    # Fork a child process
    pid = os.fork()
    
    if pid == 0:  # Child process
        # Close master fd
        os.close(master_fd)
        
        # Make slave fd the controlling terminal
        os.setsid()
        os.dup2(slave_fd, 0)  # stdin
        os.dup2(slave_fd, 1)  # stdout
        os.dup2(slave_fd, 2)  # stderr
        
        # Close the original slave fd
        if slave_fd > 2:
            os.close(slave_fd)
        
        # Set terminal size
        try:
            import fcntl
            import struct
            TIOCSWINSZ = 0x5414
            winsize = struct.pack('HHHH', 30, 80, 0, 0)  # rows, cols, xpixel, ypixel
            fcntl.ioctl(0, TIOCSWINSZ, winsize)
        except:
            pass
        
        # Execute shell
        os.execv(shell, [shell, '-i'])
        
    else:  # Parent process
        # Close slave fd
        os.close(slave_fd)
        
        # Set master fd to non-blocking
        import fcntl
        flags = fcntl.fcntl(master_fd, fcntl.F_GETFL)
        fcntl.fcntl(master_fd, fcntl.F_SETFL, flags | os.O_NONBLOCK)
        
        # Main loop
        try:
            while True:
                # Check for input from stdin or master_fd
                r, w, e = select.select([sys.stdin, master_fd], [], [], 0.1)
                
                # Read from stdin and write to master_fd
                if sys.stdin in r:
                    try:
                        data = sys.stdin.buffer.read(1024)
                        if data:
                            os.write(master_fd, data)
                        else:
                            break
                    except:
                        break
                
                # Read from master_fd and write to stdout
                if master_fd in r:
                    try:
                        data = os.read(master_fd, 1024)
                        if data:
                            sys.stdout.buffer.write(data)
                            sys.stdout.flush()
                        else:
                            break
                    except OSError:
                        pass
                        
        except KeyboardInterrupt:
            pass
        finally:
            # Clean up
            try:
                os.kill(pid, signal.SIGTERM)
                os.waitpid(pid, 0)
            except:
                pass
            os.close(master_fd)

if __name__ == '__main__':
    main()