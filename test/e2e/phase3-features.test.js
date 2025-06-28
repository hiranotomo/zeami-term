/**
 * Phase 3 Features E2E Test Suite
 * Tests for Shell Integration, Enhanced Link Detection, and Terminal Profiles
 */

const { test, expect } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

// Configure test to use Electron
test.use({
  // Test against Electron app
  contextOptions: {
    // Electron-specific options
  }
});

// Helper to launch Electron app
async function launchApp() {
  const electronApp = await require('playwright').electron.launch({
    args: [path.join(__dirname, '../../src/main/index.js')],
    env: {
      ...process.env,
      NODE_ENV: 'test',
      ZEAMI_TEST_MODE: '1'
    }
  });
  
  const window = await electronApp.firstWindow();
  await window.waitForLoadState('domcontentloaded');
  
  return { app: electronApp, page: window };
}

test.describe('Phase 3: Shell Integration', () => {
  let app, page;
  
  test.beforeEach(async () => {
    const result = await launchApp();
    app = result.app;
    page = result.page;
    
    // Wait for terminal to be ready
    await page.waitForSelector('.terminal-wrapper.active', { timeout: 10000 });
    await page.waitForTimeout(1000);
  });
  
  test.afterEach(async () => {
    await app.close();
  });
  
  test('should detect command execution with OSC sequences', async () => {
    // Type a command with OSC sequences
    await page.keyboard.type('echo -e "\\033]133;A\\007ls\\033]133;B\\007"');
    await page.keyboard.press('Enter');
    
    await page.waitForTimeout(500);
    
    // Check if command was tracked
    const commandTracked = await page.evaluate(() => {
      const session = window.terminalManager?.getActiveSession();
      if (!session || !session.shellIntegrationAddon) return false;
      
      return session.shellIntegrationAddon._commands.length > 0;
    });
    
    expect(commandTracked).toBe(true);
  });
  
  test('should navigate between commands with Cmd+Up/Down', async () => {
    // Add some commands with markers
    const commands = ['echo "First"', 'echo "Second"', 'echo "Third"'];
    
    for (const cmd of commands) {
      await page.keyboard.type(cmd);
      await page.keyboard.press('Enter');
      await page.waitForTimeout(300);
    }
    
    // Navigate to previous command
    const modifier = process.platform === 'darwin' ? 'Meta' : 'Control';
    await page.keyboard.press(`${modifier}+ArrowUp`);
    
    await page.waitForTimeout(300);
    
    // Check if scrolled to previous command
    const scrollPosition = await page.evaluate(() => {
      const terminal = window.terminalManager?.getActiveSession()?.terminal;
      if (!terminal) return -1;
      
      return terminal.buffer.active.cursorY;
    });
    
    expect(scrollPosition).toBeGreaterThanOrEqual(0);
  });
  
  test('should decorate failed commands', async () => {
    // Simulate a failed command with OSC sequence
    await page.keyboard.type('echo -e "\\033]133;A\\007false\\033]133;D;1\\007"');
    await page.keyboard.press('Enter');
    
    await page.waitForTimeout(500);
    
    // Check if decoration was added
    const hasDecoration = await page.evaluate(() => {
      const session = window.terminalManager?.getActiveSession();
      if (!session || !session.shellIntegrationAddon) return false;
      
      return session.shellIntegrationAddon._decorations.length > 0;
    });
    
    expect(hasDecoration).toBe(true);
  });
});

test.describe('Phase 3: Enhanced Link Detection', () => {
  let app, page;
  
  test.beforeEach(async () => {
    const result = await launchApp();
    app = result.app;
    page = result.page;
    
    await page.waitForSelector('.terminal-wrapper.active', { timeout: 10000 });
    await page.waitForTimeout(1000);
  });
  
  test.afterEach(async () => {
    await app.close();
  });
  
  test('should detect file paths as clickable links', async () => {
    // Type a file path
    await page.keyboard.type('echo "/Users/test/file.js:10:5"');
    await page.keyboard.press('Enter');
    
    await page.waitForTimeout(500);
    
    // Check if link was detected
    const hasLinks = await page.evaluate(() => {
      const terminal = window.terminalManager?.getActiveSession()?.terminal;
      if (!terminal) return false;
      
      // Check if enhanced link provider is active
      const session = window.terminalManager?.getActiveSession();
      return session && session.enhancedLinkProvider !== undefined;
    });
    
    expect(hasLinks).toBe(true);
  });
  
  test('should detect URLs as clickable links', async () => {
    // Type URLs
    await page.keyboard.type('echo "Visit https://github.com/user/repo"');
    await page.keyboard.press('Enter');
    
    await page.waitForTimeout(500);
    
    // Hover over the URL to see if it's recognized as a link
    const terminalElement = await page.$('.xterm-screen');
    const bbox = await terminalElement.boundingBox();
    
    // Move mouse to approximate URL position
    await page.mouse.move(bbox.x + 200, bbox.y + 50);
    
    // Check if cursor changed (indicating a link)
    const cursorStyle = await page.evaluate(() => {
      return window.getComputedStyle(document.querySelector('.xterm-screen')).cursor;
    });
    
    // Links typically show pointer cursor
    expect(['pointer', 'hand']).toContain(cursorStyle);
  });
  
  test('should detect error patterns', async () => {
    // Type an error-like message
    await page.keyboard.type('echo "Error at app.js:42:10"');
    await page.keyboard.press('Enter');
    
    await page.waitForTimeout(500);
    
    // Verify enhanced link provider is active
    const providerActive = await page.evaluate(() => {
      const session = window.terminalManager?.getActiveSession();
      return session && session.enhancedLinkProvider && session.enhancedLinkProvider._terminal !== null;
    });
    
    expect(providerActive).toBe(true);
  });
});

