/**
 * PTY Service - Advanced PTY management inspired by VS Code
 * Handles process spawning, data buffering, and shell integration
 */

const { EventEmitter } = require('events');
const { spawn } = require('child_process');
const os = require('os');
const path = require('path');
const fs = require('fs');
const { getPtyConfig, applyTerminalModes } = require('./ptyConfig');
const { PatternDetector } = require('./patternDetector');
const { CommandFormatter } = require('./commandFormatter');

class PtyService extends EventEmitter {
  constructor() {
    super();
    this.processes = new Map();
    this.dataBufferers = new Map();
    this.flowControllers = new Map();
    
    // Pattern detection and formatting
    this.patternDetector = new PatternDetector();
    this.commandFormatters = new Map(); // Per-session formatters
    
    // Configuration
    this.config = {
      defaultShell: this.detectDefaultShell(),
      defaultCwd: os.homedir(),
      env: this.prepareEnvironment(),
      // Flow control settings from VS Code
      highWaterMark: 12000, // chars
      lowWaterMark: 4000,   // chars
      chunkSize: 50,        // chars per write
      writeInterval: 5      // ms between chunks
    };
  }
  
  detectDefaultShell() {
    if (process.platform === 'win32') {
      return process.env.COMSPEC || 'cmd.exe';
    }
    return process.env.SHELL || '/bin/bash';
  }
  
  prepareEnvironment() {
    const env = { ...process.env };
    
    // Add terminal-specific environment variables
    env.TERM = 'xterm-256color';
    env.COLORTERM = 'truecolor';
    env.TERM_PROGRAM = 'ZeamiTerm';
    env.TERM_PROGRAM_VERSION = '0.1.0';
    
    // Ensure PATH includes common development tool locations
    const devPaths = [
      '/usr/local/bin',
      '/opt/homebrew/bin',
      '/opt/homebrew/sbin',
      `${process.env.HOME}/.npm-global/bin`,
      `${process.env.HOME}/.cargo/bin`,
      `${process.env.HOME}/.rbenv/shims`,
      `${process.env.HOME}/.pyenv/shims`,
      `${process.env.HOME}/.nvm/versions/node/*/bin`,
      `${process.env.HOME}/go/bin`,
      '/usr/local/go/bin',
      `${process.env.HOME}/.local/bin`,
      '/Applications/Visual Studio Code.app/Contents/Resources/app/bin'
    ];
    
    const currentPath = env.PATH || '';
    const pathArray = currentPath.split(':');
    
    devPaths.forEach(path => {
      // Expand wildcards for nvm paths
      if (path.includes('*')) {
        const fs = require('fs');
        const baseDir = path.substring(0, path.indexOf('*'));
        if (fs.existsSync(baseDir)) {
          try {
            const dirs = fs.readdirSync(baseDir);
            dirs.forEach(dir => {
              const fullPath = path.replace('*', dir);
              if (fs.existsSync(fullPath) && !pathArray.includes(fullPath)) {
                pathArray.unshift(fullPath);
              }
            });
          } catch (e) {
            // Ignore errors
          }
        }
      } else if (!pathArray.includes(path) && require('fs').existsSync(path)) {
        pathArray.unshift(path);
      }
    });
    
    env.PATH = pathArray.join(':');
    
    // Remove problematic variables
    delete env.ELECTRON_RUN_AS_NODE;
    delete env.ELECTRON_NO_ATTACH_CONSOLE;
    
    return env;
  }
  
  async createProcess(options = {}) {
    const id = this.generateId();
    
    const config = {
      shell: options.shell || this.config.defaultShell,
      args: options.args || [],
      cwd: os.homedir(), // Always start in home directory
      env: { ...this.config.env, ...options.env },
      cols: options.cols || 80,
      rows: options.rows || 30
    };
    
    // Performance monitoring
    const performanceInfo = {
      outputRate: 0,
      lastMeasure: Date.now(),
      totalBytes: 0,
      throttled: false,
      buffer: [],
      flushTimer: null
    };
    this.performanceInfo = this.performanceInfo || new Map();
    this.performanceInfo.set(id, performanceInfo);
    
    // Create command formatter for this session
    const commandFormatter = new CommandFormatter();
    this.commandFormatters.set(id, commandFormatter);
    
    // Create data bufferer with formatting
    const bufferer = new DataBufferer(id, (data) => {
      console.log(`[PtyService] DataBufferer callback: id=${id}, data length=${data.length}`);
      this.emit('data', { id, data });
    }, this.patternDetector, commandFormatter);
    this.dataBufferers.set(id, bufferer);
    
    // Create flow controller with enhanced configuration
    const flowController = new FlowController({
      ...this.config,
      adaptiveChunkSize: true,
      maxChunkSize: 1024,
      minChunkSize: 16
    });
    this.flowControllers.set(id, flowController);
    
    // Create the process
    const processInfo = await this.spawnProcess(id, config);
    this.processes.set(id, processInfo);
    
    // Start handling data
    this.handleProcessData(id, processInfo, bufferer, flowController);
    
    return {
      id,
      pid: processInfo.process.pid,
      shell: config.shell,
      cwd: config.cwd
    };
  }
  
