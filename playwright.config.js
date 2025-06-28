/**
 * Playwright configuration for E2E testing
 */

const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './test/e2e',
  timeout: 30000,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [['html', { port: 9523 }]], // デフォルトの9323から変更
  
  use: {
    trace: 'on-first-retry',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure'
  },

  // Electron-specific configuration
  projects: [
    {
      name: 'electron',
      testMatch: '**/*.test.js'
    }
  ]
});