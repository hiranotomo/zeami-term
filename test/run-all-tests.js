#!/usr/bin/env node
/**
 * Run All Tests - Comprehensive test runner for ZeamiTerm
 * Executes unit tests, integration tests, E2E tests, and performance tests
 */

const { spawn } = require('child_process');
const chalk = require('chalk');

// Simple chalk implementation if not available
const colors = {
  green: (text) => `\x1b[32m${text}\x1b[0m`,
  red: (text) => `\x1b[31m${text}\x1b[0m`,
  yellow: (text) => `\x1b[33m${text}\x1b[0m`,
  blue: (text) => `\x1b[34m${text}\x1b[0m`,
  cyan: (text) => `\x1b[36m${text}\x1b[0m`,
  bold: (text) => `\x1b[1m${text}\x1b[0m`
};

class TestRunner {
  constructor() {
    this.results = [];
    this.startTime = Date.now();
  }
  
  async runCommand(name, command, args = []) {
    console.log(`\n${colors.cyan('▶')} Running ${colors.bold(name)}...`);
    console.log(`  ${colors.yellow('$')} ${command} ${args.join(' ')}\n`);
    
    return new Promise((resolve) => {
      const startTime = Date.now();
      const proc = spawn(command, args, {
        stdio: 'inherit',
        shell: true
      });
      
      proc.on('close', (code) => {
        const duration = Date.now() - startTime;
        const status = code === 0 ? 'PASSED' : 'FAILED';
        const color = code === 0 ? colors.green : colors.red;
        
        console.log(`\n${color('●')} ${name}: ${color(status)} (${duration}ms)\n`);
        
        this.results.push({
          name,
          status,
          code,
          duration
        });
        
        resolve(code);
      });
      
      proc.on('error', (err) => {
        console.error(colors.red(`Error running ${name}:`), err);
        this.results.push({
          name,
          status: 'ERROR',
          code: -1,
          duration: Date.now() - startTime,
          error: err.message
        });
        resolve(-1);
      });
    });
  }
  
  async runAllTests() {
    console.log(colors.bold(colors.cyan('\n🧪 ZeamiTerm Comprehensive Test Suite\n')));
    console.log('This will run all test categories:\n');
    console.log('  1. Unit Tests (Phase 3 features)');
    console.log('  2. Integration Tests');
    console.log('  3. E2E Tests (Basic functionality)');
    console.log('  4. E2E Tests (Phase 3 features)');
    console.log('  5. Performance Tests\n');
    
    // 1. Unit Tests
    console.log(colors.bold('\n═══ UNIT TESTS ═══'));
    
    await this.runCommand(
      'Shell Integration Tests',
      'npm', ['test', '--', 'test/shell-integration.test.js']
    );
    
    await this.runCommand(
      'Enhanced Link Provider Tests',
      'npm', ['test', '--', 'test/enhanced-link-provider.test.js']
    );
    
    await this.runCommand(
      'Profile Selector Tests',
      'npm', ['test', '--', 'test/profile-selector.test.js']
    );
    
    // 2. Integration Tests
    console.log(colors.bold('\n═══ INTEGRATION TESTS ═══'));
    
    await this.runCommand(
      'Integration Test',
      'npm', ['run', 'test:integration']
    );
    
    // 3. E2E Tests - Basic
    console.log(colors.bold('\n═══ E2E TESTS (Basic) ═══'));
    
    await this.runCommand(
      'Basic Functionality E2E',
      'npm', ['run', 'test:e2e', '--', 'test/e2e/basic-functionality.test.js']
    );
    
    // 4. E2E Tests - Phase 3
    console.log(colors.bold('\n═══ E2E TESTS (Phase 3) ═══'));
    
    await this.runCommand(
      'Phase 3 Features E2E',
      'npm', ['run', 'test:e2e', '--', 'test/e2e/phase3-features.test.js']
    );
    
    // 5. Performance Tests (optional)
    const runPerf = process.argv.includes('--perf');
    if (runPerf) {
      console.log(colors.bold('\n═══ PERFORMANCE TESTS ═══'));
      console.log(colors.yellow('Note: Performance tests require a running application\n'));
      
      await this.runCommand(
        'Performance Test Suite',
        'node', ['test/run-performance-test.js']
      );
    } else {
      console.log(colors.yellow('\n⚠️  Skipping performance tests (use --perf to include)'));
    }
    
    // Summary
    this.printSummary();
  }
  
  printSummary() {
    const totalDuration = Date.now() - this.startTime;
    const passed = this.results.filter(r => r.status === 'PASSED').length;
    const failed = this.results.filter(r => r.status === 'FAILED').length;
    const errors = this.results.filter(r => r.status === 'ERROR').length;
    
    console.log(colors.bold('\n═══ TEST SUMMARY ═══\n'));
    
    // Results table
    console.log('Test Results:');
    console.log('─'.repeat(60));
    
    this.results.forEach(result => {
      const statusColor = 
        result.status === 'PASSED' ? colors.green :
        result.status === 'FAILED' ? colors.red :
        colors.yellow;
      
      const name = result.name.padEnd(35);
      const status = statusColor(result.status.padEnd(8));
      const duration = `${result.duration}ms`.padStart(10);
      
      console.log(`  ${name} ${status} ${duration}`);
    });
    
    console.log('─'.repeat(60));
    
    // Summary stats
    console.log(`\nTotal Tests: ${this.results.length}`);
    console.log(`  ${colors.green('✓ Passed:')} ${passed}`);
    if (failed > 0) {
      console.log(`  ${colors.red('✗ Failed:')} ${failed}`);
    }
    if (errors > 0) {
      console.log(`  ${colors.yellow('⚠ Errors:')} ${errors}`);
    }
    
    console.log(`\nTotal Duration: ${(totalDuration / 1000).toFixed(2)}s`);
    
    // Final status
    const allPassed = failed === 0 && errors === 0;
    if (allPassed) {
      console.log(colors.bold(colors.green('\n✅ All tests passed!\n')));
    } else {
      console.log(colors.bold(colors.red('\n❌ Some tests failed\n')));
      process.exit(1);
    }
  }
}

// Main execution
async function main() {
  const runner = new TestRunner();
  
  try {
    await runner.runAllTests();
  } catch (error) {
    console.error(colors.red('\n❌ Test runner error:'), error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

module.exports = { TestRunner };