/**
 * Flow-controlled PTY implementation inspired by VS Code
 * Handles input chunking and buffering to prevent freezing
 */

const { spawn } = require('child_process');
const { EventEmitter } = require('events');
const os = require('os');

class FlowControlledPty extends EventEmitter {
  constructor(options = {}) {
    super();
    this.shell = options.shell || process.env.SHELL || '/bin/bash';
    this.cwd = options.cwd || process.env.HOME || os.homedir();
    this.env = options.env || process.env;
    this.cols = options.cols || 80;
    this.rows = options.rows || 30;
    this.process = null;
    this.isRunning = false;
    
    // Flow control settings (inspired by VS Code)
    this._writeQueue = [];
    this._writing = false;
    this._chunkSize = 50; // Characters per chunk
    this._writeInterval = 5; // ms between chunks
  }

  spawn() {
    console.log('[FlowControlledPty] Starting with shell:', this.shell);
    
    const env = {
      ...this.env,
      TERM: 'xterm-256color',
      LINES: this.rows.toString(),
      COLUMNS: this.cols.toString()
    };
    
    // Use 'script' command for proper PTY on macOS
    if (process.platform === 'darwin') {
      // Use -F to flush output immediately
      this.process = spawn('script', ['-F', '/dev/null', this.shell, '-i'], {
        cwd: this.cwd,
        env,
        stdio: ['pipe', 'pipe', 'pipe']
      });
    } else {
      // Linux: use script with different options
      this.process = spawn('script', ['-qfc', `${this.shell} -i`, '/dev/null'], {
        cwd: this.cwd,
        env,
        stdio: ['pipe', 'pipe', 'pipe']
      });
    }
    
    this.isRunning = true;
    this.setupHandlers();
    
    // Send initial newline to trigger prompt
    setTimeout(() => {
      if (this.isRunning) {
        this._writeToProcess('\n');
      }
    }, 100);
    
    return this;
  }
  
  setupHandlers() {
    if (!this.process) return;
    
    let outputBuffer = '';
    let flushTimer = null;
    
    const flushOutput = () => {
      if (outputBuffer) {
        this.emit('data', outputBuffer);
        outputBuffer = '';
      }
    };
    
    // Buffer output to reduce event frequency
    this.process.stdout.on('data', (data) => {
      outputBuffer += data.toString();
      
      // Clear existing timer
      if (flushTimer) {
        clearTimeout(flushTimer);
      }
      
      // Flush after 10ms of no new data
      flushTimer = setTimeout(flushOutput, 10);
    });
    
    // Handle stderr
    this.process.stderr.on('data', (data) => {
      // Script command might output to stderr, treat as normal output
      outputBuffer += data.toString();
      
      if (flushTimer) {
        clearTimeout(flushTimer);
      }
      flushTimer = setTimeout(flushOutput, 10);
    });
    
    // Handle process exit
    this.process.on('exit', (code, signal) => {
      console.log('[FlowControlledPty] Process exited:', code, signal);
      this.isRunning = false;
      flushOutput(); // Flush any remaining output
      this.emit('exit', { code, signal });
    });
    
    // Handle errors
    this.process.on('error', (error) => {
      console.error('[FlowControlledPty] Process error:', error);
      this.isRunning = false;
      this.emit('error', error);
    });
  }
  
  write(data) {
    if (!this.isRunning) {
      console.log('[FlowControlledPty] Cannot write - process not running');
      return;
    }
    
    // Queue the write
    this._writeQueue.push(data);
    this._processWriteQueue();
  }
  
  _processWriteQueue() {
    if (this._writing || this._writeQueue.length === 0) {
      return;
    }
    
    this._writing = true;
    const data = this._writeQueue.shift();
    
    // For single characters or small inputs, write immediately
    if (data.length <= this._chunkSize) {
      this._writeToProcess(data);
      this._writing = false;
      
      // Process next item after interval
      if (this._writeQueue.length > 0) {
        setTimeout(() => this._processWriteQueue(), this._writeInterval);
      }
    } else {
      // Chunk large inputs
      this._writeChunked(data);
    }
  }
  
  _writeChunked(data) {
    const chunks = [];
    for (let i = 0; i < data.length; i += this._chunkSize) {
      chunks.push(data.slice(i, i + this._chunkSize));
    }
    
    let chunkIndex = 0;
    const writeNextChunk = () => {
      if (chunkIndex < chunks.length) {
        this._writeToProcess(chunks[chunkIndex]);
        chunkIndex++;
        setTimeout(writeNextChunk, this._writeInterval);
      } else {
        this._writing = false;
        // Process next queued item
        if (this._writeQueue.length > 0) {
          setTimeout(() => this._processWriteQueue(), this._writeInterval);
        }
      }
    };
    
    writeNextChunk();
  }
  
  _writeToProcess(data) {
    if (this.process && this.process.stdin && !this.process.stdin.destroyed) {
      try {
        const success = this.process.stdin.write(data);
        if (!success) {
          // Handle backpressure
          this.process.stdin.once('drain', () => {
            console.log('[FlowControlledPty] Stdin drained');
          });
        }
      } catch (error) {
        console.error('[FlowControlledPty] Write error:', error);
        this.emit('error', error);
      }
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
        // Kill the entire process group
        process.kill(-this.process.pid, signal);
      } catch (error) {
        // Fallback to killing just the process
        try {
          this.process.kill(signal);
        } catch (e) {
          console.error('[FlowControlledPty] Kill error:', e);
        }
      }
      this.isRunning = false;
    }
  }
  
  get pid() {
    return this.process ? this.process.pid : -1;
  }
}

module.exports = { FlowControlledPty };