  async spawnProcess(id, config) {
    return new Promise((resolve, reject) => {
      // Try different methods to spawn a proper PTY
      let process;
      let method = 'unknown';
      let ptyWrapper = null;
      
      try {
        // Method 1: Try using WorkingPty (Python-based PTY)
        const { WorkingPty } = require('./workingPty');
        ptyWrapper = new WorkingPty({
          shell: config.shell,
          cwd: config.cwd,
          env: config.env,
          cols: config.cols,
          rows: config.rows
        });
        
        ptyWrapper.spawn();
        process = ptyWrapper.process;
        method = 'working-pty';
        
        // Forward PTY events
        ptyWrapper.on('data', (data) => {
          console.log(`[PtyService] WorkingPty data received: id=${id}, length=${data.length}`);
          const bufferer = this.dataBufferers.get(id);
          if (bufferer) {
            console.log(`[PtyService] Forwarding to bufferer`);
            bufferer.write(Buffer.from(data));
          } else {
            console.error(`[PtyService] No bufferer found for id=${id}`);
          }
        });
        
        ptyWrapper.on('exit', ({ code, signal }) => {
          this.handleProcessExit(id, code, signal);
        });
        
        ptyWrapper.on('error', (error) => {
          console.error(`[PtyService] WorkingPty error for ${id}:`, error);
          this.handleProcessExit(id, null, null, error);
        });
      } catch (error) {
        console.log('[PtyService] WorkingPty not available, falling back...');
        try {
          // Method 2: Try using a PTY wrapper script
          process = this.spawnWithPtyWrapper(config);
          method = 'pty-wrapper';
        } catch (error2) {
          try {
            // Method 3: Use shell with special environment
            process = this.spawnWithShellEnvironment(config);
            method = 'shell-env';
          } catch (error3) {
            // Method 4: Basic spawn as last resort
            process = this.spawnBasic(config);
            method = 'basic';
          }
        }
      }
      
      const processInfo = {
        id,
        process,
        config,
        method,
        isRunning: true,
        unacknowledgedChars: 0,
        ptyWrapper: ptyWrapper  // Store the wrapper for later use
      };
      
      // Handle process events
      process.on('error', (error) => {
        console.error(`[PtyService] Process ${id} error:`, error);
        this.handleProcessExit(id, null, null, error);
        reject(error);
      });
      
      process.on('exit', (code, signal) => {
        this.handleProcessExit(id, code, signal);
      });
      
      // Give process time to initialize
      setTimeout(() => {
        resolve(processInfo);
      }, 100);
    });
  }
  
  spawnWithPtyWrapper(config) {
    // Create a wrapper script that provides PTY-like behavior
    const wrapperPath = this.createPtyWrapper();
    
    const args = [
      wrapperPath,
      config.shell,
      ...config.args,
      '--',
      config.cols,
      config.rows
    ];
    
    return spawn('node', args, {
      cwd: config.cwd,
      env: config.env,
      stdio: ['pipe', 'pipe', 'pipe']
    });
  }
  
  spawnWithShellEnvironment(config) {
    // Set up environment for better shell behavior
    const env = {
      ...config.env,
      LINES: config.rows.toString(),
      COLUMNS: config.cols.toString(),
      PS1: '\\w $ ', // Simple prompt
      TERM: 'xterm-256color'
    };
    
    return spawn(config.shell, config.args, {
      cwd: config.cwd,
      env,
      stdio: ['pipe', 'pipe', 'pipe']
    });
  }
  
  spawnBasic(config) {
    return spawn(config.shell, config.args, {
      cwd: config.cwd,
      env: config.env,
      stdio: ['pipe', 'pipe', 'pipe']
    });
  }
  
