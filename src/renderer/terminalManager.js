/**
 * Terminal Manager - Advanced xterm.js integration for ZeamiTerm
 * Includes WebGL rendering, selection, search, and advanced tab management
 */

class TerminalManager {
  constructor() {
    this.terminals = new Map();
    this.activeTerminalId = null;
    this.terminalCounter = 0;
    this.searchVisible = false;
    
    // Split view management
    this.splitManager = null;
    
    // Performance optimization settings
    this.useWebGL = true;
    this.scrollbackLimit = 10000;
    this.fastScrollModifier = 'shift';
    
    // xterm.js configuration with performance optimizations
    this.defaultOptions = {
      cursorBlink: true,
      cursorStyle: 'block',
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      fontSize: 14,
      fontWeight: 'normal',
      lineHeight: 1.2,
      letterSpacing: 0,
      scrollback: this.scrollbackLimit,
      theme: {
        foreground: '#cccccc',
        background: '#1e1e1e',
        cursor: '#ffffff',
        cursorAccent: '#000000',
        selection: '#3a3d41',
        black: '#000000',
        brightBlack: '#666666',
        red: '#cd3131',
        brightRed: '#f14c4c',
        green: '#0dbc79',
        brightGreen: '#23d18b',
        yellow: '#e5e510',
        brightYellow: '#f5f543',
        blue: '#2472c8',
        brightBlue: '#3b8eea',
        magenta: '#bc3fbc',
        brightMagenta: '#d670d6',
        cyan: '#11a8cd',
        brightCyan: '#29b8db',
        white: '#e5e5e5',
        brightWhite: '#ffffff'
      },
      allowTransparency: false,
      macOptionIsMeta: true,
      rightClickSelectsWord: true,
      windowsMode: navigator.platform.includes('Win'),
      convertEol: false,
      allowProposedApi: true,
      screenReaderMode: false,
      fastScrollModifier: this.fastScrollModifier,
      scrollOnUserInput: true,
      smoothScrollDuration: 100,
      overviewRulerWidth: 10,
      // Critical settings for proper input handling
      logLevel: 'warn',
      bellStyle: 'none',
      rendererType: 'canvas', // Use canvas by default for stability
      wordSeparator: ' ()[]{}\'"'
    };
    
    this.init();
  }
  
  async init() {
    // Hide loading screen
    document.getElementById('loading').style.display = 'none';
    
    // Initialize split manager
    if (window.SplitManager) {
      this.splitManager = new window.SplitManager(this);
    }
    
    // Setup search UI
    this.setupSearchUI();
    
    // Setup event listeners
    this.setupEventListeners();
    
    // Create initial terminal
    const firstSession = await this.createTerminal();
    
    // Ensure the first tab is properly activated
    if (firstSession && firstSession.id) {
      setTimeout(() => {
        this.switchToTerminal(firstSession.id);
        this.focusActiveTerminal();
      }, 100);
    }
  }
  
  setupSearchUI() {
    // Create search container
    const searchContainer = document.createElement('div');
    searchContainer.id = 'search-container';
    searchContainer.className = 'search-container';
    searchContainer.style.display = 'none';
    searchContainer.innerHTML = `
      <input type="text" id="search-input" placeholder="Find..." />
      <button id="search-prev" title="Previous match">▲</button>
      <button id="search-next" title="Next match">▼</button>
      <label>
        <input type="checkbox" id="search-case-sensitive" />
        <span>Case</span>
      </label>
      <label>
        <input type="checkbox" id="search-whole-word" />
        <span>Word</span>
      </label>
      <label>
        <input type="checkbox" id="search-regex" />
        <span>Regex</span>
      </label>
      <button id="search-close">×</button>
    `;
    
    document.getElementById('app').appendChild(searchContainer);
    
    // Search event handlers
    document.getElementById('search-input').addEventListener('input', (e) => {
      this.performSearch(e.target.value);
    });
    
    document.getElementById('search-next').addEventListener('click', () => {
      this.findNext();
    });
    
    document.getElementById('search-prev').addEventListener('click', () => {
      this.findPrevious();
    });
    
    document.getElementById('search-close').addEventListener('click', () => {
      this.hideSearch();
    });
    
    ['search-case-sensitive', 'search-whole-word', 'search-regex'].forEach(id => {
      document.getElementById(id).addEventListener('change', () => {
        const value = document.getElementById('search-input').value;
        if (value) this.performSearch(value);
      });
    });
  }
  
