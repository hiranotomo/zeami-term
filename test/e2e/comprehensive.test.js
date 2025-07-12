/**
 * Comprehensive automated test suite for ZeamiTerm
 * This test will identify issues and report them for automatic fixing
 */

const { _electron: electron } = require('@playwright/test');
const { test, expect } = require('@playwright/test');
const path = require('path');
const { ZeamiTermTestHelper } = require('./test-helpers');

let electronApp;
let page;
let testHelper;
let testResults = {
  passed: [],
  failed: [],
  errors: []
};

test.beforeAll(async () => {
  electronApp = await electron.launch({
    args: [path.join(__dirname, '../../src/main/index.js')]
  });
  
  page = await electronApp.firstWindow();
  testHelper = new ZeamiTermTestHelper(electronApp, page);
  
  await testHelper.waitForTerminalReady();
});

test.afterAll(async () => {
  await testHelper.cleanup();
  
  // Generate fix report BEFORE closing the app
  const fs = require('fs').promises;
  const path = require('path');
  
  const fixReport = {
    timestamp: new Date().toISOString(),
    failed: testResults.failed,
    errors: testResults.errors,
    suggestions: []
  };
  
  // Analyze failures and suggest fixes
  testResults.failed.forEach(failure => {
    if (failure.reason.includes('Command output not displayed')) {
      fixReport.suggestions.push({
        issue: 'Terminal output not displaying',
        possibleCauses: [
          'PTY communication issue',
          'Terminal buffer not updating',
          'Rendering problem'
        ],
        suggestedFixes: [
          'Check PTY data flow in main process',
          'Verify terminal.write() is being called',
          'Check xterm.js rendering pipeline'
        ]
      });
    }
    
    if (failure.reason.includes('Message Center')) {
      fixReport.suggestions.push({
        issue: 'Command Intelligence Hub issues',
        possibleCauses: [
          'IPC communication failure',
          'Message Center service not initialized',
          'Shell integration not capturing commands'
        ],
        suggestedFixes: [
          'Verify MessageCenterService is properly initialized',
          'Check ShellIntegrationAddon OSC handling',
          'Ensure IPC channels are properly set up'
        ]
      });
    }
    
    if (failure.reason.includes('Missing elements')) {
      fixReport.suggestions.push({
        issue: 'UI elements missing',
        possibleCauses: [
          'Elements not rendered',
          'Wrong CSS selectors',
          'Initialization timing issue'
        ],
        suggestedFixes: [
          'Check element creation in renderer',
          'Verify CSS class names',
          'Add proper wait conditions'
        ]
      });
    }
  });
  
  // Save report
  const reportPath = path.join(__dirname, '../../test-results', 'fix-report.json');
  await fs.mkdir(path.dirname(reportPath), { recursive: true });
  await fs.writeFile(reportPath, JSON.stringify(fixReport, null, 2));
  
  console.log(`\nFix report generated: ${reportPath}`);
  
  // Report test results
  console.log('\n=== Test Results Summary ===');
  console.log(`Passed: ${testResults.passed.length}`);
  console.log(`Failed: ${testResults.failed.length}`);
  console.log(`Errors: ${testResults.errors.length}`);
  
  if (testResults.failed.length > 0) {
    console.log('\n=== Failed Tests ===');
    testResults.failed.forEach(failure => {
      console.log(`- ${failure.test}: ${failure.reason}`);
    });
  }
  
  if (testResults.errors.length > 0) {
    console.log('\n=== Errors Detected ===');
    testResults.errors.forEach(error => {
      console.log(`- ${error.type}: ${error.message}`);
    });
  }
  
  await electronApp.close();
});

