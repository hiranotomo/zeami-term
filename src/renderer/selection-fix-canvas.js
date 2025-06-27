/**
 * Canvas/WebGL specific selection color fix for xterm.js
 * This handles the different rendering approach used by Canvas/WebGL renderers
 */

class CanvasSelectionFix {
  constructor() {
    this.targetColor = 'rgba(120, 150, 200, 0.3)';
    this.initialized = false;
    
    // Wait for terminals to be created
    this.waitForTerminals();
  }
  
  waitForTerminals() {
    const checkInterval = setInterval(() => {
      if (window.terminalManager?.terminals?.size > 0) {
        clearInterval(checkInterval);
        this.init();
      }
    }, 100);
  }
  
  init() {
    console.log('[CanvasSelectionFix] Initializing...');
    
    // Hook into terminal creation
    this.patchTerminalCreation();
    
    // Fix existing terminals
    this.fixExistingTerminals();
    
    this.initialized = true;
  }
  
  patchTerminalCreation() {
    // Intercept terminal option setting
    const originalCreateTerminal = window.terminalManager.createTerminal;
    if (originalCreateTerminal) {
      window.terminalManager.createTerminal = function(...args) {
        const result = originalCreateTerminal.apply(this, args);
        
        // After terminal is created, ensure selection color is set
        setTimeout(() => {
          window.canvasSelectionFix.fixTerminal(result);
        }, 100);
        
        return result;
      };
    }
  }
  
  fixExistingTerminals() {
    window.terminalManager?.terminals?.forEach((session, id) => {
      this.fixTerminal(session.terminal);
    });
  }
  
  fixTerminal(terminal) {
    if (!terminal) return;
    
    console.log('[CanvasSelectionFix] Fixing terminal...');
    
    // Method 1: Update theme directly
    if (terminal.options && terminal.options.theme) {
      terminal.options.theme.selectionBackground = this.targetColor;
      console.log('[CanvasSelectionFix] Updated terminal.options.theme.selectionBackground');
    }
    
    // Method 2: Access internal theme service
    if (terminal._core?._themeService) {
      const themeService = terminal._core._themeService;
      if (themeService.colors) {
        // Update the internal color
        themeService.colors.selectionTransparent = this.parseRgba(this.targetColor);
        themeService.colors.selectionOpaque = this.parseRgba(this.targetColor);
        console.log('[CanvasSelectionFix] Updated theme service colors');
        
        // Trigger theme update
        if (themeService._updateRestoreColors) {
          themeService._updateRestoreColors();
        }
      }
    }
    
    // Method 3: Access renderer directly
    if (terminal._core?._renderService?._renderer) {
      const renderer = terminal._core._renderService._renderer;
      
      // For Canvas renderer
      if (renderer._selectionRenderLayer) {
        console.log('[CanvasSelectionFix] Found selection render layer');
        
        // Try to update the selection color in the render layer
        const layer = renderer._selectionRenderLayer;
        if (layer._colors) {
          layer._colors.selectionTransparent = this.parseRgba(this.targetColor);
          layer._colors.selectionOpaque = this.parseRgba(this.targetColor);
          console.log('[CanvasSelectionFix] Updated render layer colors');
        }
        
        // Force redraw
        if (layer._onSelectionChanged) {
          layer._onSelectionChanged();
        }
      }
    }
    
    // Method 4: Force refresh to apply changes
    if (terminal.refresh) {
      terminal.refresh(0, terminal.rows - 1);
      console.log('[CanvasSelectionFix] Forced terminal refresh');
    }
  }
  
  parseRgba(rgbaString) {
    const match = rgbaString.match(/rgba?\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)/);
    if (match) {
      return {
        css: rgbaString,
        rgba: (parseInt(match[1]) << 24) | (parseInt(match[2]) << 16) | (parseInt(match[3]) << 8) | Math.round(parseFloat(match[4]) * 255)
      };
    }
    return null;
  }
  
  // Monitor for selection changes
  monitorSelections() {
    // Watch for selection events
    window.terminalManager?.terminals?.forEach((session) => {
      const terminal = session.terminal;
      if (terminal && terminal.onSelectionChange) {
        terminal.onSelectionChange(() => {
          console.log('[CanvasSelectionFix] Selection changed, reapplying fix...');
          this.fixTerminal(terminal);
        });
      }
    });
  }
}

// Initialize the fix
window.canvasSelectionFix = new CanvasSelectionFix();

// Export for use
window.CanvasSelectionFix = CanvasSelectionFix;