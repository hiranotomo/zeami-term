// Import xterm modules using script tags in HTML instead
// Terminal instance
let terminal;
let fitAddon;
let currentSessionId = null;

// Initialize terminal
async function initializeTerminal() {
  console.log('Creating terminal instance...');
  
  // Wait for xterm to be loaded
  if (typeof Terminal === 'undefined') {
    console.error('Terminal not loaded. Make sure xterm is included in HTML');
    return;
  }
  
  console.log('Terminal class available:', Terminal);
  
  // Create terminal instance
  terminal = new Terminal({
    fontFamily: 'Menlo, Monaco, "Courier New", monospace',
    fontSize: 14,
    theme: {
      background: '#1e1e1e',
      foreground: '#cccccc',
      cursor: '#ffffff',
      cursorAccent: '#000000',
      selection: '#264f78',
      black: '#000000',
      red: '#cd3131',
      green: '#0dbc79',
      yellow: '#e5e510',
      blue: '#2472c8',
      magenta: '#bc3fbc',
      cyan: '#11a8cd',
      white: '#e5e5e5',
      brightBlack: '#666666',
      brightRed: '#f14c4c',
      brightGreen: '#23d18b',
      brightYellow: '#f5f543',
      brightBlue: '#3b8eea',
      brightMagenta: '#d670d6',
      brightCyan: '#29b8db',
      brightWhite: '#e5e5e5'
    },
    allowTransparency: true,
    cursorBlink: true,
    cursorStyle: 'block',
    scrollback: 10000
  });

  // Add addons
  fitAddon = new FitAddon.FitAddon();
  terminal.loadAddon(fitAddon);
  
  const searchAddon = new SearchAddon.SearchAddon();
  terminal.loadAddon(searchAddon);
  
  const webLinksAddon = new WebLinksAddon.WebLinksAddon();
  terminal.loadAddon(webLinksAddon);

  // Open terminal in DOM
  const terminalElement = document.getElementById('terminal');
  if (!terminalElement) {
    console.error('Terminal element not found');
    return;
  }
  
  terminal.open(terminalElement);
  console.log('Terminal opened in DOM');
  
  // Fit terminal to container
  setTimeout(() => {
    fitAddon.fit();
    console.log('Terminal fitted to container');
  }, 100);

  // Handle terminal input
  terminal.onData((data) => {
    if (currentSessionId) {
      window.zeamiAPI.sendInput(currentSessionId, data);
    }
  });

  // Handle resize
  window.addEventListener('resize', () => {
    if (fitAddon) {
      fitAddon.fit();
    }
  });

  // Start a session
  await startSession();
  
  // Focus terminal
  terminal.focus();
}

// Start a new session
async function startSession() {
  try {
    console.log('Starting new session...');
    const result = await window.zeamiAPI.startSession({});
    
    if (result.success) {
      currentSessionId = result.sessionId;
      updateStatus('Connected', 'session-info');
      terminal.writeln('\x1b[1;32mZeamiTerm\x1b[0m - Enhanced terminal for Claude Code');
      terminal.writeln('\x1b[90mSession started: ' + currentSessionId + '\x1b[0m');
      terminal.writeln('');
      terminal.write('$ ');  // Show initial prompt
      console.log('Session started successfully:', currentSessionId);
    } else {
      terminal.writeln(`\x1b[1;31mFailed to start session: ${result.error}\x1b[0m`);
      console.error('Failed to start session:', result.error);
    }
  } catch (error) {
    terminal.writeln(`\x1b[1;31mError: ${error.message}\x1b[0m`);
    console.error('Session start error:', error);
  }
}

// Setup IPC listeners
function setupIPCListeners() {
  console.log('Setting up IPC listeners...');
  
  // Terminal data
  window.zeamiAPI.onTerminalData((data) => {
    if (data.sessionId === currentSessionId && terminal) {
      terminal.write(data.data);
    }
  });

  // Pattern detection
  window.zeamiAPI.onPatternDetected((data) => {
    if (data.sessionId === currentSessionId) {
      handlePatternDetected(data.pattern);
    }
  });

  // Action suggestions
  window.zeamiAPI.onSuggestAction((data) => {
    if (data.sessionId === currentSessionId) {
      showActionSuggestion(data.action);
    }
  });
}

// Handle pattern detection
function handlePatternDetected(pattern) {
  const indicator = document.getElementById('pattern-indicator');
  
  // Update indicator based on pattern type
  indicator.className = '';
  if (pattern.type === 'error') {
    indicator.classList.add('has-error');
    indicator.textContent = `⚠️ ${pattern.name}`;
  } else if (pattern.type === 'warning') {
    indicator.classList.add('has-warning');
    indicator.textContent = `⚡ ${pattern.name}`;
  } else {
    indicator.textContent = `ℹ️ ${pattern.name}`;
  }

  // Clear indicator after 5 seconds
  setTimeout(() => {
    indicator.textContent = '';
    indicator.className = '';
  }, 5000);

  // Show suggestion based on action
  if (pattern.action === 'suggest-zeami-type-diagnose') {
    showActionSuggestion('Run: zeami type diagnose');
  } else if (pattern.action === 'suggest-npm-install') {
    showActionSuggestion('Run: npm install');
  }
}

// Show action suggestion
function showActionSuggestion(action) {
  // Create suggestion overlay (future implementation)
  console.log('Suggested action:', action);
}

// Update status bar
function updateStatus(text, elementId) {
  const element = document.getElementById(elementId);
  if (element) {
    element.textContent = text;
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  console.log('Initializing ZeamiTerm...');
  initializeTerminal();
  setupIPCListeners();
});

// Cleanup on window close
window.addEventListener('beforeunload', () => {
  window.zeamiAPI.removeAllListeners();
});

// Debug: Check if terminal is visible
setTimeout(() => {
  const terminalElement = document.getElementById('terminal');
  console.log('Terminal element:', terminalElement);
  console.log('Terminal dimensions:', terminalElement?.offsetWidth, terminalElement?.offsetHeight);
}, 1000);