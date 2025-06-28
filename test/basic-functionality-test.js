/**
 * Basic functionality test for ZeamiTerm
 * Tests core features without full E2E setup
 */

const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let mainWindow;
let testResults = [];

function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : 'ℹ️';
  console.log(`${prefix} [${timestamp}] ${message}`);
  testResults.push({ message, type, timestamp });
}

async function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runTests() {
  log('Starting ZeamiTerm basic functionality tests...');

  try {
    // Test 1: Window creation
    log('Test 1: Creating application window...');
    mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      webPreferences: {
        preload: path.join(__dirname, '../src/preload/index.js'),
        contextIsolation: true,
        nodeIntegration: false
      },
      show: false
    });

    mainWindow.once('ready-to-show', () => {
      log('Window ready to show', 'success');
    });

    // Test 2: Load index.html
    log('Test 2: Loading index.html...');
    await mainWindow.loadFile(path.join(__dirname, '../src/renderer/index.html'));
    log('index.html loaded successfully', 'success');

    // Test 3: Check if renderer process is responding
    log('Test 3: Testing renderer process...');
    const title = await mainWindow.webContents.executeJavaScript('document.title');
    log(`Window title: ${title}`, 'success');

    // Test 4: Check for console errors
    log('Test 4: Checking for console errors...');
    let consoleErrors = [];
    mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
      if (level === 3) { // Error level
        consoleErrors.push({ message, line, sourceId });
        log(`Console error: ${message}`, 'error');
      }
    });

    // Wait for page to fully load
    await wait(3000);

    // Test 5: Check DOM elements
    log('Test 5: Checking DOM elements...');
    const domChecks = await mainWindow.webContents.executeJavaScript(`
      (function() {
        const results = {
          header: !!document.querySelector('.header'),
          terminalContainer: !!document.getElementById('terminal-container'),
          statusBar: !!document.querySelector('.status-bar'),
          toggleButtons: document.querySelectorAll('.toggle-button').length,
          splitToggleGroup: !!document.querySelector('.split-toggle-group')
        };
        return results;
      })()
    `);

    Object.entries(domChecks).forEach(([key, value]) => {
      if (value === false) {
        log(`DOM element missing: ${key}`, 'error');
      } else if (key === 'toggleButtons') {
        log(`Found ${value} toggle buttons`, value === 3 ? 'success' : 'error');
      } else {
        log(`DOM element present: ${key}`, 'success');
      }
    });

    // Test 6: Check if xterm.js is loaded
    log('Test 6: Checking xterm.js...');
    const xtermLoaded = await mainWindow.webContents.executeJavaScript(`
      typeof window.Terminal !== 'undefined'
    `);
    log(`xterm.js loaded: ${xtermLoaded}`, xtermLoaded ? 'success' : 'error');

    // Test 7: Check ZeamiTerminal
    log('Test 7: Checking ZeamiTerminal...');
    const zeamiTerminalExists = await mainWindow.webContents.executeJavaScript(`
      typeof window.zeamiTermManager !== 'undefined'
    `);
    log(`ZeamiTermManager exists: ${zeamiTerminalExists}`, zeamiTerminalExists ? 'success' : 'error');

    // Test 8: Test PTY functionality
    log('Test 8: Testing PTY functionality...');
    const ptyTest = spawn('echo', ['Hello from PTY']);
    let ptyOutput = '';
    ptyTest.stdout.on('data', (data) => {
      ptyOutput += data.toString();
    });
    ptyTest.on('close', (code) => {
      log(`PTY test completed with code ${code}: ${ptyOutput.trim()}`, code === 0 ? 'success' : 'error');
    });

    // Wait a bit more for any async operations
    await wait(2000);

    // Summary
    log('\n=== Test Summary ===');
    const errors = testResults.filter(r => r.type === 'error');
    const successes = testResults.filter(r => r.type === 'success');
    
    log(`Total tests: ${testResults.length}`);
    log(`Passed: ${successes.length}`, 'success');
    log(`Failed: ${errors.length}`, errors.length > 0 ? 'error' : 'success');

    if (errors.length > 0) {
      log('\nFailed tests:', 'error');
      errors.forEach(err => log(`  - ${err.message}`, 'error'));
    }

    if (consoleErrors.length > 0) {
      log(`\nConsole errors detected: ${consoleErrors.length}`, 'error');
      consoleErrors.forEach(err => log(`  - ${err.message}`, 'error'));
    }

  } catch (error) {
    log(`Critical error: ${error.message}`, 'error');
    log(error.stack, 'error');
  } finally {
    // Clean up
    setTimeout(() => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.close();
      }
      app.quit();
    }, 3000);
  }
}

app.whenReady().then(runTests);

app.on('window-all-closed', () => {
  app.quit();
});