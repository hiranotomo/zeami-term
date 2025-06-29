/**
 * PreferenceWindow - Settings UI component
 */

import { PreferenceManager } from '../../features/preferences/PreferenceManager.js';

export class PreferenceWindow {
  constructor(preferenceManager = null) {
    // Use the provided preference manager or create a new one
    this.preferenceManager = preferenceManager || new PreferenceManager();
    this.isOpen = false;
    this.activeCategory = 'terminal';
    this.unsavedChanges = {};
    
    // Categories configuration
    this.categories = [
      { id: 'terminal', name: 'Terminal', icon: '⌨️' },
      { id: 'appearance', name: 'Appearance', icon: '🎨' },
      { id: 'shell', name: 'Shell & Profiles', icon: '🐚' },
      { id: 'session', name: 'Session', icon: '💾' },
      { id: 'keyboard', name: 'Keyboard', icon: '⌨️' },
      { id: 'notifications', name: 'Notifications', icon: '🔔' },
      // Window settings hidden from UI but kept in PreferenceManager
      // { id: 'window', name: 'Window', icon: '🪟' },
      { id: 'advanced', name: 'Advanced', icon: '⚙️' }
    ];
    
    // Theme presets
    this.themePresets = {
      'VS Code Dark': {
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
      'VS Code Light': {
        background: '#ffffff',
        foreground: '#333333',
        cursor: '#000000',
        cursorAccent: '#ffffff',
        selection: 'rgba(0, 0, 0, 0.15)',
        black: '#000000',
        red: '#cd3131',
        green: '#00bc00',
        yellow: '#949800',
        blue: '#0451a5',
        magenta: '#bc05bc',
        cyan: '#0598bc',
        white: '#555555',
        brightBlack: '#666666',
        brightRed: '#cd3131',
        brightGreen: '#14ce14',
        brightYellow: '#b5ba00',
        brightBlue: '#0451a5',
        brightMagenta: '#bc05bc',
        brightCyan: '#0598bc',
        brightWhite: '#a5a5a5'
      },
      'Monokai': {
        background: '#272822',
        foreground: '#f8f8f2',
        cursor: '#f8f8f0',
        cursorAccent: '#272822',
        selection: 'rgba(255, 255, 255, 0.2)',
        black: '#272822',
        red: '#f92672',
        green: '#a6e22e',
        yellow: '#f4bf75',
        blue: '#66d9ef',
        magenta: '#ae81ff',
        cyan: '#a1efe4',
        white: '#f8f8f2',
        brightBlack: '#75715e',
        brightRed: '#f92672',
        brightGreen: '#a6e22e',
        brightYellow: '#f4bf75',
        brightBlue: '#66d9ef',
        brightMagenta: '#ae81ff',
        brightCyan: '#a1efe4',
        brightWhite: '#f9f8f5'
      },
      'Solarized Dark': {
        background: '#002b36',
        foreground: '#839496',
        cursor: '#839496',
        cursorAccent: '#002b36',
        selection: 'rgba(255, 255, 255, 0.15)',
        black: '#073642',
        red: '#dc322f',
        green: '#859900',
        yellow: '#b58900',
        blue: '#268bd2',
        magenta: '#d33682',
        cyan: '#2aa198',
        white: '#eee8d5',
        brightBlack: '#002b36',
        brightRed: '#cb4b16',
        brightGreen: '#586e75',
        brightYellow: '#657b83',
        brightBlue: '#839496',
        brightMagenta: '#6c71c4',
        brightCyan: '#93a1a1',
        brightWhite: '#fdf6e3'
      }
    };
    
    this.init();
  }

  init() {
    // Load CSS
    this.loadStyles();
    
    // Listen for preference changes
    this.preferenceManager.on('*', (value, oldValue, path) => {
      this.onPreferenceChange(path, value, oldValue);
    });
  }

  loadStyles() {
    if (!document.querySelector('#preference-styles')) {
      const link = document.createElement('link');
      link.id = 'preference-styles';
      link.rel = 'stylesheet';
      link.href = './styles/preferences.css';
      document.head.appendChild(link);
    }
  }

  open() {
    if (this.isOpen) return;
    
    this.isOpen = true;
    this.unsavedChanges = {};
    this.render();
    this.switchCategory(this.activeCategory);
  }

  close() {
    if (!this.isOpen) return;
    
    // Check for unsaved changes
    if (Object.keys(this.unsavedChanges).length > 0) {
      if (!confirm('You have unsaved changes. Close anyway?')) {
        return;
      }
    }
    
    this.isOpen = false;
    const container = document.querySelector('.preference-container');
    if (container) {
      container.remove();
    }
  }

  render() {
    // Create container
    const container = document.createElement('div');
    container.className = 'preference-container';
    container.innerHTML = `
      <div class="preference-overlay"></div>
      <div class="preference-window">
        <div class="preference-header">
          <h1 class="preference-title">Preferences</h1>
          <button class="preference-close">×</button>
        </div>
        <div class="preference-content">
          <div class="preference-sidebar">
            ${this.renderSidebar()}
          </div>
          <div class="preference-panels">
            ${this.renderPanels()}
          </div>
        </div>
        <div class="preference-footer">
          <div class="preference-footer-left">
            <button class="preference-button" id="pref-reset">Reset to Defaults</button>
            <button class="preference-button" id="pref-export">Export...</button>
            <button class="preference-button" id="pref-import">Import...</button>
          </div>
          <div class="preference-footer-right">
            <button class="preference-button" id="pref-cancel">Cancel</button>
            <button class="preference-button" id="pref-apply">Apply</button>
            <button class="preference-button primary" id="pref-save">Save</button>
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(container);
    
    // Attach event listeners
    this.attachEventListeners();
  }

  renderSidebar() {
    return this.categories.map(cat => `
      <div class="preference-category ${cat.id === this.activeCategory ? 'active' : ''}" 
           data-category="${cat.id}">
        <span class="preference-category-icon">${cat.icon}</span>
        <span>${cat.name}</span>
      </div>
    `).join('');
  }

  renderPanels() {
    return this.categories.map(cat => `
      <div class="preference-panel ${cat.id === this.activeCategory ? 'active' : ''}" 
           data-panel="${cat.id}">
        ${this.renderPanel(cat.id)}
      </div>
    `).join('');
  }

  renderPanel(categoryId) {
    switch (categoryId) {
      case 'terminal':
        return this.renderTerminalPanel();
      case 'appearance':
        return this.renderAppearancePanel();
      case 'shell':
        return this.renderShellPanel();
      case 'session':
        return this.renderSessionPanel();
      case 'keyboard':
        return this.renderKeyboardPanel();
      case 'notifications':
        return this.renderNotificationsPanel();
      // Window panel hidden from UI
      // case 'window':
      //   return this.renderWindowPanel();
      case 'advanced':
        return this.renderAdvancedPanel();
      default:
        return '<p>No settings available</p>';
    }
  }

  renderTerminalPanel() {
    const prefs = this.preferenceManager.getSection('terminal');
    return `
      <h2>Terminal Settings</h2>
      
      <div class="preference-group">
        <h3>Font</h3>
        <div class="preference-field">
          <label class="preference-label">Font Family</label>
          <input type="text" class="preference-input" 
                 data-pref="terminal.fontFamily" 
                 value="${prefs.fontFamily}">
        </div>
        <div class="preference-field">
          <label class="preference-label">Font Size</label>
          <input type="number" class="preference-input" 
                 data-pref="terminal.fontSize" 
                 value="${prefs.fontSize}" min="8" max="32">
          <span class="preference-slider-value">px</span>
        </div>
        <div class="preference-field">
          <label class="preference-label">Line Height</label>
          <input type="range" class="preference-slider" 
                 data-pref="terminal.lineHeight" 
                 value="${prefs.lineHeight}" min="1" max="2" step="0.1">
          <span class="preference-slider-value">${prefs.lineHeight}</span>
        </div>
      </div>
      
      <div class="preference-group">
        <h3>Cursor</h3>
        <div class="preference-field">
          <label class="preference-label">Cursor Style</label>
          <select class="preference-select" data-pref="terminal.cursorStyle">
            <option value="block" ${prefs.cursorStyle === 'block' ? 'selected' : ''}>Block</option>
            <option value="underline" ${prefs.cursorStyle === 'underline' ? 'selected' : ''}>Underline</option>
            <option value="bar" ${prefs.cursorStyle === 'bar' ? 'selected' : ''}>Bar</option>
          </select>
        </div>
        <div class="preference-field">
          <label class="preference-label">
            <input type="checkbox" class="preference-checkbox" 
                   data-pref="terminal.cursorBlink" 
                   ${prefs.cursorBlink ? 'checked' : ''}>
            Cursor Blink
          </label>
        </div>
      </div>
      
      <div class="preference-group">
        <h3>Scrolling</h3>
        <div class="preference-field">
          <label class="preference-label">Scrollback Buffer</label>
          <input type="number" class="preference-input" 
                 data-pref="terminal.scrollback" 
                 value="${prefs.scrollback}" min="100" max="999999">
          <span class="preference-slider-value">lines</span>
        </div>
        <div class="preference-field">
          <label class="preference-label">Scroll Sensitivity</label>
          <input type="range" class="preference-slider" 
                 data-pref="terminal.scrollSensitivity" 
                 value="${prefs.scrollSensitivity}" min="0.1" max="3" step="0.1">
          <span class="preference-slider-value">${prefs.scrollSensitivity}</span>
        </div>
        <div class="preference-field">
          <label class="preference-label">Fast Scroll Modifier</label>
          <select class="preference-select" data-pref="terminal.fastScrollModifier">
            <option value="alt" ${prefs.fastScrollModifier === 'alt' ? 'selected' : ''}>Alt</option>
            <option value="shift" ${prefs.fastScrollModifier === 'shift' ? 'selected' : ''}>Shift</option>
            <option value="ctrl" ${prefs.fastScrollModifier === 'ctrl' ? 'selected' : ''}>Ctrl</option>
          </select>
        </div>
      </div>
      
      <div class="preference-group">
        <h3>Behavior</h3>
        <div class="preference-field">
          <label class="preference-label">
            <input type="checkbox" class="preference-checkbox" 
                   data-pref="terminal.copyOnSelect" 
                   ${prefs.copyOnSelect ? 'checked' : ''}>
            Copy on Select
          </label>
        </div>
        <div class="preference-field">
          <label class="preference-label">
            <input type="checkbox" class="preference-checkbox" 
                   data-pref="terminal.rightClickSelectsWord" 
                   ${prefs.rightClickSelectsWord ? 'checked' : ''}>
            Right Click Selects Word
          </label>
        </div>
        <div class="preference-field">
          <label class="preference-label">Word Separators</label>
          <input type="text" class="preference-input" 
                 data-pref="terminal.wordSeparator" 
                 value="${prefs.wordSeparator}">
        </div>
      </div>
      
      <div class="preference-group">
        <h3>Renderer</h3>
        <div class="preference-field">
          <label class="preference-label">Renderer Type</label>
          <select class="preference-select" data-pref="terminal.rendererType">
            <option value="webgl" ${prefs.rendererType === 'webgl' ? 'selected' : ''}>WebGL (Recommended)</option>
            <option value="canvas" ${prefs.rendererType === 'canvas' ? 'selected' : ''}>Canvas</option>
            <option value="dom" ${prefs.rendererType === 'dom' ? 'selected' : ''}>DOM</option>
          </select>
        </div>
      </div>
    `;
  }

  renderAppearancePanel() {
    const theme = this.preferenceManager.getSection('theme');
    return `
      <h2>Appearance</h2>
      
      <div class="preference-group">
        <h3>Theme</h3>
        <div class="preference-field">
          <label class="preference-label">Theme</label>
          <select class="preference-select" data-pref="theme.name">
            <option value="VS Code Dark" ${theme.name === 'VS Code Dark' ? 'selected' : ''}>VS Code Dark</option>
            <option value="VS Code Light" ${theme.name === 'VS Code Light' ? 'selected' : ''}>VS Code Light</option>
            <option value="Monokai" ${theme.name === 'Monokai' ? 'selected' : ''}>Monokai</option>
            <option value="Solarized Dark" ${theme.name === 'Solarized Dark' ? 'selected' : ''}>Solarized Dark</option>
            <option value="Custom" ${theme.name === 'Custom' ? 'selected' : ''}>Custom</option>
          </select>
        </div>
      </div>
      
      <div class="preference-group">
        <h3>Colors</h3>
        <div class="preference-field">
          <label class="preference-label">Background</label>
          <input type="color" class="preference-color" 
                 data-pref="theme.background" 
                 value="${theme.background}">
          <input type="text" class="preference-input" 
                 data-pref="theme.background" 
                 value="${theme.background}" style="width: 100px;">
        </div>
        <div class="preference-field">
          <label class="preference-label">Foreground</label>
          <input type="color" class="preference-color" 
                 data-pref="theme.foreground" 
                 value="${theme.foreground}">
          <input type="text" class="preference-input" 
                 data-pref="theme.foreground" 
                 value="${theme.foreground}" style="width: 100px;">
        </div>
        <div class="preference-field">
          <label class="preference-label">Cursor</label>
          <input type="color" class="preference-color" 
                 data-pref="theme.cursor" 
                 value="${theme.cursor}">
          <input type="text" class="preference-input" 
                 data-pref="theme.cursor" 
                 value="${theme.cursor}" style="width: 100px;">
        </div>
        <div class="preference-field">
          <label class="preference-label">Selection</label>
          <input type="text" class="preference-input" 
                 data-pref="theme.selection" 
                 value="${theme.selection}">
        </div>
      </div>
      
      <div class="preference-group">
        <h3>ANSI Colors</h3>
        ${['black', 'red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'white'].map(color => `
          <div class="preference-field">
            <label class="preference-label">${color.charAt(0).toUpperCase() + color.slice(1)}</label>
            <input type="color" class="preference-color" 
                   data-pref="theme.${color}" 
                   value="${theme[color]}">
            <input type="text" class="preference-input" 
                   data-pref="theme.${color}" 
                   value="${theme[color]}" style="width: 80px;">
            <input type="color" class="preference-color" 
                   data-pref="theme.bright${color.charAt(0).toUpperCase() + color.slice(1)}" 
                   value="${theme['bright' + color.charAt(0).toUpperCase() + color.slice(1)]}">
            <input type="text" class="preference-input" 
                   data-pref="theme.bright${color.charAt(0).toUpperCase() + color.slice(1)}" 
                   value="${theme['bright' + color.charAt(0).toUpperCase() + color.slice(1)]}" style="width: 80px;">
          </div>
        `).join('')}
      </div>
      
      <div class="preference-group">
        <h3>Preview</h3>
        <div class="theme-preview" style="background-color: ${theme.background}; padding: 12px; border-radius: 4px; font-family: monospace; font-size: 13px;">
          <div class="theme-preview-line">
            <span style="color: ${theme.foreground}">$ </span>
            <span style="color: ${theme.green}">npm</span>
            <span style="color: ${theme.foreground}"> install</span>
          </div>
          <div class="theme-preview-line">
            <span style="color: ${theme.brightBlack}">added 125 packages in 2.5s</span>
          </div>
          <div class="theme-preview-line">
            <span style="color: ${theme.foreground}">$ </span>
            <span style="color: ${theme.yellow}">git</span>
            <span style="color: ${theme.foreground}"> status</span>
          </div>
          <div class="theme-preview-line">
            <span style="color: ${theme.red}">modified:</span>
            <span style="color: ${theme.foreground}">   src/index.js</span>
          </div>
        </div>
      </div>
    `;
  }

  renderShellPanel() {
    const shell = this.preferenceManager.getSection('shell');
    return `
      <h2>Shell & Profiles</h2>
      
      <div class="preference-group">
        <h3>Default Profile</h3>
        <div class="preference-field">
          <label class="preference-label">Default Profile</label>
          <select class="preference-select" data-pref="shell.defaultProfile">
            <option value="system" ${shell.defaultProfile === 'system' ? 'selected' : ''}>System Default</option>
            <option value="bash" ${shell.defaultProfile === 'bash' ? 'selected' : ''}>Bash</option>
            <option value="zsh" ${shell.defaultProfile === 'zsh' ? 'selected' : ''}>Zsh</option>
            <option value="fish" ${shell.defaultProfile === 'fish' ? 'selected' : ''}>Fish</option>
            <option value="powershell" ${shell.defaultProfile === 'powershell' ? 'selected' : ''}>PowerShell</option>
          </select>
        </div>
      </div>
      
      <div class="preference-group">
        <h3>Shell Settings</h3>
        <div class="preference-field vertical">
          <label class="preference-label">
            Working Directory
            <div class="preference-label-hint">Leave empty for user home directory</div>
          </label>
          <input type="text" class="preference-input" 
                 data-pref="shell.cwd" 
                 value="${shell.cwd}" 
                 placeholder="~">
        </div>
        <div class="preference-field">
          <label class="preference-label">
            <input type="checkbox" class="preference-checkbox" 
                   data-pref="shell.useSystemPath" 
                   ${shell.useSystemPath ? 'checked' : ''}>
            Use System PATH
          </label>
        </div>
      </div>
    `;
  }

  renderSessionPanel() {
    const session = this.preferenceManager.getSection('session');
    return `
      <h2>Session Settings</h2>
      
      <div class="preference-group">
        <h3>Session Management</h3>
        <div class="preference-field">
          <button class="preference-button primary" id="open-session-manager" onclick="window.sessionManager && window.sessionManager.open()">
            Open Session Manager
          </button>
          <p class="preference-label-hint">View, play, and manage saved sessions</p>
        </div>
        <div class="preference-field">
          <label class="preference-label">
            <input type="checkbox" class="preference-checkbox" 
                   data-pref="session.enableRealtimeLog" 
                   ${session.enableRealtimeLog ? 'checked' : ''}>
            Enable Real-time Session Logging
          </label>
          <p class="preference-label-hint">Automatically log all terminal sessions</p>
        </div>
        <div class="preference-field">
          <label class="preference-label">Max Sessions to Keep</label>
          <input type="number" class="preference-input" 
                 data-pref="session.maxSessions" 
                 value="${session.maxSessions}" min="10" max="1000">
          <span class="preference-slider-value">sessions</span>
        </div>
        <div class="preference-field vertical">
          <label class="preference-label">
            Session Directory
            <div class="preference-label-hint">Where to store session files</div>
          </label>
          <input type="text" class="preference-input" 
                 data-pref="session.sessionDirectory" 
                 value="${session.sessionDirectory}" 
                 placeholder="~/.zeami-term/sessions">
        </div>
      </div>
      
      <div class="preference-group">
        <h3>Auto Save</h3>
        <div class="preference-field">
          <label class="preference-label">
            <input type="checkbox" class="preference-checkbox" 
                   data-pref="session.autoSave" 
                   ${session.autoSave ? 'checked' : ''}>
            Enable Auto Save
          </label>
        </div>
        <div class="preference-field">
          <label class="preference-label">Auto Save Interval</label>
          <input type="number" class="preference-input" 
                 data-pref="session.autoSaveInterval" 
                 value="${session.autoSaveInterval / 1000}" min="10" max="300">
          <span class="preference-slider-value">seconds</span>
        </div>
        <div class="preference-field">
          <label class="preference-label">
            <input type="checkbox" class="preference-checkbox" 
                   data-pref="session.restoreOnStartup" 
                   ${session.restoreOnStartup ? 'checked' : ''}>
            Restore Session on Startup
          </label>
        </div>
      </div>
      
      <div class="preference-group">
        <h3>Command History</h3>
        <div class="preference-field">
          <label class="preference-label">
            <input type="checkbox" class="preference-checkbox" 
                   data-pref="session.saveCommandHistory" 
                   ${session.saveCommandHistory ? 'checked' : ''}>
            Save Command History
          </label>
        </div>
        <div class="preference-field">
          <label class="preference-label">Max History Size</label>
          <input type="number" class="preference-input" 
                 data-pref="session.maxHistorySize" 
                 value="${session.maxHistorySize}" min="100" max="10000">
          <span class="preference-slider-value">commands</span>
        </div>
      </div>
      
      <div class="preference-group">
        <h3>Recording Quality</h3>
        <div class="preference-field">
          <label class="preference-label">Recording Quality</label>
          <select class="preference-select" data-pref="session.recordingQuality">
            <option value="minimal" ${session.recordingQuality === 'minimal' ? 'selected' : ''}>Minimal (Output only)</option>
            <option value="balanced" ${session.recordingQuality === 'balanced' ? 'selected' : ''}>Balanced</option>
            <option value="full" ${session.recordingQuality === 'full' ? 'selected' : ''}>Full (Including input)</option>
          </select>
        </div>
        <div class="preference-field">
          <label class="preference-label">
            <input type="checkbox" class="preference-checkbox" 
                   data-pref="session.compressRecordings" 
                   ${session.compressRecordings ? 'checked' : ''}>
            Compress Recordings by Default
          </label>
        </div>
      </div>
    `;
  }

  renderKeyboardPanel() {
    const keyboard = this.preferenceManager.getSection('keyboard');
    return `
      <h2>Keyboard Settings</h2>
      
      <div class="preference-group">
        <h3>Shortcuts</h3>
        <table class="shortcuts-table">
          <thead>
            <tr>
              <th>Action</th>
              <th>Shortcut</th>
            </tr>
          </thead>
          <tbody>
            ${Object.entries(keyboard.shortcuts).map(([action, shortcut]) => `
              <tr>
                <td>${action.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</td>
                <td>
                  <input type="text" class="shortcut-input" 
                         data-pref="keyboard.shortcuts.${action}" 
                         value="${shortcut}">
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      
      <div class="preference-group">
        <h3>macOS Options</h3>
        <div class="preference-field">
          <label class="preference-label">
            <input type="checkbox" class="preference-checkbox" 
                   data-pref="keyboard.macOptionIsMeta" 
                   ${keyboard.macOptionIsMeta ? 'checked' : ''}>
            Use Option as Meta Key
          </label>
        </div>
        <div class="preference-field">
          <label class="preference-label">
            <input type="checkbox" class="preference-checkbox" 
                   data-pref="keyboard.macOptionClickForcesSelection" 
                   ${keyboard.macOptionClickForcesSelection ? 'checked' : ''}>
            Option+Click Forces Selection
          </label>
        </div>
      </div>
    `;
  }

  renderNotificationsPanel() {
    const prefs = this.preferenceManager.getSection('notifications');
    return `
      <h2>通知設定</h2>
      
      <div class="preference-group">
        <h3>基本設定</h3>
        <div class="preference-field">
          <label class="preference-label">
            <input type="checkbox" class="preference-checkbox" 
                   data-pref="notifications.enabled" 
                   ${prefs.enabled ? 'checked' : ''}>
            長時間処理の完了を通知
          </label>
          <p class="preference-label-hint">コマンド実行が指定時間を超えた場合に通知します</p>
        </div>
        <div class="preference-field">
          <label class="preference-label">
            <input type="checkbox" class="preference-checkbox" 
                   data-pref="notifications.onlyWhenUnfocused" 
                   ${prefs.onlyWhenUnfocused ? 'checked' : ''}>
            ウィンドウがフォーカスされていない時のみ通知
          </label>
        </div>
        <div class="preference-field">
          <label class="preference-label">
            <input type="checkbox" class="preference-checkbox" 
                   data-pref="notifications.sounds.enabled" 
                   ${prefs.sounds.enabled ? 'checked' : ''}>
            通知音を鳴らす
          </label>
        </div>
      </div>
      
      <div class="preference-group">
        <h3>通知閾値</h3>
        <div class="preference-field">
          <label class="preference-label">通常のコマンド</label>
          <input type="number" class="preference-input" 
                 data-pref="notifications.longCommandThreshold" 
                 value="${prefs.longCommandThreshold / 1000}" min="5" max="300">
          <span class="preference-slider-value">秒以上</span>
        </div>
        <div class="preference-field">
          <label class="preference-label">Claude Code</label>
          <input type="number" class="preference-input" 
                 data-pref="notifications.claudeCode.threshold" 
                 value="${prefs.claudeCode.threshold / 1000}" min="3" max="60">
          <span class="preference-slider-value">秒以上</span>
          <p class="preference-label-hint">Claude Codeコマンドは短い時間でも通知</p>
        </div>
      </div>
      
      <div class="preference-group">
        <h3>Claude Code専用設定</h3>
        <div class="preference-field">
          <label class="preference-label">
            <input type="checkbox" class="preference-checkbox" 
                   data-pref="notifications.claudeCode.enabled" 
                   ${prefs.claudeCode.enabled ? 'checked' : ''}>
            Claude Code実行を特別扱い
          </label>
        </div>
        ${process.platform === 'darwin' ? `
        <div class="preference-field">
          <label class="preference-label">Claude Code通知音</label>
          <select class="preference-select" data-pref="notifications.claudeCode.sound">
            <option value="Glass" ${prefs.claudeCode.sound === 'Glass' ? 'selected' : ''}>Glass（デフォルト）</option>
            <option value="Ping" ${prefs.claudeCode.sound === 'Ping' ? 'selected' : ''}>Ping（推奨）</option>
            <option value="Hero" ${prefs.claudeCode.sound === 'Hero' ? 'selected' : ''}>Hero</option>
            <option value="Tink" ${prefs.claudeCode.sound === 'Tink' ? 'selected' : ''}>Tink</option>
            <option value="none" ${prefs.claudeCode.sound === 'none' ? 'selected' : ''}>無音</option>
          </select>
        </div>
        ` : ''}
      </div>
      
      ${process.platform === 'darwin' ? `
      <div class="preference-group">
        <h3>通知タイプ別設定</h3>
        <div class="preference-field">
          <label class="preference-label">
            <input type="checkbox" class="preference-checkbox" 
                   data-pref="notifications.types.command.enabled" 
                   ${prefs.types.command.enabled ? 'checked' : ''}>
            コマンド完了
          </label>
          <select class="preference-select" style="margin-left: 10px" data-pref="notifications.types.command.sound">
            <option value="Glass" ${prefs.types.command.sound === 'Glass' ? 'selected' : ''}>Glass</option>
            <option value="Tink" ${prefs.types.command.sound === 'Tink' ? 'selected' : ''}>Tink</option>
            <option value="Pop" ${prefs.types.command.sound === 'Pop' ? 'selected' : ''}>Pop</option>
            <option value="none" ${prefs.types.command.sound === 'none' ? 'selected' : ''}>無音</option>
          </select>
        </div>
        <div class="preference-field">
          <label class="preference-label">
            <input type="checkbox" class="preference-checkbox" 
                   data-pref="notifications.types.error.enabled" 
                   ${prefs.types.error.enabled ? 'checked' : ''}>
            エラー検出
          </label>
          <select class="preference-select" style="margin-left: 10px" data-pref="notifications.types.error.sound">
            <option value="Basso" ${prefs.types.error.sound === 'Basso' ? 'selected' : ''}>Basso（警告音）</option>
            <option value="Funk" ${prefs.types.error.sound === 'Funk' ? 'selected' : ''}>Funk</option>
            <option value="Sosumi" ${prefs.types.error.sound === 'Sosumi' ? 'selected' : ''}>Sosumi</option>
            <option value="none" ${prefs.types.error.sound === 'none' ? 'selected' : ''}>無音</option>
          </select>
        </div>
        <div class="preference-field">
          <label class="preference-label">
            <input type="checkbox" class="preference-checkbox" 
                   data-pref="notifications.types.buildSuccess.enabled" 
                   ${prefs.types.buildSuccess.enabled ? 'checked' : ''}>
            ビルド成功
          </label>
          <select class="preference-select" style="margin-left: 10px" data-pref="notifications.types.buildSuccess.sound">
            <option value="Hero" ${prefs.types.buildSuccess.sound === 'Hero' ? 'selected' : ''}>Hero（目立つ音）</option>
            <option value="Submarine" ${prefs.types.buildSuccess.sound === 'Submarine' ? 'selected' : ''}>Submarine</option>
            <option value="Glass" ${prefs.types.buildSuccess.sound === 'Glass' ? 'selected' : ''}>Glass</option>
            <option value="none" ${prefs.types.buildSuccess.sound === 'none' ? 'selected' : ''}>無音</option>
          </select>
        </div>
      </div>
      ` : ''}
    `;
  }


  renderWindowPanel() {
    const window = this.preferenceManager.getSection('window');
    return `
      <h2>Window Settings</h2>
      
      <div class="preference-group">
        <h3>Appearance</h3>
        <div class="preference-field">
          <label class="preference-label">
            <input type="checkbox" class="preference-checkbox" 
                   data-pref="window.transparent" 
                   ${window.transparent ? 'checked' : ''}>
            Transparent Background
          </label>
        </div>
        <div class="preference-field">
          <label class="preference-label">Opacity</label>
          <input type="range" class="preference-slider" 
                 data-pref="window.opacity" 
                 value="${window.opacity}" min="0.1" max="1" step="0.05"
                 ${!window.transparent ? 'disabled' : ''}>
          <span class="preference-slider-value">${Math.round(window.opacity * 100)}%</span>
        </div>
        <div class="preference-field">
          <label class="preference-label">
            <input type="checkbox" class="preference-checkbox" 
                   data-pref="window.blurBackground" 
                   ${window.blurBackground ? 'checked' : ''}
                   ${!window.transparent ? 'disabled' : ''}>
            Blur Background
          </label>
        </div>
      </div>
      
      <div class="preference-group">
        <h3>Behavior</h3>
        <div class="preference-field">
          <label class="preference-label">
            <input type="checkbox" class="preference-checkbox" 
                   data-pref="window.alwaysOnTop" 
                   ${window.alwaysOnTop ? 'checked' : ''}>
            Always on Top
          </label>
        </div>
        <div class="preference-field">
          <label class="preference-label">
            <input type="checkbox" class="preference-checkbox" 
                   data-pref="window.confirmOnClose" 
                   ${window.confirmOnClose ? 'checked' : ''}>
            Confirm on Close
          </label>
        </div>
      </div>
    `;
  }

  renderAdvancedPanel() {
    const advanced = this.preferenceManager.getSection('advanced');
    return `
      <h2>Advanced Settings</h2>
      
      <div class="preference-group">
        <h3>Logging</h3>
        <div class="preference-field">
          <label class="preference-label">Log Level</label>
          <select class="preference-select" data-pref="advanced.debugging.logLevel">
            <option value="error" ${advanced.debugging.logLevel === 'error' ? 'selected' : ''}>Error</option>
            <option value="warn" ${advanced.debugging.logLevel === 'warn' ? 'selected' : ''}>Warning</option>
            <option value="info" ${advanced.debugging.logLevel === 'info' ? 'selected' : ''}>Info</option>
            <option value="debug" ${advanced.debugging.logLevel === 'debug' ? 'selected' : ''}>Debug</option>
          </select>
        </div>
        <div class="preference-field">
          <label class="preference-label">
            <input type="checkbox" class="preference-checkbox" 
                   data-pref="advanced.debugging.logToFile" 
                   ${advanced.debugging.logToFile ? 'checked' : ''}>
            Save Logs to File
          </label>
        </div>
      </div>
      
      <div class="preference-group">
        <h3>Experimental Features</h3>
        <div class="preference-field">
          <label class="preference-label">
            <input type="checkbox" class="preference-checkbox" 
                   data-pref="advanced.experimental.useWebGL2" 
                   ${advanced.experimental.useWebGL2 ? 'checked' : ''}>
            Use WebGL 2.0
          </label>
        </div>
        <div class="preference-field">
          <label class="preference-label">
            <input type="checkbox" class="preference-checkbox" 
                   data-pref="advanced.experimental.sixelSupport" 
                   ${advanced.experimental.sixelSupport ? 'checked' : ''}>
            Enable Sixel Graphics
            <span class="badge coming-soon">Coming Soon</span>
          </label>
          <p class="preference-label-hint">Support for sixel graphics protocol</p>
        </div>
        <div class="preference-field">
          <label class="preference-label">
            <input type="checkbox" class="preference-checkbox" 
                   data-pref="advanced.experimental.imageSupport" 
                   ${advanced.experimental.imageSupport ? 'checked' : ''}>
            Enable Image Support
            <span class="badge coming-soon">Coming Soon</span>
          </label>
          <p class="preference-label-hint">Display images directly in the terminal</p>
        </div>
        <div class="preference-field">
          <label class="preference-label">Unicode Version</label>
          <select class="preference-select" data-pref="advanced.experimental.unicodeVersion">
            <option value="11" ${advanced.experimental.unicodeVersion === '11' ? 'selected' : ''}>Unicode 11</option>
            <option value="13" ${advanced.experimental.unicodeVersion === '13' ? 'selected' : ''}>Unicode 13</option>
            <option value="14" ${advanced.experimental.unicodeVersion === '14' ? 'selected' : ''}>Unicode 14</option>
            <option value="15" ${advanced.experimental.unicodeVersion === '15' ? 'selected' : ''}>Unicode 15 <span class="badge coming-soon">Coming Soon</span></option>
          </select>
        </div>
      </div>
    `;
  }

  // Privacy panel removed from UI
  // renderPrivacyPanel() method is deprecated

  attachEventListeners() {
    const container = document.querySelector('.preference-container');
    
    // Close button and overlay
    container.querySelector('.preference-close').addEventListener('click', () => this.close());
    container.querySelector('.preference-overlay').addEventListener('click', () => this.close());
    
    // Category switching
    container.querySelectorAll('.preference-category').forEach(cat => {
      cat.addEventListener('click', () => {
        this.switchCategory(cat.dataset.category);
      });
    });
    
    // Input changes
    container.addEventListener('input', (e) => {
      if (e.target.dataset.pref) {
        this.handleInputChange(e.target);
      }
    });
    
    container.addEventListener('change', (e) => {
      if (e.target.dataset.pref) {
        this.handleInputChange(e.target);
        
        // Special handling for theme preset selection
        if (e.target.dataset.pref === 'theme.name' && e.target.value !== 'Custom') {
          this.applyThemePreset(e.target.value);
        }
      }
    });
    
    // Slider value display
    container.querySelectorAll('.preference-slider').forEach(slider => {
      slider.addEventListener('input', (e) => {
        const valueDisplay = e.target.nextElementSibling;
        if (valueDisplay && valueDisplay.classList.contains('preference-slider-value')) {
          const value = e.target.dataset.pref === 'window.opacity' 
            ? Math.round(e.target.value * 100) + '%'
            : e.target.value;
          valueDisplay.textContent = value;
        }
      });
    });
    
    // Footer buttons
    container.querySelector('#pref-save').addEventListener('click', () => this.save());
    container.querySelector('#pref-apply').addEventListener('click', () => this.apply());
    container.querySelector('#pref-cancel').addEventListener('click', () => this.close());
    container.querySelector('#pref-reset').addEventListener('click', () => this.reset());
    container.querySelector('#pref-export').addEventListener('click', () => this.export());
    container.querySelector('#pref-import').addEventListener('click', () => this.import());
    
    // Dependent field handling
    container.querySelectorAll('[data-pref="window.transparent"]').forEach(checkbox => {
      checkbox.addEventListener('change', (e) => {
        const opacity = container.querySelector('[data-pref="window.opacity"]');
        const blur = container.querySelector('[data-pref="window.blurBackground"]');
        if (opacity) opacity.disabled = !e.target.checked;
        if (blur) blur.disabled = !e.target.checked;
      });
    });
  }

  switchCategory(categoryId) {
    this.activeCategory = categoryId;
    
    // Update sidebar
    document.querySelectorAll('.preference-category').forEach(cat => {
      cat.classList.toggle('active', cat.dataset.category === categoryId);
    });
    
    // Update panels
    document.querySelectorAll('.preference-panel').forEach(panel => {
      panel.classList.toggle('active', panel.dataset.panel === categoryId);
    });
  }

  handleInputChange(input) {
    const path = input.dataset.pref;
    let value;
    
    if (input.type === 'checkbox') {
      value = input.checked;
    } else if (input.type === 'number') {
      value = parseFloat(input.value);
      
      // Enforce min/max limits
      if (input.hasAttribute('min')) {
        const min = parseFloat(input.getAttribute('min'));
        if (value < min) value = min;
      }
      if (input.hasAttribute('max')) {
        const max = parseFloat(input.getAttribute('max'));
        if (value > max) value = max;
      }
      
      // Special handling for session interval (convert seconds to ms)
      if (path === 'session.autoSaveInterval') {
        value = value * 1000;
      }
      // Special handling for notification thresholds (convert seconds to ms)
      if (path === 'notifications.longCommandThreshold' || 
          path === 'notifications.claudeCode.threshold') {
        value = value * 1000;
      }
    } else if (input.type === 'range') {
      value = parseFloat(input.value);
    } else if (input.tagName === 'TEXTAREA' && path === 'privacy.excludePatterns') {
      value = input.value.split('\n').filter(line => line.trim());
    } else {
      value = input.value;
    }
    
    // Track unsaved changes
    this.unsavedChanges[path] = value;
    
    // Update linked inputs (for color pickers)
    if (input.type === 'color' || (input.type === 'text' && input.previousElementSibling?.type === 'color')) {
      const container = input.parentElement;
      const colorInput = container.querySelector('input[type="color"]');
      const textInput = container.querySelector('input[type="text"]');
      if (colorInput && textInput) {
        if (input.type === 'color') {
          textInput.value = input.value;
          this.unsavedChanges[path] = input.value;
        } else {
          try {
            colorInput.value = input.value;
            this.unsavedChanges[path] = input.value;
          } catch (e) {
            // Invalid color format
          }
        }
      }
    }
  }

  apply() {
    console.log('[PreferenceWindow] Applying changes:', this.unsavedChanges);
    
    // Apply all unsaved changes
    Object.entries(this.unsavedChanges).forEach(([path, value]) => {
      console.log(`[PreferenceWindow] Setting ${path} = ${value}`);
      this.preferenceManager.set(path, value);
    });
    
    // Clear unsaved changes but keep window open
    this.unsavedChanges = {};
    
    console.log('[PreferenceWindow] Changes applied');
  }

  save() {
    this.apply();
    this.close();
  }

  reset() {
    if (confirm('Reset all preferences to defaults?')) {
      this.preferenceManager.reset();
      this.close();
      this.open(); // Reopen with default values
    }
  }

  async export() {
    const data = this.preferenceManager.export();
    
    if (window.electronAPI && window.electronAPI.saveFile) {
      const result = await window.electronAPI.saveFile({
        content: data,
        defaultFilename: 'zeami-preferences.json',
        filters: [
          { name: 'JSON Files', extensions: ['json'] },
          { name: 'All Files', extensions: ['*'] }
        ]
      });
      
      if (result.success) {
        alert(`Preferences exported to: ${result.path}`);
      }
    } else {
      // Browser fallback
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'zeami-preferences.json';
      a.click();
      URL.revokeObjectURL(url);
    }
  }

  async import() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      
      try {
        const text = await file.text();
        this.preferenceManager.import(text);
        this.close();
        this.open(); // Reopen with imported values
        alert('Preferences imported successfully');
      } catch (error) {
        alert(`Failed to import preferences: ${error.message}`);
      }
    });
    
    input.click();
  }

  onPreferenceChange(path, value, oldValue) {
    // Handle real-time preference changes
    console.log(`[PreferenceWindow] Preference changed: ${path}`, { oldValue, value });
    
    // Update UI if the window is open
    if (this.isOpen) {
      const input = document.querySelector(`[data-pref="${path}"]`);
      if (input && !this.unsavedChanges.hasOwnProperty(path)) {
        if (input.type === 'checkbox') {
          input.checked = value;
        } else {
          input.value = value;
        }
      }
    }
  }
  
  applyThemePreset(themeName) {
    const preset = this.themePresets[themeName];
    if (!preset) return;
    
    console.log(`[PreferenceWindow] Applying theme preset: ${themeName}`);
    
    // Apply all theme colors from preset
    Object.entries(preset).forEach(([key, value]) => {
      const path = `theme.${key}`;
      this.unsavedChanges[path] = value;
      
      // Update UI inputs
      const inputs = document.querySelectorAll(`[data-pref="${path}"]`);
      inputs.forEach(input => {
        if (input.type === 'color') {
          try {
            input.value = value.startsWith('rgba') ? '#000000' : value;
          } catch (e) {
            // Ignore color format errors
          }
        } else {
          input.value = value;
        }
      });
    });
    
    // Update the preview
    const panel = document.querySelector('[data-panel="appearance"]');
    if (panel) {
      const newContent = this.renderAppearancePanel();
      panel.innerHTML = newContent;
      
      // Re-attach event listeners for the new elements
      this.attachPanelEventListeners(panel);
    }
  }
  
  attachPanelEventListeners(panel) {
    // Re-attach listeners for inputs in the panel
    panel.querySelectorAll('[data-pref]').forEach(input => {
      input.addEventListener('input', (e) => this.handleInputChange(e.target));
      input.addEventListener('change', (e) => {
        this.handleInputChange(e.target);
        if (e.target.dataset.pref === 'theme.name' && e.target.value !== 'Custom') {
          this.applyThemePreset(e.target.value);
        }
      });
    });
    
    // Re-attach slider value display listeners
    panel.querySelectorAll('.preference-slider').forEach(slider => {
      slider.addEventListener('input', (e) => {
        const valueDisplay = e.target.nextElementSibling;
        if (valueDisplay && valueDisplay.classList.contains('preference-slider-value')) {
          valueDisplay.textContent = e.target.value;
        }
      });
    });
  }
}