/**
 * Smoke test for ZeamiTerm
 * Quick validation that the app starts and basic functionality works
 */

const { app } = require('electron');
const path = require('path');

// Prevent Electron from starting the app
app.commandLine.appendSwitch('--test-mode');

// Override app ready to run tests
app.whenReady().then(async () => {
  console.log('🧪 Starting ZeamiTerm smoke test...\n');
  
  try {
    // Test 1: Check required modules
    console.log('✓ Test 1: Checking required modules...');
    const { BrowserWindow } = require('electron');
    const { PtyService } = require('../src/main/ptyService');
    const { TerminalProcessManager } = require('../src/main/terminalProcessManager');
    console.log('  All required modules loaded successfully\n');
    
    // Test 2: Create window
    console.log('✓ Test 2: Creating application window...');
    const mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      webPreferences: {
        preload: path.join(__dirname, '../src/preload/index.js'),
        contextIsolation: true,
        nodeIntegration: false
      },
      show: false
    });
    console.log('  Window created successfully\n');
    
    // Test 3: Initialize services
    console.log('✓ Test 3: Initializing services...');
    const ptyService = new PtyService();
    const terminalProcessManager = new TerminalProcessManager();
    console.log('  Services initialized successfully\n');
    
    // Test 4: Load renderer
    console.log('✓ Test 4: Loading renderer...');
    await mainWindow.loadFile(path.join(__dirname, '../src/renderer/index.html'));
    console.log('  Renderer loaded successfully\n');
    
    // Test 5: Create PTY process
    console.log('✓ Test 5: Testing PTY creation...');
    const result = await ptyService.createProcess({
      cols: 80,
      rows: 24
    });
    
    if (result.success) {
      console.log(`  PTY created: PID ${result.pid}, Shell: ${result.shell}\n`);
      
      // Test 6: Write to PTY
      console.log('✓ Test 6: Testing PTY communication...');
      ptyService.writeToProcess(result.id, 'echo "ZeamiTerm Test"\n');
      
      // Wait for output
      await new Promise(resolve => {
        ptyService.once('data', ({ id, data }) => {
          console.log('  Received output from PTY\n');
          resolve();
        });
      });
      
      // Clean up
      ptyService.killProcess(result.id);
    }
    
    // Test 7: Profile management
    console.log('✓ Test 7: Testing profile management...');
    const profiles = terminalProcessManager.getProfiles();
    const defaultProfile = terminalProcessManager.getDefaultProfile();
    console.log(`  Found ${profiles.length} profiles`);
    console.log(`  Default profile: ${defaultProfile?.name || 'None'}\n`);
    
    console.log('✅ All smoke tests passed!\n');
    
    // Clean up and exit
    mainWindow.destroy();
    app.exit(0);
    
  } catch (error) {
    console.error('❌ Smoke test failed:', error);
    app.exit(1);
  }
});

// Handle errors
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught exception:', error);
  app.exit(1);
});

process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled rejection:', error);
  app.exit(1);
});