  setupEventListeners() {
    // Button event listeners
    document.getElementById('new-terminal-btn').addEventListener('click', () => {
      this.createTerminal();
    });
    
    document.getElementById('split-terminal-btn').addEventListener('click', () => {
      this.splitTerminal();
    });
    
    // Add double-click to exit split mode
    document.getElementById('split-terminal-btn').addEventListener('dblclick', () => {
      if (this.splitMode) {
        this.disableSplitView();
      }
    });
    
    document.getElementById('clear-terminal-btn').addEventListener('click', () => {
      this.clearTerminal();
    });
    
    // Window resize handler with debouncing
    let resizeTimeout;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        this.resizeAllTerminals();
      }, 100);
    });
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      // Cmd/Ctrl + T: New terminal
      if ((e.metaKey || e.ctrlKey) && e.key === 't') {
        e.preventDefault();
        this.createTerminal();
      }
      
      // Cmd/Ctrl + W: Close terminal
      if ((e.metaKey || e.ctrlKey) && e.key === 'w') {
        e.preventDefault();
        this.closeTerminal(this.activeTerminalId);
      }
      
      // Cmd/Ctrl + K: Clear terminal
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        this.clearTerminal();
      }
      
      // Cmd/Ctrl + F: Find
      if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
        e.preventDefault();
        this.showSearch();
      }
      
      // Cmd/Ctrl + 1-9: Switch tabs
      if ((e.metaKey || e.ctrlKey) && e.key >= '1' && e.key <= '9') {
        e.preventDefault();
        const index = parseInt(e.key) - 1;
        const terminalIds = Array.from(this.terminals.keys());
        if (index < terminalIds.length) {
          this.switchToTerminal(terminalIds[index]);
        }
      }
      
      // Cmd/Ctrl + Shift + ]: Next tab
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === ']') {
        e.preventDefault();
        this.nextTab();
      }
      
      // Cmd/Ctrl + Shift + [: Previous tab
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === '[') {
        e.preventDefault();
        this.previousTab();
      }
    });
  }
  
  async createTerminal(options = {}) {
    const id = `terminal-${++this.terminalCounter}`;
    
    // Create terminal wrapper
    const wrapper = document.createElement('div');
    wrapper.className = 'terminal-wrapper';
    wrapper.id = `wrapper-${id}`;
    document.getElementById('terminal-container').appendChild(wrapper);
    
    // Create xterm instance
    const terminal = new window.Terminal({
      ...this.defaultOptions,
      ...options
    });
    
    // Create addons
    const fitAddon = new window.FitAddon.FitAddon();
    const webLinksAddon = new window.WebLinksAddon.WebLinksAddon();
    const searchAddon = new window.SearchAddon.SearchAddon();
    // Fix for new @xterm addon namespaces
    const SerializeAddon = window.SerializeAddon || window.AddonSerialize;
    const serializeAddon = SerializeAddon ? new SerializeAddon.SerializeAddon() : null;
    
    // WebGL renderer for performance
    let rendererAddon = null;
    const WebglAddon = window.WebglAddon || window.AddonWebgl;
    const CanvasAddon = window.CanvasAddon || window.AddonCanvas;
    
    if (this.useWebGL && WebglAddon) {
      try {
        rendererAddon = new WebglAddon.WebglAddon();
        if (rendererAddon.onContextLoss) {
          rendererAddon.onContextLoss(() => {
            console.warn('WebGL context lost, falling back to canvas renderer');
            rendererAddon.dispose();
            if (CanvasAddon) {
              rendererAddon = new CanvasAddon.CanvasAddon();
              terminal.loadAddon(rendererAddon);
            }
          });
        }
      } catch (e) {
        console.warn('WebGL not supported, using canvas renderer', e);
        if (CanvasAddon) {
          rendererAddon = new CanvasAddon.CanvasAddon();
        }
      }
    } else if (CanvasAddon) {
      // Fallback to canvas renderer
      rendererAddon = new CanvasAddon.CanvasAddon();
    }
    
    // Load addons
    terminal.loadAddon(fitAddon);
    terminal.loadAddon(webLinksAddon);
    terminal.loadAddon(searchAddon);
    terminal.loadAddon(serializeAddon);
    if (rendererAddon) {
      terminal.loadAddon(rendererAddon);
    }
    
    // Open terminal in wrapper
    terminal.open(wrapper);
    
    // Fit terminal to container
    fitAddon.fit();
    
    // Create terminal session
    const session = {
      id,
      terminal,
      fitAddon,
      searchAddon,
      serializeAddon,
      rendererAddon,
      process: null,
      title: `Terminal ${this.terminalCounter}`,
      cwd: null,
      shell: null,
      selectionStart: null,
      selectionEnd: null
    };
    
    this.terminals.set(id, session);
    
    // Add tab
    this.addTab(session);
    
    // Setup terminal handlers
    this.setupTerminalHandlers(session);
    
    // Connect to backend
    await this.connectTerminal(session);
    
    return session;
  }
  
  addTab(session) {
    const tabsContainer = document.getElementById('tabs-container');
    const tab = document.createElement('div');
    tab.className = 'tab';
    tab.id = `tab-${session.id}`;
    tab.innerHTML = `
      <span class="tab-title">${session.title}</span>
      <span class="tab-close" data-terminal-id="${session.id}">×</span>
    `;
    
    // Tab click handler
    tab.addEventListener('click', (e) => {
      if (e.target.classList.contains('tab-close')) {
        e.stopPropagation();
        this.closeTerminal(session.id);
      } else {
        this.switchToTerminal(session.id);
      }
    });
    
    // Tab drag and drop
    tab.draggable = true;
    tab.addEventListener('dragstart', (e) => {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', session.id);
      tab.classList.add('dragging');
    });
    
    tab.addEventListener('dragend', () => {
      tab.classList.remove('dragging');
    });
    
    tab.addEventListener('dragover', (e) => {
      e.preventDefault();
      const draggingTab = document.querySelector('.dragging');
      if (draggingTab && draggingTab !== tab) {
        const rect = tab.getBoundingClientRect();
        const midpoint = rect.left + rect.width / 2;
        if (e.clientX < midpoint) {
          tabsContainer.insertBefore(draggingTab, tab);
        } else {
          tabsContainer.insertBefore(draggingTab, tab.nextSibling);
        }
      }
    });
    
    tabsContainer.appendChild(tab);
  }
  
  setupTerminalHandlers(session) {
    const { terminal } = session;
    
    // Handle terminal input - send all input immediately without buffering
    terminal.onData((data) => {
      if (session.process) {
        const api = window.electronAPI || window.zeamiAPI;
        if (api) {
          // Send all data immediately to ensure proper echo and display
          if (window.electronAPI) {
            window.electronAPI.sendInput(session.process.sessionId || session.process.id, data);
          } else {
            window.zeamiAPI.sendInput(session.process.sessionId, data);
          }
        }
      }
    });
    
    // Handle terminal resize
    terminal.onResize((size) => {
      if (session.process) {
        const api = window.electronAPI || window.zeamiAPI;
        if (api) {
          if (window.electronAPI) {
            window.electronAPI.resizeTerminal(session.process.sessionId || session.process.id, size.cols, size.rows);
          } else {
            window.zeamiAPI.resizeTerminal(session.process.sessionId, size.cols, size.rows);
          }
        }
      }
    });
    
    // Handle selection
    terminal.onSelectionChange(() => {
      const selection = terminal.getSelection();
      if (selection) {
        // Store selection for copy operations
        session.selectedText = selection;
      }
    });
    
    // Handle mouse events for better selection
    terminal.element.addEventListener('mouseup', () => {
      if (terminal.hasSelection()) {
        // Automatically copy to clipboard on selection
        if (navigator.clipboard && session.selectedText) {
          navigator.clipboard.writeText(session.selectedText)
            .catch(err => console.error('Failed to copy to clipboard:', err));
        }
      }
    });
    
    // Handle paste
    terminal.element.addEventListener('paste', (e) => {
      e.preventDefault();
      const text = e.clipboardData.getData('text/plain');
      if (text && session.process) {
        const api = window.electronAPI || window.zeamiAPI;
        if (api) {
          if (window.electronAPI) {
            window.electronAPI.sendInput(session.process.sessionId || session.process.id, text);
          } else {
            window.zeamiAPI.sendInput(session.process.sessionId, text);
          }
        }
      }
    });
    
    // Handle focus/blur
    terminal.element.addEventListener('focus', () => {
      this.activeTerminalId = session.id;
      this.updateStatusBar(session);
    });
    
    // Handle scrolling performance
    let scrollTimer;
    terminal.element.addEventListener('wheel', (e) => {
      if (e.shiftKey || e[this.fastScrollModifier + 'Key']) {
        // Fast scroll mode
        terminal.scrollLines(e.deltaY > 0 ? 10 : -10);
        e.preventDefault();
      }
      
      // Optimize rendering during scroll
      clearTimeout(scrollTimer);
      if (session.rendererAddon) {
        session.rendererAddon.clearTextureAtlas?.();
      }
      scrollTimer = setTimeout(() => {
        if (session.rendererAddon) {
          session.rendererAddon.clearTextureAtlas?.();
        }
      }, 100);
    });
  }
  
  async connectTerminal(session) {
    const api = window.electronAPI || window.zeamiAPI;
    if (!api) {
      session.terminal.write('ZeamiTerm - Terminal API not available\r\n');
      session.terminal.write('Running in demo mode\r\n\r\n');
      session.terminal.write('$ ');
      return;
    }
    
    try {
      session.terminal.write('\x1b[36mConnecting to terminal backend...\x1b[0m\r\n');
      
      const result = window.electronAPI 
        ? await window.electronAPI.createTerminal({
            cols: session.terminal.cols,
            rows: session.terminal.rows,
            cwd: session.cwd || '/'
          })
        : await window.zeamiAPI.startSession({
            cols: session.terminal.cols,
            rows: session.terminal.rows,
            cwd: session.cwd
          });
      
      if (result.success || result.id) {
        session.process = {
          id: result.id,
          sessionId: result.sessionId || result.id,
          pid: result.pid
        };
        session.cwd = result.cwd;
        session.shell = result.shell;
        
        session.terminal.write(`\x1b[32m✓ Connected!\x1b[0m Session: ${result.sessionId || result.id}\r\n`);
        session.terminal.write(`Shell: ${result.shell || 'unknown'}\r\n`);
        session.terminal.write(`Directory: ${result.cwd || 'unknown'}\r\n\r\n`);
        
        // Send terminal configuration commands as a single command to avoid multiple prompts
        setTimeout(() => {
          // Combine all exports into one command with ; separator
          const configCommand = 'export TERM=xterm-256color LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8 2>/dev/null; clear';
          
          const api = window.electronAPI || window.zeamiAPI;
          if (window.electronAPI) {
            window.electronAPI.sendInput(session.process.sessionId || session.process.id, configCommand + '\r');
          } else {
            window.zeamiAPI.sendInput(session.process.sessionId, configCommand + '\r');
          }
        }, 300); // Slightly longer delay to ensure PTY is ready
        
        // Clear existing listeners first
        if (window.zeamiAPI) {
          window.zeamiAPI.removeAllListeners();
        }
        
        // Setup data handler with proper session filtering
        if (window.electronAPI) {
          window.electronAPI.onTerminalData((data) => {
            if ((data.id === session.process.id || data.sessionId === session.process.sessionId) && session.terminal) {
              try {
                session.terminal.write(data.data);
              } catch (e) {
                console.error('Error writing to terminal:', e);
              }
            }
          });
        } else if (window.zeamiAPI) {
          window.zeamiAPI.onTerminalData((data) => {
            if (data.sessionId === session.process.sessionId && session.terminal) {
              try {
                session.terminal.write(data.data);
              } catch (e) {
                console.error('Error writing to terminal:', e);
              }
            }
          });
        }
        
        // Update status
        document.getElementById('status-connection').textContent = 'Connected';
        document.getElementById('status-connection').style.color = '#0dbc79';
        this.updateStatusBar(session);
      } else {
        session.terminal.write(`\x1b[31m✗ Connection failed:\x1b[0m ${result.error}\r\n`);
        document.getElementById('status-connection').textContent = 'Failed';
        document.getElementById('status-connection').style.color = '#cd3131';
      }
    } catch (error) {
      session.terminal.write(`\x1b[31m✗ Error:\x1b[0m ${error.message}\r\n`);
      console.error('Connection error:', error);
      document.getElementById('status-connection').textContent = 'Error';
      document.getElementById('status-connection').style.color = '#cd3131';
    }
  }
  
  // Search functionality
  showSearch() {
    this.searchVisible = true;
    document.getElementById('search-container').style.display = 'flex';
    document.getElementById('search-input').focus();
    document.getElementById('search-input').select();
  }
  
  hideSearch() {
    this.searchVisible = false;
    document.getElementById('search-container').style.display = 'none';
    
    // Clear search in active terminal
    const session = this.terminals.get(this.activeTerminalId);
    if (session && session.searchAddon) {
      session.searchAddon.clearDecorations();
    }
  }
  
  performSearch(term) {
    const session = this.terminals.get(this.activeTerminalId);
    if (!session || !session.searchAddon || !term) return;
    
    const caseSensitive = document.getElementById('search-case-sensitive').checked;
    const wholeWord = document.getElementById('search-whole-word').checked;
    const regex = document.getElementById('search-regex').checked;
    
    session.searchAddon.findNext(term, {
      caseSensitive,
      wholeWordOnly: wholeWord,
      regex,
      decorations: {
        matchBackground: '#515C6A',
        matchBorder: '#66B2FF',
        matchOverviewRuler: '#66B2FF',
        activeMatchBackground: '#515C6A',
        activeMatchBorder: '#FF9633',
        activeMatchColorOverviewRuler: '#FF9633'
      }
    });
  }
  
  findNext() {
    const session = this.terminals.get(this.activeTerminalId);
    const term = document.getElementById('search-input').value;
    if (session && session.searchAddon && term) {
      const caseSensitive = document.getElementById('search-case-sensitive').checked;
      const wholeWord = document.getElementById('search-whole-word').checked;
      const regex = document.getElementById('search-regex').checked;
      
      session.searchAddon.findNext(term, { caseSensitive, wholeWordOnly: wholeWord, regex });
    }
  }
  
  findPrevious() {
    const session = this.terminals.get(this.activeTerminalId);
    const term = document.getElementById('search-input').value;
    if (session && session.searchAddon && term) {
      const caseSensitive = document.getElementById('search-case-sensitive').checked;
      const wholeWord = document.getElementById('search-whole-word').checked;
      const regex = document.getElementById('search-regex').checked;
      
      session.searchAddon.findPrevious(term, { caseSensitive, wholeWordOnly: wholeWord, regex });
    }
  }
  
  // Tab management
  switchToTerminal(id) {
    if (!this.terminals.has(id)) return;
    
    if (!this.splitManager || !this.splitManager.isActive) {
      // Normal tab mode - hide all terminals except selected
      this.terminals.forEach((session, terminalId) => {
        const wrapper = document.getElementById(`wrapper-${terminalId}`);
        const tab = document.getElementById(`tab-${terminalId}`);
        if (wrapper) wrapper.classList.remove('active');
        if (tab) tab.classList.remove('active');
      });
      
      // Show selected terminal
      const session = this.terminals.get(id);
      const wrapper = document.getElementById(`wrapper-${id}`);
      const tab = document.getElementById(`tab-${id}`);
      
      if (wrapper) wrapper.classList.add('active');
      if (tab) tab.classList.add('active');
      
      this.activeTerminalId = id;
      
      // Resize to fit
      if (session.fitAddon) {
        setTimeout(() => session.fitAddon.fit(), 0);
      }
      
      // Focus terminal
      session.terminal.focus();
      
      // Update status bar
      this.updateStatusBar(session);
    } else {
      // Split mode - handled by split manager
      const tab = document.getElementById(`tab-${id}`);
      const prevTab = document.getElementById(`tab-${this.activeTerminalId}`);
      
      if (prevTab) prevTab.classList.remove('active');
      if (tab) tab.classList.add('active');
      
      this.activeTerminalId = id;
      
      // Update status bar
      const session = this.terminals.get(id);
      this.updateStatusBar(session);
    }
  }
  
  nextTab() {
    const ids = Array.from(this.terminals.keys());
    const currentIndex = ids.indexOf(this.activeTerminalId);
    const nextIndex = (currentIndex + 1) % ids.length;
    this.switchToTerminal(ids[nextIndex]);
  }
  
  previousTab() {
    const ids = Array.from(this.terminals.keys());
    const currentIndex = ids.indexOf(this.activeTerminalId);
    const prevIndex = (currentIndex - 1 + ids.length) % ids.length;
    this.switchToTerminal(ids[prevIndex]);
  }
  
  splitTerminal() {
    if (this.splitManager) {
      this.splitManager.toggle();
    }
  }
  
  closeTerminal(id) {
    const session = this.terminals.get(id);
    if (!session) return;
    
    // Kill process
    if (session.process) {
      const api = window.electronAPI || window.zeamiAPI;
      if (api) {
        if (window.electronAPI) {
          window.electronAPI.killTerminal(session.process.id);
        } else if (window.zeamiAPI) {
          window.zeamiAPI.endSession(session.process.sessionId);
        }
      }
    }
    
    // Dispose addons
    if (session.searchAddon) session.searchAddon.dispose();
    if (session.fitAddon) session.fitAddon.dispose();
    if (session.rendererAddon) session.rendererAddon.dispose();
    
    // Dispose terminal
    session.terminal.dispose();
    
    // Remove from DOM
    const wrapper = document.getElementById(`wrapper-${id}`);
    const tab = document.getElementById(`tab-${id}`);
    if (wrapper) wrapper.remove();
    if (tab) tab.remove();
    
    // Remove from map
    this.terminals.delete(id);
    
    // Check if we should exit split mode
    if (this.splitManager && this.splitManager.isActive && this.terminals.size <= 1) {
      this.splitManager.disable();
    }
    
    // Switch to another terminal or create new one
    if (this.terminals.size === 0) {
      this.createTerminal();
    } else if (this.activeTerminalId === id) {
      const firstId = this.terminals.keys().next().value;
      this.switchToTerminal(firstId);
    }
  }
  
  clearTerminal() {
    const session = this.terminals.get(this.activeTerminalId);
    if (session) {
      session.terminal.clear();
    }
  }
  
  focusActiveTerminal() {
    const session = this.terminals.get(this.activeTerminalId);
    if (session) {
      session.terminal.focus();
    }
  }
  
  resizeAllTerminals() {
    this.terminals.forEach(session => {
      if (session.fitAddon) {
        session.fitAddon.fit();
      }
    });
  }
  
  updateStatusBar(session) {
    document.getElementById('status-shell').textContent = 
      `Shell: ${session.shell || '-'}`;
    document.getElementById('status-cwd').textContent = 
      `Directory: ${session.cwd || '-'}`;
    document.getElementById('status-process').textContent = 
      `Process: ${session.process ? session.process.pid : '-'}`;
  }
}

// Initialize terminal manager when page loads
document.addEventListener('DOMContentLoaded', () => {
  window.terminalManager = new TerminalManager();
});