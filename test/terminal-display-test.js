#!/usr/bin/env node

/**
 * Terminal Display Test
 * 
 * Tests the actual terminal display content and shell initialization
 */

const { app, BrowserWindow } = require('electron');
const path = require('path');

class TerminalDisplayTest {
  constructor() {
    this.window = null;
    this.testResults = [];
  }

  async wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  log(test, result, details = '') {
    const status = result ? '✅' : '❌';
    console.log(`${status} ${test}${details ? ': ' + details : ''}`);
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
    // Wait longer for shell initialization
    await this.wait(5000);
  }

  async runTests() {
    console.log('=== Terminal Display Tests ===\n');
    
    try {
      await this.setup();
      
      // Test 1: Check Terminal 1 display content
      console.log('1. Testing Terminal 1 display...');
      const terminal1Content = await this.window.webContents.executeJavaScript(`
        (function() {
          const manager = window.zeamiTermManager;
          const firstId = Array.from(manager.terminals.keys())[0];
          const session = manager.terminals.get(firstId);
          
          if (!session || !session.terminal) {
            return { error: 'Terminal not found' };
          }
          
          const terminal = session.terminal;
          const buffer = terminal.buffer.active;
          const lines = [];
          
          // Get first 10 lines
          for (let i = 0; i < Math.min(10, buffer.length); i++) {
            const line = buffer.getLine(i);
            if (line) {
              const text = line.translateToString(true).trim();
              if (text) lines.push(text);
            }
          }
          
          // Get current cursor position
          const cursorY = terminal.buffer.active.cursorY;
          const cursorX = terminal.buffer.active.cursorX;
          
          // Check if terminal is focused
          const isFocused = document.activeElement === terminal.element ||
                           terminal.element.contains(document.activeElement);
          
          return {
            lines: lines,
            lineCount: lines.length,
            cursorPosition: { x: cursorX, y: cursorY },
            isFocused: isFocused,
            hasContent: lines.length > 0,
            firstLine: lines[0] || '',
            terminalId: firstId,
            isActive: manager.activeTerminalId === firstId,
            cols: terminal.cols,
            rows: terminal.rows
          };
        })()
      `);
      
      console.log('Terminal 1 content:', terminal1Content);
      
      this.log('Terminal 1 has content', terminal1Content.hasContent, 
        `${terminal1Content.lineCount} lines`);
      this.log('Terminal 1 shows prompt', 
        terminal1Content.firstLine && terminal1Content.firstLine.includes('%'),
        terminal1Content.firstLine);
      this.log('Terminal 1 is active', terminal1Content.isActive);
      this.log('Terminal 1 dimensions', 
        terminal1Content.cols > 0 && terminal1Content.rows > 0,
        `${terminal1Content.cols}x${terminal1Content.rows}`);
      
      // Test 2: Check Terminal 2 display content
      console.log('\n2. Testing Terminal 2 display...');
      
      // First switch to Terminal 2
      await this.window.webContents.executeJavaScript(`
        document.querySelectorAll('.tab')[1].click();
      `);
      await this.wait(1000);
      
      const terminal2Content = await this.window.webContents.executeJavaScript(`
        (function() {
          const manager = window.zeamiTermManager;
          const secondId = Array.from(manager.terminals.keys())[1];
          const session = manager.terminals.get(secondId);
          
          if (!session || !session.terminal) {
            return { error: 'Terminal not found' };
          }
          
          const terminal = session.terminal;
          const buffer = terminal.buffer.active;
          const lines = [];
          
          for (let i = 0; i < Math.min(10, buffer.length); i++) {
            const line = buffer.getLine(i);
            if (line) {
              const text = line.translateToString(true).trim();
              if (text) lines.push(text);
            }
          }
          
          return {
            lines: lines,
            lineCount: lines.length,
            hasContent: lines.length > 0,
            firstLine: lines[0] || '',
            terminalId: secondId,
            isActive: manager.activeTerminalId === secondId
          };
        })()
      `);
      
      console.log('Terminal 2 content:', terminal2Content);
      
      this.log('Terminal 2 has content', terminal2Content.hasContent,
        `${terminal2Content.lineCount} lines`);
      this.log('Terminal 2 shows prompt', 
        terminal2Content.firstLine && terminal2Content.firstLine.includes('%'),
        terminal2Content.firstLine);
      
      // Test 3: Compare terminals
      console.log('\n3. Comparing terminals...');
      
      const comparison = await this.window.webContents.executeJavaScript(`
        (function() {
          const manager = window.zeamiTermManager;
          const ids = Array.from(manager.terminals.keys());
          const sessions = ids.map(id => manager.terminals.get(id));
          
          return {
            bothHaveContent: sessions.every(s => {
              const buffer = s.terminal.buffer.active;
              return buffer.length > 0 && buffer.getLine(0).translateToString().trim().length > 0;
            }),
            bothHavePrompt: sessions.every(s => {
              const firstLine = s.terminal.buffer.active.getLine(0);
              return firstLine && firstLine.translateToString().includes('%');
            })
          };
        })()
      `);
      
      this.log('Both terminals have content', comparison.bothHaveContent);
      this.log('Both terminals show prompt', comparison.bothHavePrompt);
      
      // Test 4: Test typing in Terminal 1
      console.log('\n4. Testing input in Terminal 1...');
      
      // Switch back to Terminal 1
      await this.window.webContents.executeJavaScript(`
        document.querySelectorAll('.tab')[0].click();
      `);
      await this.wait(500);
      
      await this.window.webContents.executeJavaScript(`
        const manager = window.zeamiTermManager;
        const firstId = Array.from(manager.terminals.keys())[0];
        const session = manager.terminals.get(firstId);
        
        // Focus and type
        session.terminal.focus();
        session.terminal.paste('echo "test"');
      `);
      await this.wait(500);
      
      const afterInput = await this.window.webContents.executeJavaScript(`
        (function() {
          const manager = window.zeamiTermManager;
          const firstId = Array.from(manager.terminals.keys())[0];
          const session = manager.terminals.get(firstId);
          const buffer = session.terminal.buffer.active;
          
          // Get the last non-empty line
          let lastLine = '';
          for (let i = buffer.length - 1; i >= 0; i--) {
            const line = buffer.getLine(i);
            if (line) {
              const text = line.translateToString(true).trim();
              if (text) {
                lastLine = text;
                break;
              }
            }
          }
          
          return {
            lastLine: lastLine,
            containsInput: lastLine.includes('echo "test"')
          };
        })()
      `);
      
      this.log('Input appears in terminal', afterInput.containsInput,
        afterInput.lastLine);
      
      // Summary
      console.log('\n=== Test Summary ===');
      const passed = this.testResults.filter(r => r.result).length;
      const total = this.testResults.length;
      console.log(`Passed: ${passed}/${total}`);
      
      if (this.testResults.filter(r => !r.result).length > 0) {
        console.log('\nFailed tests:');
        this.testResults.filter(r => !r.result).forEach(r => {
          console.log(`  ❌ ${r.test}: ${r.details}`);
        });
      }
      
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
}

// Run tests
app.whenReady().then(() => {
  const test = new TerminalDisplayTest();
  test.runTests();
});

app.on('window-all-closed', () => {
  app.quit();
});