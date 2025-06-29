/**
 * ZeamiTermManager - Clean terminal management with new architecture
 */

import { ZeamiTerminal } from '../../xterm-zeami/ZeamiTerminal.js';
import { UnifiedHelpCommand } from '../../commands/builtin/UnifiedHelpCommand.js';
import { ClearCommand } from '../../commands/builtin/ClearCommand.js';
import { InfiniteCommand } from '../../commands/builtin/InfiniteCommand.js';
import { MatrixCommand } from '../../commands/effects/MatrixCommand.js';
import { SaveCommand } from '../../commands/builtin/SaveCommand.js';
import { SessionCommand } from '../../commands/builtin/SessionCommand.js';
import { ShellIntegrationAddon } from '../addons/ShellIntegrationAddon.js';
import { EnhancedLinkProvider } from '../addons/EnhancedLinkProvider.js';
import { ProfileSelector } from '../components/ProfileSelector.js';
import { SessionPersistence } from '../../features/session/SessionPersistence.js';
import { PreferenceManager } from '../../features/preferences/PreferenceManager.js';
import { PreferenceWindow } from '../components/PreferenceWindow.js';
import { SimpleLayoutManager } from './SimpleLayoutManager.js';

export class ZeamiTermManager {
  constructor() {
    this.terminals = new Map();
    this.activeTerminalId = null;
    this.terminalCounter = 0;
    this.searchVisible = false;
    this.sessionPersistence = new SessionPersistence();
    this.preferenceManager = new PreferenceManager();
    this.preferenceWindow = new PreferenceWindow(this.preferenceManager);
    this.layoutManager = null; // Will be initialized after DOM is ready
    this.fixedTerminals = true; // Always have exactly 2 terminals
    
    // Bind methods
    this.createTerminal = this.createTerminal.bind(this);
    this.registerBuiltinCommands = this.registerBuiltinCommands.bind(this);
    this.toggleSearch = this.toggleSearch.bind(this);
    this.setupSearch = this.setupSearch.bind(this);
    this.applyPreferences = this.applyPreferences.bind(this);
    
    // Listen for preference changes
    this.preferenceManager.on('*', (value, oldValue, path) => {
      this.onPreferenceChange(path, value, oldValue);
    });
    
    // Notification types mapping
    this.notificationTypes = {
      NORMAL: { title: '✅ コマンド完了', defaultSound: 'Glass' },
      ERROR: { title: '❌ エラー検出', defaultSound: 'Basso' },
      BUILD_SUCCESS: { title: '🚀 ビルド成功', defaultSound: 'Hero' },
      CLAUDE: { title: '✨ Claude Code完了', defaultSound: 'Ping' }
    };
  }
  
  async init() {
    console.log('[ZeamiTermManager] Initializing with clean architecture...');
    
    // Make manager accessible globally for testing
    window.zeamiTermManager = this;
    
    // Initialize layout manager
    const container = document.getElementById('terminal-container');
    this.layoutManager = new SimpleLayoutManager(container, this);
    this.layoutManager.init();
    
    // Load saved sessions
    this.sessionPersistence.loadFromStorage();
    
    // Enable auto-save
    this.sessionPersistence.enableAutoSave(30000); // Auto-save every 30 seconds
    
    // Setup profile selector
    this.setupProfileSelector();
    
    // Setup keyboard shortcuts
    this.setupKeyboardShortcuts();
    
    // Create exactly 2 fixed terminals
    await this.createTerminal({ name: 'Terminal A', id: 'terminal-a' });
    await this.createTerminal({ name: 'Terminal B', id: 'terminal-b' });
    
    // Initialize tabs UI
    this.updateTabsUI();
    
    // Ensure the first terminal is visible in tab mode
    if (this.layoutManager && this.layoutManager.mode === 'tab') {
      this.layoutManager.updateLayout();
    }
    
    // Focus the first terminal after initialization (without clearing)
    setTimeout(() => {
      const firstId = Array.from(this.terminals.keys())[0];
      if (firstId) {
        this.switchToTerminal(firstId);
        const firstSession = this.terminals.get(firstId);
        if (firstSession && firstSession.terminal) {
          firstSession.terminal.focus();
          
          // Ensure the terminal has proper dimensions
          if (firstSession.fitAddon) {
            firstSession.fitAddon.fit();
          }
        }
      }
    }, 500);
  }
  
