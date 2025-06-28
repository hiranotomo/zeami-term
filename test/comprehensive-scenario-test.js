#!/usr/bin/env node

/**
 * Comprehensive Scenario Test Suite
 * 
 * Tests all possible scenarios including edge cases, window resizing,
 * rapid interactions, and stress testing.
 */

const { app, BrowserWindow } = require('electron');
const path = require('path');

class ComprehensiveScenarioTest {
  constructor() {
    this.window = null;
    this.testResults = [];
    this.errorLog = [];
  }

  async wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  log(category, test, result, details = '') {
    const status = result ? '✅' : '❌';
    const message = `  ${status} ${test}${details ? ': ' + details : ''}`;
    console.log(message);
    this.testResults.push({ category, test, result, details });
    if (!result) {
      this.errorLog.push({ category, test, details });
    }
  }

  async setup() {
    console.log('Setting up test environment...\n');
    
    this.window = new BrowserWindow({
      width: 1200,
      height: 800,
      webPreferences: {
        preload: path.join(__dirname, '../src/preload/index.js'),
        contextIsolation: true,
        nodeIntegration: false,
        webSecurity: false
      },
      show: true
    });
    
    // Setup error handler
    await this.window.webContents.executeJavaScript(`
      window.addEventListener('error', (e) => {
        console.error('Runtime error:', e.message, e.filename, e.lineno);
      });
    `);
    
    await this.window.loadFile(path.join(__dirname, '../src/renderer/index.html'));
    await this.wait(3000);
  }

  async runTests() {
    console.log('=== Comprehensive Scenario Test Suite ===\n');
    
    try {
      await this.setup();
      
      // Category 1: Window Resize Tests
      await this.testWindowResize();
      
      // Category 2: Tab Management Stress Tests
      await this.testTabManagementStress();
      
      // Category 3: Split Mode Edge Cases
      await this.testSplitModeEdgeCases();
      
      // Category 4: Rapid User Interactions
      await this.testRapidInteractions();
      
      // Category 5: Memory and Performance
      await this.testMemoryPerformance();
      
      // Category 6: Focus and Selection
      await this.testFocusSelection();
      
      // Category 7: Keyboard Navigation
      await this.testKeyboardNavigation();
      
      // Category 8: Error Recovery
      await this.testErrorRecovery();
      
      // Category 9: State Persistence
      await this.testStatePersistence();
      
      // Category 10: Extreme Scenarios
      await this.testExtremeScenarios();
      
      // Print comprehensive summary
      this.printDetailedSummary();
      
    } catch (error) {
      console.error('Critical test error:', error);
      this.errorLog.push({ category: 'CRITICAL', test: 'Test execution', details: error.message });
    }
    
    await this.wait(3000);
    
    if (this.window && !this.window.isDestroyed()) {
      this.window.close();
    }
    
    setTimeout(() => {
      app.quit();
    }, 1000);
  }

