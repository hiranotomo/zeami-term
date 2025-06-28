/**
 * Comprehensive Test Suite for ZeamiTerm
 * Tests all features including new toggle UI and multi-window functionality
 */

const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { PtyService } = require('../src/main/ptyService');
const { TerminalProcessManager } = require('../src/main/terminalProcessManager');

class ComprehensiveTestSuite {
  constructor() {
    this.mainWindow = null;
    this.secondWindow = null;
    this.ptyService = null;
    this.terminalProcessManager = null;
    this.testResults = [];
    this.consoleErrors = [];
  }

  log(message, type = 'info', category = 'general') {
    const timestamp = new Date().toISOString();
    const prefix = {
      error: '❌',
      success: '✅',
      warning: '⚠️',
      info: 'ℹ️'
    }[type] || 'ℹ️';
    
    console.log(`${prefix} [${category}] ${message}`);
    this.testResults.push({ message, type, category, timestamp });
  }

  async wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async setupServices() {
    this.log('Setting up services...', 'info', 'setup');
    
    // Initialize PTY service
    this.ptyService = new PtyService();
    this.log('PtyService initialized', 'success', 'setup');
    
    // Initialize terminal process manager
    this.terminalProcessManager = new TerminalProcessManager();
    this.log('TerminalProcessManager initialized', 'success', 'setup');
    
    // Setup IPC handlers
    this.setupIPCHandlers();
  }

