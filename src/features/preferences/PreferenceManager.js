/**
 * PreferenceManager - Centralized preference management
 * 
 * Handles loading, saving, and applying user preferences
 */

export class PreferenceManager {
  constructor() {
    this.preferences = {};
    this.defaults = this.getDefaultPreferences();
    this.storageKey = 'zeami-terminal-preferences';
    this.listeners = new Map();
    
    // Load preferences on initialization
    this.loadPreferences();
  }

  /**
   * Get default preferences
   * @returns {Object} Default preference values
   */
  getDefaultPreferences() {
    return {
      // Terminal Settings
      terminal: {
        fontSize: 14,
        fontFamily: 'Menlo, Monaco, "Courier New", monospace',
        lineHeight: 1.2,
        cursorStyle: 'block', // block, underline, bar
        cursorBlink: true,
        scrollback: 10000,
        scrollSensitivity: 1,
        fastScrollModifier: 'shift',
        fastScrollSensitivity: 5,
        copyOnSelect: true,
        rightClickSelectsWord: true,
        wordSeparator: ' ()[]{}\'"',
        rendererType: 'webgl', // webgl, canvas, dom
        minimumContrastRatio: 4.5,
        tabStopWidth: 8,
        bellStyle: 'sound', // none, sound, visual, both
        bellSound: true,
        visualBell: false,
        shellIntegration: {
          enabled: true,
          autoPrompt: true, // Auto-prompt for shell integration on first launch
          installedShells: {} // Track which shells have integration installed
        }
      },
      
      // Theme Settings
      theme: {
        name: 'VS Code Dark',
        background: '#1e1e1e',
        foreground: '#cccccc',
        cursor: '#ffffff',
        cursorAccent: '#000000',
        selection: 'rgba(255, 255, 255, 0.3)',
        black: '#000000',
        red: '#cd3131',
        green: '#0dbc79',
        yellow: '#e5e510',
        blue: '#2472c8',
        magenta: '#bc3fbc',
        cyan: '#11a8cd',
        white: '#e5e5e5',
        brightBlack: '#666666',
        brightRed: '#f14c4c',
        brightGreen: '#23d18b',
        brightYellow: '#f5f543',
        brightBlue: '#3b8eea',
        brightMagenta: '#d670d6',
        brightCyan: '#29b8db',
        brightWhite: '#e5e5e5'
      },
      
      // Shell & Profile Settings
      shell: {
        defaultProfile: 'system',
        env: {},
        args: [],
        cwd: '',
        useSystemPath: true
      },
      
      // Session Settings
      session: {
        autoSave: true,
        autoSaveInterval: 30000, // 30 seconds
        restoreOnStartup: true,
        saveCommandHistory: true,
        maxHistorySize: 1000,
        excludeFromHistory: ['clear', 'exit', 'logout'],
        recordingQuality: 'balanced', // minimal, balanced, full
        compressRecordings: false,
        // Session management
        enableRealtimeLog: true,
        maxSessions: 100,
        sessionDirectory: '~/.zeami-term/sessions'
      },
      
      // Notification Settings
      notifications: {
        enabled: true,
        longCommandThreshold: 5000, // 5 seconds (temporarily lowered for testing)
        onlyWhenUnfocused: true,
        
        // Claude Code specific settings
        claudeCode: {
          enabled: true,
          threshold: 3000, // 3 seconds for Claude (temporarily lowered for testing)
          sound: 'Ping',
          detectPattern: ['claude', 'Claude Code']
        },
        
        // Notification types
        types: {
          command: {
            enabled: true,
            sound: 'Glass'
          },
          error: {
            enabled: true,
            sound: 'Basso'
          },
          buildSuccess: {
            enabled: true,
            sound: 'Hero'
          }
        },
        
        // Sound settings
        sounds: {
          enabled: true,
          volume: 0.5
        }
      },
      
      // Window Settings
      window: {
        transparent: false,
        opacity: 1.0,
        blurBackground: false,
        vibrancy: 'none', // none, light, dark, titlebar, selection, menu, popover, sidebar, header
        alwaysOnTop: false,
        fullscreenMode: 'native', // native, simple
        confirmOnClose: true
      },
      
      // Keyboard Settings
      keyboard: {
        shortcuts: {
          'new-terminal': 'Cmd+T',
          'close-terminal': 'Cmd+W',
          'next-terminal': 'Cmd+]',
          'prev-terminal': 'Cmd+[',
          'clear-terminal': 'Cmd+K',
          'find': 'Cmd+F',
          'split-horizontal': 'Cmd+D',
          'split-vertical': 'Cmd+Shift+D',
          'toggle-fullscreen': 'Cmd+Enter',
          'increase-font-size': 'Cmd+Plus',
          'decrease-font-size': 'Cmd+Minus',
          'reset-font-size': 'Cmd+0'
        },
        macOptionIsMeta: true,
        macOptionClickForcesSelection: false,
        altClickMovesCursor: true
      },
      
      // Advanced Settings
      advanced: {
        debugging: {
          logLevel: 'info', // error, warn, info, debug
          logToFile: false
        },
        experimental: {
          useWebGL2: true,
          sixelSupport: false,
          imageSupport: false,
          unicodeVersion: '11'
        },
        shellIntegration: {
          enabled: true,  // 自動的にシェル統合を注入
          delay: 500,     // 注入前の待機時間（ミリ秒）
          clearAfterInject: true  // 注入後に画面をクリア
        }
      }
    };
  }