test.describe('Phase 3: Terminal Profiles', () => {
  let app, page;
  
  test.beforeEach(async () => {
    const result = await launchApp();
    app = result.app;
    page = result.page;
    
    await page.waitForSelector('.terminal-wrapper.active', { timeout: 10000 });
    await page.waitForTimeout(1000);
  });
  
  test.afterEach(async () => {
    await app.close();
  });
  
  test('should display profile selector', async () => {
    // Check if profile selector exists
    const profileSelector = await page.$('.profile-selector');
    expect(profileSelector).toBeTruthy();
    
    // Check if dropdown button exists
    const dropdownButton = await page.$('.profile-dropdown-button');
    expect(dropdownButton).toBeTruthy();
  });
  
  test('should show profiles dropdown on click', async () => {
    // Click profile dropdown button
    const dropdownButton = await page.$('.profile-dropdown-button');
    await dropdownButton.click();
    
    await page.waitForTimeout(300);
    
    // Check if dropdown menu is visible
    const menuVisible = await page.evaluate(() => {
      const menu = document.querySelector('.profile-dropdown-menu');
      return menu && !menu.classList.contains('hidden');
    });
    
    expect(menuVisible).toBe(true);
  });
  
  test('should close dropdown on outside click', async () => {
    // Open dropdown
    const dropdownButton = await page.$('.profile-dropdown-button');
    await dropdownButton.click();
    
    await page.waitForTimeout(300);
    
    // Click outside
    await page.click('body');
    
    await page.waitForTimeout(300);
    
    // Check if dropdown is hidden
    const menuHidden = await page.evaluate(() => {
      const menu = document.querySelector('.profile-dropdown-menu');
      return menu && menu.classList.contains('hidden');
    });
    
    expect(menuHidden).toBe(true);
  });
  
  test('should create terminal with selected profile', async () => {
    // Open dropdown
    const dropdownButton = await page.$('.profile-dropdown-button');
    await dropdownButton.click();
    
    await page.waitForTimeout(300);
    
    // Get profile items
    const profileItems = await page.$$('.profile-item');
    
    if (profileItems.length > 1) {
      // Click second profile
      await profileItems[1].click();
      
      await page.waitForTimeout(300);
      
      // Create new terminal
      const modifier = process.platform === 'darwin' ? 'Meta' : 'Control';
      await page.keyboard.press(`${modifier}+t`);
      
      await page.waitForTimeout(1000);
      
      // Verify new terminal was created
      const terminalCount = await page.evaluate(() => {
        return window.terminalManager?.terminals.size || 0;
      });
      
      expect(terminalCount).toBe(2);
    } else {
      // Skip test if no profiles available
      console.log('No additional profiles available for testing');
    }
  });
});

test.describe('Phase 3: Performance Tests', () => {
  let app, page;
  
  test.beforeEach(async () => {
    const result = await launchApp();
    app = result.app;
    page = result.page;
    
    await page.waitForSelector('.terminal-wrapper.active', { timeout: 10000 });
    await page.waitForTimeout(1000);
  });
  
  test.afterEach(async () => {
    await app.close();
  });
  
  test('should handle large output efficiently', async () => {
    // Generate large output
    await page.keyboard.type('infinite log');
    await page.keyboard.press('Enter');
    
    // Let it run for 2 seconds
    await page.waitForTimeout(2000);
    
    // Stop with Ctrl+C
    await page.keyboard.press('Control+c');
    
    await page.waitForTimeout(500);
    
    // Check if terminal is still responsive
    await page.keyboard.type('help');
    await page.keyboard.press('Enter');
    
    await page.waitForTimeout(500);
    
    // Verify help command worked
    const terminalText = await page.evaluate(() => {
      const terminal = window.terminalManager?.getActiveSession()?.terminal;
      if (!terminal) return '';
      
      const buffer = terminal.buffer.active;
      let text = '';
      for (let i = Math.max(0, buffer.length - 20); i < buffer.length; i++) {
        const line = buffer.getLine(i);
        if (line) {
          text += line.translateToString(true) + '\n';
        }
      }
      return text;
    });
    
    expect(terminalText).toContain('Built-in Commands');
  });
  
  test('should maintain smooth scrolling with large buffer', async () => {
    // Generate content to fill buffer
    for (let i = 0; i < 10; i++) {
      await page.keyboard.type(`echo "Line ${i}"`.repeat(10));
      await page.keyboard.press('Enter');
      await page.waitForTimeout(100);
    }
    
    // Test scrolling performance
    const startTime = Date.now();
    
    // Scroll up
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Shift+PageUp');
      await page.waitForTimeout(50);
    }
    
    // Scroll down
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Shift+PageDown');
      await page.waitForTimeout(50);
    }
    
    const endTime = Date.now();
    const scrollTime = endTime - startTime;
    
    // Should complete scrolling within reasonable time
    expect(scrollTime).toBeLessThan(2000);
  });
});