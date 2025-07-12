/**
 * Test helper functions for ZeamiTerm E2E tests
 */

const { expect } = require('@playwright/test');
const path = require('path');
const fs = require('fs').promises;

class ZeamiTermTestHelper {
  constructor(electronApp, page) {
    this.electronApp = electronApp;
    this.page = page;
    this.windows = new Map();
  }

  /**
   * Wait for terminal to be ready
   */
  async waitForTerminalReady() {
    await this.page.waitForSelector('.terminal-wrapper', { timeout: 10000 });
    await this.page.waitForSelector('.xterm', { timeout: 5000 });
    await this.page.waitForTimeout(1000); // Allow terminal to fully initialize
  }

  /**
   * Type command in terminal
   */
  async typeCommand(command) {
    await this.page.focus('.xterm-helper-textarea');
    await this.page.keyboard.type(command);
  }

  /**
   * Execute command (type and press Enter)
   */
  async executeCommand(command) {
    await this.typeCommand(command);
    await this.page.keyboard.press('Enter');
    await this.page.waitForTimeout(500); // Wait for command execution
  }

  /**
   * Get terminal output text
   */
  async getTerminalOutput() {
    return await this.page.evaluate(() => {
      // Try multiple methods to get terminal content
      
      // Method 1: Try getting active terminal directly
      const activeTerminal = window.terminalManager?.getActiveTerminal();
      if (activeTerminal && activeTerminal.terminal) {
        const buffer = activeTerminal.terminal.buffer.active;
        let output = '';
        
        for (let i = 0; i < buffer.length; i++) {
          const line = buffer.getLine(i);
          if (line) {
            output += line.translateToString(true) + '\n';
          }
        }
        
        if (output.trim()) return output.trim();
      }
      
      // Method 2: Try getting active session's terminal
      const activeSession = window.terminalManager?.getActiveSession();
      if (activeSession && activeSession.terminal) {
        const buffer = activeSession.terminal.buffer.active;
        let output = '';
        
        for (let i = 0; i < buffer.length; i++) {
          const line = buffer.getLine(i);
          if (line) {
            output += line.translateToString(true) + '\n';
          }
        }
        
        if (output.trim()) return output.trim();
      }
      
      // Method 3: Try getting first terminal from terminals map
      if (window.terminalManager?.terminals) {
        for (const [id, terminal] of window.terminalManager.terminals) {
          if (terminal && terminal.terminal) {
            const buffer = terminal.terminal.buffer.active;
            let output = '';
            
            for (let i = 0; i < buffer.length; i++) {
              const line = buffer.getLine(i);
              if (line) {
                output += line.translateToString(true) + '\n';
              }
            }
            
            if (output.trim()) return output.trim();
          }
        }
      }
      
      return '';
    });
  }

  /**
   * Open Message Center window
   */
  async openMessageCenter() {
    // Try keyboard shortcut first
    await this.page.keyboard.press('Meta+Shift+C');
    await this.page.waitForTimeout(1000);
    
    const windows = await this.electronApp.windows();
    const messageCenterWindow = windows.find(w => w !== this.page);
    
    if (messageCenterWindow) {
      await messageCenterWindow.waitForSelector('#app', { timeout: 5000 });
      this.windows.set('messageCenter', messageCenterWindow);
      return messageCenterWindow;
    }
    
    throw new Error('Message Center window not found');
  }

  /**
   * Create new terminal split
   */
  async createSplit(direction = 'vertical') {
    const shortcut = direction === 'vertical' ? 'Meta+D' : 'Meta+Shift+D';
    await this.page.keyboard.press(shortcut);
    await this.page.waitForTimeout(500);
  }

  /**
   * Switch to terminal by index
   */
  async switchToTerminal(index) {
    const terminals = await this.page.$$('.terminal-wrapper');
    if (terminals[index]) {
      await terminals[index].click();
      await this.page.waitForTimeout(200);
    }
  }

  /**
   * Test paste functionality
   */
  async testPaste(text) {
    // Copy text to clipboard
    await this.page.evaluate((text) => {
      navigator.clipboard.writeText(text);
    }, text);
    
    // Focus terminal and paste
    await this.page.focus('.xterm-helper-textarea');
    await this.page.keyboard.press('Meta+V');
    await this.page.waitForTimeout(500);
  }

  /**
   * Check if element contains text
   */
  async elementContainsText(selector, text) {
    const element = await this.page.$(selector);
    if (!element) return false;
    
    const content = await element.textContent();
    return content.includes(text);
  }

  /**
   * Take screenshot for debugging
   */
  async takeDebugScreenshot(name) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const screenshotPath = path.join(__dirname, '../../test-results', `${name}-${timestamp}.png`);
    
    await fs.mkdir(path.dirname(screenshotPath), { recursive: true });
    await this.page.screenshot({ path: screenshotPath, fullPage: true });
    
    return screenshotPath;
  }

  /**
   * Get command execution data from Message Center
   */
  async getCommandExecutions() {
    const messageCenterWindow = this.windows.get('messageCenter');
    if (!messageCenterWindow) return [];
    
    return await messageCenterWindow.evaluate(() => {
      // Access the React component's state or global data
      const commandData = window.__commandExecutions || [];
      return commandData;
    });
  }

  /**
   * Wait for specific output in terminal
   */
  async waitForOutput(expectedText, timeout = 5000) {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      const output = await this.getTerminalOutput();
      if (output.includes(expectedText)) {
        return true;
      }
      await this.page.waitForTimeout(100);
    }
    
    return false;
  }

  /**
   * Check if terminal is responsive
   */
  async isTerminalResponsive() {
    const testCommand = `echo "test-${Date.now()}"`;
    await this.executeCommand(testCommand);
    
    const hasOutput = await this.waitForOutput(testCommand.split('"')[1], 2000);
    return hasOutput;
  }

  /**
   * Get error logs from the application
   */
  async getErrorLogs() {
    const logs = [];
    
    // Collect console errors
    this.page.on('console', msg => {
      if (msg.type() === 'error') {
        logs.push({
          type: 'console',
          text: msg.text(),
          location: msg.location()
        });
      }
    });
    
    // Collect page errors
    this.page.on('pageerror', error => {
      logs.push({
        type: 'pageerror',
        text: error.message,
        stack: error.stack
      });
    });
    
    return logs;
  }

  /**
   * Clean up test environment
   */
  async cleanup() {
    // Close all extra windows
    for (const [name, window] of this.windows) {
      if (!window.isClosed()) {
        await window.close();
      }
    }
    this.windows.clear();
  }
}

module.exports = { ZeamiTermTestHelper };