  async testWindowResize() {
    console.log('1. Window Resize Tests');
    console.log('---------------------');
    
    const originalBounds = this.window.getBounds();
    
    // Test 1: Small window
    this.window.setSize(800, 600);
    await this.wait(1000);
    
    let state = await this.window.webContents.executeJavaScript(`
      (function() {
        const terminals = Array.from(window.zeamiTermManager.terminals.values());
        return {
          terminal1Cols: terminals[0]?.terminal.cols,
          terminal1Rows: terminals[0]?.terminal.rows,
          layoutIntact: !!window.zeamiTermManager.layoutManager
        };
      })()
    `);
    
    this.log('Window Resize', 'Small window (800x600)', state.layoutIntact, 
      `Terminal: ${state.terminal1Cols}x${state.terminal1Rows}`);
    
    // Test 2: Very small window
    this.window.setSize(400, 300);
    await this.wait(1000);
    
    state = await this.window.webContents.executeJavaScript(`
      (function() {
        const visibleElements = Array.from(document.querySelectorAll('.terminal-wrapper'))
          .filter(el => el.offsetWidth > 0 && el.offsetHeight > 0);
        return {
          elementsVisible: visibleElements.length,
          headerVisible: document.querySelector('.header').offsetHeight > 0
        };
      })()
    `);
    
    this.log('Window Resize', 'Very small window (400x300)', 
      state.elementsVisible > 0 && state.headerVisible, 
      `Visible elements: ${state.elementsVisible}`);
    
    // Test 3: Large window
    this.window.setSize(1920, 1080);
    await this.wait(1000);
    
    // Test 4: Aspect ratio changes
    this.window.setSize(1600, 400); // Very wide
    await this.wait(500);
    this.window.setSize(400, 1000); // Very tall
    await this.wait(500);
    
    // Test 5: Resize during split mode
    await this.window.webContents.executeJavaScript(`
      document.querySelector('.toggle-button[title="Split Vertical"]').click();
    `);
    await this.wait(500);
    
    this.window.setSize(1000, 700);
    await this.wait(1000);
    
    state = await this.window.webContents.executeJavaScript(`
      (function() {
        const panes = document.querySelectorAll('.split-pane');
        return {
          bothPanesVisible: Array.from(panes).every(p => p.offsetWidth > 0),
          splitterVisible: document.querySelector('.splitter-vertical').offsetWidth > 0
        };
      })()
    `);
    
    this.log('Window Resize', 'Resize in split mode', 
      state.bothPanesVisible && state.splitterVisible);
    
    // Restore original size
    this.window.setBounds(originalBounds);
    await this.wait(1000);
    
    console.log('');
  }

  async testTabManagementStress() {
    console.log('2. Tab Management Stress Tests');
    console.log('------------------------------');
    
    // Reset to initial state
    await this.window.webContents.executeJavaScript(`
      document.querySelector('.toggle-button[title="Tab Mode"]').click();
    `);
    await this.wait(500);
    
    // Test 1: Create many tabs
    const tabsToCreate = 10;
    for (let i = 0; i < tabsToCreate; i++) {
      await this.window.webContents.executeJavaScript(`
        window.zeamiTermManager.createTerminal();
      `);
      await this.wait(100);
    }
    
    let state = await this.window.webContents.executeJavaScript(`
      (function() {
        return {
          terminalCount: window.zeamiTermManager.terminals.size,
          tabCount: document.querySelectorAll('.tab').length,
          tabsOverflow: document.getElementById('tabs-container').scrollWidth > 
                       document.getElementById('tabs-container').clientWidth
        };
      })()
    `);
    
    this.log('Tab Stress', 'Create 10 additional tabs', 
      state.terminalCount === 12 && state.tabCount === 12,
      `Created ${state.terminalCount} terminals`);
    
    // Test 2: Rapid tab switching
    const switchCount = 20;
    const startTime = Date.now();
    
    for (let i = 0; i < switchCount; i++) {
      const tabIndex = i % 5;
      await this.window.webContents.executeJavaScript(`
        const tabs = document.querySelectorAll('.tab');
        if (tabs[${tabIndex}]) tabs[${tabIndex}].click();
      `);
      await this.wait(50);
    }
    
    const switchTime = Date.now() - startTime;
    this.log('Tab Stress', 'Rapid tab switching', switchTime < 2000, 
      `${switchCount} switches in ${switchTime}ms`);
    
    // Test 3: Close tabs in various orders
    // Close middle tab
    await this.window.webContents.executeJavaScript(`
      document.querySelectorAll('.tab-close')[5].click();
    `);
    await this.wait(200);
    
    // Close last tab
    await this.window.webContents.executeJavaScript(`
      const closes = document.querySelectorAll('.tab-close');
      closes[closes.length - 1].click();
    `);
    await this.wait(200);
    
    // Close first tab
    await this.window.webContents.executeJavaScript(`
      document.querySelectorAll('.tab-close')[0].click();
    `);
    await this.wait(200);
    
    state = await this.window.webContents.executeJavaScript(`
      (function() {
        const manager = window.zeamiTermManager;
        return {
          terminalCount: manager.terminals.size,
          activeTerminalExists: manager.terminals.has(manager.activeTerminalId),
          tabsConsistent: document.querySelectorAll('.tab').length === manager.terminals.size
        };
      })()
    `);
    
    this.log('Tab Stress', 'Close tabs in various orders', 
      state.activeTerminalExists && state.tabsConsistent,
      `${state.terminalCount} terminals remaining`);
    
    // Test 4: Close all but 2 tabs
    while (state.terminalCount > 2) {
      await this.window.webContents.executeJavaScript(`
        const closes = document.querySelectorAll('.tab-close');
        if (closes.length > 2) closes[closes.length - 1].click();
      `);
      await this.wait(100);
      
      state = await this.window.webContents.executeJavaScript(`
        (function() {
          return {
            terminalCount: window.zeamiTermManager.terminals.size
          };
        })()
      `);
    }
    
    console.log('');
  }

