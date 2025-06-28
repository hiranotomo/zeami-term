const { EventEmitter } = require('events');
const { ZeamiInstance } = require('./zeamiInstance');
const { TerminalProfileManager } = require('./profiles/TerminalProfileManager');

class TerminalProcessManager extends EventEmitter {
  constructor() {
    super();
    this.sessions = new Map();
    this.nextSessionId = 1;
    this.profileManager = new TerminalProfileManager();
    
    // Load saved profiles
    this.profileManager.loadProfiles().catch(console.error);
  }

  async createSession(options = {}) {
    const sessionId = `session-${this.nextSessionId++}`;
    
    // Get terminal options from profile
    const terminalOptions = this.profileManager.createTerminalOptions(
      options.profileId,
      {
        cwd: options.cwd,
        env: {
          TERM: 'xterm-256color',
          ZEAMI_TERM: 'true',
          ZEAMI_SHELL_INTEGRATION_PATH: require('path').join(__dirname, '../../shell-integration'),
          ...options.env
        }
      }
    );
    
    const instance = new ZeamiInstance({
      sessionId,
      shell: terminalOptions.shell,
      args: terminalOptions.args,
      cwd: terminalOptions.cwd,
      env: terminalOptions.env,
      profile: terminalOptions.profile
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
  
  // Profile management methods
  
  getProfiles() {
    return this.profileManager.getAllProfiles();
  }
  
  getProfile(id) {
    return this.profileManager.getProfile(id);
  }
  
  getDefaultProfile() {
    return this.profileManager.getDefaultProfile();
  }
  
  async addProfile(profile) {
    const newProfile = this.profileManager.addProfile(profile);
    await this.profileManager.saveProfiles();
    return newProfile;
  }
  
  async updateProfile(id, updates) {
    const updatedProfile = this.profileManager.updateProfile(id, updates);
    await this.profileManager.saveProfiles();
    return updatedProfile;
  }
  
  async deleteProfile(id) {
    const deleted = this.profileManager.deleteProfile(id);
    if (deleted) {
      await this.profileManager.saveProfiles();
    }
    return deleted;
  }
  
  async setDefaultProfile(id) {
    this.profileManager.setDefaultProfile(id);
    await this.profileManager.saveProfiles();
  }
}

module.exports = { TerminalProcessManager };