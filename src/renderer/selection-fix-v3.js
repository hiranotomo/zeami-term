/**
 * Selection Fix v3 - Direct and aggressive approach
 * This WILL fix the selection color to transparent blue
 */

(function() {
  'use strict';
  
  const SELECTION_COLOR = 'rgba(120, 150, 200, 0.3)';
  const SELECTION_COLOR_HEX = '#7896C84D';
  
  console.log('[SelectionFix-v3] Starting aggressive selection fix...');
  
  // Helper function to apply selection fix to a terminal
  function fixTerminalSelection(terminal) {
    if (!terminal) return;
    
    console.log('[SelectionFix-v3] Fixing terminal:', terminal);
    
    // 1. Fix through options
    if (terminal.options && terminal.options.theme) {
      terminal.options.theme.selectionBackground = SELECTION_COLOR;
      terminal.options.theme.selectionForeground = undefined; // Let it be automatic
    }
    
    // 2. Fix through internal theme
    if (terminal._core && terminal._core._colorManager) {
      const colorManager = terminal._core._colorManager;
      if (colorManager.colors && colorManager.colors.selectionTransparent) {
        // Force update selection colors
        colorManager.colors.selectionTransparent = colorManager._parseColor(SELECTION_COLOR);
        colorManager.colors.selectionOpaque = colorManager._parseColor(SELECTION_COLOR);
      }
    }
    
    // 3. Fix through renderer
    if (terminal._core && terminal._core._renderService && terminal._core._renderService._renderer) {
      const renderer = terminal._core._renderService._renderer;
      
      // For canvas renderer
      if (renderer._renderLayers) {
        renderer._renderLayers.forEach(layer => {
          if (layer.constructor.name.includes('Selection') || layer._selectionModel) {
            console.log('[SelectionFix-v3] Found selection layer:', layer);
            
            // Override colors
            if (layer._colors) {
              layer._colors.selectionTransparent = {
                css: SELECTION_COLOR,
                rgba: 0x7896C84D
              };
              layer._colors.selectionOpaque = layer._colors.selectionTransparent;
            }
            
            // Force refresh
            if (layer._onSelectionChanged) {
              layer._onSelectionChanged();
            }
          }
        });
      }
    }
    
    // 4. Force terminal refresh
    terminal.refresh(0, terminal.rows - 1);
  }
  
  // Override Terminal constructor
  const OriginalTerminal = window.Terminal;
  window.Terminal = function(options = {}) {
    // Ensure selection color is set
    if (!options.theme) options.theme = {};
    options.theme.selectionBackground = SELECTION_COLOR;
    
    const terminal = new OriginalTerminal(options);
    
    // Apply fix after creation
    setTimeout(() => fixTerminalSelection(terminal), 0);
    
    return terminal;
  };
  
  // Copy prototype
  window.Terminal.prototype = OriginalTerminal.prototype;
  Object.setPrototypeOf(window.Terminal, OriginalTerminal);
  
  // Fix TerminalManager
  function patchTerminalManager() {
    if (!window.TerminalManager) return;
    
    const TM = window.TerminalManager.prototype;
    
    // Override init
    const originalInit = TM.init;
    TM.init = async function() {
      // Set selection color in default options
      this.defaultOptions.theme.selectionBackground = SELECTION_COLOR;
      console.log('[SelectionFix-v3] Patched TerminalManager defaults');
      
      const result = await originalInit.call(this);
      
      // Fix any existing terminals
      if (this.terminals) {
        this.terminals.forEach(session => {
          if (session.terminal) {
            fixTerminalSelection(session.terminal);
          }
        });
      }
      
      return result;
    };
    
    // Override createTerminal
    const originalCreate = TM.createTerminal;
    TM.createTerminal = async function(options = {}) {
      // Ensure selection color
      if (!options.theme) options.theme = {};
      options.theme.selectionBackground = SELECTION_COLOR;
      
      const result = await originalCreate.call(this, options);
      
      // Apply fix to new terminal
      if (result && result.terminal) {
        setTimeout(() => fixTerminalSelection(result.terminal), 100);
      }
      
      return result;
    };
  }
  
  // Apply patches when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(() => {
        patchTerminalManager();
        
        // Fix any existing terminals
        if (window.terminalManager && window.terminalManager.terminals) {
          window.terminalManager.terminals.forEach(session => {
            if (session.terminal) {
              fixTerminalSelection(session.terminal);
            }
          });
        }
      }, 200);
    });
  } else {
    // Already loaded
    setTimeout(() => {
      patchTerminalManager();
      
      // Fix existing terminals
      if (window.terminalManager && window.terminalManager.terminals) {
        window.terminalManager.terminals.forEach(session => {
          if (session.terminal) {
            fixTerminalSelection(session.terminal);
          }
        });
      }
    }, 200);
  }
  
  // Continuous monitoring (aggressive approach)
  let checkInterval = setInterval(() => {
    if (window.terminalManager && window.terminalManager.terminals && window.terminalManager.terminals.size > 0) {
      clearInterval(checkInterval);
      
      // Set up mutation observer to catch any theme changes
      window.terminalManager.terminals.forEach(session => {
        if (session.terminal && session.terminal.element) {
          const observer = new MutationObserver(() => {
            // Re-apply fix if anything changes
            fixTerminalSelection(session.terminal);
          });
          
          observer.observe(session.terminal.element, {
            attributes: true,
            attributeFilter: ['style', 'class'],
            subtree: true
          });
        }
      });
    }
  }, 100);
  
  // Also patch xterm.js selection handling directly
  setTimeout(() => {
    if (window.Terminal && window.Terminal.prototype) {
      const proto = window.Terminal.prototype;
      
      // Override _setTheme if it exists
      if (proto._setTheme) {
        const original_setTheme = proto._setTheme;
        proto._setTheme = function(theme) {
          if (theme && !theme.selectionBackground) {
            theme.selectionBackground = SELECTION_COLOR;
          }
          return original_setTheme.call(this, theme);
        };
      }
    }
  }, 1000);
  
  console.log('[SelectionFix-v3] Aggressive selection fix initialized');
  
  // Export for debugging
  window.selectionFixV3 = {
    fixTerminalSelection,
    SELECTION_COLOR,
    forceFixAll: () => {
      if (window.terminalManager && window.terminalManager.terminals) {
        window.terminalManager.terminals.forEach(session => {
          if (session.terminal) {
            console.log('[SelectionFix-v3] Force fixing terminal:', session.id);
            fixTerminalSelection(session.terminal);
          }
        });
      }
    }
  };
})();