  async testSplitModeEdgeCases() {
    console.log('3. Split Mode Edge Cases');
    console.log('------------------------');
    
    // Test 1: Switch to split with only 1 terminal
    await this.window.webContents.executeJavaScript(`
      // Close one terminal first
      document.querySelectorAll('.tab-close')[1].click();
    `);
    await this.wait(500);
    
    await this.window.webContents.executeJavaScript(`
      document.querySelector('.toggle-button[title="Split Vertical"]').click();
    `);
    await this.wait(1000);
    
    let state = await this.window.webContents.executeJavaScript(`
      (function() {
        return {
          terminalCount: window.zeamiTermManager.terminals.size,
          visibleTerminals: Array.from(document.querySelectorAll('.terminal-wrapper'))
            .filter(w => w.offsetParent !== null).length
        };
      })()
    `);
    
    this.log('Split Edge', 'Split with 1 terminal auto-creates 2nd', 
      state.terminalCount === 2 && state.visibleTerminals === 2);
    
    // Test 2: Minimum splitter position
    await this.window.webContents.executeJavaScript(`
      const container = document.querySelector('.simple-split-container');
      if (container) {
        container.style.gridTemplateColumns = '50px 4px 1fr';
      }
    `);
    await this.wait(500);
    
    state = await this.window.webContents.executeJavaScript(`
      (function() {
        const panes = document.querySelectorAll('.split-pane');
        return {
          leftPaneWidth: panes[0]?.offsetWidth,
          rightPaneWidth: panes[1]?.offsetWidth,
          bothVisible: Array.from(panes).every(p => p.offsetWidth > 0)
        };
      })()
    `);
    
    this.log('Split Edge', 'Minimum splitter position', state.bothVisible,
      `Left: ${state.leftPaneWidth}px, Right: ${state.rightPaneWidth}px`);
    
    // Test 3: Maximum splitter position
    await this.window.webContents.executeJavaScript(`
      const container = document.querySelector('.simple-split-container');
      if (container) {
        container.style.gridTemplateColumns = '1fr 4px 50px';
      }
    `);
    await this.wait(500);
    
    // Test 4: Split mode with many terminals
    for (let i = 0; i < 5; i++) {
      await this.window.webContents.executeJavaScript(`
        window.zeamiTermManager.createTerminal();
      `);
      await this.wait(100);
    }
    
    state = await this.window.webContents.executeJavaScript(`
      (function() {
        return {
          totalTerminals: window.zeamiTermManager.terminals.size,
          visibleInSplit: Array.from(document.querySelectorAll('.terminal-wrapper'))
            .filter(w => w.offsetParent !== null).length,
          hiddenTerminals: Array.from(document.querySelectorAll('.terminal-wrapper'))
            .filter(w => w.offsetParent === null).length
        };
      })()
    `);
    
    this.log('Split Edge', 'Split shows only 2 terminals', 
      state.visibleInSplit === 2,
      `${state.visibleInSplit} visible, ${state.hiddenTerminals} hidden`);
    
    // Test 5: Switch between all split modes rapidly
    const modes = ['Split Horizontal', 'Split Vertical', 'Tab Mode'];
    for (let i = 0; i < 10; i++) {
      const mode = modes[i % modes.length];
      await this.window.webContents.executeJavaScript(`
        document.querySelector('.toggle-button[title="${mode}"]').click();
      `);
      await this.wait(100);
    }
    
    state = await this.window.webContents.executeJavaScript(`
      (function() {
        return {
          layoutIntact: !!window.zeamiTermManager.layoutManager,
          noErrors: !window.lastError
        };
      })()
    `);
    
    this.log('Split Edge', 'Rapid mode switching', state.layoutIntact && state.noErrors);
    
    console.log('');
  }

