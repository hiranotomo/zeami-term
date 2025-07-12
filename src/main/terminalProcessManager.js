const { EventEmitter } = require('events');
const { ZeamiInstance } = require('./zeamiInstance');
const { TerminalProfileManager } = require('./profiles/TerminalProfileManager');
const { ShellScriptGenerator } = require('./shellIntegration/ShellScriptGenerator');
const { app } = require('electron');

class TerminalProcessManager extends EventEmitter {
  constructor() {
    super();
    this.sessions = new Map();
    this.nextSessionId = 1;
    this.profileManager = new TerminalProfileManager();
    this.shellScriptGenerator = new ShellScriptGenerator();
    
    // Initialize shell script generator
    this._initializeShellIntegration();
    
    // Load saved profiles
    this.profileManager.loadProfiles().catch(console.error);
  }

  async _initializeShellIntegration() {
    try {
      const appDataPath = app.getPath('userData');
      await this.shellScriptGenerator.initialize(appDataPath);
      console.log('[TerminalProcessManager] Shell integration scripts initialized');
    } catch (error) {
      console.error('[TerminalProcessManager] Failed to initialize shell integration:', error);
    }
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
          ZEAMI_TERM: '1',
          TERM_PROGRAM: 'ZeamiTerm',
          TERM_PROGRAM_VERSION: '0.1.0',
          ZEAMI_SHELL_INTEGRATION_PATH: require('path').join(__dirname, '../../shell-integration'),
          ...options.env
        }
      }
    );
    
    // Get shell integration command if enabled
    let shellIntegrationCmd = null;
    if (options.enableShellIntegration !== false) {
      shellIntegrationCmd = this.shellScriptGenerator.getInitCommand(terminalOptions.shell);
    }
    
    const instance = new ZeamiInstance({
      sessionId,
      shell: terminalOptions.shell,
      args: terminalOptions.args,
      cwd: terminalOptions.cwd,
      env: terminalOptions.env,
      profile: terminalOptions.profile,
      enableShellIntegration: true,  // デフォルトで有効
      shellIntegrationCmd
    });

    // Forward events
    instance.on('data', (data) => {
      this.emit('data', sessionId, data);
      // Send to monitor window if available
      if (global.monitorWindow) {
        global.monitorWindow.sendData(sessionId, 'output', data);
      }
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
      // Send to monitor window if available
      if (global.monitorWindow) {
        global.monitorWindow.sendData(sessionId, 'input', data);
      }
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
  
  // Shell integration methods
  
  async isShellIntegrationInstalled(shellPath) {
    return await this.shellScriptGenerator.isIntegrationInstalled(shellPath);
  }
  
  async installShellIntegration(shellPath) {
    return await this.shellScriptGenerator.installForShell(shellPath);
  }
  
  getShellIntegrationCommand(shellPath) {
    return this.shellScriptGenerator.getIntegrationCommand(shellPath);
  }
}

module.exports = { TerminalProcessManager };