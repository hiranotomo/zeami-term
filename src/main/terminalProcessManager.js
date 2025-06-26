const { EventEmitter } = require('events');
const { ZeamiInstance } = require('./zeamiInstance');

class TerminalProcessManager extends EventEmitter {
  constructor() {
    super();
    this.sessions = new Map();
    this.nextSessionId = 1;
  }

  async createSession(options = {}) {
    const sessionId = `session-${this.nextSessionId++}`;
    
    const instance = new ZeamiInstance({
      sessionId,
      shell: options.shell || process.env.SHELL || '/bin/bash',
      cwd: options.cwd || process.env.HOME,
      env: {
        ...process.env,
        TERM: 'xterm-256color',
        ZEAMI_TERM: 'true',
        ...options.env
      }
    });

    // Forward events
    instance.on('data', (data) => {
      this.emit('data', sessionId, data);
    });

    instance.on('pattern-detected', (pattern) => {
      this.emit('pattern-detected', sessionId, pattern);
    });

    instance.on('exit', () => {
      this.sessions.delete(sessionId);
      this.emit('session-closed', sessionId);
    });

    await instance.start();
    this.sessions.set(sessionId, instance);
    
    return sessionId;
  }

  sendInput(sessionId, data) {
    console.log('[MANAGER] sendInput called with:', data, 'for session:', sessionId);
    const instance = this.sessions.get(sessionId);
    if (instance) {
      console.log('[MANAGER] Found instance, writing data');
      instance.write(data);
      console.log('[MANAGER] Data written to instance');
    } else {
      console.log('[MANAGER] No instance found for session:', sessionId);
    }
  }

  getSessionContext(sessionId) {
    const instance = this.sessions.get(sessionId);
    if (instance) {
      return instance.getContext();
    }
    return null;
  }

  closeSession(sessionId) {
    const instance = this.sessions.get(sessionId);
    if (instance) {
      instance.destroy();
      this.sessions.delete(sessionId);
    }
  }

  closeAllSessions() {
    for (const [sessionId, instance] of this.sessions) {
      instance.destroy();
    }
    this.sessions.clear();
  }
}

module.exports = { TerminalProcessManager };