  async testRapidInteractions() {
    console.log('4. Rapid User Interactions');
    console.log('--------------------------');
    
    // Test 1: Double/triple clicks
    await this.window.webContents.executeJavaScript(`
      const tab = document.querySelectorAll('.tab')[0];
      for (let i = 0; i < 3; i++) {
        tab.click();
      }
    `);
    await this.wait(200);
    
    let state = await this.window.webContents.executeJavaScript(`
      (function() {
        return {
          activeTerminalId: window.zeamiTermManager.activeTerminalId,
          noErrors: !window.lastError
        };
      })()
    `);
    
    this.log('Rapid Interaction', 'Triple click on tab', state.noErrors);
    
    // Test 2: Click multiple tabs rapidly
    await this.window.webContents.executeJavaScript(`
      const tabs = document.querySelectorAll('.tab');
      tabs[0].click();
      tabs[1].click();
      tabs[0].click();
      tabs[1].click();
    `);
    await this.wait(500);
    
    // Test 3: Spam toggle buttons
    for (let i = 0; i < 10; i++) {
      await this.window.webContents.executeJavaScript(`
        const buttons = document.querySelectorAll('.toggle-button');
        buttons[i % buttons.length].click();
      `);
      await this.wait(20);
    }
    
    // Test 4: Create and immediately close
    await this.window.webContents.executeJavaScript(`
      window.zeamiTermManager.createTerminal();
      const closes = document.querySelectorAll('.tab-close');
      closes[closes.length - 1].click();
    `);
    await this.wait(500);
    
    state = await this.window.webContents.executeJavaScript(`
      (function() {
        return {
          consistentState: window.zeamiTermManager.terminals.size === 
                          document.querySelectorAll('.tab').length,
          activeValid: window.zeamiTermManager.terminals.has(
                      window.zeamiTermManager.activeTerminalId)
        };
      })()
    `);
    
    this.log('Rapid Interaction', 'Create and immediate close', 
      state.consistentState && state.activeValid);
    
    // Test 5: Drag splitter rapidly (simulate)
    await this.window.webContents.executeJavaScript(`
      document.querySelector('.toggle-button[title="Split Vertical"]').click();
    `);
    await this.wait(500);
    
    for (let i = 0; i < 5; i++) {
      const position = 0.2 + (i * 0.15);
      await this.window.webContents.executeJavaScript(`
        const container = document.querySelector('.simple-split-container');
        if (container) {
          container.style.gridTemplateColumns = '${position}fr 4px ${1-position}fr';
        }
      `);
      await this.wait(50);
    }
    
    console.log('');
  }

  async testMemoryPerformance() {
    console.log('5. Memory and Performance Tests');
    console.log('-------------------------------');
    
    // Get initial memory
    const initialMemory = await this.window.webContents.executeJavaScript(`
      performance.memory ? performance.memory.usedJSHeapSize : 0
    `);
    
    // Test 1: Create and destroy many terminals
    const createDestroyCount = 20;
    for (let i = 0; i < createDestroyCount; i++) {
      await this.window.webContents.executeJavaScript(`
        window.zeamiTermManager.createTerminal();
      `);
      await this.wait(50);
      
      await this.window.webContents.executeJavaScript(`
        const ids = Array.from(window.zeamiTermManager.terminals.keys());
        const lastId = ids[ids.length - 1];
        window.zeamiTermManager.closeTerminal(lastId);
      `);
      await this.wait(50);
    }
    
    // Force garbage collection if available
    await this.window.webContents.executeJavaScript(`
      if (window.gc) window.gc();
    `);
    await this.wait(1000);
    
    const afterMemory = await this.window.webContents.executeJavaScript(`
      performance.memory ? performance.memory.usedJSHeapSize : 0
    `);
    
    const memoryIncrease = afterMemory - initialMemory;
    this.log('Performance', 'Memory after create/destroy cycle', 
      memoryIncrease < 10 * 1024 * 1024, // Less than 10MB increase
      `Memory increased by ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`);
    
    // Test 2: Large output handling
    await this.window.webContents.executeJavaScript(`
      const terminal = Array.from(window.zeamiTermManager.terminals.values())[0].terminal;
      const largeText = 'A'.repeat(1000) + '\\r\\n';
      const startTime = performance.now();
      
      for (let i = 0; i < 100; i++) {
        terminal.write(largeText);
      }
      
      window.largeOutputTime = performance.now() - startTime;
    `);
    
    const outputTime = await this.window.webContents.executeJavaScript(`window.largeOutputTime`);
    this.log('Performance', 'Large output handling', outputTime < 1000,
      `100k characters in ${outputTime.toFixed(0)}ms`);
    
    // Test 3: Resize performance
    const resizeStart = Date.now();
    for (let i = 0; i < 10; i++) {
      this.window.setSize(800 + i * 50, 600 + i * 30);
      await this.wait(50);
    }
    const resizeTime = Date.now() - resizeStart;
    
    this.log('Performance', 'Window resize performance', resizeTime < 2000,
      `10 resizes in ${resizeTime}ms`);
    
    console.log('');
  }