  createPtyWrapper() {
    // Create a Node.js script that acts as a PTY wrapper
    const wrapperCode = `
const { spawn } = require('child_process');
const readline = require('readline');

const shell = process.argv[2];
const args = process.argv.slice(3, process.argv.indexOf('--'));
const cols = parseInt(process.argv[process.argv.length - 2]);
const rows = parseInt(process.argv[process.argv.length - 1]);

// Spawn the shell
const proc = spawn(shell, args, {
  env: {
    ...process.env,
    TERM: 'xterm-256color',
    COLUMNS: cols,
    LINES: rows
  },
  stdio: ['pipe', 'pipe', 'pipe']
});

// Forward stdin to process
process.stdin.pipe(proc.stdin);

// Forward process output to stdout
proc.stdout.pipe(process.stdout);
proc.stderr.pipe(process.stdout);

// Handle process exit
proc.on('exit', (code, signal) => {
  process.exit(code);
});

// Handle errors
proc.on('error', (error) => {
  console.error('Process error:', error);
  process.exit(1);
});

// Handle resize (not implemented for basic wrapper)
process.on('SIGWINCH', () => {
  // Would handle resize here in a real PTY
});
`;
    
    const wrapperPath = path.join(os.tmpdir(), `pty-wrapper-${Date.now()}.js`);
    fs.writeFileSync(wrapperPath, wrapperCode);
    return wrapperPath;
  }
  
  handleProcessData(id, processInfo, bufferer, flowController) {
    const { process, ptyWrapper } = processInfo;
    
    // If using WorkingPty, data is already handled in spawnProcess
    if (ptyWrapper) {
      return;
    }
    
    // Handle stdout
    if (process.stdout) {
      process.stdout.on('data', (data) => {
        bufferer.write(data);
      });
    }
    
    // Handle stderr
    if (process.stderr) {
      process.stderr.on('data', (data) => {
        bufferer.write(data);
      });
    }
  }
  
  writeToProcess(id, data) {
    const processInfo = this.processes.get(id);
    const flowController = this.flowControllers.get(id);
    const commandFormatter = this.commandFormatters.get(id);
    
    if (!processInfo || !processInfo.isRunning) {
      console.warn(`[PtyService] Cannot write to process ${id} - not running`);
      return;
    }
    
    // Detect command for formatting (when Enter is pressed)
    if (commandFormatter && data.includes('\r') || data.includes('\n')) {
      // Extract the command (simplified - in reality would need to track input buffer)
      commandFormatter.detectCommand(data.trim());
    }
    
    // If using WorkingPty, write directly to it
    if (processInfo.ptyWrapper) {
      processInfo.ptyWrapper.write(data);
      return;
    }
    
    // Apply flow control for regular processes
    flowController.write(data, (chunk) => {
      try {
        if (processInfo.process.stdin && !processInfo.process.stdin.destroyed) {
          processInfo.process.stdin.write(chunk);
        }
      } catch (error) {
        console.error(`[PtyService] Write error for process ${id}:`, error);
      }
    });
  }
  
  resizeProcess(id, cols, rows) {
    const processInfo = this.processes.get(id);
    if (!processInfo || !processInfo.isRunning) return;
    
    // Update config
    processInfo.config.cols = cols;
    processInfo.config.rows = rows;
    
    // If using WorkingPty, use its resize method
    if (processInfo.ptyWrapper) {
      processInfo.ptyWrapper.resize(cols, rows);
      return;
    }
    
    // Try to send resize signal for regular processes
    if (process.platform !== 'win32') {
      try {
        process.kill(processInfo.process.pid, 'SIGWINCH');
      } catch (error) {
        // Ignore errors
      }
    }
    
    // Send escape sequence for terminal size
    this.writeToProcess(id, `\x1b[8;${rows};${cols}t`);
  }
  
  handleProcessExit(id, code, signal, error) {
    const processInfo = this.processes.get(id);
    if (!processInfo) return;
    
    processInfo.isRunning = false;
    
    // Clean up PTY wrapper if present
    if (processInfo.ptyWrapper) {
      processInfo.ptyWrapper.cleanup();
    }
    
    // Clean up resources
    const bufferer = this.dataBufferers.get(id);
    if (bufferer) {
      bufferer.flush();
      this.dataBufferers.delete(id);
    }
    
    this.flowControllers.delete(id);
    this.commandFormatters.delete(id);
    this.processes.delete(id);
    
    // Emit exit event
    this.emit('exit', {
      id,
      code,
      signal,
      error: error ? error.message : null
    });
  }
  
