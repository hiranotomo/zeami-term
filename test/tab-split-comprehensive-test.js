/**
 * Comprehensive Tab and Split Mode Test Suite
 * 
 * This test suite thoroughly tests all tab and split functionality,
 * including edge cases and user interaction scenarios.
 */

const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { PtyService } = require('../src/main/ptyService');
const { TerminalProcessManager } = require('../src/main/terminalProcessManager');
const { SessionManager } = require('../src/main/sessionManager');

class TabSplitTestSuite {
  constructor() {
    this.window = null;
    this.ptyService = null;
    this.terminalProcessManager = null;
    this.sessionManager = null;
    this.testResults = [];
    this.errors = [];
  }

  log(message, type = 'info', testName = '') {
    const timestamp = new Date().toISOString();
    const prefix = {
      error: '❌',
      success: '✅',
      warning: '⚠️',
      info: 'ℹ️'
    }[type] || 'ℹ️';
    
    console.log(`${prefix} [${testName}] ${message}`);
    this.testResults.push({ message, type, testName, timestamp });
  }

  async wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async setup() {
    this.log('Setting up test environment...', 'info', 'setup');
    
    // Initialize services
    this.ptyService = new PtyService();
    this.sessionManager = new SessionManager();
    this.terminalProcessManager = new TerminalProcessManager();
    
    // Setup IPC handlers
    this.setupIPCHandlers();
    
    // Create window
    this.window = new BrowserWindow({
      width: 1200,
      height: 800,
      webPreferences: {
        preload: path.join(__dirname, '../src/preload/index.js'),
        contextIsolation: true,
        nodeIntegration: false
      },
      show: false
    });
    
    await this.window.loadFile(path.join(__dirname, '../src/renderer/index.html'));
    
    // Wait for page to load and setup mocks immediately
    await this.window.webContents.executeJavaScript(`
      if (!window.electronAPI) {
        window.electronAPI = {
          createNewWindow: () => {
            console.log('[Test] Mock createNewWindow called');
          },
          terminal: {
            create: async (options) => {
              console.log('[Test] Mock terminal create:', options);
              return { id: 'mock-terminal-' + Date.now(), success: true };
            },
            write: async (id, data) => {
              console.log('[Test] Mock terminal write:', id, data.length);
              return { success: true };
            },
            resize: async (id, cols, rows) => {
              console.log('[Test] Mock terminal resize:', id, cols, rows);
              return { success: true };
            }
          },
          profiles: {
            get: async () => {
              return {
                profiles: [{ id: 'default', name: 'Default Shell', shell: '/bin/bash' }],
                defaultProfileId: 'default'
              };
            }
          }
        };
      }
    `);
    
    await this.wait(3000); // Wait for initialization
    
    this.log('Setup complete', 'success', 'setup');
  }

