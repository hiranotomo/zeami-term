/**
 * xterm.js Monkey Patch - Last resort approach
 * This directly modifies xterm.js internals at runtime
 */

(function() {
  'use strict';
  
  console.log('[XtermMonkeyPatch] Starting deep xterm.js patching...');
  
  const SELECTION_RGBA = 'rgba(120, 150, 200, 0.3)';
  
  // Wait for xterm to be loaded
  function waitForXterm(callback) {
    if (window.Terminal) {
      callback();
    } else {
      setTimeout(() => waitForXterm(callback), 10);
    }
  }
  
  waitForXterm(() => {
    console.log('[XtermMonkeyPatch] xterm.js loaded, applying patches...');
    
    // Patch color parsing
    const originalTerminal = window.Terminal;
    
    // Create patched constructor
    window.Terminal = function(options = {}) {
      const terminal = new originalTerminal(options);
      
      // Wait for core to be initialized
      const patchInterval = setInterval(() => {
        if (terminal._core && terminal._core._renderService) {
          clearInterval(patchInterval);
          patchTerminalCore(terminal);
        }
      }, 10);
      
      return terminal;
    };
    
    // Copy static properties and prototype
    Object.setPrototypeOf(window.Terminal, originalTerminal);
    Object.setPrototypeOf(window.Terminal.prototype, originalTerminal.prototype);
    
    // Patch existing terminals
    if (window.terminalManager && window.terminalManager.terminals) {
      window.terminalManager.terminals.forEach(session => {
        if (session.terminal) {
          patchTerminalCore(session.terminal);
        }
      });
    }
  });
  
  function patchTerminalCore(terminal) {
    console.log('[XtermMonkeyPatch] Patching terminal core...');
    
    if (!terminal._core) return;
    
    // 1. Patch color manager
    if (terminal._core._colorManager) {
      const colorManager = terminal._core._colorManager;
      
      // Override color parsing for selection
      const originalRefreshColors = colorManager.onOptionsChange;
      if (originalRefreshColors) {
        colorManager.onOptionsChange = function() {
          originalRefreshColors.call(this);
          
          // Force selection colors
          if (this.colors) {
            const rgba = parseRgba(SELECTION_RGBA);
            this.colors.selectionTransparent = {
              css: SELECTION_RGBA,
              rgba: rgba
            };
            this.colors.selectionOpaque = {
              css: SELECTION_RGBA,
              rgba: rgba
            };
          }
        };
        
        // Trigger refresh
        colorManager.onOptionsChange();
      }
    }
    
    // 2. Patch renderer
    if (terminal._core._renderService && terminal._core._renderService._renderer) {
      patchRenderer(terminal._core._renderService._renderer);
    }
    
    // 3. Watch for renderer changes
    const renderService = terminal._core._renderService;
    if (renderService) {
      const originalSetRenderer = renderService.setRenderer;
      if (originalSetRenderer) {
        renderService.setRenderer = function(renderer) {
          const result = originalSetRenderer.call(this, renderer);
          setTimeout(() => patchRenderer(renderer), 0);
          return result;
        };
      }
    }
  }
  
  function patchRenderer(renderer) {
    if (!renderer) return;
    
    console.log('[XtermMonkeyPatch] Patching renderer:', renderer.constructor.name);
    
    // Canvas renderer patches
    if (renderer._renderLayers) {
      renderer._renderLayers.forEach(layer => {
        patchRenderLayer(layer);
      });
    }
    
    // WebGL renderer patches
    if (renderer._model) {
      patchWebGLModel(renderer._model);
    }
  }
  
  function patchRenderLayer(layer) {
    if (!layer) return;
    
    const layerName = layer.constructor.name;
    console.log('[XtermMonkeyPatch] Patching render layer:', layerName);
    
    // Selection layer specific patches
    if (layerName.includes('Selection') || layer._selectionModel) {
      
      // Override draw methods
      const drawMethods = ['_fillCells', '_fillBottomLineAtCells', '_fillCharTrueColor', '_drawSelection'];
      
      drawMethods.forEach(methodName => {
        if (layer[methodName]) {
          const original = layer[methodName];
          layer[methodName] = function(...args) {
            // Temporarily override context fillStyle
            if (this._ctx) {
              const savedFillStyle = this._ctx.fillStyle;
              this._ctx.fillStyle = SELECTION_RGBA;
              const result = original.apply(this, args);
              this._ctx.fillStyle = savedFillStyle;
              return result;
            }
            return original.apply(this, args);
          };
        }
      });
      
      // Override color properties
      if (layer._colors) {
        Object.defineProperty(layer._colors, 'selectionTransparent', {
          get: () => ({ css: SELECTION_RGBA, rgba: parseRgba(SELECTION_RGBA) }),
          set: () => {} // Ignore sets
        });
        
        Object.defineProperty(layer._colors, 'selectionOpaque', {
          get: () => ({ css: SELECTION_RGBA, rgba: parseRgba(SELECTION_RGBA) }),
          set: () => {} // Ignore sets
        });
      }
    }
  }
  
  function patchWebGLModel(model) {
    if (!model || !model.selection) return;
    
    console.log('[XtermMonkeyPatch] Patching WebGL model...');
    
    // Override selection color in WebGL
    Object.defineProperty(model.selection, 'selectionRgba', {
      get: () => [120/255, 150/255, 200/255, 0.3],
      set: () => {} // Ignore sets
    });
  }
  
  function parseRgba(rgbaString) {
    const match = rgbaString.match(/rgba?\((\d+),\s*(\d+),\s*(\d+),?\s*([\d.]+)?\)/);
    if (match) {
      const r = parseInt(match[1]);
      const g = parseInt(match[2]);
      const b = parseInt(match[3]);
      const a = parseFloat(match[4] || '1') * 255;
      return (r << 24 | g << 16 | b << 8 | Math.round(a)) >>> 0;
    }
    return 0x7896C84D; // Fallback
  }
  
  // Continuous monitoring for new terminals
  setInterval(() => {
    if (window.terminalManager && window.terminalManager.terminals) {
      window.terminalManager.terminals.forEach(session => {
        if (session.terminal && !session.terminal._monkeyPatched) {
          patchTerminalCore(session.terminal);
          session.terminal._monkeyPatched = true;
        }
      });
    }
  }, 500);
  
  // Export for debugging
  window.xtermMonkeyPatch = {
    patchTerminalCore,
    patchRenderer,
    SELECTION_RGBA
  };
  
  console.log('[XtermMonkeyPatch] Monkey patch initialized');
})();