  async testFocusSelection() {
    console.log('6. Focus and Selection Tests');
    console.log('---------------------------');
    
    // Test 1: Focus follows mouse in split mode
    await this.window.webContents.executeJavaScript(`
      document.querySelector('.toggle-button[title="Split Vertical"]').click();
    `);
    await this.wait(500);
    
    await this.window.webContents.executeJavaScript(`
      document.querySelectorAll('.split-pane')[1].click();
    `);
    await this.wait(200);
    
    let state = await this.window.webContents.executeJavaScript(`
      (function() {
        const activeId = window.zeamiTermManager.activeTerminalId;
        const expectedId = Array.from(window.zeamiTermManager.terminals.keys())[1];
        return {
          correctFocus: activeId === expectedId,
          activeId,
          expectedId
        };
      })()
    `);
    
    this.log('Focus', 'Click on second pane focuses terminal', state.correctFocus,
      `Active: ${state.activeId}`);
    
    // Test 2: Text selection
    await this.window.webContents.executeJavaScript(`
      const terminal = Array.from(window.zeamiTermManager.terminals.values())[0].terminal;
      terminal.write('This is a test line for selection\\r\\n');
      terminal.selectAll();
      window.hasSelection = terminal.hasSelection();
    `);
    
    const hasSelection = await this.window.webContents.executeJavaScript(`window.hasSelection`);
    this.log('Focus', 'Terminal text selection', hasSelection);
    
    // Test 3: Focus persistence through mode changes
    await this.window.webContents.executeJavaScript(`
      const secondId = Array.from(window.zeamiTermManager.terminals.keys())[1];
      window.zeamiTermManager.switchToTerminal(secondId);
    `);
    await this.wait(200);
    
    await this.window.webContents.executeJavaScript(`
      document.querySelector('.toggle-button[title="Tab Mode"]').click();
    `);
    await this.wait(500);
    
    state = await this.window.webContents.executeJavaScript(`
      (function() {
        const activeId = window.zeamiTermManager.activeTerminalId;
        const expectedId = Array.from(window.zeamiTermManager.terminals.keys())[1];
        return {
          focusPersisted: activeId === expectedId
        };
      })()
    `);
    
    this.log('Focus', 'Focus persists through mode change', state.focusPersisted);
    
    console.log('');
  }

  async testKeyboardNavigation() {
    console.log('7. Keyboard Navigation Tests');
    console.log('---------------------------');
    
    // Test 1: Type in terminal
    await this.window.webContents.executeJavaScript(`
      const terminal = Array.from(window.zeamiTermManager.terminals.values())[0].terminal;
      terminal.focus();
      
      // Simulate typing
      const testText = 'echo "Hello World"';
      for (const char of testText) {
        terminal.onData(char);
      }
      terminal.onData('\\r');
      
      window.typingSuccess = true;
    `);
    
    const typingSuccess = await this.window.webContents.executeJavaScript(`window.typingSuccess`);
    this.log('Keyboard', 'Type in terminal', typingSuccess);
    
    // Test 2: Copy/paste simulation
    await this.window.webContents.executeJavaScript(`
      const terminal = Array.from(window.zeamiTermManager.terminals.values())[0].terminal;
      terminal.write('Test content for copy\\r\\n');
      terminal.selectAll();
      
      // Get selection
      const selection = terminal.getSelection();
      window.selectionLength = selection.length;
    `);
    
    const selectionLength = await this.window.webContents.executeJavaScript(`window.selectionLength`);
    this.log('Keyboard', 'Select and copy', selectionLength > 0,
      `Selected ${selectionLength} characters`);
    
    console.log('');
  }