  /**
   * Load preferences from storage
   */
  loadPreferences() {
    try {
      // Check if running in renderer process
      if (typeof window !== 'undefined' && window.localStorage) {
        const stored = localStorage.getItem(this.storageKey);
        if (stored) {
          const parsed = JSON.parse(stored);
          this.preferences = this.mergePreferences(this.defaults, parsed);
        } else {
          this.preferences = { ...this.defaults };
        }
      } else {
        // Main process - use defaults for now
        // TODO: Implement file-based storage for main process
        this.preferences = { ...this.defaults };
      }
    } catch (error) {
      console.error('[PreferenceManager] Error loading preferences:', error);
      this.preferences = { ...this.defaults };
    }
  }

  /**
   * Save preferences to storage
   */
  savePreferences() {
    try {
      // Check if running in renderer process
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(this.storageKey, JSON.stringify(this.preferences));
      } else {
        // Main process - TODO: Implement file-based storage
        console.log('[PreferenceManager] Main process storage not yet implemented');
      }
      this.notifyListeners('save', this.preferences);
    } catch (error) {
      console.error('[PreferenceManager] Error saving preferences:', error);
    }
  }

  /**
   * Merge preferences with defaults (deep merge)
   */
  mergePreferences(defaults, stored) {
    const merged = { ...defaults };
    
    for (const key in stored) {
      if (stored.hasOwnProperty(key)) {
        if (typeof stored[key] === 'object' && !Array.isArray(stored[key])) {
          merged[key] = this.mergePreferences(defaults[key] || {}, stored[key]);
        } else {
          merged[key] = stored[key];
        }
      }
    }
    
    return merged;
  }

  /**
   * Get preference value
   * @param {string} path - Dot notation path (e.g., 'terminal.fontSize')
   * @returns {*} Preference value
   */
  get(path) {
    const keys = path.split('.');
    let value = this.preferences;
    
    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else {
        return undefined;
      }
    }
    
    return value;
  }

  /**
   * Set preference value
   * @param {string} path - Dot notation path
   * @param {*} value - New value
   */
  set(path, value) {
    // Validate specific preferences
    if (path === 'terminal.fontSize') {
      value = Math.max(8, Math.min(32, value)); // Clamp between 8 and 32
    } else if (path === 'terminal.scrollback') {
      value = Math.max(100, Math.min(999999, value)); // Clamp between 100 and 999999
    } else if (path === 'terminal.lineHeight') {
      value = Math.max(1, Math.min(2, value)); // Clamp between 1 and 2
    } else if (path === 'window.opacity') {
      value = Math.max(0.1, Math.min(1, value)); // Clamp between 0.1 and 1
    }
    
    const keys = path.split('.');
    const lastKey = keys.pop();
    let target = this.preferences;
    
    for (const key of keys) {
      if (!target[key] || typeof target[key] !== 'object') {
        target[key] = {};
      }
      target = target[key];
    }
    
    const oldValue = target[lastKey];
    target[lastKey] = value;
    
    this.savePreferences();
    this.notifyListeners(path, value, oldValue);
  }

  /**
   * Reset preferences to defaults
   * @param {string} section - Optional section to reset
   */
  reset(section = null) {
    if (section) {
      if (this.defaults[section]) {
        this.preferences[section] = { ...this.defaults[section] };
      }
    } else {
      this.preferences = { ...this.defaults };
    }
    
    this.savePreferences();
    this.notifyListeners('reset', section);
  }

  /**
   * Export preferences
   * @returns {string} JSON string of preferences
   */
  export() {
    return JSON.stringify(this.preferences, null, 2);
  }

  /**
   * Import preferences
   * @param {string} jsonString - JSON string of preferences
   */
  import(jsonString) {
    try {
      const imported = JSON.parse(jsonString);
      this.preferences = this.mergePreferences(this.defaults, imported);
      this.savePreferences();
      this.notifyListeners('import', this.preferences);
    } catch (error) {
      throw new Error(`Failed to import preferences: ${error.message}`);
    }
  }

  /**
   * Add preference change listener
   * @param {string} path - Path to watch (or '*' for all)
   * @param {Function} callback - Callback function
   * @returns {Function} Unsubscribe function
   */
  on(path, callback) {
    if (!this.listeners.has(path)) {
      this.listeners.set(path, new Set());
    }
    
    this.listeners.get(path).add(callback);
    
    // Return unsubscribe function
    return () => {
      const callbacks = this.listeners.get(path);
      if (callbacks) {
        callbacks.delete(callback);
        if (callbacks.size === 0) {
          this.listeners.delete(path);
        }
      }
    };
  }

  /**
   * Notify listeners of preference changes
   */
  notifyListeners(path, value, oldValue) {
    // Notify specific path listeners
    const pathListeners = this.listeners.get(path);
    if (pathListeners) {
      pathListeners.forEach(callback => {
        callback(value, oldValue, path);
      });
    }
    
    // Notify wildcard listeners
    const wildcardListeners = this.listeners.get('*');
    if (wildcardListeners) {
      wildcardListeners.forEach(callback => {
        callback(value, oldValue, path);
      });
    }
    
    // Notify parent path listeners
    const parts = path.split('.');
    for (let i = parts.length - 1; i > 0; i--) {
      const parentPath = parts.slice(0, i).join('.');
      const parentListeners = this.listeners.get(parentPath);
      if (parentListeners) {
        parentListeners.forEach(callback => {
          callback(this.get(parentPath), oldValue, path);
        });
      }
    }
  }

  /**
   * Get all preferences
   * @returns {Object} All preferences
   */
  getAll() {
    return { ...this.preferences };
  }

  /**
   * Get preferences for a section
   * @param {string} section - Section name
   * @returns {Object} Section preferences
   */
  getSection(section) {
    return this.preferences[section] ? { ...this.preferences[section] } : null;
  }

  /**
   * Apply theme to terminal
   * @param {Terminal} terminal - xterm.js terminal instance
   */
  applyTheme(terminal) {
    const theme = this.getSection('theme');
    if (theme && terminal.options) {
      terminal.options.theme = theme;
    }
  }

  /**
   * Apply terminal settings
   * @param {Terminal} terminal - xterm.js terminal instance
   */
  applyTerminalSettings(terminal) {
    const settings = this.getSection('terminal');
    if (settings && terminal.options) {
      Object.keys(settings).forEach(key => {
        if (key !== 'theme') {
          terminal.options[key] = settings[key];
        }
      });
    }
  }
}