  async createTerminal(options = {}) {
    const id = options.id || `terminal-${++this.terminalCounter}`;
    
    // Check if we should restore a session
    const shouldRestore = options.restoreSession !== false && this.terminals.size === 0;
    
    // Use selected profile or default
    const profileId = options.profileId || this.selectedProfileId;
    
    // Create terminal wrapper
    const wrapper = document.createElement('div');
    wrapper.className = 'terminal-wrapper';
    wrapper.id = `wrapper-${id}`;
    
    // Get preferences
    const terminalPrefs = this.preferenceManager.getSection('terminal');
    const themePrefs = this.preferenceManager.getSection('theme');
    
    // Create ZeamiTerminal instance with preferences
    const terminal = new ZeamiTerminal({
      theme: themePrefs,
      fontFamily: terminalPrefs.fontFamily,
      fontSize: terminalPrefs.fontSize,
      lineHeight: terminalPrefs.lineHeight,
      cursorStyle: terminalPrefs.cursorStyle,
      cursorBlink: terminalPrefs.cursorBlink,
      allowTransparency: true,
      scrollback: terminalPrefs.scrollback,
      fastScrollModifier: terminalPrefs.fastScrollModifier,
      fastScrollSensitivity: terminalPrefs.fastScrollSensitivity,
      cwd: options.cwd, // Pass parent directory if provided
      scrollSensitivity: terminalPrefs.scrollSensitivity,
      rendererType: terminalPrefs.rendererType === 'webgl' ? 'canvas' : terminalPrefs.rendererType,
      customGlyphs: true,
      drawBoldTextInBrightColors: true,
      minimumContrastRatio: terminalPrefs.minimumContrastRatio,
      copyOnSelect: terminalPrefs.copyOnSelect,
      rightClickSelectsWord: terminalPrefs.rightClickSelectsWord,
      wordSeparator: terminalPrefs.wordSeparator,
      tabStopWidth: terminalPrefs.tabStopWidth,
      bellStyle: terminalPrefs.bellStyle,
      // Important for Claude Code compatibility
      convertEol: true,  // Convert CRLF to LF
      windowsMode: false, // Use Unix-style line endings
      macOptionIsMeta: true, // Mac Option key as Meta
      allowProposedApi: true, // Enable proposed APIs
      screenReaderMode: false, // Disable screen reader mode for better performance
      ...options
    });
    
    // Open terminal in wrapper
    terminal.open(wrapper);
    
    // Register builtin commands
    this.registerBuiltinCommands(terminal);
    
    // Handle selection for copy functionality
    terminal.onSelectionChange(() => {
      if (terminal.hasSelection()) {
        const selectedText = terminal.getSelection();
        // Store selected text for copy operations
        terminal._lastSelectedText = selectedText;
      }
    });
    
    // Handle copy keyboard shortcut
    terminal.attachCustomKeyEventHandler((event) => {
      // Cmd+C on Mac, Ctrl+C on others
      if ((event.metaKey || event.ctrlKey) && event.key === 'c') {
        if (terminal.hasSelection()) {
          const selectedText = terminal.getSelection();
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(selectedText).then(() => {
              console.log('[ZeamiTermManager] Text copied to clipboard');
              // Don't clear selection - let user decide
            }).catch(err => {
              console.error('[ZeamiTermManager] Failed to copy to clipboard:', err);
            });
          }
          return false; // Prevent sending Ctrl+C to terminal when text is selected
        }
      }
      return true; // Allow other key events
    });
    
    // Create addons
    const fitAddon = new window.FitAddon.FitAddon();
    terminal.loadAddon(fitAddon);
    
    // Search addon with decorations
    const searchAddon = new window.SearchAddon.SearchAddon();
    terminal.loadAddon(searchAddon);
    
    // Shell integration addon
    const shellIntegrationAddon = new ShellIntegrationAddon();
    terminal.loadAddon(shellIntegrationAddon);
    
    // Listen to shell integration events
    terminal.onShellIntegrationEvent = (eventName, data) => {
      console.log(`[ShellIntegration] ${eventName}:`, data);
      
      // Update status bar with command info
      if (eventName === 'commandEnd' && data.exitCode !== 0) {
        const msg = `Command failed with exit code ${data.exitCode}`;
        this.showNotification(msg, 'error');
      }
      
      // Forward CWD changes to link provider
      if (eventName === 'cwdChange' && enhancedLinkProvider) {
        enhancedLinkProvider._cwd = data;
      }
      
      // Handle long command completion
      if (eventName === 'longCommandCompleted') {
        this.showCommandNotification(data);
      }
    };
    
    // Enhanced link provider
    const enhancedLinkProvider = new EnhancedLinkProvider();
    terminal.loadAddon(enhancedLinkProvider);
    
    // Web links addon (for basic URL support)
    const webLinksAddon = new window.WebLinksAddon.WebLinksAddon();
    terminal.loadAddon(webLinksAddon);
    
    // WebGL renderer for high performance with optimizations
    let rendererAddon = null;
    try {
      if (window.WebglAddon) {
        rendererAddon = new window.WebglAddon.WebglAddon();
        
        // WebGL-specific optimizations
        rendererAddon.onContextLoss = () => {
          console.warn('[ZeamiTermManager] WebGL context lost, attempting recovery...');
          terminal.refresh(0, terminal.rows - 1);
        };
        
        terminal.loadAddon(rendererAddon);
        
        // Enable WebGL-specific performance features
        if (rendererAddon.setTextureAtlas) {
          // Larger texture atlas for better batching
          rendererAddon.setTextureAtlas(4096, 4096);
        }
        
        console.log('[ZeamiTermManager] WebGL renderer enabled with optimizations');
      } else {
        // Fallback to Canvas renderer
        rendererAddon = new window.CanvasAddon.CanvasAddon();
        terminal.loadAddon(rendererAddon);
        console.log('[ZeamiTermManager] Canvas renderer enabled');
      }
    } catch (error) {
      console.warn('[ZeamiTermManager] Failed to initialize renderer:', error);
    }
    
    // Setup optimized scrolling with shift+scroll 10x speed
    this.setupScrolling(terminal, rendererAddon);
    
    // Fit terminal with proper resize handling
    const fitTerminal = () => {
      // Use fitAddon to calculate the optimal size
      try {
        fitAddon.fit();
        
        // Get the dimensions after fit
        const dims = fitAddon.proposeDimensions();
        if (dims && dims.cols && dims.rows) {
          // Apply the dimensions if they're valid
          if (dims.cols !== terminal.cols || dims.rows !== terminal.rows) {
            terminal.resize(dims.cols, dims.rows);
          }
        }
        
        // Force complete refresh
        terminal.refresh(0, terminal.rows - 1);
        
        // Ensure viewport is scrolled to bottom
        terminal.scrollToBottom();
      } catch (error) {
        console.warn('[ZeamiTermManager] Fit error:', error);
      }
    };
    
