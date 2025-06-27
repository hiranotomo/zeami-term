/**
 * Terminal Manager - Advanced xterm.js integration for ZeamiTerm
 * Includes WebGL rendering, selection, search, and advanced tab management
 */

// Error state indicator will be loaded dynamically to avoid require issues

class TerminalManager {
  constructor() {
    this.terminals = new Map();
    this.activeTerminalId = null;
    this.terminalCounter = 0;
    this.searchVisible = false;
    
    // Split view management
    this.splitManager = null;
    
    // Theme management
    this.themeManager = null;
    
    // Performance optimization settings
    this.useWebGL = true;
    this.scrollbackLimit = 50000; // Increased for large outputs
    this.fastScrollModifier = 'shift';
    this.fastScrollMultiplier = 10; // 10x speed with shift
    
    // Show startup logo
    this.showStartupLogo = true;
    
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
      smoothScrollDuration: 0, // Disable smooth scrolling for performance
      fastScrollModifier: 'shift',
      fastScrollSensitivity: 5,
      scrollSensitivity: 1,
      theme: {
        foreground: '#cccccc',
        background: '#1e1e1e',
        cursor: '#ffffff',
        cursorAccent: '#000000',
        selectionBackground: '#7896C84D', // Transparent blue selection (hex with alpha)
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
      smoothScrollDuration: 0, // Disable smooth scrolling for better performance
      overviewRulerWidth: 10,
      // Performance optimizations
      fastScrollSensitivity: 5, // Increase scroll speed
      scrollSensitivity: 1,
      macOptionClickForcesSelection: true,
      // Critical settings for proper input handling
      logLevel: 'warn',
      bellStyle: 'none',
      rendererType: 'canvas', // Use canvas by default for stability
      wordSeparator: ' ()[]{}\'"',
      // Additional performance settings
      customGlyphs: true,
      drawBoldTextInBrightColors: true,
      minimumContrastRatio: 4.5
    };
    
    this.init();
  }
  
