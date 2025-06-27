/**
 * Selection color override using Canvas/WebGL renderer hooks
 * This approach directly modifies the renderer's selection layer
 */

class SelectionOverride {
  constructor() {
    this.targetColor = {
      r: 120,
      g: 150, 
      b: 200,
      a: 0.3
    };
    
    this.init();
  }
  
  init() {
    console.log('[SelectionOverride] Initializing renderer hook approach...');
    
    // Wait for terminals
    const checkInterval = setInterval(() => {
      if (window.terminalManager?.terminals?.size > 0) {
        clearInterval(checkInterval);
        this.hookRenderers();
      }
    }, 100);
  }
  
  hookRenderers() {
    window.terminalManager.terminals.forEach((session) => {
      this.hookTerminalRenderer(session.terminal);
    });
    
    // Hook future terminals
    const originalCreate = window.terminalManager.createTerminal;
    window.terminalManager.createTerminal = function(...args) {
      const result = originalCreate.apply(this, args);
      setTimeout(() => {
        window.selectionOverride.hookTerminalRenderer(result);
      }, 500);
      return result;
    };
  }
  
  hookTerminalRenderer(terminal) {
    if (!terminal?._core?._renderService?._renderer) {
      console.log('[SelectionOverride] Renderer not ready, retrying...');
      setTimeout(() => this.hookTerminalRenderer(terminal), 100);
      return;
    }
    
    const renderer = terminal._core._renderService._renderer;
    console.log('[SelectionOverride] Hooking renderer:', renderer.constructor.name);
    
    // For Canvas renderer
    if (renderer._renderLayers) {
      const selectionLayer = Array.from(renderer._renderLayers).find(
        layer => layer?.constructor?.name?.includes('Selection')
      );
      
      if (selectionLayer) {
        console.log('[SelectionOverride] Found selection layer, patching...');
        this.patchSelectionLayer(selectionLayer);
      }
    }
    
    // Hook the selection service
    if (terminal._core._selectionService) {
      this.hookSelectionService(terminal._core._selectionService, terminal);
    }
  }
  
  patchSelectionLayer(layer) {
    // Override the fill style method
    const originalFillCells = layer._fillCells?.bind(layer);
    if (originalFillCells) {
      layer._fillCells = (x, y, width, height) => {
        // Save current context
        const ctx = layer._ctx;
        if (ctx) {
          const savedFillStyle = ctx.fillStyle;
          // Apply our transparent color
          ctx.fillStyle = `rgba(${this.targetColor.r}, ${this.targetColor.g}, ${this.targetColor.b}, ${this.targetColor.a})`;
          console.log('[SelectionOverride] Applying custom fill style');
        }
        
        // Call original method
        const result = originalFillCells(x, y, width, height);
        
        return result;
      };
    }
    
    // Override the onSelectionChanged method
    const originalOnSelectionChanged = layer._onSelectionChanged?.bind(layer);
    if (originalOnSelectionChanged) {
      layer._onSelectionChanged = () => {
        console.log('[SelectionOverride] Selection changed, applying override');
        
        // Temporarily override the colors
        if (layer._colors) {
          const originalSelectionOpaque = layer._colors.selectionOpaque;
          const originalSelectionTransparent = layer._colors.selectionTransparent;
          
          // Create custom color objects
          layer._colors.selectionOpaque = {
            css: `rgba(${this.targetColor.r}, ${this.targetColor.g}, ${this.targetColor.b}, ${this.targetColor.a})`,
            rgba: this.toRgba(this.targetColor.r, this.targetColor.g, this.targetColor.b, Math.round(this.targetColor.a * 255))
          };
          
          layer._colors.selectionTransparent = layer._colors.selectionOpaque;
          
          // Call original
          const result = originalOnSelectionChanged();
          
          // Don't restore - keep our colors
          // layer._colors.selectionOpaque = originalSelectionOpaque;
          // layer._colors.selectionTransparent = originalSelectionTransparent;
          
          return result;
        }
        
        return originalOnSelectionChanged();
      };
    }
  }
  
  hookSelectionService(selectionService, terminal) {
    // Force a refresh when selection changes
    const originalSetSelection = selectionService.setSelection?.bind(selectionService);
    if (originalSetSelection) {
      selectionService.setSelection = (...args) => {
        const result = originalSetSelection(...args);
        
        // Force re-render with our colors
        setTimeout(() => {
          if (terminal._core._renderService) {
            terminal._core._renderService.onResize(terminal.cols, terminal.rows);
          }
        }, 0);
        
        return result;
      };
    }
  }
  
  toRgba(r, g, b, a) {
    return (r << 24 | g << 16 | b << 8 | a) >>> 0;
  }
}

// Initialize
window.selectionOverride = new SelectionOverride();