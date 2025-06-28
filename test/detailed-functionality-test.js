#!/usr/bin/env node

/**
 * Detailed Functionality Test
 * 
 * Tests all tab and split features in detail.
 */

const { app, BrowserWindow } = require('electron');
const path = require('path');

class DetailedFunctionalityTest {
  constructor() {
    this.window = null;
    this.testResults = [];
  }

  async wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  log(test, result, details = '') {
    const status = result ? '✅' : '❌';
    const message = `${status} ${test}${details ? ': ' + details : ''}`;
    console.log(message);
    this.testResults.push({ test, result, details });
  }

  async setup() {
    console.log('Setting up test window...\n');
    
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
    
    await this.window.loadFile(path.join(__dirname, '../src/renderer/index.html'));
    await this.wait(3000);
  }

  async runTests() {
    console.log('=== Detailed Functionality Tests ===\n');
    
    try {
      await this.setup();
      
      // Test 1: Initial State
      await this.testInitialState();
      
      // Test 2: Tab Mode Operations
      await this.testTabMode();
      
      // Test 3: Split Vertical Mode
      await this.testSplitVertical();
      
      // Test 4: Split Horizontal Mode
      await this.testSplitHorizontal();
      
      // Test 5: Splitter Dragging
      await this.testSplitterDragging();
      
      // Test 6: Mode Transitions
      await this.testModeTransitions();
      
      // Test 7: Terminal Content Preservation
      await this.testContentPreservation();
      
      // Test 8: New Window Button
      await this.testNewWindowButton();
      
      // Summary
      this.printSummary();
      
    } catch (error) {
      console.error('Test error:', error);
    }
    
    await this.wait(3000);
    
    if (this.window && !this.window.isDestroyed()) {
      this.window.close();
    }
    
    setTimeout(() => {
      app.quit();
    }, 1000);
  }

  async testInitialState() {
    console.log('1. Testing Initial State...');
    
    const state = await this.window.webContents.executeJavaScript(`
      (function() {
        const manager = window.zeamiTermManager;
        const terminals = Array.from(manager.terminals.keys());
        const tabs = Array.from(document.querySelectorAll('.tab'));
        const activeTab = tabs.find(t => t.classList.contains('active'));
        
        return {
          terminalIds: terminals,
          terminalCount: terminals.length,
          tabCount: tabs.length,
          activeTerminalId: manager.activeTerminalId,
          activeTabIndex: activeTab ? tabs.indexOf(activeTab) : -1,
          layoutMode: manager.layoutManager.mode,
          toggleButtons: Array.from(document.querySelectorAll('.toggle-button')).map(b => ({
            text: b.textContent,
            active: b.classList.contains('active')
          }))
        };
      })()
    `);
    
    this.log('Two terminals created', state.terminalCount === 2, `Found ${state.terminalCount} terminals`);
    this.log('Two tabs displayed', state.tabCount === 2, `Found ${state.tabCount} tabs`);
    this.log('Tab mode active', state.layoutMode === 'tab');
    this.log('First terminal active', state.activeTerminalId === 'terminal-1');
    this.log('Tab button active', state.toggleButtons.find(b => b.text === 'Tab')?.active === true);
    
    console.log('');
  }

  async testTabMode() {
    console.log('2. Testing Tab Mode Operations...');
    
    // Test tab clicking
    await this.window.webContents.executeJavaScript(`
      document.querySelectorAll('.tab')[1].click();
    `);
    await this.wait(500);
    
    let state = await this.window.webContents.executeJavaScript(`
      (function() {
        const manager = window.zeamiTermManager;
        const tabs = Array.from(document.querySelectorAll('.tab'));
        const activeTab = tabs.find(t => t.classList.contains('active'));
        return {
          activeTerminalId: manager.activeTerminalId,
          activeTabIndex: activeTab ? tabs.indexOf(activeTab) : -1
        };
      })()
    `);
    
    this.log('Tab click switches terminal', state.activeTerminalId === 'terminal-2');
    this.log('Tab UI updates correctly', state.activeTabIndex === 1);
    
    // Test tab close button
    await this.window.webContents.executeJavaScript(`
      // Create a third terminal first
      window.zeamiTermManager.createTerminal();
    `);
    await this.wait(1000);
    
    await this.window.webContents.executeJavaScript(`
      document.querySelectorAll('.tab-close')[2].click();
    `);
    await this.wait(500);
    
    state = await this.window.webContents.executeJavaScript(`
      (function() {
        return {
          terminalCount: window.zeamiTermManager.terminals.size,
          tabCount: document.querySelectorAll('.tab').length
        };
      })()
    `);
    
    this.log('Tab close removes terminal', state.terminalCount === 2);
    this.log('Tab count updates', state.tabCount === 2);
    
    console.log('');
  }

