// Import ZeamiTermManager
import { ZeamiTermManager } from './core/ZeamiTermManager.js';
import { pasteDebugger } from './utils/PasteDebugger.js';

// Create and initialize manager
const manager = new ZeamiTermManager();

// Show debug instructions
console.log('[ZeamiTerm] Press Ctrl+Shift+P to toggle paste debugger');

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
      const message = loading.querySelector('p');
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