/**
 * Simple Index - Minimal initialization for ZeamiTerm
 * This file just ensures terminalManager.js handles everything
 */

// The terminal manager will initialize automatically when DOM is ready
// (loaded from terminalManager.js)

// Optional: Setup any global error handlers
window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
});

// Session management is now handled by terminalManager.js
console.log('ZeamiTerm starting...');