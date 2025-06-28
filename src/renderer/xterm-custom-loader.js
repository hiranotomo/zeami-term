/**
 * Custom xterm.js loader that uses our patched version
 * This ensures that our modifications (like transparent selection) are always used
 */

(function() {
  // Check if we're in the renderer process
  if (typeof window === 'undefined') {
    return;
  }

  // Path to our custom-built xterm.js
  const customXtermPath = '../../build/xterm.js';

  // Load the custom xterm.js
  const script = document.createElement('script');
  script.src = customXtermPath;
  script.onload = function() {
    console.log('✓ Custom xterm.js loaded successfully');
    
    // Verify our patches are applied by checking if Terminal is available
    if (window.Terminal || window.Terminal?.Terminal) {
      console.log('✓ Terminal constructor available');
      
      // The UMD wrapper might expose Terminal differently
      if (!window.Terminal && window.Terminal?.Terminal) {
        window.Terminal = window.Terminal.Terminal;
      }
    }
  };
  script.onerror = function() {
    console.error('Failed to load custom xterm.js, falling back to default');
    // Fallback to loading the default xterm.js
    const fallbackScript = document.createElement('script');
    fallbackScript.src = '../../node_modules/xterm/lib/xterm.js';
    document.head.appendChild(fallbackScript);
  };

  // Insert before other scripts
  const firstScript = document.getElementsByTagName('script')[0];
  if (firstScript) {
    firstScript.parentNode.insertBefore(script, firstScript);
  } else {
    document.head.appendChild(script);
  }
})();