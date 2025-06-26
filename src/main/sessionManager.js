/**
 * Session Manager - Persist and restore terminal sessions
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

class SessionManager {
  constructor() {
    this.sessionDir = path.join(os.homedir(), '.zeami-term', 'sessions');
    this.ensureSessionDir();
  }
  
  ensureSessionDir() {
    if (!fs.existsSync(this.sessionDir)) {
      fs.mkdirSync(this.sessionDir, { recursive: true });
    }
  }
  
  saveSession(sessionData) {
    const sessionFile = path.join(this.sessionDir, 'last-session.json');
    const dataToSave = {
      timestamp: new Date().toISOString(),
      version: '1.0',
      terminals: sessionData.terminals.map(terminal => ({
        id: terminal.id,
        title: terminal.title,
        cwd: terminal.cwd,
        shell: terminal.shell,
        buffer: terminal.buffer, // Terminal content
        scrollback: terminal.scrollback,
        activeCommand: terminal.activeCommand,
        history: terminal.history
      })),
      activeTerminalId: sessionData.activeTerminalId,
      windowBounds: sessionData.windowBounds,
      splitLayout: sessionData.splitLayout
    };
    
    try {
      fs.writeFileSync(sessionFile, JSON.stringify(dataToSave, null, 2));
      console.log('[SessionManager] Session saved successfully');
      return true;
    } catch (error) {
      console.error('[SessionManager] Failed to save session:', error);
      return false;
    }
  }
  
  loadSession() {
    const sessionFile = path.join(this.sessionDir, 'last-session.json');
    
    if (!fs.existsSync(sessionFile)) {
      console.log('[SessionManager] No previous session found');
      return null;
    }
    
    try {
      const data = fs.readFileSync(sessionFile, 'utf8');
      const session = JSON.parse(data);
      
      // Check session age (optional: skip if too old)
      const sessionAge = Date.now() - new Date(session.timestamp).getTime();
      const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
      
      if (sessionAge > maxAge) {
        console.log('[SessionManager] Session too old, ignoring');
        return null;
      }
      
      console.log('[SessionManager] Session loaded successfully');
      return session;
    } catch (error) {
      console.error('[SessionManager] Failed to load session:', error);
      return null;
    }
  }
  
  clearSession() {
    const sessionFile = path.join(this.sessionDir, 'last-session.json');
    try {
      if (fs.existsSync(sessionFile)) {
        fs.unlinkSync(sessionFile);
      }
      return true;
    } catch (error) {
      console.error('[SessionManager] Failed to clear session:', error);
      return false;
    }
  }
  
  // Save command history separately
  saveHistory(terminalId, history) {
    const historyFile = path.join(this.sessionDir, `history-${terminalId}.json`);
    try {
      fs.writeFileSync(historyFile, JSON.stringify(history, null, 2));
    } catch (error) {
      console.error('[SessionManager] Failed to save history:', error);
    }
  }
  
  loadHistory(terminalId) {
    const historyFile = path.join(this.sessionDir, `history-${terminalId}.json`);
    if (!fs.existsSync(historyFile)) {
      return [];
    }
    
    try {
      const data = fs.readFileSync(historyFile, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error('[SessionManager] Failed to load history:', error);
      return [];
    }
  }
}

module.exports = { SessionManager };