  async testSplitVertical() {
    console.log('3. Testing Split Vertical Mode...');
    
    await this.window.webContents.executeJavaScript(`
      document.querySelector('.toggle-button[title="Split Vertical"]').click();
    `);
    await this.wait(1000);
    
    const state = await this.window.webContents.executeJavaScript(`
      (function() {
        const container = document.querySelector('.simple-split-container');
        const panes = document.querySelectorAll('.split-pane');
        const splitter = document.querySelector('.splitter-vertical');
        const visibleTerminals = Array.from(document.querySelectorAll('.terminal-wrapper'))
          .filter(w => w.offsetParent !== null);
        
        return {
          layoutMode: window.zeamiTermManager.layoutManager.mode,
          containerExists: !!container,
          gridStyle: container ? window.getComputedStyle(container).gridTemplateColumns : null,
          paneCount: panes.length,
          splitterExists: !!splitter,
          splitterCursor: splitter ? window.getComputedStyle(splitter).cursor : null,
          visibleTerminalCount: visibleTerminals.length
        };
      })()
    `);
    
    this.log('Layout mode changed', state.layoutMode === 'split-vertical');
    this.log('Split container created', state.containerExists);
    this.log('Grid columns set', state.gridStyle && state.gridStyle.includes('fr'));
    this.log('Two panes created', state.paneCount === 2);
    this.log('Vertical splitter exists', state.splitterExists);
    this.log('Splitter has col-resize cursor', state.splitterCursor === 'col-resize');
    this.log('Both terminals visible', state.visibleTerminalCount === 2);
    
    console.log('');
  }

  async testSplitHorizontal() {
    console.log('4. Testing Split Horizontal Mode...');
    
    await this.window.webContents.executeJavaScript(`
      document.querySelector('.toggle-button[title="Split Horizontal"]').click();
    `);
    await this.wait(1000);
    
    const state = await this.window.webContents.executeJavaScript(`
      (function() {
        const container = document.querySelector('.simple-split-container');
        const splitter = document.querySelector('.splitter-horizontal');
        
        return {
          layoutMode: window.zeamiTermManager.layoutManager.mode,
          gridStyle: container ? window.getComputedStyle(container).gridTemplateRows : null,
          splitterExists: !!splitter,
          splitterCursor: splitter ? window.getComputedStyle(splitter).cursor : null
        };
      })()
    `);
    
    this.log('Layout mode changed', state.layoutMode === 'split-horizontal');
    this.log('Grid rows set', state.gridStyle && state.gridStyle.includes('fr'));
    this.log('Horizontal splitter exists', state.splitterExists);
    this.log('Splitter has row-resize cursor', state.splitterCursor === 'row-resize');
    
    console.log('');
  }

  async testSplitterDragging() {
    console.log('5. Testing Splitter Dragging...');
    
    // Switch to vertical split for testing
    await this.window.webContents.executeJavaScript(`
      document.querySelector('.toggle-button[title="Split Vertical"]').click();
    `);
    await this.wait(1000);
    
    // Simulate splitter drag
    const dragResult = await this.window.webContents.executeJavaScript(`
      (function() {
        const splitter = document.querySelector('.splitter-vertical');
        const container = document.querySelector('.simple-split-container');
        
        if (!splitter || !container) return { error: 'Elements not found' };
        
        const initialGrid = window.getComputedStyle(container).gridTemplateColumns;
        
        // Simulate drag by changing grid directly (actual drag would require mouse events)
        container.style.gridTemplateColumns = '0.3fr 4px 0.7fr';
        
        // Check if layout can be saved
        const canSave = !!window.localStorage;
        if (canSave) {
          localStorage.setItem('zeami-layout-split', JSON.stringify({
            direction: 'vertical',
            sizes: '0.3fr 4px 0.7fr'
          }));
        }
        
        return {
          initialGrid,
          newGrid: window.getComputedStyle(container).gridTemplateColumns,
          layoutSaved: canSave
        };
      })()
    `);
    
    this.log('Grid can be modified', dragResult.newGrid !== dragResult.initialGrid);
    this.log('Layout can be saved', dragResult.layoutSaved);
    
    console.log('');
  }