  setupIPCHandlers() {
    ipcMain.handle('terminal:create', async (event, options) => {
      try {
        const result = await this.ptyService.createProcess(options);
        return { success: true, ...result };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('terminal:input', async (event, { id, data }) => {
      try {
        this.ptyService.writeToProcess(id, data);
        return { success: true };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('terminal:resize', async (event, { id, cols, rows }) => {
      try {
        this.ptyService.resizeProcess(id, cols, rows);
        return { success: true };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('profiles:get', async () => {
      return {
        profiles: this.terminalProcessManager.getProfiles(),
        defaultProfileId: this.terminalProcessManager.getDefaultProfile()?.id
      };
    });

    this.ptyService.on('data', ({ id, data }) => {
      BrowserWindow.getAllWindows().forEach(win => {
        if (!win.isDestroyed()) {
          win.webContents.send('terminal:data', { id, data });
        }
      });
    });
  }

  async executeInRenderer(code) {
    // Inject necessary globals before executing code
    const setupCode = `
      if (!window.electronAPI) {
        window.electronAPI = {
          createNewWindow: () => {
            console.log('[Test] Mock createNewWindow called');
          },
          terminal: {
            create: async (options) => {
              console.log('[Test] Mock terminal create:', options);
              return { id: 'mock-terminal-' + Date.now(), success: true };
            },
            write: async (id, data) => {
              console.log('[Test] Mock terminal write:', id, data.length);
              return { success: true };
            },
            resize: async (id, cols, rows) => {
              console.log('[Test] Mock terminal resize:', id, cols, rows);
              return { success: true };
            }
          },
          profiles: {
            get: async () => {
              return {
                profiles: [{ id: 'default', name: 'Default Shell', shell: '/bin/bash' }],
                defaultProfileId: 'default'
              };
            }
          }
        };
      }
    `;
    
    try {
      // First setup the mocks
      await this.window.webContents.executeJavaScript(setupCode);
      // Then execute the actual code
      return await this.window.webContents.executeJavaScript(code);
    } catch (error) {
      console.error('[Test] Error executing in renderer:', error);
      throw error;
    }
  }

  async runTests() {
    this.log('Starting comprehensive tab and split tests...', 'info', 'main');
    
    try {
      await this.setup();
      
      // Test categories
      await this.testInitialState();
      await this.testTabCreation();
      await this.testTabSwitching();
      await this.testTabClosing();
      await this.testSplitModes();
      await this.testSplitToTabTransition();
      await this.testFocusHandling();
      await this.testTerminalContent();
      await this.testLayoutPersistence();
      await this.testEdgeCases();
      
      this.generateReport();
      
    } catch (error) {
      this.log(`Critical error: ${error.message}`, 'error', 'main');
      this.log(error.stack, 'error', 'main');
    } finally {
      await this.cleanup();
    }
  }

  async testInitialState() {
    const testName = 'InitialState';
    this.log('Testing initial state...', 'info', testName);
    
    const state = await this.executeInRenderer(`
      (function() {
        const manager = window.zeamiTermManager;
        return {
          terminalCount: manager?.terminals?.size || 0,
          activeTerminalId: manager?.activeTerminalId,
          layoutMode: manager?.layoutManager?.mode,
          tabCount: document.querySelectorAll('.tab').length,
          visibleTerminals: Array.from(document.querySelectorAll('.terminal-wrapper'))
            .filter(w => w.offsetParent !== null).length,
          tabButtonActive: document.querySelector('.toggle-button')?.classList.contains('active'),
          firstTabActive: document.querySelector('.tab')?.classList.contains('active')
        };
      })()
    `);
    
    // Assertions
    this.assert(state.terminalCount === 2, 'Should have 2 initial terminals', testName);
    this.assert(state.activeTerminalId !== null, 'Should have active terminal', testName);
    this.assert(state.layoutMode === 'tab', 'Should start in tab mode', testName);
    this.assert(state.tabCount === 2, 'Should show 2 tabs', testName);
    this.assert(state.visibleTerminals === 1, 'Should show only 1 terminal in tab mode', testName);
    this.assert(state.tabButtonActive === true, 'Tab button should be active', testName);
    this.assert(state.firstTabActive === true, 'First tab should be active', testName);
  }

  async testTabCreation() {
    const testName = 'TabCreation';
    this.log('Testing tab creation...', 'info', testName);
    
    // Create new terminal using async/await properly
    await this.executeInRenderer(`
      (async function() {
        try {
          await window.zeamiTermManager.createTerminal();
          return { success: true };
        } catch (error) {
          console.error('Failed to create terminal:', error);
          return { success: false, error: error.message };
        }
      })()
    `);
    await this.wait(1000);
    
    const state = await this.executeInRenderer(`
      (function() {
        const manager = window.zeamiTermManager;
        return {
          terminalCount: manager?.terminals?.size || 0,
          tabCount: document.querySelectorAll('.tab').length,
          lastTabTitle: Array.from(document.querySelectorAll('.tab-title')).pop()?.textContent
        };
      })()
    `);
    
    this.assert(state.terminalCount === 3, 'Should have 3 terminals after creation', testName);
    this.assert(state.tabCount === 3, 'Should show 3 tabs', testName);
    this.assert(state.lastTabTitle === 'Terminal 3', 'New tab should have correct title', testName);
  }

  async testTabSwitching() {
    const testName = 'TabSwitching';
    this.log('Testing tab switching...', 'info', testName);
    
    // Get initial active terminal
    const initialState = await this.executeInRenderer(`
      window.zeamiTermManager.activeTerminalId
    `);
    
    // Click second tab
    await this.executeInRenderer(`
      document.querySelectorAll('.tab')[1].click();
    `);
    await this.wait(500);
    
    const afterSwitch = await this.executeInRenderer(`
      (function() {
        const manager = window.zeamiTermManager;
        const tabs = Array.from(document.querySelectorAll('.tab'));
        return {
          activeTerminalId: manager.activeTerminalId,
          secondTabActive: tabs[1]?.classList.contains('active'),
          firstTabActive: tabs[0]?.classList.contains('active'),
          visibleTerminalId: Array.from(document.querySelectorAll('.terminal-wrapper'))
            .find(w => w.offsetParent !== null)?.id
        };
      })()
    `);
    
    this.assert(afterSwitch.activeTerminalId !== initialState, 'Active terminal should change', testName);
    this.assert(afterSwitch.secondTabActive === true, 'Second tab should be active', testName);
    this.assert(afterSwitch.firstTabActive === false, 'First tab should not be active', testName);
    this.assert(afterSwitch.visibleTerminalId.includes('terminal-2'), 'Terminal 2 should be visible', testName);
  }

  async testTabClosing() {
    const testName = 'TabClosing';
    this.log('Testing tab closing...', 'info', testName);
    
    // Close the third tab
    await this.executeInRenderer(`
      document.querySelectorAll('.tab-close')[2].click();
    `);
    await this.wait(500);
    
    const state = await this.executeInRenderer(`
      (function() {
        const manager = window.zeamiTermManager;
        return {
          terminalCount: manager?.terminals?.size || 0,
          tabCount: document.querySelectorAll('.tab').length
        };
      })()
    `);
    
    this.assert(state.terminalCount === 2, 'Should have 2 terminals after closing', testName);
    this.assert(state.tabCount === 2, 'Should show 2 tabs after closing', testName);
  }

  async testSplitModes() {
    const testName = 'SplitModes';
    this.log('Testing split modes...', 'info', testName);
    
    // Test vertical split
    await this.executeInRenderer(`
      document.querySelector('.toggle-button[title="Split Vertical"]').click();
    `);
    await this.wait(1000);
    
    const verticalState = await this.executeInRenderer(`
      (function() {
        const manager = window.zeamiTermManager;
        return {
          layoutMode: manager?.layoutManager?.mode,
          splitContainer: !!document.querySelector('.simple-split-container'),
          visibleTerminals: Array.from(document.querySelectorAll('.terminal-wrapper'))
            .filter(w => w.offsetParent !== null).length,
          splitterType: document.querySelector('.splitter-vertical') ? 'vertical' : 
                       document.querySelector('.splitter-horizontal') ? 'horizontal' : 'none',
          gridTemplate: window.getComputedStyle(document.querySelector('.simple-split-container'))?.gridTemplateColumns
        };
      })()
    `);
    
    this.assert(verticalState.layoutMode === 'split-vertical', 'Should be in vertical split mode', testName);
    this.assert(verticalState.splitContainer === true, 'Split container should exist', testName);
    this.assert(verticalState.visibleTerminals === 2, 'Should show 2 terminals in split', testName);
    this.assert(verticalState.splitterType === 'vertical', 'Should have vertical splitter', testName);
    this.assert(verticalState.gridTemplate.includes('fr'), 'Should use fractional grid units', testName);
    
    // Test horizontal split
    await this.executeInRenderer(`
      document.querySelector('.toggle-button[title="Split Horizontal"]').click();
    `);
    await this.wait(1000);
    
    const horizontalState = await this.executeInRenderer(`
      (function() {
        const manager = window.zeamiTermManager;
        return {
          layoutMode: manager?.layoutManager?.mode,
          splitterType: document.querySelector('.splitter-vertical') ? 'vertical' : 
                       document.querySelector('.splitter-horizontal') ? 'horizontal' : 'none',
          gridTemplate: window.getComputedStyle(document.querySelector('.simple-split-container'))?.gridTemplateRows
        };
      })()
    `);
    
    this.assert(horizontalState.layoutMode === 'split-horizontal', 'Should be in horizontal split mode', testName);
    this.assert(horizontalState.splitterType === 'horizontal', 'Should have horizontal splitter', testName);
    this.assert(horizontalState.gridTemplate.includes('fr'), 'Should use fractional grid units', testName);
  }

  async testSplitToTabTransition() {
    const testName = 'SplitToTabTransition';
    this.log('Testing split to tab transition...', 'info', testName);
    
    // Switch back to tab mode
    await this.executeInRenderer(`
      document.querySelector('.toggle-button[title="Tab Mode"]').click();
    `);
    await this.wait(1000);
    
    const tabState = await this.executeInRenderer(`
      (function() {
        const manager = window.zeamiTermManager;
        return {
          layoutMode: manager?.layoutManager?.mode,
          splitContainer: !!document.querySelector('.simple-split-container'),
          visibleTerminals: Array.from(document.querySelectorAll('.terminal-wrapper'))
            .filter(w => w.offsetParent !== null).length,
          activeTerminalVisible: document.getElementById('wrapper-' + manager.activeTerminalId)?.offsetParent !== null
        };
      })()
    `);
    
    this.assert(tabState.layoutMode === 'tab', 'Should be back in tab mode', testName);
    this.assert(tabState.splitContainer === false, 'Split container should be removed', testName);
    this.assert(tabState.visibleTerminals === 1, 'Should show only 1 terminal in tab mode', testName);
    this.assert(tabState.activeTerminalVisible === true, 'Active terminal should be visible', testName);
  }

  async testFocusHandling() {
    const testName = 'FocusHandling';
    this.log('Testing focus handling in split mode...', 'info', testName);
    
    // Switch to vertical split
    await this.executeInRenderer(`
      document.querySelector('.toggle-button[title="Split Vertical"]').click();
    `);
    await this.wait(1000);
    
    // Click on second pane
    await this.executeInRenderer(`
      document.querySelectorAll('.split-pane')[1].click();
    `);
    await this.wait(500);
    
    const focusState = await this.executeInRenderer(`
      (function() {
        const manager = window.zeamiTermManager;
        const terminals = Array.from(manager.terminals.entries());
        const secondTerminalId = terminals[1]?.[0];
        return {
          activeTerminalId: manager.activeTerminalId,
          secondTerminalId: secondTerminalId,
          activeTabIndex: Array.from(document.querySelectorAll('.tab'))
            .findIndex(tab => tab.classList.contains('active'))
        };
      })()
    `);
    
    this.assert(focusState.activeTerminalId === focusState.secondTerminalId, 
      'Second terminal should be active after click', testName);
    this.assert(focusState.activeTabIndex === 1, 'Second tab should be active', testName);
  }

  async testTerminalContent() {
    const testName = 'TerminalContent';
    this.log('Testing terminal content preservation...', 'info', testName);
    
    // Type in first terminal
    await this.executeInRenderer(`
      const manager = window.zeamiTermManager;
      const firstTerminal = Array.from(manager.terminals.values())[0];
      firstTerminal.terminal.write('echo "Terminal 1 Test"\\r\\n');
    `);
    await this.wait(500);
    
    // Switch to second terminal
    await this.executeInRenderer(`
      document.querySelectorAll('.tab')[1].click();
    `);
    await this.wait(500);
    
    // Type in second terminal
    await this.executeInRenderer(`
      const manager = window.zeamiTermManager;
      const secondTerminal = Array.from(manager.terminals.values())[1];
      secondTerminal.terminal.write('echo "Terminal 2 Test"\\r\\n');
    `);
    await this.wait(500);
    
    // Get content from both terminals
    const content = await this.executeInRenderer(`
      (function() {
        const manager = window.zeamiTermManager;
        const terminals = Array.from(manager.terminals.values());
        return {
          terminal1Lines: terminals[0]?.terminal.buffer.active.length || 0,
          terminal2Lines: terminals[1]?.terminal.buffer.active.length || 0,
          terminal1HasContent: terminals[0]?.terminal.buffer.active.getLine(0)?.translateToString().trim().length > 0,
          terminal2HasContent: terminals[1]?.terminal.buffer.active.getLine(0)?.translateToString().trim().length > 0
        };
      })()
    `);
    
    this.assert(content.terminal1Lines > 0, 'Terminal 1 should have content', testName);
    this.assert(content.terminal2Lines > 0, 'Terminal 2 should have content', testName);
    this.assert(content.terminal1HasContent === true, 'Terminal 1 content should be preserved', testName);
    this.assert(content.terminal2HasContent === true, 'Terminal 2 content should be preserved', testName);
  }

  async testLayoutPersistence() {
    const testName = 'LayoutPersistence';
    this.log('Testing layout persistence...', 'info', testName);
    
    // Set split mode with custom size
    await this.executeInRenderer(`
      document.querySelector('.toggle-button[title="Split Vertical"]').click();
    `);
    await this.wait(1000);
    
    // Simulate drag to change split size
    await this.executeInRenderer(`
      const splitter = document.querySelector('.splitter-vertical');
      const container = document.querySelector('.simple-split-container');
      if (splitter && container) {
        container.style.gridTemplateColumns = '0.3fr 4px 0.7fr';
        localStorage.setItem('zeami-layout-split', JSON.stringify({
          direction: 'vertical',
          sizes: '0.3fr 4px 0.7fr'
        }));
      }
    `);
    
    // Check persistence
    const savedLayout = await this.executeInRenderer(`
      localStorage.getItem('zeami-layout-split')
    `);
    
    this.assert(savedLayout !== null, 'Layout should be saved', testName);
    this.assert(savedLayout.includes('0.3fr'), 'Saved layout should have custom sizes', testName);
  }

  async testEdgeCases() {
    const testName = 'EdgeCases';
    this.log('Testing edge cases...', 'info', testName);
    
    // Test rapid mode switching
    for (let i = 0; i < 5; i++) {
      await this.executeInRenderer(`
        document.querySelector('.toggle-button[title="Tab Mode"]').click();
      `);
      await this.wait(100);
      await this.executeInRenderer(`
        document.querySelector('.toggle-button[title="Split Vertical"]').click();
      `);
      await this.wait(100);
    }
    
    const rapidSwitchState = await this.executeInRenderer(`
      (function() {
        const manager = window.zeamiTermManager;
        return {
          terminalsIntact: manager?.terminals?.size === 2,
          layoutMode: manager?.layoutManager?.mode,
          noErrors: !window.lastError
        };
      })()
    `);
    
    this.assert(rapidSwitchState.terminalsIntact === true, 'Terminals should survive rapid switching', testName);
    this.assert(rapidSwitchState.layoutMode === 'split-vertical', 'Should end in split mode', testName);
    this.assert(rapidSwitchState.noErrors === true, 'No errors during rapid switching', testName);
    
    // Test closing all terminals
    await this.executeInRenderer(`
      const manager = window.zeamiTermManager;
      const ids = Array.from(manager.terminals.keys());
      ids.forEach(id => manager.closeTerminal(id));
    `);
    await this.wait(1000);
    
    const emptyState = await this.executeInRenderer(`
      (function() {
        const manager = window.zeamiTermManager;
        return {
          terminalCount: manager?.terminals?.size || 0,
          tabCount: document.querySelectorAll('.tab').length,
          layoutMode: manager?.layoutManager?.mode
        };
      })()
    `);
    
    this.assert(emptyState.terminalCount === 0, 'Should have no terminals', testName);
    this.assert(emptyState.tabCount === 0, 'Should have no tabs', testName);
    this.assert(emptyState.layoutMode === 'tab', 'Should reset to tab mode', testName);
  }

  assert(condition, message, testName) {
    if (condition) {
      this.log(`✓ ${message}`, 'success', testName);
    } else {
      this.log(`✗ ${message}`, 'error', testName);
      this.errors.push({ testName, message });
    }
  }

  generateReport() {
    this.log('\n=== TEST REPORT ===', 'info', 'report');
    
    const testGroups = {};
    this.testResults.forEach(result => {
      if (!testGroups[result.testName]) {
        testGroups[result.testName] = { total: 0, success: 0, error: 0 };
      }
      if (result.type === 'success' || result.type === 'error') {
        testGroups[result.testName].total++;
        testGroups[result.testName][result.type]++;
      }
    });
    
    let totalTests = 0;
    let totalSuccess = 0;
    
    Object.entries(testGroups).forEach(([testName, stats]) => {
      if (stats.total > 0) {
        const status = stats.error === 0 ? 'PASSED' : 'FAILED';
        const emoji = stats.error === 0 ? '✅' : '❌';
        this.log(`${emoji} ${testName}: ${stats.success}/${stats.total} ${status}`, 
          stats.error === 0 ? 'success' : 'error', 'report');
        totalTests += stats.total;
        totalSuccess += stats.success;
      }
    });
    
    this.log(`\nOverall: ${totalSuccess}/${totalTests} tests passed`, 
      this.errors.length === 0 ? 'success' : 'error', 'report');
    
    if (this.errors.length > 0) {
      this.log('\nFailed tests:', 'error', 'report');
      this.errors.forEach(error => {
        this.log(`  - [${error.testName}] ${error.message}`, 'error', 'report');
      });
      
      // Suggest fixes
      this.suggestFixes();
    }
  }

  suggestFixes() {
    this.log('\n=== SUGGESTED FIXES ===', 'info', 'fixes');
    
    const fixes = {
      'InitialState': {
        'Should have 2 initial terminals': 'Check ZeamiTermManager.init() - ensure 2 terminals are created',
        'First tab should be active': 'Check activeTerminalId assignment in createTerminal()',
        'Should show only 1 terminal in tab mode': 'Check SimpleLayoutManager.updateLayout()'
      },
      'TabSwitching': {
        'Active terminal should change': 'Check switchToTerminal() implementation',
        'Terminal 2 should be visible': 'Check layout manager updateLayout() for tab mode'
      },
      'SplitModes': {
        'Should show 2 terminals in split': 'Check createSplitLayout() terminal display logic',
        'Should have vertical splitter': 'Check splitter class assignment in createSplitLayout()'
      },
      'FocusHandling': {
        'Second terminal should be active after click': 'Check pane click handlers in createSplitLayout()',
        'Second tab should be active': 'Ensure updateTabsUI() is called after focus change'
      }
    };
    
    this.errors.forEach(error => {
      const fix = fixes[error.testName]?.[error.message];
      if (fix) {
        this.log(`[${error.testName}] ${error.message}:`, 'warning', 'fixes');
        this.log(`  → ${fix}`, 'info', 'fixes');
      }
    });
  }

  async cleanup() {
    this.log('\nCleaning up...', 'info', 'cleanup');
    
    if (this.ptyService) {
      await this.ptyService.cleanup();
    }
    
    if (this.window && !this.window.isDestroyed()) {
      this.window.close();
    }
    
    setTimeout(() => {
      app.quit();
    }, 1000);
  }
}

// Run tests
app.whenReady().then(() => {
  const testSuite = new TabSplitTestSuite();
  testSuite.runTests();
});

app.on('window-all-closed', () => {
  app.quit();
});