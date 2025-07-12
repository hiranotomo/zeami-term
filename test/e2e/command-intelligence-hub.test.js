/**
 * Command Intelligence Hub test for ZeamiTerm
 * Tests the Message Center and command tracking functionality
 */

const { _electron: electron } = require('@playwright/test');
const { test, expect } = require('@playwright/test');
const path = require('path');

let electronApp;
let page;
let messageCenterPage;

test.beforeAll(async () => {
  // Launch Electron app
  electronApp = await electron.launch({
    args: [path.join(__dirname, '../../src/main/index.js')]
  });
  
  // Get the first window that the app opens
  page = await electronApp.firstWindow();
  
  // Wait for app to be ready
  await page.waitForSelector('.terminal-wrapper', { timeout: 10000 });
});

test.afterAll(async () => {
  await electronApp.close();
});

test.describe('Command Intelligence Hub', () => {
  test('should open Message Center window', async () => {
    // Open Message Center using keyboard shortcut
    await page.keyboard.press('Meta+Shift+C');
    
    // Wait for new window to open
    await page.waitForTimeout(1000);
    
    // Get all windows
    const windows = await electronApp.windows();
    expect(windows.length).toBeGreaterThan(1);
    
    // Find Message Center window
    messageCenterPage = windows.find(w => w !== page);
    expect(messageCenterPage).toBeTruthy();
    
    // Check if Message Center is loaded
    await messageCenterPage.waitForSelector('#app', { timeout: 5000 });
  });
  
  test('should track executed commands', async () => {
    // Execute a command in terminal
    await page.focus('.xterm-helper-textarea');
    await page.keyboard.type('echo "test command"');
    await page.keyboard.press('Enter');
    
    // Wait for command to be processed
    await page.waitForTimeout(500);
    
    // Check if command appears in Message Center
    if (messageCenterPage) {
      // Wait for realtime view to update
      await messageCenterPage.waitForTimeout(1000);
      
      // Check if the command is visible in the realtime view
      const realtimeContent = await messageCenterPage.locator('.realtime-view').textContent();
      expect(realtimeContent).toContain('echo "test command"');
    }
  });
  
  test('should display command statistics', async () => {
    if (messageCenterPage) {
      // Check if statistics are displayed
      const statsCards = await messageCenterPage.locator('.stat-card').count();
      expect(statsCards).toBeGreaterThan(0);
      
      // Check if total commands counter exists
      const totalCommands = await messageCenterPage.locator('.stat-card:has-text("Total Commands")').textContent();
      expect(totalCommands).toBeTruthy();
    }
  });
  
  test('should switch between different views', async () => {
    if (messageCenterPage) {
      // Test Timeline view
      await messageCenterPage.locator('button:has-text("Timeline")').click();
      await expect(messageCenterPage.locator('.timeline-view')).toBeVisible();
      
      // Test Analysis view
      await messageCenterPage.locator('button:has-text("Analysis")').click();
      await expect(messageCenterPage.locator('.analysis-view')).toBeVisible();
      
      // Test Detailed Log view
      await messageCenterPage.locator('button:has-text("Detailed Log")').click();
      await expect(messageCenterPage.locator('.detailed-log-view')).toBeVisible();
      
      // Return to Realtime view
      await messageCenterPage.locator('button:has-text("Realtime")').click();
      await expect(messageCenterPage.locator('.realtime-view')).toBeVisible();
    }
  });
  
  test('should filter commands by executor', async () => {
    if (messageCenterPage) {
      // Open filter dropdown
      const filterButton = await messageCenterPage.locator('.command-filter button').first();
      await filterButton.click();
      
      // Select human executor filter
      await messageCenterPage.locator('text=Human').click();
      
      // Verify filtered results
      await page.waitForTimeout(500);
      const executorBadges = await messageCenterPage.locator('.executor-badge').allTextContents();
      
      // All visible commands should be from Human executor
      for (const badge of executorBadges) {
        expect(badge).toContain('Human');
      }
    }
  });
  
  test('should export command data', async () => {
    if (messageCenterPage) {
      // Click export button
      const exportButton = await messageCenterPage.locator('button:has-text("Export")');
      
      // Check if export button exists
      if (await exportButton.count() > 0) {
        // Note: We can't fully test file download in Playwright with Electron
        // but we can verify the button exists and is clickable
        await expect(exportButton).toBeEnabled();
      }
    }
  });
});