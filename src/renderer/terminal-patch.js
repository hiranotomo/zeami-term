/**
 * Terminal Patch - Direct override of xterm.js defaults
 * This ensures our selection color is applied regardless of how xterm.js is initialized
 */

// Wait for xterm.js to be loaded
function patchXtermDefaults() {
  if (!window.Terminal) {
    console.warn('[TerminalPatch] Terminal not found, retrying...');
    setTimeout(patchXtermDefaults, 100);
    return;
  }

  console.log('[TerminalPatch] Patching Terminal defaults...');
  
  // Store the original Terminal constructor
  const OriginalTerminal = window.Terminal;
  
  // Create a new Terminal constructor that applies our defaults
  window.Terminal = function(options = {}) {
    // Force our selection color
    if (!options.theme) {
      options.theme = {};
    }
    
    // Our transparent blue selection
    options.theme.selectionBackground = 'rgba(120, 150, 200, 0.3)';
    
    console.log('[TerminalPatch] Creating terminal with patched selectionBackground:', options.theme.selectionBackground);
    
    // Call the original constructor
    return new OriginalTerminal(options);
  };
  
  // Copy all static properties and methods
  Object.setPrototypeOf(window.Terminal, OriginalTerminal);
  Object.setPrototypeOf(window.Terminal.prototype, OriginalTerminal.prototype);
  
  // Copy static properties
  for (const key in OriginalTerminal) {
    if (OriginalTerminal.hasOwnProperty(key)) {
      window.Terminal[key] = OriginalTerminal[key];
    }
  }
  
  console.log('[TerminalPatch] Terminal patched successfully');
}

// Start patching immediately
patchXtermDefaults();