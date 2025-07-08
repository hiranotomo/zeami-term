/**
 * Keyboard shortcuts utility for ZeamiTerm
 * Provides OS-aware keyboard shortcut strings and handlers
 */

export class KeyboardShortcuts {
  static isMac() {
    return navigator.platform.toLowerCase().includes('mac');
  }
  
  static isWindows() {
    return navigator.platform.toLowerCase().includes('win');
  }
  
  static isLinux() {
    return !this.isMac() && !this.isWindows();
  }
  
  /**
   * Get the appropriate modifier key name for the current OS
   */
  static getModifierKey() {
    return this.isMac() ? 'Cmd' : 'Ctrl';
  }
  
  /**
   * Get keyboard shortcuts for common operations
   */
  static getShortcuts() {
    const mod = this.getModifierKey();
    
    return {
      // Basic operations
      copy: `${mod}+C`,
      paste: `${mod}+V`,
      cut: `${mod}+X`,
      selectAll: `${mod}+A`,
      
      // Terminal specific
      newTab: `${mod}+T`,
      closeTab: `${mod}+W`,
      nextTab: `${mod}+Tab`,
      prevTab: `${mod}+Shift+Tab`,
      
      // Search
      find: `${mod}+F`,
      findNext: 'F3',
      findPrev: 'Shift+F3',
      
      // Terminal control
      clear: `${mod}+K`,
      interrupt: 'Ctrl+C', // Always Ctrl+C regardless of OS
      
      // Custom features
      pasteDebugger: `${mod}+Shift+P`,
      preferences: `${mod}+,`,
      
      // Newline insertion
      newlineAlt: 'Option+Return',
      newlineShift: 'Shift+Return'
    };
  }
  
  /**
   * Check if a keyboard event matches a specific shortcut
   */
  static matchesShortcut(event, shortcutString) {
    const parts = shortcutString.split('+');
    const key = parts[parts.length - 1];
    
    // Check key
    if (event.key !== key && event.code !== key) {
      // Special cases
      if (key === 'Return' && event.key !== 'Enter') return false;
      if (key === ',' && event.key !== ',') return false;
    }
    
    // Check modifiers
    const hasCmd = parts.includes('Cmd');
    const hasCtrl = parts.includes('Ctrl');
    const hasShift = parts.includes('Shift');
    const hasAlt = parts.includes('Alt') || parts.includes('Option');
    
    if (this.isMac()) {
      if (hasCmd && !event.metaKey) return false;
      if (hasCtrl && !event.ctrlKey) return false;
    } else {
      if ((hasCmd || hasCtrl) && !event.ctrlKey) return false;
    }
    
    if (hasShift && !event.shiftKey) return false;
    if (hasAlt && !event.altKey) return false;
    
    return true;
  }
  
  /**
   * Format a shortcut string for display
   */
  static formatShortcut(shortcutString) {
    if (this.isMac()) {
      return shortcutString
        .replace('Cmd', '⌘')
        .replace('Ctrl', '⌃')
        .replace('Shift', '⇧')
        .replace('Option', '⌥')
        .replace('Alt', '⌥')
        .replace('Return', '⏎')
        .replace('+', '');
    }
    return shortcutString;
  }
  
  /**
   * Get help text for keyboard shortcuts
   */
  static getHelpText() {
    const shortcuts = this.getShortcuts();
    const isMac = this.isMac();
    
    return `
Keyboard Shortcuts:
===================

Basic Operations:
  ${shortcuts.copy} - Copy selected text
  ${shortcuts.paste} - Paste from clipboard
  ${shortcuts.cut} - Cut selected text
  ${shortcuts.selectAll} - Select all text

Terminal Control:
  ${shortcuts.newTab} - New terminal tab
  ${shortcuts.closeTab} - Close current tab
  ${shortcuts.clear} - Clear terminal
  ${shortcuts.interrupt} - Interrupt current process (SIGINT)

Navigation:
  ${shortcuts.nextTab} - Next tab
  ${shortcuts.prevTab} - Previous tab

Search:
  ${shortcuts.find} - Find in terminal
  ${shortcuts.findNext} - Find next
  ${shortcuts.findPrev} - Find previous

Special Features:
  ${shortcuts.pasteDebugger} - Toggle paste debugger
  ${shortcuts.preferences} - Open preferences
  
Newline Insertion:
  ${isMac ? shortcuts.newlineAlt : shortcuts.newlineShift} - Insert newline without executing
  ${shortcuts.newlineShift} - Insert newline (alternative)
`;
  }
}

// Export singleton instance
export const keyboardShortcuts = new KeyboardShortcuts();

// Also export class for testing
export default KeyboardShortcuts;