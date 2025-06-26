const { EventEmitter } = require('events');
const { MessageRouter } = require('./messageRouter');
const { PatternDetector } = require('./patternDetector');
const { TerminalBackend } = require('./terminalBackend');

class ZeamiInstance extends EventEmitter {
  constructor(options) {
    super();
    this.sessionId = options.sessionId;
    this.shell = options.shell;
    this.cwd = options.cwd;
    this.env = options.env;
    this.ptyProcess = null;
    this.messageRouter = new MessageRouter();
    this.patternDetector = new PatternDetector();
    this.context = {
      currentDirectory: this.cwd,
      history: [],
      detectedPatterns: []
    };
  }

  async start() {
    // Create terminal backend
    this.ptyProcess = new TerminalBackend({
      shell: this.shell,
      cwd: this.cwd,
      env: this.env
    });

    // Handle terminal output
    this.ptyProcess.on('data', (data) => {
      // Store in history
      this.context.history.push({
        type: 'output',
        data,
        timestamp: Date.now()
      });

      // Detect patterns
      const patterns = this.patternDetector.analyze(data);
      if (patterns.length > 0) {
        patterns.forEach(pattern => {
          this.context.detectedPatterns.push(pattern);
          this.emit('pattern-detected', pattern);
        });
      }

      // Forward to renderer
      this.emit('data', data);
    });

    // Handle terminal exit
    this.ptyProcess.on('exit', ({ code, signal }) => {
      this.emit('exit', { exitCode: code, signal });
    });

    // Handle errors
    this.ptyProcess.on('error', (error) => {
      console.error('Terminal error:', error);
      this.emit('error', error);
    });

    // Start the terminal
    this.ptyProcess.spawn();
  }

  write(data) {
    console.log('[INSTANCE] write called with:', data);
    if (this.ptyProcess) {
      // Store in history
      this.context.history.push({
        type: 'input',
        data,
        timestamp: Date.now()
      });

      // Route through message router for enhancement
      console.log('[INSTANCE] Processing through message router');
      const enhanced = this.messageRouter.processInput(data, this.context);
      console.log('[INSTANCE] Enhanced data:', enhanced);
      
      // Write to PTY
      console.log('[INSTANCE] Writing to PTY process');
      this.ptyProcess.write(enhanced);
      console.log('[INSTANCE] Data written to PTY');
    } else {
      console.log('[INSTANCE] No PTY process available');
    }
  }

  resize(cols, rows) {
    if (this.ptyProcess) {
      this.ptyProcess.resize(cols, rows);
    }
  }

  getContext() {
    return {
      ...this.context,
      pid: this.ptyProcess?.pid,
      running: !!this.ptyProcess
    };
  }

  destroy() {
    if (this.ptyProcess) {
      this.ptyProcess.kill();
      this.ptyProcess = null;
    }
  }
}

module.exports = { ZeamiInstance };