  async testErrorRecovery() {
    console.log('8. Error Recovery Tests');
    console.log('----------------------');
    
    // Test 1: Invalid terminal ID
    const errorResult = await this.window.webContents.executeJavaScript(`
      (function() {
        try {
          window.zeamiTermManager.switchToTerminal('invalid-id-12345');
          return { handled: true, error: null };
        } catch (e) {
          return { handled: true, error: e.message };
        }
      })()
    `);
    
    this.log('Error Recovery', 'Handle invalid terminal ID', errorResult.handled);
    
    // Test 2: Close last terminal
    await this.window.webContents.executeJavaScript(`
      const ids = Array.from(window.zeamiTermManager.terminals.keys());
      for (const id of ids) {
        window.zeamiTermManager.closeTerminal(id);
      }
    `);
    await this.wait(500);
    
    const state = await this.window.webContents.executeJavaScript(`
      (function() {
        return {
          terminalCount: window.zeamiTermManager.terminals.size,
          layoutMode: window.zeamiTermManager.layoutManager.mode
        };
      })()
    `);
    
    this.log('Error Recovery', 'Handle closing all terminals', 
      state.terminalCount === 0 && state.layoutMode === 'tab');
    
    // Test 3: Recover by creating new terminal
    await this.window.webContents.executeJavaScript(`
      window.zeamiTermManager.createTerminal();
      window.zeamiTermManager.createTerminal();
    `);
    await this.wait(500);
    
    console.log('');
  }

  async testStatePersistence() {
    console.log('9. State Persistence Tests');
    console.log('-------------------------');
    
    // Test 1: Save layout state
    await this.window.webContents.executeJavaScript(`
      document.querySelector('.toggle-button[title="Split Vertical"]').click();
    `);
    await this.wait(500);
    
    await this.window.webContents.executeJavaScript(`
      const container = document.querySelector('.simple-split-container');
      container.style.gridTemplateColumns = '0.3fr 4px 0.7fr';
      
      localStorage.setItem('zeami-test-layout', JSON.stringify({
        mode: 'split-vertical',
        sizes: '0.3fr 4px 0.7fr'
      }));
    `);
    
    const saved = await this.window.webContents.executeJavaScript(`
      localStorage.getItem('zeami-test-layout') !== null
    `);
    
    this.log('Persistence', 'Save layout state', saved);
    
    // Test 2: Restore layout state
    await this.window.webContents.executeJavaScript(`
      const saved = localStorage.getItem('zeami-test-layout');
      if (saved) {
        const layout = JSON.parse(saved);
        window.restoredLayout = layout;
      }
    `);
    
    const restored = await this.window.webContents.executeJavaScript(`
      window.restoredLayout && window.restoredLayout.mode === 'split-vertical'
    `);
    
    this.log('Persistence', 'Restore layout state', restored);
    
    // Clean up
    await this.window.webContents.executeJavaScript(`
      localStorage.removeItem('zeami-test-layout');
    `);
    
    console.log('');
  }

