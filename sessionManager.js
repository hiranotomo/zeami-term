/**
 * Session Manager - Handles terminal session persistence
 * Saves and restores terminal state across app restarts
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

class SessionManager {
  constructor() {
    this.sessionDir = path.join(os.homedir(), '.zeamiterm');
    this.sessionFile = path.join(this.sessionDir, 'session.json');
    this.ensureSessionDir();
  }

  ensureSessionDir() {
    if (!fs.existsSync(this.sessionDir)) {
      fs.mkdirSync(this.sessionDir, { recursive: true });
    }
  }

  saveSession(sessionData) {
    try {
      const dataToSave = {
        timestamp: new Date().toISOString(),
        version: '1.0',
        terminals: sessionData.terminals.map(terminal => ({
          id: terminal.id,
          title: terminal.title,
          cwd: terminal.cwd,
          shell: terminal.shell,
          buffer: terminal.buffer ? terminal.buffer.substring(0, 100000) : '', // Limit buffer size
          scrollback: terminal.scrollback || 0,
          cols: terminal.cols || 80,
          rows: terminal.rows || 30
        })),
        activeTerminalId: sessionData.activeTerminalId,
        windowBounds: sessionData.windowBounds,
        splitLayout: sessionData.splitLayout
      };

      fs.writeFileSync(this.sessionFile, JSON.stringify(dataToSave, null, 2));
      console.log('[SessionManager] Session saved successfully');
      return true;
    } catch (error) {
      console.error('[SessionManager] Failed to save session:', error);
      return false;
    }
  }

  loadSession() {
    try {
      if (!fs.existsSync(this.sessionFile)) {
        console.log('[SessionManager] No previous session found');
        return null;
      }

      const data = fs.readFileSync(this.sessionFile, 'utf8');
      const session = JSON.parse(data);

      // Validate session data
      if (!session.version || !session.terminals) {
        console.warn('[SessionManager] Invalid session data');
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
    try {
      if (fs.existsSync(this.sessionFile)) {
        fs.unlinkSync(this.sessionFile);
        console.log('[SessionManager] Session cleared');
      }
    } catch (error) {
      console.error('[SessionManager] Failed to clear session:', error);
    }
  }

  // Save window bounds
  saveWindowBounds(bounds) {
    try {
      const boundsFile = path.join(this.sessionDir, 'window-bounds.json');
      fs.writeFileSync(boundsFile, JSON.stringify(bounds, null, 2));
    } catch (error) {
      console.error('[SessionManager] Failed to save window bounds:', error);
    }
  }

  loadWindowBounds() {
    try {
      const boundsFile = path.join(this.sessionDir, 'window-bounds.json');
      if (fs.existsSync(boundsFile)) {
        const data = fs.readFileSync(boundsFile, 'utf8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.error('[SessionManager] Failed to load window bounds:', error);
    }
    return null;
  }
}

module.exports = SessionManager;