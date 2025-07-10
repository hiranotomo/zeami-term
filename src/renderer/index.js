// Import ZeamiTermManager
import { ZeamiTermManager } from './core/ZeamiTermManager.js';
import { pasteDebugger } from './utils/PasteDebugger.js';
import { keyboardShortcutHelp } from './components/KeyboardShortcutHelp.js';
import KeyboardShortcuts from './utils/KeyboardShortcuts.js';

// Create and initialize manager
const manager = new ZeamiTermManager();
window.zeamiTermManager = manager; // Make it globally accessible

// Show debug instructions with OS-specific shortcut
const debugShortcut = KeyboardShortcuts.getShortcuts().pasteDebugger;
console.log(`[ZeamiTerm] Press ${debugShortcut} to toggle paste debugger`);

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
  console.log('[Renderer] DOM loaded, initializing ZeamiTermManager...');
  
  try {
    await manager.init();
    console.log('[Renderer] ZeamiTermManager initialized successfully');
  } catch (error) {
    console.error('[Renderer] Failed to initialize ZeamiTermManager:', error);
    
    // Show error in loading screen
    const loading = document.getElementById('loading');
    if (loading) {
      const message = loading.querySelector('div');
      if (message) {
        message.textContent = `Initialization failed: ${error.message}`;
        message.style.color = '#ff6b6b';
      }
    }
  }
});

// Handle window unload
window.addEventListener('beforeunload', () => {
  if (manager) {
    manager.cleanup();
  }
});

// Export for debugging
window.zeamiTermManager = manager;