  async init() {
    // Hide loading screen
    document.getElementById('loading').style.display = 'none';
    
    // Initialize theme manager V2
    if (window.ThemeManagerV2) {
      console.log('[TerminalManager] Initializing ThemeManagerV2...');
      this.themeManager = new window.ThemeManagerV2();
      const theme = await this.themeManager.init();
      console.log('[TerminalManager] ThemeManagerV2 initialized with theme:', theme);
    } else {
      console.error('[TerminalManager] ThemeManagerV2 not found!');
    }
    
    // Initialize split manager
    if (window.SplitManager) {
      this.splitManager = new window.SplitManager(this);
    }
    
    // Initialize update notifier
    if (window.UpdateNotifier) {
      this.updateNotifier = new window.UpdateNotifier();
    }
    
    // Setup search UI
    this.setupSearchUI();
    
    // Setup event listeners
    this.setupEventListeners();
    
    // Setup session management - DISABLED for now
    // this.setupSessionManagement();
    
    // Create initial terminal
    const firstSession = await this.createTerminal();
    
    // Ensure the first tab is properly activated
    if (firstSession && firstSession.id) {
      setTimeout(() => {
        this.switchToTerminal(firstSession.id);
        this.focusActiveTerminal();
        // Force resize to fix initial display area
        this.resizeAllTerminals();
        // Additional focus attempt after a longer delay
        setTimeout(() => {
          this.focusActiveTerminal();
          this.resizeAllTerminals();
        }, 500);
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
    
    // Focus terminal when clicking on the container
    document.getElementById('terminal-container').addEventListener('click', () => {
      this.focusActiveTerminal();
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
    
    // Get theme from theme manager
    let terminalTheme;
    if (this.themeManager) {
      terminalTheme = this.themeManager.getXtermTheme();
      console.log('[TerminalManager] Using theme from ThemeManagerV2:', terminalTheme);
    } else {
      terminalTheme = this.defaultOptions.theme;
      console.log('[TerminalManager] Using default theme:', terminalTheme);
    }
    
    // Create xterm instance with proper theme
    const terminal = new window.Terminal({
      ...this.defaultOptions,
      theme: terminalTheme,
      ...options
    });
    
    console.log('[TerminalManager] Terminal created with theme:', terminal.options.theme);
    console.log('[TerminalManager] Selection color:', terminal.options.theme?.selectionBackground);
    
    // Debug: Check renderer type after addons are loaded
    setTimeout(() => {
      console.log('[TerminalManager] Renderer type:', this.useWebGL ? 'WebGL' : 'Canvas');
      console.log('[TerminalManager] Terminal._core._renderService:', terminal._core?._renderService);
      console.log('[TerminalManager] Actual theme in use:', terminal._core?._themeService?.colors);
    }, 1000);
    
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
        // Configure WebGL for optimal performance
        rendererAddon = new WebglAddon.WebglAddon();
        
        // Enable texture atlas for better glyph rendering
        if (rendererAddon.textureAtlas) {
          rendererAddon.textureAtlas = true;
        }
        
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
    
    // Fit terminal to container with a delay to ensure proper sizing
    setTimeout(() => {
      fitAddon.fit();
      // Force a second fit after a short delay for accuracy
      setTimeout(() => {
        fitAddon.fit();
      }, 100);
    }, 50);
    
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
    
    // Initialize error state indicator (safe, read-only monitoring)
    try {
      if (window.ErrorStateIndicator) {
        session.errorIndicator = new window.ErrorStateIndicator(terminal, wrapper);
      } else {
        console.warn('ErrorStateIndicator not loaded yet');
      }
    } catch (err) {
      console.warn('Failed to initialize error indicator:', err);
      // Continue without error indicator if initialization fails
    }
    
    this.terminals.set(id, session);
    
    // Add tab
    this.addTab(session);
    
    // Setup terminal handlers
    this.setupTerminalHandlers(session);
    
    // Switch to this terminal immediately
    this.switchToTerminal(id);
    
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
          // Debug log for input
          console.log('[Terminal] Sending input:', data.split('').map(c => {
            const code = c.charCodeAt(0);
            if (code < 32 || code === 127) return `\\x${code.toString(16).padStart(2, '0')}`;
            return c;
          }).join(''));
          
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
      
      // Update tab state when terminal is focused
      const tab = document.getElementById(`tab-${session.id}`);
      const prevTab = document.getElementById(`tab-${this.activeTerminalId}`);
      if (prevTab && prevTab !== tab) prevTab.classList.remove('active');
      if (tab) tab.classList.add('active');
    });
    
    // Add click handler to wrapper for better focus handling in split mode
    const wrapper = document.getElementById(`wrapper-${session.id}`);
    if (wrapper) {
      wrapper.addEventListener('click', () => {
        if (this.splitManager && this.splitManager.isActive) {
          session.terminal.focus();
        }
      });
    }
    
    // Optimized scrolling with WebGL performance improvements
    let scrollTimer = null;
    let rafId = null;
    
    // Use passive listener for better performance
    terminal.element.addEventListener('wheel', (e) => {
      e.preventDefault();
      
      // Calculate normalized scroll delta
      let deltaY = e.deltaY;
      if (e.deltaMode === 1) { // DOM_DELTA_LINE
        deltaY *= 40; // Convert to pixels
      } else if (e.deltaMode === 2) { // DOM_DELTA_PAGE
        deltaY *= terminal.rows * 40;
      }
      
      // Apply scroll multiplier for shift key (10x speed)
      const multiplier = e.shiftKey ? 10 : 1;
      const scrollLines = Math.sign(deltaY) * Math.max(1, Math.ceil(Math.abs(deltaY) / 40)) * multiplier;
      
      // Cancel any pending scroll animation
      if (rafId) {
        cancelAnimationFrame(rafId);
      }
      
      // Use requestAnimationFrame for smooth scrolling
      rafId = requestAnimationFrame(() => {
        terminal.scrollLines(scrollLines);
        rafId = null;
      });
      
      // Clear texture atlas for WebGL optimization
      clearTimeout(scrollTimer);
      scrollTimer = setTimeout(() => {
        if (session.rendererAddon && session.rendererAddon.clearTextureAtlas) {
          session.rendererAddon.clearTextureAtlas();
        }
      }, 150);
    }, { passive: false });
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
      // First ensure the terminal is visible and focused
      const wrapper = document.getElementById(`wrapper-${session.id}`);
      if (wrapper) {
        wrapper.classList.add('active');
      }
      
      // Display cool startup logo (only on first terminal or if enabled)
      if (this.showStartupLogo && this.terminalCounter === 1) {
        // Ensure terminal is ready and visible
        await new Promise(resolve => setTimeout(resolve, 200));
        session.terminal.focus();
        await this.displayStartupLogo(session.terminal);
      } else {
        session.terminal.write('\x1b[36mConnecting to terminal backend...\x1b[0m\r\n');
      }
      
      const result = window.electronAPI 
        ? await window.electronAPI.createTerminal({
            cols: session.terminal.cols,
            rows: session.terminal.rows,
            cwd: null // Let backend use home directory
          })
        : await window.zeamiAPI.startSession({
            cols: session.terminal.cols,
            rows: session.terminal.rows,
            cwd: null // Let backend use home directory
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
          const configCommand = 'export TERM=xterm-256color LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8 2>/dev/null';
          
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
        
        // Ensure terminal has focus after connection
        if (this.activeTerminalId === session.id) {
          setTimeout(() => session.terminal.focus(), 400);
        }
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
      // Split mode - update active terminal and focus
      const tab = document.getElementById(`tab-${id}`);
      const prevTab = document.getElementById(`tab-${this.activeTerminalId}`);
      
      if (prevTab) prevTab.classList.remove('active');
      if (tab) tab.classList.add('active');
      
      this.activeTerminalId = id;
      
      // Focus the selected terminal in split mode
      const session = this.terminals.get(id);
      if (session && session.terminal) {
        // Add a small delay to ensure the terminal is properly rendered
        setTimeout(() => {
          session.terminal.focus();
        }, 10);
      }
      
      // Update status bar
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
    
    // Dispose error indicator (safe cleanup)
    if (session.errorIndicator) {
      try {
        session.errorIndicator.dispose();
      } catch (err) {
        console.warn('Error disposing error indicator:', err);
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
        try {
          // Force recalculation of dimensions
          const wrapper = document.getElementById(`wrapper-${session.id}`);
          if (wrapper) {
            // Ensure wrapper has proper dimensions
            const containerRect = document.getElementById('terminal-container').getBoundingClientRect();
            wrapper.style.width = '100%';
            wrapper.style.height = '100%';
          }
          
          // Fit multiple times to ensure accuracy
          session.fitAddon.fit();
          
          // Send resize to backend
          if (session.process && session.terminal) {
            const { cols, rows } = session.terminal;
            this.resizeProcess(session.id, cols, rows);
          }
        } catch (error) {
          console.error('Error resizing terminal:', error);
        }
      }
    });
  }
  
  resizeProcess(id, cols, rows) {
    const session = this.terminals.get(id);
    if (!session || !session.process) return;
    
    const api = window.electronAPI || window.zeamiAPI;
    if (api) {
      if (window.electronAPI) {
        window.electronAPI.resizeTerminal(session.process.sessionId || session.process.id, cols, rows);
      } else {
        window.zeamiAPI.resizeTerminal(session.process.sessionId, cols, rows);
      }
    }
  }
  
  updateStatusBar(session) {
    document.getElementById('status-shell').textContent = 
      `Shell: ${session.shell || '-'}`;
    document.getElementById('status-cwd').textContent = 
      `Directory: ${session.cwd || '-'}`;
    document.getElementById('status-process').textContent = 
      `Process: ${session.process ? session.process.pid : '-'}`;
  }
  
  async displayStartupLogo(terminal) {
    // Wait a bit to ensure terminal is fully initialized
    await this.sleep(100);
    
    // Clear screen
    terminal.write('\x1b[2J\x1b[H');
    
    // Colors
    const GREEN = '\x1b[1;32m';
    const DIM_GREEN = '\x1b[2;32m';
    const RESET = '\x1b[0m';
    const CYAN = '\x1b[36m';
    const BRIGHT_CYAN = '\x1b[1;36m';
    
    // Skip matrix rain for now - just show logo
    // await this.matrixRainEffect(terminal, 3);
    
    // Clear screen for logo
    terminal.write('\x1b[2J\x1b[H');
    
    // ASCII Art logo with typewriter effect
    const logo = [
      '██████╗ ███████╗ █████╗ ███╗   ███╗██╗    ████████╗███████╗██████╗ ███╗   ███╗',
      '╚══███╔╝██╔════╝██╔══██╗████╗ ████║██║    ╚══██╔══╝██╔════╝██╔══██╗████╗ ████║',
      '  ███╔╝ █████╗  ███████║██╔████╔██║██║       ██║   █████╗  ██████╔╝██╔████╔██║',
      ' ███╔╝  ██╔══╝  ██╔══██║██║╚██╔╝██║██║       ██║   ██╔══╝  ██╔══██╗██║╚██╔╝██║',
      '███████╗███████╗██║  ██║██║ ╚═╝ ██║██║       ██║   ███████╗██║  ██║██║ ╚═╝ ██║',
      '╚══════╝╚══════╝╚═╝  ╚═╝╚═╝     ╚═╝╚═╝       ╚═╝   ╚══════╝╚═╝  ╚═╝╚═╝     ╚═╝'
    ];
    
    // Display logo with animation
    terminal.write(GREEN);
    for (const line of logo) {
      terminal.write(line + '\r\n');
      await this.sleep(50);
    }
    terminal.write(RESET + '\r\n');
    
    // Version and tagline
    const tagline = 'Terminal from Teleport v0.1.0';
    const padding = ' '.repeat(Math.floor((80 - tagline.length) / 2));
    terminal.write(padding + BRIGHT_CYAN + tagline + RESET + '\r\n');
    terminal.write(padding + DIM_GREEN + 'Advanced Terminal Emulator for Claude Code' + RESET + '\r\n\r\n');
    
    // System initialization messages with animation
    const messages = [
      { delay: 100, text: '[SYSTEM] Initializing quantum encryption matrix...', color: DIM_GREEN },
      { delay: 150, text: '[SYSTEM] Loading neural interface drivers...', color: DIM_GREEN },
      { delay: 200, text: '[SYSTEM] Establishing secure channel...', color: DIM_GREEN },
      { delay: 100, text: '[OK] Encryption: AES-256-GCM', color: GREEN },
      { delay: 100, text: '[OK] Authentication: ED25519', color: GREEN },
      { delay: 150, text: '[SYSTEM] Synchronizing with runtime...', color: DIM_GREEN },
      { delay: 200, text: '[SYSTEM] Terminal ready', color: GREEN }
    ];
    
    for (const msg of messages) {
      await this.sleep(msg.delay);
      terminal.write(msg.color + msg.text + RESET + '\r\n');
    }
    
    terminal.write('\r\n');
  }
  
  async matrixRainEffect(terminal, duration) {
    const cols = terminal.cols;
    const rows = terminal.rows;
    const drops = new Array(Math.floor(cols / 3)).fill(0);
    
    for (let i = 0; i < duration * 20; i++) {
      let output = '';
      for (let j = 0; j < drops.length; j++) {
        const x = j * 3;
        if (drops[j] > 0 && drops[j] <= rows) {
          const char = String.fromCharCode(0x30 + Math.floor(Math.random() * 10));
          const brightness = 1 - (drops[j] / rows);
          const color = brightness > 0.7 ? '\x1b[1;32m' : brightness > 0.3 ? '\x1b[0;32m' : '\x1b[2;32m';
          output += `\x1b[${drops[j]};${x}H${color}${char}\x1b[0m`;
        }
        if (Math.random() > 0.95) {
          drops[j] = 1;
        } else if (drops[j] > 0) {
          drops[j]++;
        }
        if (drops[j] > rows) {
          drops[j] = 0;
        }
      }
      terminal.write(output);
      await this.sleep(50);
    }
  }
  
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  setupSessionManagement() {
    // Auto-save session periodically
    setInterval(() => {
      this.saveSession();
    }, 30000); // Every 30 seconds
    
    // Save session before unload
    window.addEventListener('beforeunload', () => {
      this.saveSession();
    });
    
    // Listen for session restore
    if (window.electronAPI) {
      window.electronAPI.onSessionRestore((sessionData) => {
        this.restoreSession(sessionData);
      });
    }
    
    // Listen for save request from main process
    if (window.electronAPI) {
      window.electronAPI.onSessionSaveRequest(() => {
        this.saveSession();
      });
    }
  }
  
  async saveSession() {
    const sessionData = {
      terminals: Array.from(this.terminals.entries()).map(([id, session]) => ({
        id: id,
        title: session.title,
        cwd: session.cwd,
        shell: session.shell,
        buffer: session.serializeAddon ? session.serializeAddon.serialize() : '',
        scrollback: session.terminal.buffer.active.length,
        activeCommand: '', // Would need command detection
        history: [] // Would need to track command history
      })),
      activeTerminalId: this.activeTerminalId,
      windowBounds: {
        width: window.innerWidth,
        height: window.innerHeight
      },
      splitLayout: this.splitManager ? this.splitManager.getLayout() : null
    };
    
    if (window.electronAPI) {
      await window.electronAPI.saveSession(sessionData);
    }
  }
  
  async restoreSession(sessionData) {
    // Session restoration disabled to prevent infinite loops
    console.log('Session restoration is currently disabled');
    return;
    
    // Original code commented out
    /*
    if (!sessionData || !sessionData.terminals) return;
    
    console.log('Restoring session with', sessionData.terminals.length, 'terminals');
    
    // Clear existing terminals
    this.terminals.forEach((session, id) => {
      this.closeTerminal(id);
    });
    
    // Restore each terminal
    for (const termData of sessionData.terminals) {
      const session = await this.createTerminal({
        cwd: termData.cwd || null, // Use saved cwd or default to home
        shell: termData.shell
      });
      
      if (session && termData.buffer) {
        // Restore terminal content
        try {
          session.terminal.write(termData.buffer);
        } catch (e) {
          console.error('Failed to restore terminal buffer:', e);
        }
      }
      
      // Update title
      if (termData.title) {
        session.title = termData.title;
        const tab = document.getElementById(`tab-${session.id}`);
        if (tab) {
          tab.querySelector('.tab-title').textContent = termData.title;
        }
      }
    }
    
    // Restore active terminal
    if (sessionData.activeTerminalId && this.terminals.has(sessionData.activeTerminalId)) {
      this.switchToTerminal(sessionData.activeTerminalId);
    }
    
    // Restore split layout if any
    if (sessionData.splitLayout && this.splitManager) {
      this.splitManager.restoreLayout(sessionData.splitLayout);
    }
    */
  }
}

// Initialize terminal manager when page loads
document.addEventListener('DOMContentLoaded', () => {
  // Clear any stored session data to prevent loops
  try {
    localStorage.removeItem('zeamiterm-session');
    sessionStorage.clear();
  } catch (e) {
    console.error('Failed to clear session storage:', e);
  }
  
  window.terminalManager = new TerminalManager();
});