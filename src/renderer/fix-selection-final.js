/**
 * Final solution for xterm.js selection transparency
 * Use hex format with alpha channel
 */

class FinalSelectionFix {
  constructor() {
    // Convert rgba(120, 150, 200, 0.3) to hex format
    // R=120 (0x78), G=150 (0x96), B=200 (0xC8), A=0.3*255=76.5 (0x4D)
    this.targetColorHex = '#7896C84D';
    this.targetColorRgba = 'rgba(120, 150, 200, 0.3)';
    
    this.init();
  }
  
  init() {
    console.log('[FinalSelectionFix] Initializing with hex color:', this.targetColorHex);
    
    // Wait for terminal manager
    const checkInterval = setInterval(() => {
      if (window.terminalManager?.terminals?.size > 0) {
        clearInterval(checkInterval);
        this.applyFix();
      }
    }, 100);
  }
  
  applyFix() {
    // Override the theme manager's color conversion
    if (window.ThemeManagerV2) {
      const originalGetXtermTheme = window.ThemeManagerV2.prototype.getXtermTheme;
      window.ThemeManagerV2.prototype.getXtermTheme = function() {
        const theme = originalGetXtermTheme.call(this);
        // Use hex format which xterm.js handles better
        theme.selectionBackground = window.finalSelectionFix.targetColorHex;
        console.log('[FinalSelectionFix] Overriding theme with hex color:', theme.selectionBackground);
        return theme;
      };
    }
    
    // Fix existing terminals
    window.terminalManager?.terminals?.forEach((session) => {
      this.fixTerminal(session.terminal);
    });
    
    // Hook into new terminal creation
    const originalCreateTerminal = window.terminalManager.createTerminal;
    window.terminalManager.createTerminal = function(...args) {
      const result = originalCreateTerminal.apply(this, args);
      setTimeout(() => {
        window.finalSelectionFix.fixTerminal(result);
      }, 100);
      return result;
    };
  }
  
  fixTerminal(terminal) {
    if (!terminal) return;
    
    console.log('[FinalSelectionFix] Fixing terminal...');
    
    // Update theme with hex color
    if (!terminal.options.theme) {
      terminal.options.theme = {};
    }
    terminal.options.theme.selectionBackground = this.targetColorHex;
    
    // If xterm has a setOption method, use it
    if (terminal.setOption) {
      terminal.setOption('theme', terminal.options.theme);
      console.log('[FinalSelectionFix] Applied theme via setOption');
    }
    
    // Force refresh
    if (terminal.refresh) {
      terminal.refresh(0, terminal.rows - 1);
    }
  }
}

// Initialize the fix
window.finalSelectionFix = new FinalSelectionFix();