/**
 * Terminal Manager - Bridge to new ZeamiTermManager
 * This file serves as a bridge during the transition to the new architecture
 */

import { ZeamiTermManager } from './core/ZeamiTermManager.js';

// Create and export the new manager
window.TerminalManager = ZeamiTermManager;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
  console.log('[TerminalManager] Transitioning to new architecture...');
  
  try {
    const manager = new ZeamiTermManager();
    window.terminalManager = manager;
    
    // Initialize
    await manager.init();
    
    // Setup menu action listener
    if (window.electronAPI && window.electronAPI.onMenuAction) {
      window.electronAPI.onMenuAction((action) => {
        console.log('[TerminalManager] Menu action:', action);
        switch (action) {
          case 'preferences':
            manager.preferenceWindow.open();
            break;
          case 'new-terminal':
            manager.createTerminal();
            break;
          case 'close-terminal':
            if (manager.activeTerminalId) {
              manager.closeTerminal(manager.activeTerminalId);
            }
            break;
          case 'clear-terminal':
            const session = manager.terminals.get(manager.activeTerminalId);
            if (session && session.terminal) {
              session.terminal._processCommand('clear', []);
            }
            break;
          case 'find':
            manager.toggleSearch();
            break;
          case 'save-terminal':
            manager.saveCurrentTerminal();
            break;
          case 'toggle-file-explorer':
            manager.toggleFileExplorer();
            break;
          default:
            console.log('[TerminalManager] Unknown menu action:', action);
        }
      });
    }
    
    // Setup notification event listeners
    if (window.electronAPI && window.electronAPI.onNotificationClicked) {
      window.electronAPI.onNotificationClicked((data) => {
        console.log('[TerminalManager] Notification clicked:', data);
        
        // Focus the terminal that triggered the notification
        if (data.terminalId && manager.terminals.has(data.terminalId)) {
          manager.focusTerminal(data.terminalId);
          
          // Highlight or flash the terminal to draw attention
          const session = manager.terminals.get(data.terminalId);
          if (session && session.element) {
            session.element.classList.add('notification-highlight');
            setTimeout(() => {
              session.element.classList.remove('notification-highlight');
            }, 1000);
          }
        }
      });
    }
    
    // Setup terminal focus event listener
    if (window.electronAPI && window.electronAPI.onTerminalFocus) {
      window.electronAPI.onTerminalFocus((terminalId) => {
        console.log('[TerminalManager] Focus terminal:', terminalId);
        if (manager.terminals.has(terminalId)) {
          manager.focusTerminal(terminalId);
        }
      });
    }
    
    console.log('[TerminalManager] New architecture initialized successfully!');
  } catch (error) {
    console.error('[TerminalManager] Initialization failed:', error);
    
    // Show error to user
    const loading = document.getElementById('loading');
    if (loading) {
      loading.innerHTML = `
        <div style="color: #f44747; text-align: center; padding: 20px;">
          <h3>Initialization Error</h3>
          <p>${error.message || 'Unknown error occurred'}</p>
          <p style="font-size: 12px; margin-top: 10px;">
            Press Cmd/Ctrl+Shift+I to open developer tools for more details
          </p>
        </div>
      `;
    }
    
    // Re-throw to ensure it's visible in console
    throw error;
  }
});