test.describe('ZeamiTerm Comprehensive Test Suite', () => {
  test('1. Basic Terminal Functionality', async () => {
    try {
      // Test basic command execution
      await testHelper.executeCommand('echo "Hello ZeamiTerm"');
      const hasOutput = await testHelper.waitForOutput('Hello ZeamiTerm');
      
      if (!hasOutput) {
        testResults.failed.push({
          test: 'Basic Terminal Functionality',
          reason: 'Command output not displayed correctly'
        });
      } else {
        testResults.passed.push('Basic Terminal Functionality');
      }
      
      expect(hasOutput).toBe(true);
    } catch (error) {
      testResults.errors.push({
        type: 'Basic Terminal Test',
        message: error.message
      });
      throw error;
    }
  });

  test('2. Terminal Split Functionality', async () => {
    try {
      // Create vertical split
      await testHelper.createSplit('vertical');
      await page.waitForTimeout(500);
      
      // Check if we have two terminals
      const terminals = await page.$$('.terminal-wrapper');
      const terminalCount = terminals.length;
      
      if (terminalCount !== 2) {
        testResults.failed.push({
          test: 'Terminal Split',
          reason: `Expected 2 terminals, found ${terminalCount}`
        });
      } else {
        testResults.passed.push('Terminal Split');
      }
      
      expect(terminalCount).toBe(2);
      
      // Test switching between terminals
      await testHelper.switchToTerminal(0);
      await testHelper.executeCommand('echo "Terminal 1"');
      
      await testHelper.switchToTerminal(1);
      await testHelper.executeCommand('echo "Terminal 2"');
      
    } catch (error) {
      testResults.errors.push({
        type: 'Terminal Split Test',
        message: error.message
      });
      throw error;
    }
  });

  test('3. Copy/Paste Functionality', async () => {
    try {
      const testText = 'This is a paste test with special chars: 日本語 $@#!';
      await testHelper.testPaste(testText);
      
      // Check if pasted text appears
      const output = await testHelper.getTerminalOutput();
      const hasPastedText = output.includes(testText);
      
      if (!hasPastedText) {
        testResults.failed.push({
          test: 'Copy/Paste',
          reason: 'Pasted text not found in terminal output'
        });
      } else {
        testResults.passed.push('Copy/Paste');
      }
      
      expect(hasPastedText).toBe(true);
    } catch (error) {
      testResults.errors.push({
        type: 'Copy/Paste Test',
        message: error.message
      });
      throw error;
    }
  });

  test('4. Command Intelligence Hub', async () => {
    try {
      // Open Message Center
      const messageCenterWindow = await testHelper.openMessageCenter();
      
      if (!messageCenterWindow) {
        testResults.failed.push({
          test: 'Command Intelligence Hub',
          reason: 'Message Center window failed to open'
        });
        return;
      }
      
      // Execute some commands
      await testHelper.switchToTerminal(0);
      await testHelper.executeCommand('ls');
      await testHelper.executeCommand('pwd');
      await testHelper.executeCommand('echo "Test command"');
      
      // Wait for commands to be registered
      await page.waitForTimeout(1000);
      
      // Check if commands are tracked
      const realtimeView = await messageCenterWindow.$('.realtime-view');
      if (realtimeView) {
        const content = await realtimeView.textContent();
        const hasCommands = content.includes('ls') && content.includes('pwd');
        
        if (!hasCommands) {
          testResults.failed.push({
            test: 'Command Intelligence Hub',
            reason: 'Commands not tracked in Message Center'
          });
        } else {
          testResults.passed.push('Command Intelligence Hub');
        }
        
        expect(hasCommands).toBe(true);
      }
      
    } catch (error) {
      testResults.errors.push({
        type: 'Command Intelligence Hub Test',
        message: error.message
      });
      throw error;
    }
  });

  test('5. Terminal Responsiveness', async () => {
    try {
      const isResponsive = await testHelper.isTerminalResponsive();
      
      if (!isResponsive) {
        testResults.failed.push({
          test: 'Terminal Responsiveness',
          reason: 'Terminal not responding to commands'
        });
      } else {
        testResults.passed.push('Terminal Responsiveness');
      }
      
      expect(isResponsive).toBe(true);
    } catch (error) {
      testResults.errors.push({
        type: 'Terminal Responsiveness Test',
        message: error.message
      });
      throw error;
    }
  });

  test('6. Error Handling', async () => {
    try {
      // Execute an invalid command
      await testHelper.executeCommand('invalidcommand12345');
      await page.waitForTimeout(500);
      
      // Check if error is displayed
      const output = await testHelper.getTerminalOutput();
      const hasError = output.includes('command not found') || 
                      output.includes('not recognized') ||
                      output.includes('invalidcommand12345');
      
      if (!hasError) {
        testResults.failed.push({
          test: 'Error Handling',
          reason: 'Error message not displayed for invalid command'
        });
      } else {
        testResults.passed.push('Error Handling');
      }
      
      expect(hasError).toBe(true);
    } catch (error) {
      testResults.errors.push({
        type: 'Error Handling Test',
        message: error.message
      });
      throw error;
    }
  });

  test('7. Performance Test', async () => {
    try {
      const startTime = Date.now();
      
      // Execute multiple commands rapidly
      for (let i = 0; i < 10; i++) {
        await testHelper.typeCommand(`echo "Line ${i}"`);
        await page.keyboard.press('Enter');
      }
      
      // Wait for all commands to complete
      await testHelper.waitForOutput('Line 9', 5000);
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      if (duration > 5000) {
        testResults.failed.push({
          test: 'Performance',
          reason: `Commands took too long to execute: ${duration}ms`
        });
      } else {
        testResults.passed.push('Performance');
      }
      
      expect(duration).toBeLessThan(5000);
    } catch (error) {
      testResults.errors.push({
        type: 'Performance Test',
        message: error.message
      });
      throw error;
    }
  });

  test('8. UI Elements Visibility', async () => {
    try {
      // Check essential UI elements
      const elements = {
        terminal: await page.$('.terminal-wrapper'),
        statusBar: await page.$('.status-bar'),
        tabBar: await page.$('.tab-bar')
      };
      
      const missingElements = [];
      for (const [name, element] of Object.entries(elements)) {
        if (!element) {
          missingElements.push(name);
        }
      }
      
      if (missingElements.length > 0) {
        testResults.failed.push({
          test: 'UI Elements',
          reason: `Missing elements: ${missingElements.join(', ')}`
        });
      } else {
        testResults.passed.push('UI Elements');
      }
      
      expect(missingElements.length).toBe(0);
    } catch (error) {
      testResults.errors.push({
        type: 'UI Elements Test',
        message: error.message
      });
      throw error;
    }
  });

});