    // Initial fit with multiple attempts
    setTimeout(fitTerminal, 50);
    setTimeout(fitTerminal, 100);
    setTimeout(fitTerminal, 200);
    
    // Refit on window resize
    const resizeObserver = new ResizeObserver(() => {
      clearTimeout(this._resizeTimeout);
      this._resizeTimeout = setTimeout(fitTerminal, 50);
    });
    resizeObserver.observe(wrapper);
    
    // Create session
    const session = {
      id,
      terminal,
      fitAddon,
      searchAddon,
      shellIntegrationAddon,
      enhancedLinkProvider,
      webLinksAddon,
      rendererAddon,
      process: null,
      title: options.name || `Terminal ${this.terminalCounter}`,
      searchDecorations: [],
      wrapper,
      cwd: options.cwd || null,
      fixedId: options.id // Store fixed ID for Terminal A/B
    };
    
    this.terminals.set(id, session);
    
    // Only set as active if it's the first terminal or explicitly requested
    if (!this.activeTerminalId || options.activate) {
      this.activeTerminalId = id;
      wrapper.classList.add('active');
    } else {
      wrapper.classList.add('inactive');
    }
    
    
    // Configure search decorations after session is created
    searchAddon.onDidChangeResults((results) => {
      this.updateSearchDecorations(session, results);
    });
    
    // Add to layout manager
    this.layoutManager.addTerminal(id, wrapper);
    
    // Update tabs UI
    this.updateTabsUI();
    
    // Connect to PTY
    await this.connectTerminal(session, shouldRestore);
    
    // Focus terminal only if it's the active one
    if (id === this.activeTerminalId) {
      terminal.focus();
    }
    
    // Hide loading screen
    const loading = document.getElementById('loading');
    if (loading) {
      loading.classList.add('hidden');
    }
    
