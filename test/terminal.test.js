/**
 * Terminal Test Suite - Automated testing for ZeamiTerm
 * Tests all terminal functionality including input/output, PTY behavior, and xterm.js integration
 */

const { app } = require('electron');
const path = require('path');
const { PtyService } = require('../src/main/ptyService');

// Test utilities
class TestRunner {
  constructor() {
    this.tests = [];
    this.results = [];
    this.ptyService = null;
  }
  
  async setup() {
    console.log('🔧 Setting up test environment...');
    this.ptyService = new PtyService();
  }
  
  async teardown() {
    console.log('🧹 Cleaning up test environment...');
    if (this.ptyService) {
      // Kill all processes
      this.ptyService.processes.forEach((_, id) => {
        this.ptyService.killProcess(id);
      });
    }
  }
  
  test(name, fn) {
    this.tests.push({ name, fn });
  }
  
  async run() {
    console.log(`\n🧪 Running ${this.tests.length} tests...\n`);
    
    await this.setup();
    
    for (const test of this.tests) {
      try {
        console.log(`⏳ ${test.name}`);
        const startTime = Date.now();
        
        await test.fn();
        
        const duration = Date.now() - startTime;
        console.log(`✅ ${test.name} (${duration}ms)`);
        
        this.results.push({
          name: test.name,
          status: 'passed',
          duration
        });
      } catch (error) {
        console.log(`❌ ${test.name}`);
        console.error(`   ${error.message}`);
        
        this.results.push({
          name: test.name,
          status: 'failed',
          error: error.message,
          stack: error.stack
        });
      }
    }
    
    await this.teardown();
    
    this.printSummary();
  }
  
  printSummary() {
    console.log('\n📊 Test Summary\n');
    
    const passed = this.results.filter(r => r.status === 'passed').length;
    const failed = this.results.filter(r => r.status === 'failed').length;
    const total = this.results.length;
    
    console.log(`Total: ${total}`);
    console.log(`Passed: ${passed} ✅`);
    console.log(`Failed: ${failed} ❌`);
    
    if (failed > 0) {
      console.log('\n❌ Failed Tests:');
      this.results
        .filter(r => r.status === 'failed')
        .forEach(r => {
          console.log(`\n  ${r.name}:`);
          console.log(`    ${r.error}`);
        });
    }
    
    const exitCode = failed > 0 ? 1 : 0;
    process.exit(exitCode);
  }
  
  // Assertion helpers
  assert(condition, message) {
    if (!condition) {
      throw new Error(message || 'Assertion failed');
    }
  }
  
  assertEqual(actual, expected, message) {
    if (actual !== expected) {
      throw new Error(
        message || `Expected ${expected}, but got ${actual}`
      );
    }
  }
  
  assertContains(haystack, needle, message) {
    if (!haystack.includes(needle)) {
      throw new Error(
        message || `Expected "${haystack}" to contain "${needle}"`
      );
    }
  }
  
  async waitFor(condition, timeout = 5000) {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      if (await condition()) {
        return true;
      }
      await this.delay(100);
    }
    
    throw new Error('Timeout waiting for condition');
  }
  
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Create test runner
const runner = new TestRunner();

// Test 1: Basic PTY creation
runner.test('Create PTY process', async function() {
  const result = await runner.ptyService.createProcess({
    shell: '/bin/bash',
    cwd: process.cwd()
  });
  
  runner.assert(result.id, 'Process should have an ID');
  runner.assert(result.pid > 0, 'Process should have a valid PID');
  runner.assertEqual(result.shell, '/bin/bash', 'Shell should be bash');
});

// Test 2: Write and read data
runner.test('Write and read data from PTY', async function() {
  const result = await runner.ptyService.createProcess();
  let outputData = '';
  
  // Listen for data
  runner.ptyService.on('data', ({ id, data }) => {
    if (id === result.id) {
      outputData += data;
    }
  });
  
  // Send echo command
  runner.ptyService.writeToProcess(result.id, 'echo "Hello ZeamiTerm"\n');
  
  // Wait for output
  await runner.waitFor(() => outputData.includes('Hello ZeamiTerm'));
  
  runner.assertContains(outputData, 'Hello ZeamiTerm', 'Output should contain our message');
});

// Test 3: Multiple processes
runner.test('Handle multiple PTY processes', async function() {
  const process1 = await runner.ptyService.createProcess();
  const process2 = await runner.ptyService.createProcess();
  
  runner.assert(process1.id !== process2.id, 'Process IDs should be unique');
  runner.assert(process1.pid !== process2.pid, 'Process PIDs should be different');
  
  // Both processes should be in the map
  runner.assertEqual(runner.ptyService.processes.size, 2, 'Should have 2 processes');
});

