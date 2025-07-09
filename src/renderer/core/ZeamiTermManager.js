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
import { ShellIntegrationSetup } from '../components/ShellIntegrationSetup.js';
import { FileExplorer } from '../components/FileExplorer.js';
import { pasteDebugger } from '../utils/PasteDebugger.js';
import KeyboardShortcuts from '../utils/KeyboardShortcuts.js';
import { LogPanel } from '../components/LogPanel.js';

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
    this.updateNotifier = null; // Will be initialized in init()
    this.shellIntegrationSetup = new ShellIntegrationSetup();
    this.shellIntegrationChecked = new Set(); // Track which shells we've already checked
    this.fileExplorer = null; // Will be initialized after DOM is ready
    
    // Prevent infinite loops
    this.isInitializing = false;
    this.terminalsBeingCreated = new Set();
    
    // Bind methods
    this.createTerminal = this.createTerminal.bind(this);
    this.registerBuiltinCommands = this.registerBuiltinCommands.bind(this);
    this.toggleSearch = this.toggleSearch.bind(this);
    this.setupSearch = this.setupSearch.bind(this);
    this.applyPreferences = this.applyPreferences.bind(this);
    this.sendToActiveTerminal = this.sendToActiveTerminal.bind(this);
    
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
    
    // Prevent duplicate initialization
    if (this.isInitializing) {
      console.warn('[ZeamiTermManager] Already initializing, skipping...');
      return;
    }
    this.isInitializing = true;
    
    // Make manager accessible globally for testing and addons
    window.zeamiTermManager = this;
    window.terminalManager = this;  // For backward compatibility
    
    // Add test helpers for debugging
    window.testNotification = (type = 'command') => {
      console.log('[TEST] Testing notification type:', type);
      this.testNotification(type);
    };
    
    window.testLongCommand = () => {
      console.log('[TEST] Simulating long command completion');
      this.showCommandNotification({
        command: 'sleep 10 && echo "Done"',
        duration: 10000,
        exitCode: 0,
        isClaude: false
      });
    };
    
    // Initialize update notifier
    if (window.UpdateNotifier) {
      this.updateNotifier = new window.UpdateNotifier();
      console.log('[ZeamiTermManager] Update notifier initialized');
    }
    
    // Initialize layout manager
    const container = document.getElementById('terminal-container');
    this.layoutManager = new SimpleLayoutManager(container, this);
    this.layoutManager.init();
    
    // Initialize file explorer
    this.fileExplorer = new FileExplorer(this);
    this.fileExplorer.init();
    
    // Initialize log panel
    this.logPanel = new LogPanel();
    console.log('[ZeamiTermManager] Log panel initialized');
    
    // Load saved sessions
    this.sessionPersistence.loadFromStorage();
    
    // Enable auto-save
    this.sessionPersistence.enableAutoSave(30000); // Auto-save every 30 seconds
    
    // Setup profile selector
    this.setupProfileSelector();
    
    // Setup keyboard shortcuts
    this.setupKeyboardShortcuts();
    
    // Setup menu action handler
    this.setupMenuActionHandler();
    
    // Setup window resize handler with debounce
    this.setupResizeHandler();
    
    // Setup message handlers
    this.setupMessageHandlers();
    
    // Get window ID for terminal registration
    const windowId = await this.getWindowId();
    
    // Create exactly 2 fixed terminals with default sizes to avoid resize loops
    await this.createTerminal({ 
      name: 'Terminal A', 
      id: 'terminal-a',
      cols: 80,
      rows: 24,
      env: { 
        ZEAMI_TERMINAL_ID: 'A', 
        ZEAMI_TERMINAL_NAME: 'Terminal A',
        ZEAMI_WINDOW_ID: windowId.toString()
      }
    });
    await this.createTerminal({ 
      name: 'Terminal B', 
      id: 'terminal-b',
      cols: 80,
      rows: 24,
      env: { 
        ZEAMI_TERMINAL_ID: 'B', 
        ZEAMI_TERMINAL_NAME: 'Terminal B',
        ZEAMI_WINDOW_ID: windowId.toString()
      }
    });
    
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
    
    // Prevent duplicate creation
    if (this.terminalsBeingCreated.has(id)) {
      console.warn(`[ZeamiTermManager] Terminal ${id} is already being created`);
      return;
    }
    
    this.terminalsBeingCreated.add(id);
    
    try {
    // Check if we should restore a session
    const shouldRestore = options.restoreSession !== false && this.terminals.size === 0;
    
    // Use selected profile or default
    const profileId = options.profileId || this.selectedProfileId;
    
    // Create terminal wrapper
    const wrapper = document.createElement('div');
    wrapper.className = 'terminal-wrapper';
    wrapper.id = `wrapper-${id}`;
    
    // Add click handler to activate terminal when clicking on inactive terminal
    wrapper.addEventListener('click', (e) => {
      // Only activate if the terminal is inactive and the click is not on a scrollbar
      if (wrapper.classList.contains('inactive') && 
          e.target === wrapper || e.target.classList.contains('xterm-viewport')) {
        this.switchToTerminal(id);
      }
    });
    
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
      convertEol: false,  // Don't convert CR/LF - needed for Claude Code status updates
      windowsMode: false, // Use Unix-style line endings
      macOptionIsMeta: true, // Mac Option key as Meta
      allowProposedApi: true, // Enable proposed APIs
      screenReaderMode: false, // Disable screen reader mode for better performance
      // ENABLE bracketed paste mode for proper paste handling
      bracketedPasteMode: true,
      // Set initial size
      cols: options.cols || 80,
      rows: options.rows || 24
    });
    
    // Open terminal in wrapper
    terminal.open(wrapper);
    
    // Paste handler will be configured after PTY connection
    // ZeamiTerminal will handle paste events via _handleData method
    
    // Enable bracketed paste mode to ensure Claude Code can detect paste events
    // Send CSI ? 2004 h (set bracketed paste mode)
    // Note: This will be done after the session is created and stored
    
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
      
      
      // Handle newline insertion: Option+Return (Mac) or Shift+Return (all platforms)
      if (event.key === 'Enter' && (event.altKey || event.shiftKey)) {
        // Only handle keydown events to prevent double processing
        if (event.type !== 'keydown') {
          return false;
        }
        
        console.log('[ZeamiTermManager] Handling newline with Alt/Shift+Enter');
        // Send a literal newline to the terminal
        // Use the terminal's _handleData method directly
        if (terminal._handleData) {
          terminal._handleData('\n');
        }
        return false; // Prevent default handling
      }
      
      return true; // Allow other key events
    });
    
    // Create addons
    const fitAddon = new window.FitAddon.FitAddon();
    terminal.loadAddon(fitAddon);
    
    // Search addon with decorations
    const searchAddon = new window.SearchAddon.SearchAddon();
    terminal.loadAddon(searchAddon);
    
    // Enhanced link provider (先に定義)
    const enhancedLinkProvider = new EnhancedLinkProvider();
    terminal.loadAddon(enhancedLinkProvider);
    
    // DISABLED: Shell integration addon - may interfere with paste
    // const shellIntegrationAddon = new ShellIntegrationAddon();
    // terminal.loadAddon(shellIntegrationAddon);
    const shellIntegrationAddon = null;
    
    // Listen to shell integration events
    terminal.onShellIntegrationEvent = (eventName, data) => {
      console.log(`[ShellIntegration] ${eventName}:`, data);
      
      // Update status bar with command info
      if (eventName === 'commandEnd' && data.exitCode !== 0) {
        const msg = `Command failed with exit code ${data.exitCode}`;
        this.showNotification(msg, 'error');
      }
      
      // Forward CWD changes to link provider and file explorer
      if (eventName === 'cwdChange') {
        if (enhancedLinkProvider) {
          enhancedLinkProvider._cwd = data;
        }
        
        // Always update session's cwd
        session.cwd = data;
        
        // Update file explorer immediately if this is the active terminal and explorer is visible
        if (this.fileExplorer && session.id === this.activeTerminalId) {
          console.log('[ZeamiTermManager] CWD changed for active terminal:', data);
          if (this.fileExplorer.isVisible) {
            this.fileExplorer.updatePath(data);
          }
        }
      }
      
      // Handle long command completion
      if (eventName === 'longCommandCompleted') {
        console.log('[ZeamiTermManager] Long command completed, showing notification:', data);
        this.showCommandNotification(data);
      } 
      // Handle Zeami CLI completion
      else if (eventName === 'zeamiCLICompleted') {
        console.log('[ZeamiTermManager] Zeami CLI command completed:', data);
        this.handleZeamiCLICompletion(data);
      } else {
        console.log('[ZeamiTermManager] Received shell integration event:', eventName, data);
      }
    };
    
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
    
    // Refit on window resize with debounce
    let resizeInProgress = false;
    const resizeObserver = new ResizeObserver(() => {
      if (resizeInProgress) return;
      
      resizeInProgress = true;
      clearTimeout(this._resizeTimeout);
      this._resizeTimeout = setTimeout(() => {
        fitTerminal();
        resizeInProgress = false;
      }, 50);
    });
    resizeObserver.observe(wrapper);
    
    // Session already created above
    
    
    // Configure search decorations after session is created
    searchAddon.onDidChangeResults((results) => {
      this.updateSearchDecorations(session, results);
    });
    
    // Add to layout manager
    this.layoutManager.addTerminal(id, wrapper);
    
    // Update tabs UI
    this.updateTabsUI();
    
    // Connect to PTY
    await this.connectTerminal(session, shouldRestore, options);
    
    // Update session cwd from process if available
    if (session.process && session.process.cwd) {
      session.cwd = session.process.cwd;
      console.log('[ZeamiTermManager] Set initial CWD from process:', session.cwd);
    }
    
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
    } finally {
      // Always remove from creating set
      this.terminalsBeingCreated.delete(id);
    }
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
  
  async connectTerminal(session, shouldRestore = false, options = {}) {
    const api = window.electronAPI || window.zeamiAPI;
    if (!api) {
      session.terminal.writeln('ZeamiTerm - Terminal API not available');
      session.terminal.writeln('Running in demo mode\r\n');
      return;
    }
    
    // Create session object first
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
    
    try {
      // Only show animation for the first terminal
      const isFirstTerminal = this.terminals.size === 1;
      let animationPromise = null;
      let outputBuffer = [];
      let bufferingOutput = isFirstTerminal;
      
      // Start animation if needed
      if (isFirstTerminal && window.StartupAnimation) {
        const animation = new window.StartupAnimation(session.terminal);
        animationPromise = animation.play().then(() => {
          // Show essential info after animation
          session.terminal.writeln('\x1b[32m✓ ZeamiTerm commands installed!\x1b[0m');
          session.terminal.writeln('');
          session.terminal.writeln('Available commands:');
          session.terminal.writeln('  \x1b[33mh\x1b[0m or \x1b[33mhelp\x1b[0m  - Open interactive menu');
          session.terminal.writeln('  \x1b[33mzm\x1b[0m or \x1b[33mmenu\x1b[0m - Open interactive menu');
          session.terminal.writeln('  \x1b[33mmatrix\x1b[0m       - Run Matrix animation');
          session.terminal.writeln('  \x1b[33mmatrix extreme\x1b[0m - Run high-load test');
          session.terminal.writeln('');
          session.terminal.writeln('Note: The \'?\' command is aliased to \'h\'');
          
          // Flush buffered output
          session.bufferingOutput = false;
          session.outputBuffer.forEach(data => session.terminal.write(data));
          session.outputBuffer = [];
          
          // Show keyboard shortcuts after flushing output
          session.terminal.writeln(`\x1b[2mzsh: command not found: 2004h\x1b[0m`);
          session.terminal.writeln('Type \x1b[1;33mhelp\x1b[0m for available commands or \x1b[1;33m?\x1b[0m for menu.');
          if (KeyboardShortcuts) {
            const shortcuts = KeyboardShortcuts.getShortcuts();
            session.terminal.writeln(`\x1b[2mKeyboard shortcuts: ${shortcuts.copy} copy, ${shortcuts.paste} paste, ${shortcuts.pasteDebugger} debug\x1b[0m`);
            session.terminal.writeln(`\x1b[2mFor newline: ${KeyboardShortcuts.isMac() ? 'Option' : 'Alt'}+Return or Shift+Return\x1b[0m`);
          }
          session.terminal.writeln('');
        });
      }
      
      // Create PTY process
      let result;
      if (window.electronAPI) {
        result = await window.electronAPI.createTerminal({
          cols: session.terminal.cols,
          rows: session.terminal.rows,
          profileId: this.selectedProfileId,
          env: options.env || {},
          cwd: options.cwd || '/Users/hirano/develop/Zeami-1/projects/zeami-term' // Use provided cwd or project directory
        });
      } else {
        result = await window.zeamiAPI.startSession({
          cols: session.terminal.cols,
          rows: session.terminal.rows,
          profileId: this.selectedProfileId,
          env: options.env || {}
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
        
        // Check and prompt for shell integration
        if (false && result.shell) {  // Temporarily disabled to fix infinite loop
          // Check if shell integration is enabled in preferences
          const shellIntegrationEnabled = this.preferenceManager.get('terminal.shellIntegration.enabled');
          
          if (shellIntegrationEnabled !== false) {
            // Check if already installed for this shell
            const installedShells = this.preferenceManager.get('terminal.shellIntegration.installedShells') || {};
            
            if (!installedShells[result.shell]) {
              // Show setup dialog after a short delay
              setTimeout(async () => {
                const setupResult = await this.shellIntegrationSetup.show(result.shell);
                console.log('[ZeamiTermManager] Shell integration setup result:', setupResult);
                
                if (setupResult.action === 'installed') {
                  // Mark as installed
                  installedShells[result.shell] = true;
                  this.preferenceManager.set('terminal.shellIntegration.installedShells', installedShells);
                  this.preferenceManager.savePreferences();
                  
                  // Source the RC file in current session
                  setTimeout(() => {
                    const sourceCmd = `source ${setupResult.rcFile || '~/.bashrc'}`;
                    window.electronAPI.sendInput(session.process.id, sourceCmd + '\n');
                    this.showNotification('Shell integration enabled and activated!', 'info');
                  }, 500);
                } else if (setupResult.action === 'session_only') {
                  // Session only - already activated by ZeamiInstance
                  this.showNotification('Shell integration enabled for this session', 'info');
                } else if (setupResult.action === 'never') {
                  // User chose never - mark it so we don't ask again
                  installedShells[result.shell] = 'never';
                  this.preferenceManager.set('terminal.shellIntegration.installedShells', installedShells);
                  this.preferenceManager.savePreferences();
                }
              }, 1000);
            }
          }
        }
        
        // Configure dynamic paste handling for ZeamiTerminal
        // This will be handled in ZeamiTerminal's _handleData method
        session.terminal._dynamicPasteConfig = {
          enabled: true,
          mediumContentLines: { min: 30, max: 50 },
          mediumChunkSize: 500,
          standardChunkSize: 1000,
          chunkDelay: 10,
          mediumChunkDelay: 15,
          targetTotalTime: 60
        };
        
        console.log('[ZeamiTermManager] Configured dynamic paste handling for terminal');
        
        // Set PTY handler for user input
        session.terminal.setPtyHandler((data) => {
          console.log(`[Renderer] Sending user input to PTY: ${JSON.stringify(data)}`);
          
          // Enhanced logging for paste debugging
          const hasStartMarker = data.includes('\x1b[200~');
          const hasEndMarker = data.includes('\x1b[201~');
          
          if (hasStartMarker || hasEndMarker) {
            console.log('[PASTE DEBUG] Data from setPtyHandler contains markers - this is expected with bracketedPasteMode enabled');
            pasteDebugger.log('info', 'setPtyHandler received data with markers', { 
              time: new Date().toISOString(),
              hasStartMarker,
              hasEndMarker,
              length: data.length,
              preview: data.substring(0, 50).replace(/\x1b/g, 'ESC')
            });
          }
          
          // Log large data transfers
          if (data.length > 100) {
            console.log(`[PASTE DEBUG] Large data from setPtyHandler: ${data.length} bytes`);
            pasteDebugger.log('info', `setPtyHandler large data: ${data.length} bytes`, {
              lines: data.split('\n').length,
              hasMarkers: hasStartMarker || hasEndMarker,
              preview: data.substring(0, 50).replace(/\x1b/g, 'ESC') + '...'
            });
          }
          
          // Send data to PTY - markers should already be stripped by onPaste handler
          
          if (window.electronAPI) {
            window.electronAPI.sendInput(session.process.id, data);
          } else {
            window.zeamiAPI.sendInput(session.process.sessionId, data);
          }
        });
        
        // Store buffer state on session for access in data handler
        session.bufferingOutput = bufferingOutput;
        session.outputBuffer = outputBuffer;
        
        // Handle terminal data - Use global listener approach
        if (window.electronAPI) {
          // Set up global listener only once
          if (!this.terminalDataListenerSetup) {
            this.terminalDataListenerSetup = true;
            
            window.electronAPI.onTerminalData(({ id, data }) => {
              console.log(`[Renderer] Received terminal data: id=${id}, length=${data ? data.length : 0}`);
              
              // Find the terminal session that matches this process ID
              for (const [terminalId, termSession] of this.terminals) {
                if (termSession.process && termSession.process.id === id) {
                  console.log(`[Renderer] Writing to terminal ${terminalId}: ${data ? data.substring(0, 50) : 'null'}...`);
                  if (data) {
                    // Check if we're buffering output during animation
                    if (termSession.bufferingOutput) {
                      termSession.outputBuffer.push(data);
                    } else {
                      termSession.terminal.write(data);
                    }
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
              if (session.bufferingOutput) {
                session.outputBuffer.push(data);
              } else {
                session.terminal.write(data);
              }
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
        
        // Enable bracketed paste mode after terminal is connected
        setTimeout(() => {
          if (session.terminal._ptyHandler) {
            console.log('[ZeamiTermManager] Sending control sequence to ENABLE bracketed paste mode');
            // Send CSI ? 2004 h (set bracketed paste mode)
            session.terminal._ptyHandler('\x1b[?2004h');
            pasteDebugger.log('info', 'Sent control sequence to ENABLE bracketed paste mode');
            
            // Also send a newline to ensure the command is processed
            setTimeout(() => {
              session.terminal._ptyHandler('\r');
              console.log('[ZeamiTermManager] Sent newline after bracketed paste mode enable');
            }, 50);
          }
        }, 500); // Delay to ensure terminal is ready
        
        // Auto-restore last session if this is the first terminal
        // Delay to ensure it appears after the startup animation
        if (shouldRestore) {
          setTimeout(() => {
            this.tryRestoreLastSession(session);
          }, 100);
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
  
  async showWelcomeMessage(terminal) {
    // Use the new startup animation instead
    if (window.StartupAnimation) {
      const animation = new window.StartupAnimation(terminal);
      await animation.play();
      
      // After animation, show essential info
      terminal.writeln('\x1b[32m✓ ZeamiTerm commands installed!\x1b[0m');
      terminal.writeln('');
      terminal.writeln('Available commands:');
      terminal.writeln('  \x1b[33mh\x1b[0m or \x1b[33mhelp\x1b[0m  - Open interactive menu');
      terminal.writeln('  \x1b[33mzm\x1b[0m or \x1b[33mmenu\x1b[0m - Open interactive menu');
      terminal.writeln('  \x1b[33mmatrix\x1b[0m       - Run Matrix animation');
      terminal.writeln('  \x1b[33mmatrix extreme\x1b[0m - Run high-load test');
      terminal.writeln('');
      terminal.writeln('Note: The \'?\' command is aliased to \'h\'');
      terminal.writeln(`\x1b[2mzeami:~ % 2004h\x1b[0m`);
      terminal.writeln(`\x1b[2mzsh: command not found: 2004h\x1b[0m`);
      terminal.writeln('Type \x1b[1;33mhelp\x1b[0m for available commands or \x1b[1;33m?\x1b[0m for menu.');
      
      // Show OS-specific keyboard shortcuts
      const shortcuts = KeyboardShortcuts.getShortcuts();
      terminal.writeln(`\x1b[2mKeyboard shortcuts: ${shortcuts.copy} copy, ${shortcuts.paste} paste, ${shortcuts.pasteDebugger} debug\x1b[0m`);
      terminal.writeln(`\x1b[2mFor newline: ${KeyboardShortcuts.isMac() ? 'Option' : 'Alt'}+Return or Shift+Return\x1b[0m`);
      terminal.writeln('');
    } else {
      // Fallback to simple message if animation is not available
      terminal.writeln('\x1b[32mZeamiTerm v0.1.11\x1b[0m');
      terminal.writeln('Type \x1b[1;33mhelp\x1b[0m for available commands or \x1b[1;33m?\x1b[0m for menu.');
      terminal.writeln('');
    }
  }
  
  // Legacy tab methods - now handled by LayoutManager
  addTab(session) {
    // Deprecated - handled by LayoutManager
    console.warn('[ZeamiTermManager] addTab is deprecated, use LayoutManager');
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
    
    // Update file explorer if visible
    if (this.fileExplorer && this.fileExplorer.isVisible) {
      // Try to get cwd from session or process
      let currentPath = session.cwd || session.process?.cwd;
      
      if (!currentPath) {
        // Fallback to home directory
        currentPath = process.env.HOME || '/Users/' + process.env.USER;
      }
      
      console.log('[ZeamiTermManager] switchToTerminal - Updating file explorer path:', currentPath);
      this.fileExplorer.updatePath(currentPath);
    }
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
      
      // Cmd/Ctrl + Shift + E: Toggle File Explorer
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'E') {
        e.preventDefault();
        this.toggleFileExplorer();
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
    
    // File explorer toggle button
    document.getElementById('file-explorer-toggle')?.addEventListener('click', () => {
      this.toggleFileExplorer();
    });
  }
  
  setupMenuActionHandler() {
    // Listen for menu actions from main process
    if (window.electronAPI && window.electronAPI.onMenuAction) {
      window.electronAPI.onMenuAction((action) => {
        console.log('[ZeamiTermManager] Received menu action:', action);
        
        switch(action) {
          case 'save-terminal':
            this.saveTerminalHistory();
            break;
          case 'preferences':
            this.preferenceWindow.open();
            break;
          case 'find':
            this.toggleSearch();
            break;
          case 'paste':
            this.handleMenuPaste();
            break;
          case 'custom-paste':
            this.handleCustomPaste();
            break;
          default:
            console.warn('[ZeamiTermManager] Unknown menu action:', action);
        }
      });
    }
  }
  
  setupResizeHandler() {
    let resizeTimer = null;
    let resizeInProgress = false;
    
    window.addEventListener('resize', () => {
      // Clear any existing timer
      if (resizeTimer) {
        clearTimeout(resizeTimer);
      }
      
      // Mark resize as in progress
      resizeInProgress = true;
      
      // Debounce the resize event
      resizeTimer = setTimeout(() => {
        resizeInProgress = false;
        console.log('[ZeamiTermManager] Window resized, refitting all terminals');
        
        // First, let the layout manager update
        if (this.layoutManager) {
          this.layoutManager.resizeTerminals();
        }
        
        // Then refit terminals with proper synchronization
        setTimeout(() => {
          this.terminals.forEach((session, id) => {
            if (session.wrapper && session.wrapper.offsetParent !== null) {
              // Terminal is visible
              if (session.fitAddon && session.terminal) {
                try {
                  // Get current dimensions
                  const dimensions = session.fitAddon.proposeDimensions();
                  if (dimensions && dimensions.cols && dimensions.rows) {
                    // Only resize if dimensions actually changed
                    if (dimensions.cols !== session.terminal.cols || dimensions.rows !== session.terminal.rows) {
                      session.terminal.resize(dimensions.cols, dimensions.rows);
                    }
                  }
                  
                  // Fit addon will handle the actual fitting
                  session.fitAddon.fit();
                  
                  // Minimal refresh to update display
                  session.terminal.refresh(0, session.terminal.rows - 1);
                } catch (error) {
                  console.warn('[ZeamiTermManager] Failed to fit terminal on resize:', error);
                }
              }
            }
          });
        }, 50); // Small delay to ensure DOM is ready
      }, 150); // Debounce for 150ms
    });
  }
  
  async saveTerminalHistory() {
    const activeTerminal = this.getActiveTerminal();
    if (!activeTerminal) {
      console.warn('[ZeamiTermManager] No active terminal to save');
      return;
    }
    
    // Use the SaveCommand execute method
    const saveCommand = new SaveCommand();
    await saveCommand.execute(activeTerminal, []);
  }
  
  async handleCustomPaste() {
    const activeTerminal = this.getActiveTerminal();
    if (!activeTerminal) {
      console.warn('[ZeamiTermManager] No active terminal for paste');
      return;
    }
    
    try {
      // Check clipboard for images
      if (navigator.clipboard && navigator.clipboard.read) {
        const items = await navigator.clipboard.read();
        for (const item of items) {
          if (item.types.includes('image/png') || item.types.includes('image/jpeg')) {
            // Found an image, send Ctrl+V to trigger Claude Code's image handling
            console.log('[ZeamiTermManager] Image detected in clipboard, sending Ctrl+V');
            if (activeTerminal._handleData) {
              activeTerminal._handleData('\x16'); // Ctrl+V
            }
            return;
          }
        }
      }
      
      // No image found or clipboard API not available, paste text
      if (activeTerminal.paste && navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        if (text) {
          activeTerminal.paste(text);
        }
      }
    } catch (error) {
      console.error('[ZeamiTermManager] Failed to handle custom paste:', error);
    }
  }
  
  async handleMenuPaste() {
    const activeTerminal = this.getActiveTerminal();
    if (!activeTerminal) {
      console.warn('[ZeamiTermManager] No active terminal for paste');
      return;
    }
    
    try {
      // Get the terminal's textarea element
      const textarea = activeTerminal.textarea;
      if (!textarea) {
        console.warn('[ZeamiTermManager] No textarea found for paste');
        return;
      }
      
      // Focus the textarea
      textarea.focus();
      
      // Use the terminal's paste method directly if available
      if (activeTerminal.paste && typeof activeTerminal.paste === 'function') {
        // Try to read clipboard and paste
        navigator.clipboard.read().then(items => {
          console.log('[ZeamiTermManager] Clipboard items:', items.length);
          
          // Check for images first
          for (const item of items) {
            console.log('[ZeamiTermManager] Item types:', item.types);
            if (item.types.includes('image/png') || item.types.includes('image/jpeg')) {
              // This is an image, but xterm.js paste only handles text
              // So we need to let the browser handle it naturally
              document.execCommand('paste');
              return;
            }
          }
          
          // If no images, try text paste
          navigator.clipboard.readText().then(text => {
            if (text) {
              activeTerminal.paste(text);
            }
          });
        }).catch(err => {
          console.error('[ZeamiTermManager] Clipboard read failed:', err);
          // Fallback to execCommand
          document.execCommand('paste');
        });
      } else {
        // Fallback to execCommand
        document.execCommand('paste');
      }
      
      console.log('[ZeamiTermManager] Menu paste executed');
    } catch (error) {
      console.error('[ZeamiTermManager] Failed to handle menu paste:', error);
    }
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
        // Use public API instead of internal methods
        terminal.resize(terminal.cols, terminal.rows);
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
    
    // Save the file explorer toggle button before clearing
    const fileExplorerToggle = document.getElementById('file-explorer-toggle');
    
    // Clear existing tabs but keep file explorer toggle
    const existingTabs = tabsContainer.querySelectorAll('.tab');
    existingTabs.forEach(tab => tab.remove());
    
    // Re-add file explorer toggle if it was removed
    if (fileExplorerToggle && !tabsContainer.contains(fileExplorerToggle)) {
      tabsContainer.insertBefore(fileExplorerToggle, tabsContainer.firstChild);
    }
    
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
  
  async showCommandNotification(data) {
    console.log('[ZeamiTermManager] showCommandNotification called with:', data);
    
    const prefs = this.preferenceManager;
    
    // Log current preferences for debugging
    console.log('[ZeamiTermManager] Current notification preferences:', {
      enabled: prefs.get('notifications.enabled'),
      soundsEnabled: prefs.get('notifications.sounds.enabled'),
      commandSound: prefs.get('notifications.types.command.sound'),
      errorSound: prefs.get('notifications.types.error.sound'),
      buildSound: prefs.get('notifications.types.buildSuccess.sound'),
      claudeSound: prefs.get('notifications.claudeCode.sound')
    });
    
    // Check if notifications are enabled
    if (!prefs.get('notifications.enabled')) {
      console.log('[ZeamiTermManager] Notifications are disabled');
      return;
    }
    
    // Check if window is focused
    if (document.hasFocus() && prefs.get('notifications.onlyWhenUnfocused')) {
      console.log('[ZeamiTermManager] Window is focused and onlyWhenUnfocused is true');
      return;
    }
    
    // Determine notification type
    let notificationType = 'NORMAL';
    let sound = prefs.get('notifications.types.command.sound');
    
    if (data.isClaude) {
      notificationType = 'CLAUDE';
      sound = prefs.get('notifications.claudeCode.sound');
    } else if (data.exitCode !== 0) {
      notificationType = 'ERROR';
      sound = prefs.get('notifications.types.error.sound');
    } else if (data.command && this.detectBuildSuccess(data.command)) {
      notificationType = 'BUILD_SUCCESS';
      sound = prefs.get('notifications.types.buildSuccess.sound');
    }
    
    console.log(`[ZeamiTermManager] Notification type: ${notificationType}, sound: ${sound}`);
    
    const config = this.notificationTypes[notificationType];
    
    // Prepare notification
    const title = config.title;
    const body = `"${data.command || 'コマンド'}" が完了しました（${this.formatDuration(data.duration)}）`;
    
    // Forward to Message Center first
    if (window.electronAPI && window.electronAPI.sendToMessageCenter) {
      const messageData = {
        type: 'command-notification',
        source: {
          windowId: await this.getWindowId(),
          terminalId: this.activeTerminalId,
          terminalName: this.getTerminalName(this.activeTerminalId)
        },
        timestamp: Date.now(),
        data: {
          command: data.command,
          duration: data.duration,
          exitCode: data.exitCode,
          isClaude: data.isClaude,
          notificationType
        },
        notification: {
          title,
          body,
          sound: sound && sound !== 'none' ? sound : null,
          silent: !prefs.get('notifications.sounds.enabled') || sound === 'none'
        }
      };
      
      // Send to Message Center
      window.electronAPI.sendToMessageCenter(messageData).catch(err => {
        console.warn('[ZeamiTermManager] Failed to send to Message Center:', err);
      });
    }
    
    // Show notification using Electron API for proper sound support
    try {
      if (window.electronAPI && window.electronAPI.showNotification) {
        console.log('[ZeamiTermManager] Using Electron notification API');
        // Use Electron notification for sound support
        window.electronAPI.showNotification({
          title,
          body,
          sound: sound && sound !== 'none' ? sound : null,
          silent: !prefs.get('notifications.sounds.enabled') || sound === 'none'
        });
      } else {
        // Fallback to web notification
        const notification = new Notification(title, {
          body,
          icon: '../../../assets/icon.png',
          silent: !prefs.get('notifications.sounds.enabled') || sound === 'none'
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
      }
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
  
  async getWindowId() {
    if (window.electronAPI && window.electronAPI.getWindowId) {
      return await window.electronAPI.getWindowId();
    }
    return 'unknown';
  }
  
  getTerminalName(terminalId) {
    const session = this.terminals.get(terminalId);
    if (session && session.name) {
      return session.name;
    }
    // Extract terminal letter from ID (e.g., "terminal-a" -> "A")
    const match = terminalId.match(/terminal-(\w)/);
    if (match) {
      return `Terminal ${match[1].toUpperCase()}`;
    }
    return terminalId;
  }
  
  setupMessageHandlers() {
    // Handle incoming messages from other terminals
    if (window.electronAPI && window.electronAPI.onTerminalMessage) {
      window.electronAPI.onTerminalMessage(({ targetId, message }) => {
        console.log('[ZeamiTermManager] Received terminal message:', { targetId, message });
        
        // Find the target terminal
        const session = this.terminals.get(targetId);
        if (session && session.terminal) {
          // Display message in terminal
          const formattedMessage = `\r\n\x1b[36m[Message from ${message.source.windowId === 'message-center' ? 'Message Center' : message.source.terminalId || 'Unknown'}]\x1b[0m\r\n${message.content}\r\n`;
          session.terminal.write(formattedMessage);
          
          // Show notification if enabled
          if (this.preferenceManager.get('notifications.enabled')) {
            window.electronAPI.showNotification({
              title: '💬 新しいメッセージ',
              body: message.content,
              sound: 'Glass'
            });
          }
        }
      });
    }
    
    // Handle broadcast messages
    if (window.electronAPI && window.electronAPI.onTerminalBroadcast) {
      window.electronAPI.onTerminalBroadcast((message) => {
        console.log('[ZeamiTermManager] Received broadcast message:', message);
        
        // Display in all terminals
        this.terminals.forEach((session, id) => {
          if (session.terminal) {
            const formattedMessage = `\r\n\x1b[33m[Broadcast from ${message.source.windowId === 'message-center' ? 'Message Center' : message.source.terminalId || 'Unknown'}]\x1b[0m\r\n${message.content}\r\n`;
            session.terminal.write(formattedMessage);
          }
        });
        
        // Show notification
        if (this.preferenceManager.get('notifications.enabled')) {
          window.electronAPI.showNotification({
            title: '📢 ブロードキャストメッセージ',
            body: message.content,
            sound: 'Ping'
          });
        }
      });
    }
  }
  
  async handleZeamiCLICompletion(data) {
    console.log('[ZeamiTermManager] Processing Zeami CLI completion:', data);
    
    // Extract command info
    const commandParts = data.command.split(' ');
    const zeamiCommand = commandParts.slice(1).join(' '); // Remove 'zeami' part
    
    // Determine notification type based on exit code and command
    let notificationType = 'ZEAMI_CLI';
    let icon = '⚡';
    let title = 'Zeami CLI 完了';
    
    if (data.exitCode !== 0) {
      notificationType = 'ZEAMI_CLI_ERROR';
      icon = '❌';
      title = 'Zeami CLI エラー';
    } else if (zeamiCommand.includes('type')) {
      icon = '🔍';
      title = 'Zeami Type Check 完了';
    } else if (zeamiCommand.includes('learn')) {
      icon = '🧠';
      title = 'Zeami Learn 完了';
    } else if (zeamiCommand.includes('batch')) {
      icon = '📦';
      title = 'Zeami Batch 完了';
    } else if (zeamiCommand.includes('doc')) {
      icon = '📝';
      title = 'Zeami Doc 完了';
    }
    
    // Format the message
    const formattedCommand = data.isClaude ? 
      `[Claude Code] ${data.command}` : 
      data.command;
    
    // Send to Message Center
    if (window.electronAPI && window.electronAPI.sendToMessageCenter) {
      const messageData = {
        type: 'zeami-cli-notification',
        source: {
          windowId: await this.getWindowId(),
          terminalId: this.activeTerminalId,
          terminalName: this.getTerminalName(this.activeTerminalId)
        },
        timestamp: Date.now(),
        data: {
          command: data.command,
          zeamiCommand: zeamiCommand,
          duration: data.duration,
          exitCode: data.exitCode,
          cwd: data.cwd,
          isClaude: data.isClaude,
          notificationType
        },
        notification: {
          title: `${icon} ${title}`,
          body: `${formattedCommand}\n実行時間: ${this.formatDuration(data.duration)}`,
          sound: data.exitCode === 0 ? 'Glass' : 'Basso'
        }
      };
      
      try {
        await window.electronAPI.sendToMessageCenter(messageData);
        console.log('[ZeamiTermManager] Zeami CLI completion sent to Message Center');
      } catch (err) {
        console.warn('[ZeamiTermManager] Failed to send Zeami CLI completion to Message Center:', err);
      }
    }
    
    // Also show local notification if enabled
    if (this.preferenceManager.get('notifications.enabled')) {
      window.electronAPI.showNotification({
        title: `${icon} ${title}`,
        body: `${formattedCommand}\n実行時間: ${this.formatDuration(data.duration)}`,
        sound: data.exitCode === 0 ? 'Glass' : 'Basso'
      });
    }
  }
  
  testNotification(type) {
    const prefs = this.preferenceManager;
    
    // Create test data based on type
    let testData = {
      command: '',
      duration: 25000, // 25 seconds
      exitCode: 0,
      isClaude: false
    };
    
    let notificationType = 'NORMAL';
    let sound = '';
    
    switch(type) {
      case 'command':
        testData.command = 'npm run build';
        notificationType = 'NORMAL';
        sound = prefs.get('notifications.types.command.sound');
        break;
        
      case 'error':
        testData.command = 'npm test';
        testData.exitCode = 1;
        notificationType = 'ERROR';
        sound = prefs.get('notifications.types.error.sound');
        break;
        
      case 'build':
        testData.command = 'webpack: compiled successfully';
        notificationType = 'BUILD_SUCCESS';
        sound = prefs.get('notifications.types.buildSuccess.sound');
        break;
        
      case 'claude':
        testData.command = 'claude --dangerously-skip-permissions';
        testData.isClaude = true;
        testData.duration = 12000; // 12 seconds
        notificationType = 'CLAUDE';
        sound = prefs.get('notifications.claudeCode.sound');
        break;
    }
    
    const config = this.notificationTypes[notificationType];
    
    // Check if notifications are enabled
    if (!prefs.get('notifications.enabled')) {
      alert('通知が無効になっています。設定で有効にしてください。');
      return;
    }
    
    // Show test notification using Electron API for proper sound support
    try {
      if (window.electronAPI && window.electronAPI.showNotification) {
        // Use Electron notification for sound support
        window.electronAPI.showNotification({
          title: config.title + ' (テスト)',
          body: `"${testData.command}" が完了しました（${this.formatDuration(testData.duration)}）`,
          sound: sound && sound !== 'none' ? sound : null,
          silent: !prefs.get('notifications.sounds.enabled') || sound === 'none'
        });
      } else {
        // Fallback to web notification
        const notification = new Notification(config.title + ' (テスト)', {
          body: `"${testData.command}" が完了しました（${this.formatDuration(testData.duration)}）`,
          icon: '../../../assets/icon.png',
          silent: !prefs.get('notifications.sounds.enabled') || sound === 'none'
        });
        
        // Auto-close after 5 seconds
        setTimeout(() => {
          notification.close();
        }, 5000);
        
        // Click handler - focus window
        notification.onclick = () => {
          window.focus();
          notification.close();
        };
      }
      
      console.log(`[ZeamiTermManager] Test notification shown: ${type}, sound: ${sound}`);
      console.log(`[ZeamiTermManager] Notification preferences:`, {
        enabled: prefs.get('notifications.enabled'),
        soundsEnabled: prefs.get('notifications.sounds.enabled'),
        commandSound: prefs.get('notifications.types.command.sound'),
        errorSound: prefs.get('notifications.types.error.sound'),
        buildSound: prefs.get('notifications.types.buildSuccess.sound'),
        claudeSound: prefs.get('notifications.claudeCode.sound')
      });
    } catch (error) {
      console.error('[ZeamiTermManager] Failed to show test notification:', error);
      alert('通知の表示に失敗しました。システム設定で通知が許可されているか確認してください。');
    }
  }
  
  sendToActiveTerminal(command) {
    const activeSession = this.terminals.get(this.activeTerminalId);
    if (activeSession && activeSession.terminal) {
      activeSession.terminal.paste(command);
    }
  }
  
  toggleFileExplorer() {
    if (this.fileExplorer) {
      const isVisible = this.fileExplorer.toggle();
      
      // Update button state
      const toggleButton = document.getElementById('file-explorer-toggle');
      if (toggleButton) {
        if (isVisible) {
          toggleButton.classList.add('active');
        } else {
          toggleButton.classList.remove('active');
        }
      }
      
      // Update file explorer with current terminal's directory
      if (isVisible) {
        const activeSession = this.terminals.get(this.activeTerminalId);
        console.log('[ZeamiTermManager] toggleFileExplorer - Active session:', {
          id: this.activeTerminalId,
          session: activeSession,
          cwd: activeSession?.cwd,
          process: activeSession?.process
        });
        
        // Try to get cwd from session or process
        let currentPath = activeSession?.cwd || activeSession?.process?.cwd;
        
        if (!currentPath && activeSession?.process) {
          // If no cwd, use the process's initial cwd
          currentPath = activeSession.process.cwd;
        }
        
        if (!currentPath) {
          // Fallback to home directory
          currentPath = process.env.HOME || '/Users/' + process.env.USER;
        }
        
        console.log('[ZeamiTermManager] Using path for file explorer:', currentPath);
        this.fileExplorer.updatePath(currentPath);
      }
    }
  }
}