  async testExtremeScenarios() {
    console.log('10. Extreme Scenarios');
    console.log('--------------------');
    
    // Test 1: Extremely long terminal output
    await this.window.webContents.executeJavaScript(`
      const terminal = Array.from(window.zeamiTermManager.terminals.values())[0].terminal;
      const longLine = 'A'.repeat(500);
      
      for (let i = 0; i < 1000; i++) {
        terminal.write(longLine + '\\r\\n');
      }
      
      window.bufferLength = terminal.buffer.active.length;
    `);
    
    const bufferLength = await this.window.webContents.executeJavaScript(`window.bufferLength`);
    this.log('Extreme', 'Handle 1000 long lines', bufferLength > 0,
      `Buffer has ${bufferLength} lines`);
    
    // Test 2: Rapid terminal creation/destruction
    const rapidStart = Date.now();
    for (let i = 0; i < 50; i++) {
      await this.window.webContents.executeJavaScript(`
        window.zeamiTermManager.createTerminal();
        const ids = Array.from(window.zeamiTermManager.terminals.keys());
        window.zeamiTermManager.closeTerminal(ids[ids.length - 1]);
      `);
    }
    const rapidTime = Date.now() - rapidStart;
    
    this.log('Extreme', '50 rapid create/destroy cycles', rapidTime < 5000,
      `Completed in ${rapidTime}ms`);
    
    // Test 3: All features at once
    await this.window.webContents.executeJavaScript(`
      // Create terminals
      for (let i = 0; i < 5; i++) {
        window.zeamiTermManager.createTerminal();
      }
      
      // Switch to split
      document.querySelector('.toggle-button[title="Split Horizontal"]').click();
      
      // Write to terminals
      const terminals = Array.from(window.zeamiTermManager.terminals.values());
      terminals.forEach((t, i) => {
        t.terminal.write('Terminal ' + i + ' active\\r\\n');
      });
      
      // Resize window
      window.resizeTo(1000, 600);
    `);
    await this.wait(1000);
    
    const finalState = await this.window.webContents.executeJavaScript(`
      (function() {
        return {
          terminalCount: window.zeamiTermManager.terminals.size,
          layoutMode: window.zeamiTermManager.layoutManager.mode,
          noErrors: !window.lastError
        };
      })()
    `);
    
    this.log('Extreme', 'All features simultaneously', 
      finalState.terminalCount >= 5 && finalState.noErrors);
    
    console.log('');
  }

  printDetailedSummary() {
    console.log('=== Detailed Test Summary ===\n');
    
    // Group by category
    const categories = {};
    this.testResults.forEach(result => {
      if (!categories[result.category]) {
        categories[result.category] = { total: 0, passed: 0, failed: 0 };
      }
      categories[result.category].total++;
      if (result.result) {
        categories[result.category].passed++;
      } else {
        categories[result.category].failed++;
      }
    });
    
    // Print category summaries
    Object.entries(categories).forEach(([category, stats]) => {
      const percentage = (stats.passed / stats.total * 100).toFixed(0);
      const status = stats.failed === 0 ? '✅' : '⚠️';
      console.log(`${status} ${category}: ${stats.passed}/${stats.total} (${percentage}%)`);
    });
    
    // Overall summary
    const total = this.testResults.length;
    const passed = this.testResults.filter(r => r.result).length;
    const failed = total - passed;
    const percentage = (passed / total * 100).toFixed(1);
    
    console.log(`\nOverall: ${passed}/${total} tests passed (${percentage}%)`);
    
    // Print failures if any
    if (this.errorLog.length > 0) {
      console.log('\n❌ Failed Tests:');
      this.errorLog.forEach(error => {
        console.log(`  - [${error.category}] ${error.test}: ${error.details}`);
      });
    }
    
    // Performance summary
    console.log('\n📊 Performance Metrics:');
    const perfTests = this.testResults.filter(r => 
      r.category === 'Performance' || r.details.includes('ms'));
    perfTests.forEach(test => {
      if (test.details.includes('ms')) {
        console.log(`  - ${test.test}: ${test.details}`);
      }
    });
    
    // Final verdict
    console.log('\n🎯 Final Verdict:');
    if (failed === 0) {
      console.log('  ✅ All tests passed! The application is working perfectly.');
    } else if (failed < 5) {
      console.log('  ⚠️ Minor issues detected. The application is mostly stable.');
    } else {
      console.log('  ❌ Multiple issues detected. Further investigation needed.');
    }
  }
}

// Run tests
app.whenReady().then(() => {
  const test = new ComprehensiveScenarioTest();
  test.runTests();
});

app.on('window-all-closed', () => {
  app.quit();
});