// Test 4: Process termination
runner.test('Terminate PTY process', async function() {
  const result = await runner.ptyService.createProcess();
  let exitReceived = false;
  
  runner.ptyService.on('exit', ({ id }) => {
    if (id === result.id) {
      exitReceived = true;
    }
  });
  
  // Kill the process
  runner.ptyService.killProcess(result.id);
  
  // Wait for exit event
  await runner.waitFor(() => exitReceived);
  
  runner.assert(exitReceived, 'Should receive exit event');
  runner.assertEqual(runner.ptyService.processes.has(result.id), false, 'Process should be removed from map');
});

// Test 5: Environment variables
runner.test('PTY environment variables', async function() {
  const result = await runner.ptyService.createProcess({
    env: { TEST_VAR: 'zeami_test_123' }
  });
  
  let outputData = '';
  
  runner.ptyService.on('data', ({ id, data }) => {
    if (id === result.id) {
      outputData += data;
    }
  });
  
  // Check environment variable
  runner.ptyService.writeToProcess(result.id, 'echo $TEST_VAR\n');
  
  await runner.waitFor(() => outputData.includes('zeami_test_123'));
  
  runner.assertContains(outputData, 'zeami_test_123', 'Environment variable should be set');
});

// Test 6: Working directory
runner.test('PTY working directory', async function() {
  const testDir = '/tmp';
  const result = await runner.ptyService.createProcess({
    cwd: testDir
  });
  
  let outputData = '';
  
  runner.ptyService.on('data', ({ id, data }) => {
    if (id === result.id) {
      outputData += data;
    }
  });
  
  // Check working directory
  runner.ptyService.writeToProcess(result.id, 'pwd\n');
  
  await runner.waitFor(() => outputData.includes(testDir));
  
  runner.assertContains(outputData, testDir, 'Working directory should be set correctly');
});

// Test 7: Input buffering and flow control
runner.test('Input flow control', async function() {
  const result = await runner.ptyService.createProcess();
  
  // Send a large amount of data
  const largeText = 'x'.repeat(1000);
  runner.ptyService.writeToProcess(result.id, `echo "${largeText}"\n`);
  
  // Flow controller should handle this without issues
  await runner.delay(1000);
  
  // Process should still be running
  const processInfo = runner.ptyService.processes.get(result.id);
  runner.assert(processInfo && processInfo.isRunning, 'Process should still be running');
});

// Test 8: Special characters and escape sequences
runner.test('Handle special characters', async function() {
  const result = await runner.ptyService.createProcess();
  let outputData = '';
  
  runner.ptyService.on('data', ({ id, data }) => {
    if (id === result.id) {
      outputData += data;
    }
  });
  
  // Test special characters
  const specialChars = 'Hello\tWorld\nNew Line\rCarriage Return';
  runner.ptyService.writeToProcess(result.id, `echo -e "${specialChars}"\n`);
  
  await runner.waitFor(() => outputData.includes('Hello') && outputData.includes('World'));
  
  runner.assert(outputData.length > 0, 'Should receive output with special characters');
});

// Test 9: Resize functionality
runner.test('Resize PTY', async function() {
  const result = await runner.ptyService.createProcess({
    cols: 80,
    rows: 24
  });
  
  // Resize the terminal
  runner.ptyService.resizeProcess(result.id, 120, 40);
  
  // Process should still be running after resize
  const processInfo = runner.ptyService.processes.get(result.id);
  runner.assert(processInfo && processInfo.isRunning, 'Process should still be running after resize');
  runner.assertEqual(processInfo.config.cols, 120, 'Columns should be updated');
  runner.assertEqual(processInfo.config.rows, 40, 'Rows should be updated');
});

// Test 10: Error handling
runner.test('Handle invalid process ID', async function() {
  const invalidId = 'invalid-process-id';
  
  // Should not throw, just log warning
  runner.ptyService.writeToProcess(invalidId, 'test');
  runner.ptyService.killProcess(invalidId);
  runner.ptyService.resizeProcess(invalidId, 80, 24);
  
  // All operations should complete without throwing
  runner.assert(true, 'Invalid operations should not throw');
});

// Run all tests
if (require.main === module) {
  runner.run().catch(error => {
    console.error('Test runner failed:', error);
    process.exit(1);
  });
}

module.exports = { TestRunner };