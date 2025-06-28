#!/usr/bin/env node

/**
 * Simple Tab and Split Test
 * 
 * This is a simplified test to check basic tab and split functionality.
 */

const { app, BrowserWindow } = require('electron');
const path = require('path');

class SimpleTabTest {
  constructor() {
    this.window = null;
  }

  async wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async setup() {
    console.log('Setting up test window...');
    
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
    await this.wait(3000); // Wait for initialization
    
    console.log('Window loaded');
  }

  async runTests() {
    console.log('\n=== Simple Tab and Split Tests ===\n');
    
    try {
      await this.setup();
      
      // Test 1: Check initial state
      console.log('1. Testing initial state...');
      const initialState = await this.window.webContents.executeJavaScript(`
        (function() {
          const manager = window.zeamiTermManager;
          if (!manager) return { error: 'Manager not found' };
          
          return {
            terminalCount: manager.terminals ? manager.terminals.size : 0,
            activeTerminalId: manager.activeTerminalId,
            layoutMode: manager.layoutManager ? manager.layoutManager.mode : 'unknown',
            tabCount: document.querySelectorAll('.tab').length,
            tabsVisible: document.getElementById('tabs-container').style.display !== 'none'
          };
        })()
      `);
      console.log('Initial state:', initialState);
      
      // Test 2: Check tab switching
      console.log('\n2. Testing tab switching...');
      await this.window.webContents.executeJavaScript(`
        const tabs = document.querySelectorAll('.tab');
        if (tabs.length >= 2) {
          console.log('Clicking second tab');
          tabs[1].click();
        }
      `);
      await this.wait(1000);
      
      const afterSwitch = await this.window.webContents.executeJavaScript(`
        (function() {
          const tabs = Array.from(document.querySelectorAll('.tab'));
          const activeTab = tabs.find(tab => tab.classList.contains('active'));
          const activeIndex = activeTab ? tabs.indexOf(activeTab) : -1;
          
          return {
            activeTabIndex: activeIndex,
            activeTerminalId: window.zeamiTermManager.activeTerminalId
          };
        })()
      `);
      console.log('After switch:', afterSwitch);
      
      // Test 3: Check split mode
      console.log('\n3. Testing split mode...');
      await this.window.webContents.executeJavaScript(`
        const verticalBtn = document.querySelector('.toggle-button[title="Split Vertical"]');
        if (verticalBtn) {
          console.log('Clicking vertical split button');
          verticalBtn.click();
        }
      `);
      await this.wait(1500);
      
      const splitState = await this.window.webContents.executeJavaScript(`
        (function() {
          const manager = window.zeamiTermManager;
          const visibleTerminals = Array.from(document.querySelectorAll('.terminal-wrapper'))
            .filter(w => w.offsetParent !== null);
          
          return {
            layoutMode: manager.layoutManager ? manager.layoutManager.mode : 'unknown',
            visibleTerminalCount: visibleTerminals.length,
            splitContainer: !!document.querySelector('.simple-split-container'),
            splitter: !!document.querySelector('.splitter-vertical')
          };
        })()
      `);
      console.log('Split state:', splitState);
      
      // Test 4: Check focus in split mode
      console.log('\n4. Testing focus in split mode...');
      await this.window.webContents.executeJavaScript(`
        const panes = document.querySelectorAll('.split-pane');
        if (panes.length >= 2) {
          console.log('Clicking second pane');
          panes[1].click();
        }
      `);
      await this.wait(1000);
      
      const focusState = await this.window.webContents.executeJavaScript(`
        (function() {
          const manager = window.zeamiTermManager;
          const tabs = Array.from(document.querySelectorAll('.tab'));
          const activeTab = tabs.find(tab => tab.classList.contains('active'));
          const activeIndex = activeTab ? tabs.indexOf(activeTab) : -1;
          
          return {
            activeTerminalId: manager.activeTerminalId,
            activeTabIndex: activeIndex,
            expectedIndex: 1
          };
        })()
      `);
      console.log('Focus state:', focusState);
      
      // Test 5: Return to tab mode
      console.log('\n5. Testing return to tab mode...');
      await this.window.webContents.executeJavaScript(`
        const tabBtn = document.querySelector('.toggle-button[title="Tab Mode"]');
        if (tabBtn) {
          console.log('Clicking tab mode button');
          tabBtn.click();
        }
      `);
      await this.wait(1000);
      
      const tabModeState = await this.window.webContents.executeJavaScript(`
        (function() {
          const manager = window.zeamiTermManager;
          const visibleTerminals = Array.from(document.querySelectorAll('.terminal-wrapper'))
            .filter(w => w.offsetParent !== null);
          
          return {
            layoutMode: manager.layoutManager ? manager.layoutManager.mode : 'unknown',
            visibleTerminalCount: visibleTerminals.length,
            splitContainer: !!document.querySelector('.simple-split-container')
          };
        })()
      `);
      console.log('Tab mode state:', tabModeState);
      
      console.log('\n=== Test Summary ===');
      console.log('1. Initial state:', initialState.terminalCount === 2 ? '✅ 2 terminals created' : '❌ Wrong terminal count');
      console.log('2. Tab switching:', afterSwitch.activeTabIndex === 1 ? '✅ Tab switched correctly' : '❌ Tab switch failed');
      console.log('3. Split mode:', splitState.visibleTerminalCount === 2 ? '✅ Both terminals visible' : '❌ Split display issue');
      console.log('4. Focus in split:', focusState.activeTabIndex === focusState.expectedIndex ? '✅ Focus synced with tab' : '❌ Focus not synced');
      console.log('5. Tab mode return:', tabModeState.visibleTerminalCount === 1 ? '✅ Single terminal visible' : '❌ Tab mode issue');
      
    } catch (error) {
      console.error('Test error:', error);
    }
    
    // Keep window open for 5 seconds to observe results
    await this.wait(5000);
    
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
  const test = new SimpleTabTest();
  test.runTests();
});

app.on('window-all-closed', () => {
  app.quit();
});