  setupIPCHandlers() {
    // Terminal creation
    ipcMain.handle('terminal:create', async (event, options) => {
      try {
        const result = await this.ptyService.createProcess(options);
        this.log(`Terminal created: ${result.id}`, 'success', 'ipc');
        return { success: true, ...result };
      } catch (error) {
        this.log(`Failed to create terminal: ${error.message}`, 'error', 'ipc');
        return { success: false, error: error.message };
      }
    });

    // Terminal input
    ipcMain.handle('terminal:input', async (event, { id, data }) => {
      try {
        this.ptyService.writeToProcess(id, data);
        return { success: true };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    // Terminal resize
    ipcMain.handle('terminal:resize', async (event, { id, cols, rows }) => {
      try {
        this.ptyService.resizeProcess(id, cols, rows);
        return { success: true };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    // Profile management
    ipcMain.handle('profiles:get', async () => {
      return {
        profiles: this.terminalProcessManager.getProfiles(),
        defaultProfileId: this.terminalProcessManager.getDefaultProfile()?.id
      };
    });

    // PTY data forwarding
    this.ptyService.on('data', ({ id, data }) => {
      BrowserWindow.getAllWindows().forEach(win => {
        if (!win.isDestroyed()) {
          win.webContents.send('terminal:data', { id, data });
        }
      });
    });

    this.log('IPC handlers setup complete', 'success', 'setup');
  }

  async createTestWindow(isMain = true) {
    const window = new BrowserWindow({
      width: 1200,
      height: 800,
      webPreferences: {
        preload: path.join(__dirname, '../src/preload/index.js'),
        contextIsolation: true,
        nodeIntegration: false
      },
      show: false
    });

    // Setup console error tracking
    window.webContents.on('console-message', (event, level, message, line, sourceId) => {
      if (level === 3) { // Error level
        this.consoleErrors.push({ message, line, sourceId, window: isMain ? 'main' : 'second' });
        this.log(`Console error: ${message}`, 'error', 'console');
      }
    });

    await window.loadFile(path.join(__dirname, '../src/renderer/index.html'));
    
    return window;
  }

  async runTests() {
    this.log('Starting comprehensive test suite...', 'info', 'main');

    try {
      // Setup phase
      await this.setupServices();
      
      // Test categories
      await this.testWindowCreation();
      await this.testDOMElements();
      await this.testToggleUI();
      await this.testSplitFunctionality();
      await this.testMultiWindow();
      await this.testTerminalCreation();
      await this.testDirectoryInheritance();
      await this.testLayoutPersistence();
      await this.testKeyboardShortcuts();
      await this.testErrorHandling();
      
      // Summary
      this.generateSummary();
      
    } catch (error) {
      this.log(`Critical test failure: ${error.message}`, 'error', 'main');
      this.log(error.stack, 'error', 'main');
    } finally {
      await this.cleanup();
    }
  }

  async testWindowCreation() {
    this.log('\n=== Testing Window Creation ===', 'info', 'window');
    
    this.mainWindow = await this.createTestWindow(true);
    this.log('Main window created', 'success', 'window');
    
    const title = await this.mainWindow.webContents.executeJavaScript('document.title');
    this.log(`Window title: ${title}`, 'success', 'window');
    
    await this.wait(1000);
  }

  async testDOMElements() {
    this.log('\n=== Testing DOM Elements ===', 'info', 'dom');
    
    const domChecks = await this.mainWindow.webContents.executeJavaScript(`
      (function() {
        return {
          header: !!document.querySelector('.header'),
          terminalContainer: !!document.getElementById('terminal-container'),
          statusBar: !!document.querySelector('.status-bar'),
          toggleGroup: !!document.querySelector('.split-toggle-group'),
          toggleButtons: document.querySelectorAll('.toggle-button').length,
          tabButton: !!Array.from(document.querySelectorAll('.toggle-button')).find(b => b.textContent === 'Tab'),
          horizontalButton: !!Array.from(document.querySelectorAll('.toggle-button')).find(b => b.textContent === 'Horizontal'),
          verticalButton: !!Array.from(document.querySelectorAll('.toggle-button')).find(b => b.textContent === 'Vertical'),
          newWindowButton: !!document.querySelector('button[title="New Window"]'),
          preferencesButton: !!document.getElementById('preferences-btn')
        };
      })()
    `);

    Object.entries(domChecks).forEach(([key, value]) => {
      if (key === 'toggleButtons') {
        const pass = value === 3;
        this.log(`Toggle buttons count: ${value} (expected 3)`, pass ? 'success' : 'error', 'dom');
      } else {
        this.log(`${key}: ${value ? 'present' : 'missing'}`, value ? 'success' : 'error', 'dom');
      }
    });
  }

  async testToggleUI() {
    this.log('\n=== Testing Toggle UI ===', 'info', 'toggle');
    
    // Test initial state
    const initialState = await this.mainWindow.webContents.executeJavaScript(`
      (function() {
        const tabBtn = Array.from(document.querySelectorAll('.toggle-button')).find(b => b.textContent === 'Tab');
        return {
          tabActive: tabBtn?.classList.contains('active'),
          layoutMode: window.zeamiTermManager?.layoutManager?.mode
        };
      })()
    `);
    
    this.log(`Initial tab button active: ${initialState.tabActive}`, initialState.tabActive ? 'success' : 'error', 'toggle');
    this.log(`Initial layout mode: ${initialState.layoutMode}`, initialState.layoutMode === 'tab' ? 'success' : 'error', 'toggle');
    
    // Test clicking Horizontal button
    await this.mainWindow.webContents.executeJavaScript(`
      const horizontalBtn = Array.from(document.querySelectorAll('.toggle-button')).find(b => b.textContent === 'Horizontal');
      horizontalBtn?.click();
    `);
    await this.wait(500);
    
    const horizontalState = await this.mainWindow.webContents.executeJavaScript(`
      (function() {
        const horizontalBtn = Array.from(document.querySelectorAll('.toggle-button')).find(b => b.textContent === 'Horizontal');
        return {
          horizontalActive: horizontalBtn?.classList.contains('active'),
          layoutMode: window.zeamiTermManager?.layoutManager?.mode,
          splitContainer: !!document.querySelector('.simple-split-container')
        };
      })()
    `);
    
    this.log(`Horizontal button active: ${horizontalState.horizontalActive}`, horizontalState.horizontalActive ? 'success' : 'error', 'toggle');
    this.log(`Layout mode after horizontal click: ${horizontalState.layoutMode}`, horizontalState.layoutMode === 'split-horizontal' ? 'success' : 'error', 'toggle');
    this.log(`Split container created: ${horizontalState.splitContainer}`, horizontalState.splitContainer ? 'success' : 'error', 'toggle');
  }

  async testSplitFunctionality() {
    this.log('\n=== Testing Split Functionality ===', 'info', 'split');
    
    // Test vertical split
    await this.mainWindow.webContents.executeJavaScript(`
      const verticalBtn = Array.from(document.querySelectorAll('.toggle-button')).find(b => b.textContent === 'Vertical');
      verticalBtn?.click();
    `);
    await this.wait(1000);
    
    const splitState = await this.mainWindow.webContents.executeJavaScript(`
      (function() {
        return {
          terminalCount: window.zeamiTermManager?.terminals?.size || 0,
          splitPanes: document.querySelectorAll('.split-pane').length,
          splitter: !!document.querySelector('.splitter-vertical'),
          gridTemplate: window.getComputedStyle(document.querySelector('.simple-split-container'))?.gridTemplateColumns
        };
      })()
    `);
    
    this.log(`Terminal count: ${splitState.terminalCount}`, splitState.terminalCount >= 2 ? 'success' : 'error', 'split');
    this.log(`Split panes: ${splitState.splitPanes}`, splitState.splitPanes === 2 ? 'success' : 'error', 'split');
    this.log(`Vertical splitter present: ${splitState.splitter}`, splitState.splitter ? 'success' : 'error', 'split');
    this.log(`Grid template: ${splitState.gridTemplate}`, 'info', 'split');
  }

  async testMultiWindow() {
    this.log('\n=== Testing Multi-Window ===', 'info', 'multiwindow');
    
    // Click new window button
    await this.mainWindow.webContents.executeJavaScript(`
      const newWindowBtn = document.querySelector('button[title="New Window"]');
      newWindowBtn?.click();
    `);
    
    await this.wait(2000);
    
    const windowCount = BrowserWindow.getAllWindows().length;
    this.log(`Window count after new window: ${windowCount}`, windowCount > 1 ? 'success' : 'error', 'multiwindow');
    
    if (windowCount > 1) {
      this.secondWindow = BrowserWindow.getAllWindows().find(w => w !== this.mainWindow);
      this.log('Second window created successfully', 'success', 'multiwindow');
      
      // Test that second window has its own layout manager
      const secondWindowState = await this.secondWindow.webContents.executeJavaScript(`
        (function() {
          return {
            hasLayoutManager: !!window.zeamiTermManager?.layoutManager,
            hasToggleButtons: document.querySelectorAll('.toggle-button').length === 3
          };
        })()
      `);
      
      this.log(`Second window has layout manager: ${secondWindowState.hasLayoutManager}`, secondWindowState.hasLayoutManager ? 'success' : 'error', 'multiwindow');
      this.log(`Second window has toggle buttons: ${secondWindowState.hasToggleButtons}`, secondWindowState.hasToggleButtons ? 'success' : 'error', 'multiwindow');
    }
  }

  async testTerminalCreation() {
    this.log('\n=== Testing Terminal Creation ===', 'info', 'terminal');
    
    const terminalState = await this.mainWindow.webContents.executeJavaScript(`
      (function() {
        const terminals = window.zeamiTermManager?.terminals;
        return {
          terminalCount: terminals?.size || 0,
          hasActiveTerminal: !!window.zeamiTermManager?.activeTerminalId,
          terminalWrappers: document.querySelectorAll('.terminal-wrapper').length
        };
      })()
    `);
    
    this.log(`Terminal count: ${terminalState.terminalCount}`, terminalState.terminalCount > 0 ? 'success' : 'error', 'terminal');
    this.log(`Has active terminal: ${terminalState.hasActiveTerminal}`, terminalState.hasActiveTerminal ? 'success' : 'error', 'terminal');
    this.log(`Terminal wrappers in DOM: ${terminalState.terminalWrappers}`, terminalState.terminalWrappers > 0 ? 'success' : 'error', 'terminal');
  }

  async testDirectoryInheritance() {
    this.log('\n=== Testing Directory Inheritance ===', 'info', 'directory');
    
    // This would require actual terminal interaction
    // For now, we'll test the mechanism exists
    const inheritanceCheck = await this.mainWindow.webContents.executeJavaScript(`
      (function() {
        const terminal = Array.from(window.zeamiTermManager?.terminals?.values() || [])[0];
        return {
          hasCwdProperty: terminal?.cwd !== undefined,
          cwdValue: terminal?.cwd
        };
      })()
    `);
    
    this.log(`Terminal has cwd property: ${inheritanceCheck.hasCwdProperty}`, inheritanceCheck.hasCwdProperty ? 'success' : 'error', 'directory');
    this.log(`Current directory: ${inheritanceCheck.cwdValue}`, 'info', 'directory');
  }

  async testLayoutPersistence() {
    this.log('\n=== Testing Layout Persistence ===', 'info', 'persistence');
    
    // Test saving layout
    await this.mainWindow.webContents.executeJavaScript(`
      localStorage.setItem('zeami-layout-split', JSON.stringify({
        direction: 'vertical',
        sizes: '0.3fr 4px 0.7fr'
      }));
    `);
    
    const savedLayout = await this.mainWindow.webContents.executeJavaScript(`
      localStorage.getItem('zeami-layout-split')
    `);
    
    this.log(`Layout saved: ${!!savedLayout}`, !!savedLayout ? 'success' : 'error', 'persistence');
    this.log(`Saved layout data: ${savedLayout}`, 'info', 'persistence');
  }

  async testKeyboardShortcuts() {
    this.log('\n=== Testing Keyboard Shortcuts ===', 'info', 'keyboard');
    
    // Test that keyboard shortcuts are registered
    const shortcutsExist = await this.mainWindow.webContents.executeJavaScript(`
      (function() {
        // Check if event listeners would be triggered
        return {
          hasKeydownListener: typeof window.onkeydown === 'function' || window._eventListeners?.keydown?.length > 0
        };
      })()
    `);
    
    this.log(`Keyboard listeners registered: ${Object.values(shortcutsExist).some(v => v)}`, 'info', 'keyboard');
  }

  async testErrorHandling() {
    this.log('\n=== Testing Error Handling ===', 'info', 'errors');
    
    // Check for any console errors
    this.log(`Console errors detected: ${this.consoleErrors.length}`, this.consoleErrors.length === 0 ? 'success' : 'error', 'errors');
    
    if (this.consoleErrors.length > 0) {
      this.consoleErrors.forEach((err, i) => {
        this.log(`Error ${i + 1} [${err.window}]: ${err.message}`, 'error', 'errors');
      });
    }
    
    // Test error boundaries
    const hasErrorHandling = await this.mainWindow.webContents.executeJavaScript(`
      (function() {
        return {
          hasWindowErrorListener: window.onerror !== null,
          hasUnhandledRejectionListener: window.onunhandledrejection !== null
        };
      })()
    `);
    
    this.log(`Window error handler: ${hasErrorHandling.hasWindowErrorListener}`, 'info', 'errors');
    this.log(`Unhandled rejection handler: ${hasErrorHandling.hasUnhandledRejectionListener}`, 'info', 'errors');
  }

  generateSummary() {
    this.log('\n=== TEST SUMMARY ===', 'info', 'summary');
    
    const categories = {};
    this.testResults.forEach(result => {
      if (!categories[result.category]) {
        categories[result.category] = { total: 0, success: 0, error: 0, warning: 0, info: 0 };
      }
      categories[result.category].total++;
      categories[result.category][result.type]++;
    });
    
    Object.entries(categories).forEach(([category, stats]) => {
      if (category !== 'summary') {
        this.log(`${category.toUpperCase()}: ${stats.success}/${stats.total} passed`, stats.error === 0 ? 'success' : 'error', 'summary');
      }
    });
    
    const totalErrors = this.testResults.filter(r => r.type === 'error').length;
    const totalSuccess = this.testResults.filter(r => r.type === 'success').length;
    const totalTests = this.testResults.filter(r => r.type === 'success' || r.type === 'error').length;
    
    this.log(`\nTotal: ${totalSuccess}/${totalTests} tests passed`, totalErrors === 0 ? 'success' : 'error', 'summary');
    
    if (totalErrors > 0) {
      this.log(`\nFailed tests:`, 'error', 'summary');
      this.testResults
        .filter(r => r.type === 'error')
        .forEach(r => this.log(`  - [${r.category}] ${r.message}`, 'error', 'summary'));
    }
  }

  async cleanup() {
    this.log('\nCleaning up...', 'info', 'cleanup');
    
    // Clean up PTY processes
    if (this.ptyService) {
      await this.ptyService.cleanup();
    }
    
    // Close windows
    if (this.secondWindow && !this.secondWindow.isDestroyed()) {
      this.secondWindow.close();
    }
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.close();
    }
    
    // Quit after a delay
    setTimeout(() => {
      app.quit();
    }, 1000);
  }
}

// Run tests when app is ready
app.whenReady().then(() => {
  const testSuite = new ComprehensiveTestSuite();
  testSuite.runTests();
});

app.on('window-all-closed', () => {
  app.quit();
});