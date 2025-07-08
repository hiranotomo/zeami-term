/**
 * Keyboard Shortcut Help Component
 * Displays keyboard shortcuts in a modal or panel
 */

import KeyboardShortcuts from '../utils/KeyboardShortcuts.js';

export class KeyboardShortcutHelp {
  constructor() {
    this.isVisible = false;
    this.container = null;
    this.setupUI();
    this.bindKeyboard();
  }
  
  setupUI() {
    // Create container
    this.container = document.createElement('div');
    this.container.className = 'keyboard-shortcut-help';
    this.container.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(30, 30, 30, 0.95);
      border: 1px solid #444;
      border-radius: 8px;
      padding: 24px;
      max-width: 600px;
      max-height: 80vh;
      overflow-y: auto;
      z-index: 10001;
      display: none;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.5);
      color: #e0e0e0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;
    
    // Create content
    this.updateContent();
    
    // Add close button
    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '×';
    closeBtn.style.cssText = `
      position: absolute;
      top: 12px;
      right: 12px;
      background: none;
      border: none;
      color: #999;
      font-size: 24px;
      cursor: pointer;
      padding: 0;
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
    `;
    closeBtn.onclick = () => this.hide();
    this.container.appendChild(closeBtn);
    
    // Append to body
    document.body.appendChild(this.container);
    
    // Close on background click
    this.container.addEventListener('click', (e) => {
      if (e.target === this.container) {
        this.hide();
      }
    });
  }
  
  updateContent() {
    const shortcuts = KeyboardShortcuts.getShortcuts();
    const isMac = KeyboardShortcuts.isMac();
    
    const content = `
      <h2 style="margin: 0 0 20px 0; color: #fff;">Keyboard Shortcuts</h2>
      
      <div class="shortcut-section">
        <h3 style="color: #4CAF50; margin: 16px 0 8px 0;">Basic Operations</h3>
        <div class="shortcut-list">
          ${this.createShortcutItem(shortcuts.copy, 'Copy selected text')}
          ${this.createShortcutItem(shortcuts.paste, 'Paste from clipboard')}
          ${this.createShortcutItem(shortcuts.cut, 'Cut selected text')}
          ${this.createShortcutItem(shortcuts.selectAll, 'Select all text')}
        </div>
      </div>
      
      <div class="shortcut-section">
        <h3 style="color: #2196F3; margin: 16px 0 8px 0;">Terminal Control</h3>
        <div class="shortcut-list">
          ${this.createShortcutItem(shortcuts.newTab, 'New terminal tab')}
          ${this.createShortcutItem(shortcuts.closeTab, 'Close current tab')}
          ${this.createShortcutItem(shortcuts.clear, 'Clear terminal')}
          ${this.createShortcutItem(shortcuts.interrupt, 'Interrupt process (SIGINT)')}
        </div>
      </div>
      
      <div class="shortcut-section">
        <h3 style="color: #FF9800; margin: 16px 0 8px 0;">Navigation</h3>
        <div class="shortcut-list">
          ${this.createShortcutItem(shortcuts.nextTab, 'Next tab')}
          ${this.createShortcutItem(shortcuts.prevTab, 'Previous tab')}
          ${this.createShortcutItem(shortcuts.find, 'Find in terminal')}
          ${this.createShortcutItem(shortcuts.findNext, 'Find next')}
          ${this.createShortcutItem(shortcuts.findPrev, 'Find previous')}
        </div>
      </div>
      
      <div class="shortcut-section">
        <h3 style="color: #9C27B0; margin: 16px 0 8px 0;">Special Features</h3>
        <div class="shortcut-list">
          ${this.createShortcutItem(shortcuts.pasteDebugger, 'Toggle paste debugger')}
          ${this.createShortcutItem(shortcuts.preferences, 'Open preferences')}
          ${this.createShortcutItem(isMac ? shortcuts.newlineAlt : shortcuts.newlineShift, 'Insert newline without executing')}
          ${this.createShortcutItem(shortcuts.newlineShift, 'Insert newline (alternative)')}
        </div>
      </div>
      
      <style>
        .shortcut-list {
          display: grid;
          gap: 8px;
        }
        .shortcut-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 12px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 4px;
        }
        .shortcut-item:hover {
          background: rgba(255, 255, 255, 0.1);
        }
        .shortcut-key {
          font-family: monospace;
          background: rgba(255, 255, 255, 0.1);
          padding: 4px 8px;
          border-radius: 3px;
          border: 1px solid rgba(255, 255, 255, 0.2);
          white-space: nowrap;
        }
        .shortcut-description {
          color: #bbb;
          margin-right: 16px;
        }
      </style>
    `;
    
    // Clear and set content
    this.container.innerHTML = content;
  }
  
  createShortcutItem(shortcut, description) {
    const formatted = KeyboardShortcuts.formatShortcut(shortcut);
    return `
      <div class="shortcut-item">
        <span class="shortcut-description">${description}</span>
        <span class="shortcut-key">${formatted}</span>
      </div>
    `;
  }
  
  bindKeyboard() {
    // Show help with ? or Shift+/
    document.addEventListener('keydown', (e) => {
      // Check for ? key (Shift+/)
      if (e.key === '?' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        // Don't show if terminal has focus and is in input mode
        const activeElement = document.activeElement;
        if (!activeElement || !activeElement.classList.contains('xterm-helper-textarea')) {
          this.toggle();
          e.preventDefault();
        }
      }
      
      // Hide on Escape
      if (e.key === 'Escape' && this.isVisible) {
        this.hide();
        e.preventDefault();
      }
    });
  }
  
  show() {
    this.container.style.display = 'block';
    this.isVisible = true;
    
    // Update content in case platform changed
    this.updateContent();
  }
  
  hide() {
    this.container.style.display = 'none';
    this.isVisible = false;
  }
  
  toggle() {
    if (this.isVisible) {
      this.hide();
    } else {
      this.show();
    }
  }
}

// Create and export singleton
export const keyboardShortcutHelp = new KeyboardShortcutHelp();