  killProcess(id, signal = 'SIGTERM') {
    const processInfo = this.processes.get(id);
    if (!processInfo || !processInfo.isRunning) return;
    
    try {
      processInfo.isRunning = false; // Mark as not running immediately
      
      if (processInfo.ptyWrapper) {
        processInfo.ptyWrapper.kill(signal);
      } else if (processInfo.process && !processInfo.process.killed) {
        processInfo.process.kill(signal);
      }
      
      // Clean up immediately for SIGKILL
      if (signal === 'SIGKILL') {
        this.handleProcessExit(id, null, signal);
      }
    } catch (error) {
      // Only log if it's not an expected error
      if (error.code !== 'ESRCH') { // ESRCH = No such process
        console.error(`[PtyService] Failed to kill process ${id}:`, error);
      }
      // Clean up anyway
      this.handleProcessExit(id, null, signal, error);
    }
  }
  
  generateId() {
    return `pty-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * Data Bufferer - Reduces frequency of data events
 * Based on VS Code's TerminalDataBufferer
 */
class DataBufferer {
  constructor(id, callback, patternDetector, commandFormatter) {
    this.id = id;
    this.callback = callback;
    this.patternDetector = patternDetector;
    this.commandFormatter = commandFormatter;
  }
  
  write(data) {
    console.log(`[DataBufferer] write called: id=${this.id}, data length=${data.length}`);
    let text = data.toString('utf8');
    
    // Apply command formatting if active
    if (this.commandFormatter) {
      text = this.commandFormatter.format(text);
    }
    
    // Apply pattern highlighting
    if (this.patternDetector) {
      text = this.patternDetector.highlightText(text);
    }
    
    console.log(`[DataBufferer] calling callback with text length=${text.length}`);
    // Pass through formatted data
    this.callback(text);
  }
  
  flush() {
    // No-op since we're not buffering
  }
}

/**
 * Flow Controller - Manages input flow control
 * Based on VS Code's flow control implementation
 */
class FlowController {
  constructor(config) {
    this.config = config;
    this.queue = [];
    this.writing = false;
    this.currentChunkSize = config.chunkSize || 50;
    this.adaptiveChunkSize = config.adaptiveChunkSize || false;
    this.maxChunkSize = config.maxChunkSize || 1024;
    this.minChunkSize = config.minChunkSize || 16;
    this.lastWriteTime = Date.now();
    this.writeHistory = [];
  }
  
  write(data, callback) {
    // Adaptive chunk size based on performance
    if (this.adaptiveChunkSize) {
      this.adjustChunkSize();
    }
    
    // For large inputs, chunk them
    if (data.length > this.currentChunkSize) {
      for (let i = 0; i < data.length; i += this.currentChunkSize) {
        this.queue.push({
          data: data.slice(i, i + this.currentChunkSize),
          callback,
          timestamp: Date.now()
        });
      }
    } else {
      this.queue.push({ data, callback, timestamp: Date.now() });
    }
    
    this.processQueue();
  }
  
  adjustChunkSize() {
    const now = Date.now();
    const timeSinceLastWrite = now - this.lastWriteTime;
    
    // Keep history of last 10 writes
    this.writeHistory.push(timeSinceLastWrite);
    if (this.writeHistory.length > 10) {
      this.writeHistory.shift();
    }
    
    // Calculate average write time
    const avgWriteTime = this.writeHistory.reduce((a, b) => a + b, 0) / this.writeHistory.length;
    
    // Adjust chunk size based on performance
    if (avgWriteTime < 5 && this.currentChunkSize < this.maxChunkSize) {
      // Writing is fast, increase chunk size
      this.currentChunkSize = Math.min(this.currentChunkSize * 2, this.maxChunkSize);
    } else if (avgWriteTime > 20 && this.currentChunkSize > this.minChunkSize) {
      // Writing is slow, decrease chunk size
      this.currentChunkSize = Math.max(Math.floor(this.currentChunkSize / 2), this.minChunkSize);
    }
  }
  
  processQueue() {
    if (this.writing || this.queue.length === 0) return;
    
    this.writing = true;
    const item = this.queue.shift();
    
    // Track write time
    const writeStart = Date.now();
    
    item.callback(item.data);
    
    // Adaptive interval based on queue size
    const queuePressure = Math.min(this.queue.length / 100, 1);
    const adaptiveInterval = Math.max(1, this.config.writeInterval * (1 - queuePressure * 0.8));
    
    setTimeout(() => {
      this.lastWriteTime = Date.now();
      this.writing = false;
      this.processQueue();
    }, adaptiveInterval);
  }
  
  getQueueSize() {
    return this.queue.length;
  }
  
  clear() {
    this.queue = [];
  }
}

module.exports = { PtyService };