    return session;
  }
  
  registerBuiltinCommands(terminal) {
    // Register help command
    const helpCommand = new UnifiedHelpCommand('help');
    terminal.registerCommand(helpCommand.name, helpCommand, {
      description: helpCommand.description,
      usage: helpCommand.usage,
      category: helpCommand.category
    });
    
    // Register menu command (? command)
    const menuCommand = new UnifiedHelpCommand('menu');
    terminal.registerCommand(menuCommand.name, menuCommand, {
      description: menuCommand.description,
      usage: menuCommand.usage,
      category: menuCommand.category,
      aliases: menuCommand.aliases
    });
    
    // Register clear command
    const clearCommand = new ClearCommand();
    terminal.registerCommand(clearCommand.name, clearCommand, {
      description: clearCommand.description,
      usage: clearCommand.usage,
      category: clearCommand.category,
      aliases: clearCommand.aliases
    });
    
    // Register infinite command
    const infiniteCommand = new InfiniteCommand();
    terminal.registerCommand(infiniteCommand.name, infiniteCommand, {
      description: infiniteCommand.description,
      usage: infiniteCommand.usage,
      category: infiniteCommand.category,
      aliases: infiniteCommand.aliases
    });
    
    // Register matrix command
    const matrixCommand = new MatrixCommand();
    terminal.registerCommand(matrixCommand.name, matrixCommand, {
      description: matrixCommand.description,
      usage: matrixCommand.usage,
      category: matrixCommand.category
    });
    
    // Register save command
    const saveCommand = new SaveCommand();
    terminal.registerCommand(saveCommand.name, saveCommand, {
      description: saveCommand.description,
      usage: saveCommand.usage,
      category: saveCommand.category,
      aliases: saveCommand.aliases
    });
    
    // Register session command
    const sessionCommand = new SessionCommand();
    // Pass terminal manager reference for accessing session data
    terminal._zeamiTermManager = this;
    terminal.registerCommand(sessionCommand.name, sessionCommand, {
      description: sessionCommand.description,
      usage: sessionCommand.usage,
      category: sessionCommand.category,
      aliases: sessionCommand.aliases
    });
  }
  
  async connectTerminal(session, shouldRestore = false) {
    const api = window.electronAPI || window.zeamiAPI;
    if (!api) {
      session.terminal.writeln('ZeamiTerm - Terminal API not available');
      session.terminal.writeln('Running in demo mode\r\n');
      return;
    }
    
    try {
      // Show welcome message
      this.showWelcomeMessage(session.terminal);
      
      // Create PTY process
      let result;
      if (window.electronAPI) {
        result = await window.electronAPI.createTerminal({
          cols: session.terminal.cols,
          rows: session.terminal.rows,
          profileId: this.selectedProfileId
        });
      } else {
        result = await window.zeamiAPI.startSession({
          cols: session.terminal.cols,
          rows: session.terminal.rows,
          profileId: this.selectedProfileId
        });
      }
      
      if (result.success) {
        session.process = {
          id: result.id,
          sessionId: result.sessionId || result.id,
          pid: result.pid,
          shell: result.shell,
          cwd: result.cwd
        };
        
        // Update session's cwd
        session.cwd = result.cwd;
        
        // Set PTY handler for user input
        session.terminal.setPtyHandler((data) => {
          console.log(`[Renderer] Sending user input to PTY: ${JSON.stringify(data)}`);
          if (window.electronAPI) {
            window.electronAPI.sendInput(session.process.id, data);
          } else {
            window.zeamiAPI.sendInput(session.process.sessionId, data);
          }
        });
        
        // Handle terminal data - Use global listener approach
        if (window.electronAPI) {
          // Set up global listener only once
          if (!this.terminalDataListenerSetup) {
            this.terminalDataListenerSetup = true;
            
            window.electronAPI.onTerminalData(({ id, data }) => {
              console.log(`[Renderer] Received terminal data: id=${id}, length=${data ? data.length : 0}`);
              
              // Find the terminal session that matches this process ID
              for (const [terminalId, session] of this.terminals) {
                if (session.process && session.process.id === id) {
                  console.log(`[Renderer] Writing to terminal ${terminalId}: ${data ? data.substring(0, 50) : 'null'}...`);
                  if (data) {
                    session.terminal.write(data);
                  }
                  break;
                }
              }
            });
          }
        } else {
          window.zeamiAPI.onTerminalData(({ sessionId, data }) => {
            if (sessionId === session.process.sessionId && data) {
              console.log(`[Renderer] Writing to terminal via zeamiAPI`);
              session.terminal.write(data);
            }
          });
        }
        
        // Handle resize
        session.terminal.onResize((size) => {
          if (session.process) {
            if (window.electronAPI) {
              window.electronAPI.resizeTerminal(session.process.id, size.cols, size.rows);
            } else {
              window.zeamiAPI.resizeTerminal(session.process.sessionId, size.cols, size.rows);
            }
          }
        });
        
        // Update status
        this.updateStatusBar(session);
        
        // Auto-restore last session if this is the first terminal
        if (shouldRestore) {
          this.tryRestoreLastSession(session);
        }
        
        // Save session on terminal data changes
        session.terminal.onData(() => {
          // Debounce to avoid too frequent saves
          if (session.autoSaveTimer) {
            clearTimeout(session.autoSaveTimer);
          }
          session.autoSaveTimer = setTimeout(() => {
            this.sessionPersistence.saveSession(session.id, session.terminal, session.process);
          }, 5000); // Save 5 seconds after last input
        });
      }
    } catch (error) {
      console.error('[ZeamiTermManager] Failed to connect terminal:', error);
      session.terminal.writeln(`\r\n\x1b[31mError: ${error.message}\x1b[0m`);
    }
  }
  
  tryRestoreLastSession(session) {
    const sessions = this.sessionPersistence.listSessions();
    if (sessions.length === 0) {
      return;
    }
    
    // Get the most recent session
    const lastSession = sessions[0]; // Already sorted by timestamp
    
    // Show restore prompt
    session.terminal.writeln('\r\n\x1b[33mPrevious session found:\x1b[0m');
    session.terminal.writeln(`  Last active: ${new Date(lastSession.timestamp).toLocaleString()}`);
    session.terminal.writeln(`  Directory: ${lastSession.workingDirectory}`);
    session.terminal.writeln(`  Buffer: ${lastSession.bufferSize} lines`);
    session.terminal.writeln('\r\nRestore this session? Type "session restore ' + lastSession.id + '" to restore.\r\n');
  }
  
  showWelcomeMessage(terminal) {
    terminal.writeln('\x1b[1;36m╔══════════════════════════════════════════╗\x1b[0m');
    terminal.writeln('\x1b[1;36m║     ZeamiTerm v0.1.2 - Clean Edition     ║\x1b[0m');
    terminal.writeln('\x1b[1;36m╚══════════════════════════════════════════╝\x1b[0m');
    terminal.writeln('');
    terminal.writeln('Type \x1b[1;33mhelp\x1b[0m for available commands or \x1b[1;33m?\x1b[0m for menu.');
    terminal.writeln('');
  }
  
  // Legacy tab methods - now handled by LayoutManager
  addTab(session) {
    // Deprecated - handled by LayoutManager
    console.warn('[ZeamiTermManager] addTab is deprecated, use LayoutManager');
  }
  
  switchToTerminal(id) {
    // Deprecated - handled by LayoutManager
    console.warn('[ZeamiTermManager] switchToTerminal is deprecated, use LayoutManager');
    this.focusTerminal(id);
  }
  
  focusTerminal(id) {
    const session = this.terminals.get(id);
    if (session) {
      this.activeTerminalId = id;
      session.terminal.focus();
      
      // Fit terminal
      if (session.fitAddon) {
        setTimeout(() => {
          session.fitAddon.fit();
          session.terminal.refresh(0, session.terminal.rows - 1);
        }, 50);
      }
      
      this.updateStatusBar(session);
    }
  }
  
  async closeTerminal(id) {
    const session = this.terminals.get(id);
    if (!session) return;
    
    // Don't close fixed terminals
    if (this.fixedTerminals) {
      console.log('[ZeamiTermManager] Cannot close fixed terminal:', id);
      return;
    }
    
    // Kill PTY process
    if (session.process) {
      const api = window.electronAPI || window.zeamiAPI;
      if (api) {
        if (window.electronAPI) {
          await window.electronAPI.killTerminal(session.process.id);
        } else {
          await window.zeamiAPI.endSession(session.process.sessionId);
        }
      }
    }
    
    // Remove from layout manager
    this.layoutManager.removeTerminal(id);
    
    // Dispose terminal
    session.terminal.dispose();
    
    // Remove from map
    this.terminals.delete(id);
    
    // Switch to another terminal or create new one
    if (this.terminals.size === 0) {
      await this.createTerminal();
    } else if (this.activeTerminalId === id) {
      const firstId = this.terminals.keys().next().value;
      this.switchToTerminal(firstId);
    }
  }
  
  updateStatusBar(session) {
    if (!session) return;
    
    document.getElementById('status-shell').textContent = 
      `Shell: ${session.process?.shell || '-'}`;
    document.getElementById('status-cwd').textContent = 
      `Directory: ${session.process?.cwd || '-'}`;
    document.getElementById('status-process').textContent = 
      `Process: ${session.process?.pid || '-'}`;
    document.getElementById('status-connection').textContent = 
      session.process ? 'Connected' : 'Disconnected';
  }
  
  setupKeyboardShortcuts() {
    document.addEventListener('keydown', async (e) => {
      // Get keyboard shortcuts from preferences
      const shortcuts = this.preferenceManager.get('keyboard.shortcuts');
      const keyCombo = this.getKeyCombo(e);
      
      // Check against configured shortcuts
      for (const [action, shortcut] of Object.entries(shortcuts)) {
        if (this.matchesShortcut(keyCombo, shortcut)) {
          e.preventDefault();
          this.executeShortcutAction(action);
          return;
        }
      }
      
      // Legacy hardcoded shortcuts (will be removed later)
      // Cmd/Ctrl + T: New terminal (disabled for fixed terminals)
      if ((e.metaKey || e.ctrlKey) && e.key === 't') {
        e.preventDefault();
        if (!this.fixedTerminals) {
          await this.createTerminal();
        }
      }
      
      // Cmd/Ctrl + W: Close terminal (disabled for fixed terminals)
      if ((e.metaKey || e.ctrlKey) && e.key === 'w') {
        e.preventDefault();
        if (!this.fixedTerminals && this.activeTerminalId) {
          await this.closeTerminal(this.activeTerminalId);
        }
      }
      
      // Cmd/Ctrl + K: Clear terminal
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        const session = this.terminals.get(this.activeTerminalId);
        if (session) {
          session.terminal._processCommand('clear', []);
        }
      }
      
      // Cmd/Ctrl + F: Search
      if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
        e.preventDefault();
        this.toggleSearch();
      }
      
      // Cmd/Ctrl + Up: Previous command
      if ((e.metaKey || e.ctrlKey) && e.key === 'ArrowUp') {
        e.preventDefault();
        const session = this.terminals.get(this.activeTerminalId);
        if (session && session.shellIntegrationAddon) {
          session.shellIntegrationAddon.navigateToPreviousCommand();
        }
      }
      
      // Cmd/Ctrl + Down: Next command
      if ((e.metaKey || e.ctrlKey) && e.key === 'ArrowDown') {
        e.preventDefault();
        const session = this.terminals.get(this.activeTerminalId);
        if (session && session.shellIntegrationAddon) {
          session.shellIntegrationAddon.navigateToNextCommand();
        }
      }
    });
    
    // Button handlers
    document.getElementById('new-terminal-btn')?.addEventListener('click', 
      () => {
        if (!this.fixedTerminals) {
          this.createTerminal();
        }
      });
    
    document.getElementById('clear-terminal-btn')?.addEventListener('click', () => {
      const session = this.terminals.get(this.activeTerminalId);
      if (session) {
        session.terminal._processCommand('clear', []);
      }
    });
    
    document.getElementById('preferences-btn')?.addEventListener('click', () => {
      this.preferenceWindow.open();
    });
  }
  
  getActiveSession() {
    return this.terminals.get(this.activeTerminalId);
  }
  
  getActiveTerminal() {
    const session = this.getActiveSession();
    return session ? session.terminal : null;
  }
  
  getAllTerminals() {
    const terminals = [];
    this.terminals.forEach(session => {
      terminals.push(session.terminal);
    });
    return terminals;
  }
  
  setupScrolling(terminal, rendererAddon) {
    let scrollTimer = null;
    let rafId = null;
    
    // Optimized scrolling with shift+scroll 10x speed
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
      
      // WebGL optimization: Smart texture atlas management
      if (rendererAddon && rendererAddon.clearTextureAtlas) {
        clearTimeout(scrollTimer);
        scrollTimer = setTimeout(() => {
          // Only clear if we've scrolled significantly
          if (Math.abs(scrollLines) > 10) {
            rendererAddon.clearTextureAtlas();
          }
        }, 150);
      }
    }, { passive: false });
    
    console.log('[ZeamiTermManager] Optimized scrolling enabled (Shift+Scroll for 10x speed)');
  }
  
  toggleSearch() {
    const searchContainer = document.getElementById('search-container');
    const session = this.getActiveSession();
    
    if (!searchContainer || !session) return;
    
    this.searchVisible = !this.searchVisible;
    searchContainer.style.display = this.searchVisible ? 'flex' : 'none';
    
    if (this.searchVisible) {
      this.setupSearch(session);
      const searchInput = document.getElementById('search-input');
      if (searchInput) {
        searchInput.focus();
        searchInput.select();
      }
    }
  }
  
  setupSearch(session) {
    const searchInput = document.getElementById('search-input');
    const searchNext = document.getElementById('search-next');
    const searchPrev = document.getElementById('search-prev');
    const searchClose = document.getElementById('search-close');
    const caseSensitive = document.getElementById('search-case-sensitive');
    const wholeWord = document.getElementById('search-whole-word');
    const regex = document.getElementById('search-regex');
    
    if (!session.searchAddon) return;
    
    // Clear previous decorations when starting new search
    if (session.searchDecorations) {
      session.searchDecorations.forEach(decoration => decoration.dispose());
      session.searchDecorations = [];
    }
    
    // Search function
    const performSearch = () => {
      const searchTerm = searchInput.value;
      if (!searchTerm) return;
      
      const options = {
        caseSensitive: caseSensitive.checked,
        wholeWord: wholeWord.checked,
        regex: regex.checked
      };
      
      session.searchAddon.findNext(searchTerm, options);
    };
    
    // Event listeners
    searchInput.addEventListener('input', performSearch);
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        if (e.shiftKey) {
          session.searchAddon.findPrevious(searchInput.value, {
            caseSensitive: caseSensitive.checked,
            wholeWord: wholeWord.checked,
            regex: regex.checked
          });
        } else {
          performSearch();
        }
      } else if (e.key === 'Escape') {
        this.toggleSearch();
      }
    });
    
    searchNext.addEventListener('click', performSearch);
    searchPrev.addEventListener('click', () => {
      session.searchAddon.findPrevious(searchInput.value, {
        caseSensitive: caseSensitive.checked,
        wholeWord: wholeWord.checked,
        regex: regex.checked
      });
    });
    
    searchClose.addEventListener('click', () => this.toggleSearch());
    
    // Update search on option change
    [caseSensitive, wholeWord, regex].forEach(checkbox => {
      checkbox.addEventListener('change', performSearch);
    });
  }
  
  getKeyCombo(event) {
    const parts = [];
    if (event.ctrlKey) parts.push('Ctrl');
    if (event.altKey) parts.push('Alt');
    if (event.shiftKey) parts.push('Shift');
    if (event.metaKey) parts.push('Cmd');
    
    // Special keys
    const key = event.key.length === 1 ? event.key.toUpperCase() : event.key;
    const keyMap = {
      'ArrowUp': 'Up',
      'ArrowDown': 'Down',
      'ArrowLeft': 'Left',
      'ArrowRight': 'Right',
      ' ': 'Space',
      'Enter': 'Enter',
      'Escape': 'Esc'
    };
    
    parts.push(keyMap[key] || key);
    return parts.join('+');
  }
  
  matchesShortcut(keyCombo, shortcut) {
    // Normalize both for comparison
    const normalize = (s) => s.replace(/\s+/g, '').toLowerCase();
    return normalize(keyCombo) === normalize(shortcut);
  }
  
  async executeShortcutAction(action) {
    switch (action) {
      case 'new-terminal':
        await this.createTerminal();
        break;
      case 'close-terminal':
        if (this.activeTerminalId) {
          await this.closeTerminal(this.activeTerminalId);
        }
        break;
      case 'next-terminal':
        this.switchToNextTerminal();
        break;
      case 'prev-terminal':
        this.switchToPrevTerminal();
        break;
      case 'clear-terminal':
        const session = this.terminals.get(this.activeTerminalId);
        if (session) {
          session.terminal._processCommand('clear', []);
        }
        break;
      case 'find':
        this.toggleSearch();
        break;
      case 'toggle-fullscreen':
        if (window.electronAPI) {
          window.electronAPI.toggleFullscreen();
        }
        break;
      case 'increase-font-size':
        this.changeFontSize(1);
        break;
      case 'decrease-font-size':
        this.changeFontSize(-1);
        break;
      case 'reset-font-size':
        this.resetFontSize();
        break;
    }
  }
  
  switchToNextTerminal() {
    const ids = Array.from(this.terminals.keys());
    const currentIndex = ids.indexOf(this.activeTerminalId);
    const nextIndex = (currentIndex + 1) % ids.length;
    if (ids[nextIndex]) {
      this.switchToTerminal(ids[nextIndex]);
    }
  }
  
  switchToPrevTerminal() {
    const ids = Array.from(this.terminals.keys());
    const currentIndex = ids.indexOf(this.activeTerminalId);
    const prevIndex = (currentIndex - 1 + ids.length) % ids.length;
    if (ids[prevIndex]) {
      this.switchToTerminal(ids[prevIndex]);
    }
  }
  
  changeFontSize(delta) {
    const currentSize = this.preferenceManager.get('terminal.fontSize');
    const newSize = Math.max(8, Math.min(32, currentSize + delta));
    this.preferenceManager.set('terminal.fontSize', newSize);
  }
  
  resetFontSize() {
    const defaultSize = this.preferenceManager.getDefaultPreferences().terminal.fontSize;
    this.preferenceManager.set('terminal.fontSize', defaultSize);
  }
  
  onPreferenceChange(path, value, oldValue) {
    console.log(`[ZeamiTermManager] Preference changed: ${path} = ${value} (was ${oldValue})`);
    
    // Apply preference changes to all terminals
    if (path.startsWith('terminal.') || path.startsWith('theme.')) {
      console.log('[ZeamiTermManager] Applying preferences to all terminals...');
      this.terminals.forEach((session, id) => {
        console.log(`[ZeamiTermManager] Applying to terminal ${id}`);
        this.applyPreferences(session.terminal);
      });
    }
    
    // Handle window-specific preferences
    if (path.startsWith('window.') && window.electronAPI) {
      // Send window preferences to main process
      window.electronAPI.updateWindowPreferences(this.preferenceManager.getSection('window'));
    }
  }
  
  applyPreferences(terminal) {
    const terminalPrefs = this.preferenceManager.getSection('terminal');
    const themePrefs = this.preferenceManager.getSection('theme');
    
    console.log('[ZeamiTermManager] Applying preferences:', { terminalPrefs, themePrefs });
    
    // Apply theme - need to set theme as an object with color properties
    if (terminal.options && themePrefs) {
      // Create a clean theme object
      const theme = {
        background: themePrefs.background,
        foreground: themePrefs.foreground,
        cursor: themePrefs.cursor,
        cursorAccent: themePrefs.cursorAccent,
        selection: themePrefs.selection,
        black: themePrefs.black,
        red: themePrefs.red,
        green: themePrefs.green,
        yellow: themePrefs.yellow,
        blue: themePrefs.blue,
        magenta: themePrefs.magenta,
        cyan: themePrefs.cyan,
        white: themePrefs.white,
        brightBlack: themePrefs.brightBlack,
        brightRed: themePrefs.brightRed,
        brightGreen: themePrefs.brightGreen,
        brightYellow: themePrefs.brightYellow,
        brightBlue: themePrefs.brightBlue,
        brightMagenta: themePrefs.brightMagenta,
        brightCyan: themePrefs.brightCyan,
        brightWhite: themePrefs.brightWhite
      };
      
      // Set theme property - directly update options object
      terminal.options.theme = theme;
      
      // For xterm.js, use the options setter if available
      if (terminal.options && typeof terminal.options === 'object') {
        Object.assign(terminal.options, { theme });
      }
    }
    
    // Apply terminal settings - directly update options object
    // xterm.js v5 uses the options object directly
    if (terminal.options && typeof terminal.options === 'object') {
      // Update all options at once
      Object.assign(terminal.options, {
        fontSize: terminalPrefs.fontSize,
        fontFamily: terminalPrefs.fontFamily,
        lineHeight: terminalPrefs.lineHeight,
        cursorStyle: terminalPrefs.cursorStyle,
        cursorBlink: terminalPrefs.cursorBlink,
        scrollSensitivity: terminalPrefs.scrollSensitivity,
        fastScrollSensitivity: terminalPrefs.fastScrollSensitivity,
        fastScrollModifier: terminalPrefs.fastScrollModifier,
        scrollback: terminalPrefs.scrollback,
        tabStopWidth: terminalPrefs.tabStopWidth,
        bellStyle: terminalPrefs.bellStyle,
        wordSeparator: terminalPrefs.wordSeparator,
        rightClickSelectsWord: terminalPrefs.rightClickSelectsWord,
        copyOnSelect: terminalPrefs.copyOnSelect,
        minimumContrastRatio: terminalPrefs.minimumContrastRatio
      });
      
      // Log the updated options for debugging
      console.log('[ZeamiTermManager] Updated terminal options:', {
        fontSize: terminal.options.fontSize,
        fontFamily: terminal.options.fontFamily,
        cursorStyle: terminal.options.cursorStyle
      });
    }
    
    // Force a complete refresh and re-render
    setTimeout(() => {
      // For font size changes, we need to ensure the renderer updates
      if (terminal._core && terminal._core._renderService) {
        terminal._core._renderService.clear();
        terminal._core._renderService.onResize(terminal.cols, terminal.rows);
      }
      
      // Refresh the entire terminal
      terminal.refresh(0, terminal.rows - 1);
      
      // Also trigger resize to ensure proper rendering
      const cols = terminal.cols;
      const rows = terminal.rows;
      terminal.resize(cols, rows);
      
      // Focus to ensure cursor is visible
      terminal.focus();
    }, 100);
  }
  
  updateSearchDecorations(session, results) {
    // Clear existing decorations
    if (session.searchDecorations) {
      session.searchDecorations.forEach(decoration => decoration.dispose());
      session.searchDecorations = [];
    }
    
    if (!results || results.length === 0) return;
    
    // Create decorations for each result
    results.forEach((result, index) => {
      // Create a marker decoration on the scrollbar
      const decoration = session.terminal.registerDecoration({
        marker: {
          line: result.row,
          startColumn: result.col,
          endColumn: result.col + result.term.length
        },
        overviewRulerLane: 'full',
        overviewRulerOptions: {
          color: index === results.resultIndex ? '#ff9800' : '#4caf50',
          position: 'full'
        }
      });
      
      if (decoration) {
        session.searchDecorations.push(decoration);
      }
    });
  }
  
  showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    // Style based on type
    notification.style.cssText = `
      position: fixed;
      bottom: 60px;
      right: 20px;
      padding: 12px 20px;
      border-radius: 4px;
      font-size: 13px;
      z-index: 10000;
      animation: slide-in 0.3s ease-out;
      background: ${type === 'error' ? '#f44747' : type === 'warning' ? '#ff9800' : '#007acc'};
      color: white;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
    `;
    
    document.body.appendChild(notification);
    
    // Auto-remove after 3 seconds
    setTimeout(() => {
      notification.style.animation = 'slide-out 0.3s ease-in';
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }
  
  setupProfileSelector() {
    // Create profile selector
    this.profileSelector = new ProfileSelector();
    
    // Set callback for profile selection
    this.profileSelector.onProfileSelect = (profile) => {
      // Store selected profile for new terminals
      this.selectedProfileId = profile.id;
    };
    
    // Render profile selector
    const profileSelectorEl = this.profileSelector.render();
    
    // Add to header actions
    const actionsContainer = document.querySelector('.actions');
    if (actionsContainer) {
      actionsContainer.insertBefore(profileSelectorEl, actionsContainer.firstChild);
    }
    
    // Load profiles
    this.profileSelector.update();
  }
  
  updateTabsUI() {
    const tabsContainer = document.getElementById('tabs-container');
    if (!tabsContainer) return;
    
    // Clear existing tabs
    tabsContainer.innerHTML = '';
    
    // Create tabs for each terminal
    this.terminals.forEach((session, id) => {
      const tab = document.createElement('div');
      tab.className = 'tab';
      tab.id = `tab-${id}`;
      
      // Add active class to active terminal
      if (id === this.activeTerminalId) {
        tab.classList.add('active');
      }
      
      // Tab content - no close button for fixed terminals
      if (this.fixedTerminals) {
        tab.innerHTML = `
          <span class="tab-title">${session.title || 'Terminal'}</span>
        `;
      } else {
        tab.innerHTML = `
          <span class="tab-title">${session.title || 'Terminal'}</span>
          <span class="tab-close" data-terminal-id="${id}">×</span>
        `;
      }
      
      // Click handler for tab
      tab.addEventListener('click', (e) => {
        if (!e.target.classList.contains('tab-close')) {
          this.switchToTerminal(id);
          this.updateTabsUI();
        }
      });
      
      // Click handler for close button (only if not fixed terminals)
      if (!this.fixedTerminals) {
        const closeBtn = tab.querySelector('.tab-close');
        if (closeBtn) {
          closeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.closeTerminal(id);
          });
        }
      }
      
      tabsContainer.appendChild(tab);
    });
  }
  
  async saveCurrentTerminal() {
    const session = this.terminals.get(this.activeTerminalId);
    if (!session || !session.terminal) {
      console.log('[ZeamiTermManager] No active terminal to save');
      return;
    }
    
    try {
      // Get terminal buffer content using serialize addon
      const serializeAddon = new (await import('@xterm/addon-serialize')).SerializeAddon();
      session.terminal.loadAddon(serializeAddon);
      
      // Serialize the entire scrollback buffer and screen
      const content = serializeAddon.serialize();
      
      // Create filename with timestamp
      const now = new Date();
      const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, -5);
      const filename = `terminal-${session.title.replace(' ', '-')}-${timestamp}.log`;
      
      // Convert ANSI escape codes to plain text
      const plainText = content.replace(/\x1b\[[0-9;]*m/g, ''); // Remove color codes
      
      // Create a blob and download
      const blob = new Blob([plainText], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      URL.revokeObjectURL(url);
      
      console.log(`[ZeamiTermManager] Terminal saved to ${filename}`);
      
      // Show notification
      const notification = new Notification('ターミナル保存完了', {
        body: `${filename} として保存されました`,
        icon: '../../../assets/icon.png'
      });
      
      setTimeout(() => notification.close(), 3000);
    } catch (error) {
      console.error('[ZeamiTermManager] Failed to save terminal:', error);
      
      const notification = new Notification('保存エラー', {
        body: 'ターミナルの保存に失敗しました',
        icon: '../../../assets/icon.png'
      });
      
      setTimeout(() => notification.close(), 3000);
    }
  }
  
  showCommandNotification(data) {
    const prefs = this.preferenceManager;
    
    // Check if notifications are enabled
    if (!prefs.get('notifications.enabled')) return;
    
    // Check if window is focused
    if (document.hasFocus() && prefs.get('notifications.onlyWhenUnfocused')) return;
    
    // Determine notification type
    let notificationType = 'NORMAL';
    let sound = prefs.get('notifications.types.command.sound');
    
    if (data.isClaude) {
      notificationType = 'CLAUDE';
      sound = prefs.get('notifications.claudeCode.sound');
    } else if (data.exitCode !== 0) {
      notificationType = 'ERROR';
      sound = prefs.get('notifications.types.error.sound');
    } else if (this.detectBuildSuccess(data.command)) {
      notificationType = 'BUILD_SUCCESS';
      sound = prefs.get('notifications.types.buildSuccess.sound');
    }
    
    const config = this.notificationTypes[notificationType];
    
    // Prepare notification
    const title = config.title;
    const body = `"${data.command}" が完了しました（${this.formatDuration(data.duration)}）`;
    
    // Show notification
    try {
      const notification = new Notification(title, {
        body,
        icon: '../../../assets/icon.png',
        silent: !prefs.get('notifications.sounds.enabled') || sound === 'none',
        // macOS specific sound
        ...(process.platform === 'darwin' && sound && sound !== 'none' ? { sound } : {})
      });
      
      // Click handler - focus window
      notification.onclick = () => {
        window.focus();
        const session = this.terminals.get(this.activeTerminalId);
        if (session && session.terminal) {
          session.terminal.focus();
        }
      };
      
      // Auto close after 5 seconds
      setTimeout(() => notification.close(), 5000);
      
    } catch (error) {
      console.error('[ZeamiTermManager] Failed to show notification:', error);
    }
  }
  
  detectBuildSuccess(command) {
    const buildPatterns = [
      /build.*success/i,
      /successfully built/i,
      /compiled successfully/i,
      /webpack.*compiled/i,
      /✓.*build/i
    ];
    
    return buildPatterns.some(pattern => pattern.test(command));
  }
  
  formatDuration(milliseconds) {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    if (minutes > 0) {
      return `${minutes}分${remainingSeconds}秒`;
    }
    return `${seconds}秒`;
  }
  
  switchToTerminal(id) {
    if (!this.terminals.has(id)) return;
    
    // Update inactive/active classes on all terminals
    this.terminals.forEach((session, terminalId) => {
      if (session.wrapper) {
        if (terminalId === id) {
          session.wrapper.classList.remove('inactive');
          session.wrapper.classList.add('active');
        } else {
          session.wrapper.classList.remove('active');
          session.wrapper.classList.add('inactive');
        }
      }
    });
    
    this.activeTerminalId = id;
    
    // Update layout manager
    if (this.layoutManager && this.layoutManager.mode === 'tab') {
      this.layoutManager.updateLayout();
    }
    
    // Focus the terminal
    const session = this.terminals.get(id);
    if (session && session.terminal) {
      session.terminal.focus();
    }
    
    // Update tabs UI
    this.updateTabsUI();
  }
}