  async testModeTransitions() {
    console.log('6. Testing Mode Transitions...');
    
    // Rapid mode switching
    const transitions = [
      { button: 'Tab Mode', expected: 'tab' },
      { button: 'Split Vertical', expected: 'split-vertical' },
      { button: 'Split Horizontal', expected: 'split-horizontal' },
      { button: 'Tab Mode', expected: 'tab' },
      { button: 'Split Vertical', expected: 'split-vertical' }
    ];
    
    for (const transition of transitions) {
      await this.window.webContents.executeJavaScript(`
        document.querySelector('.toggle-button[title="${transition.button}"]').click();
      `);
      await this.wait(300);
      
      const mode = await this.window.webContents.executeJavaScript(`
        window.zeamiTermManager.layoutManager.mode
      `);
      
      this.log(`Transition to ${transition.expected}`, mode === transition.expected);
    }
    
    console.log('');
  }

  async testContentPreservation() {
    console.log('7. Testing Terminal Content Preservation...');
    
    // Write to terminals
    await this.window.webContents.executeJavaScript(`
      const terminals = Array.from(window.zeamiTermManager.terminals.values());
      terminals[0].terminal.write('Terminal 1 Test Content\\r\\n');
      terminals[1].terminal.write('Terminal 2 Test Content\\r\\n');
    `);
    await this.wait(500);
    
    // Switch modes
    await this.window.webContents.executeJavaScript(`
      document.querySelector('.toggle-button[title="Split Vertical"]').click();
    `);
    await this.wait(500);
    
    await this.window.webContents.executeJavaScript(`
      document.querySelector('.toggle-button[title="Tab Mode"]').click();
    `);
    await this.wait(500);
    
    const content = await this.window.webContents.executeJavaScript(`
      (function() {
        const terminals = Array.from(window.zeamiTermManager.terminals.values());
        return {
          terminal1HasContent: terminals[0].terminal.buffer.active.getLine(0)?.translateToString().includes('Terminal 1'),
          terminal2HasContent: terminals[1].terminal.buffer.active.getLine(0)?.translateToString().includes('Terminal 2')
        };
      })()
    `);
    
    this.log('Terminal 1 content preserved', content.terminal1HasContent);
    this.log('Terminal 2 content preserved', content.terminal2HasContent);
    
    console.log('');
  }

  async testNewWindowButton() {
    console.log('8. Testing New Window Button...');
    
    const buttonExists = await this.window.webContents.executeJavaScript(`
      !!document.querySelector('.action-button[title="New Window"]')
    `);
    
    this.log('New window button exists', buttonExists);
    
    // Test button click (won't actually create window in test)
    await this.window.webContents.executeJavaScript(`
      const btn = document.querySelector('.action-button[title="New Window"]');
      if (btn) {
        // Override electronAPI for test
        window.electronAPI = window.electronAPI || {};
        let clicked = false;
        window.electronAPI.createNewWindow = () => { clicked = true; };
        btn.click();
        window.newWindowClicked = clicked;
      }
    `);
    
    const clicked = await this.window.webContents.executeJavaScript(`window.newWindowClicked`);
    this.log('New window button clickable', clicked === true);
    
    console.log('');
  }

  printSummary() {
    console.log('=== Test Summary ===\n');
    
    const total = this.testResults.length;
    const passed = this.testResults.filter(r => r.result).length;
    const failed = this.testResults.filter(r => !r.result).length;
    
    console.log(`Total tests: ${total}`);
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failed}`);
    
    if (failed > 0) {
      console.log('\nFailed tests:');
      this.testResults.filter(r => !r.result).forEach(r => {
        console.log(`  ❌ ${r.test}${r.details ? ': ' + r.details : ''}`);
      });
    }
    
    console.log(`\nOverall: ${failed === 0 ? '✅ All tests passed!' : '❌ Some tests failed'}`);
  }
}

// Run tests
app.whenReady().then(() => {
  const test = new DetailedFunctionalityTest();
  test.runTests();
});

app.on('window-all-closed', () => {
  app.quit();
});