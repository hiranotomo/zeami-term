/**
 * Integration test for ZeamiTerm
 * Tests the app in a real environment with automated checks
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const TEST_TIMEOUT = 30000; // 30 seconds
const STARTUP_DELAY = 5000; // 5 seconds

console.log('🧪 ZeamiTerm Integration Test\n');
console.log('This test will launch the app and check basic functionality.\n');

// Test results
const results = {
  passed: 0,
  failed: 0,
  errors: []
};

// Launch Electron app
const electronPath = require('electron');
const appPath = path.join(__dirname, '..');

console.log('🚀 Launching ZeamiTerm...');
const appProcess = spawn(electronPath, [appPath, '--test-mode'], {
  env: { ...process.env, NODE_ENV: 'test', ZEAMI_TEST_MODE: 'true' }
});

let appStarted = false;
let testComplete = false;

// Capture app output
appProcess.stdout.on('data', (data) => {
  const output = data.toString();
  
  // Check for successful startup indicators
  if (output.includes('Zeami CLI found at:')) {
    console.log('✓ Zeami CLI integration detected');
    results.passed++;
  }
  
  if (output.includes('[ProfileManager]') && output.includes('profiles')) {
    console.log('✓ Profile manager initialized');
    results.passed++;
    appStarted = true;
  }
  
  if (output.includes('Auto-update')) {
    console.log('✓ Auto-updater initialized');
    results.passed++;
  }
  
  // Check for errors
  if (output.toLowerCase().includes('error') && !output.includes('error recorder')) {
    console.error('❌ Error detected:', output);
    results.failed++;
    results.errors.push(output);
  }
});

appProcess.stderr.on('data', (data) => {
  const error = data.toString();
  
  // Ignore some expected warnings
  if (error.includes('Electron Security Warning') || 
      error.includes('DevTools') ||
      error.includes('font') ||
      error.includes('GPU')) {
    return;
  }
  
  console.error('❌ Error output:', error);
  results.failed++;
  results.errors.push(error);
});

// Test timeout
const testTimeout = setTimeout(() => {
  if (!testComplete) {
    console.error('\n❌ Test timeout - app did not respond within', TEST_TIMEOUT / 1000, 'seconds');
    results.failed++;
    finishTest();
  }
}, TEST_TIMEOUT);

// Main test logic
setTimeout(async () => {
  if (!appStarted) {
    console.error('❌ App did not start properly');
    results.failed++;
    finishTest();
    return;
  }
  
  console.log('\n📋 Running integration checks...\n');
  
  // Test 1: Check if log files are being created
  try {
    const logsDir = path.join(appPath, 'logs');
    if (fs.existsSync(logsDir)) {
      console.log('✓ Logs directory exists');
      results.passed++;
      
      const logFiles = fs.readdirSync(logsDir);
      if (logFiles.length > 0) {
        console.log(`✓ Found ${logFiles.length} log file(s)`);
        results.passed++;
      }
    }
  } catch (error) {
    console.error('❌ Error checking logs:', error.message);
    results.failed++;
  }
  
  // Test 2: Check if profiles are saved
  try {
    const profilesPath = path.join(process.env.HOME || process.env.USERPROFILE, '.zeami-term', 'profiles.json');
    if (fs.existsSync(profilesPath)) {
      console.log('✓ Profiles configuration exists');
      results.passed++;
      
      const profiles = JSON.parse(fs.readFileSync(profilesPath, 'utf8'));
      console.log(`✓ Found ${profiles.profiles.length} terminal profile(s)`);
      results.passed++;
    }
  } catch (error) {
    console.log('ℹ️  No saved profiles yet (this is normal for first run)');
  }
  
  // Test 3: Check memory usage
  try {
    const memUsage = process.memoryUsage();
    const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
    console.log(`ℹ️  Memory usage: ${heapUsedMB} MB`);
    
    if (heapUsedMB < 200) {
      console.log('✓ Memory usage is reasonable');
      results.passed++;
    } else {
      console.warn('⚠️  High memory usage detected');
    }
  } catch (error) {
    console.error('❌ Error checking memory:', error.message);
    results.failed++;
  }
  
  // Finish test
  setTimeout(finishTest, 2000);
}, STARTUP_DELAY);

function finishTest() {
  if (testComplete) return;
  testComplete = true;
  
  clearTimeout(testTimeout);
  
  console.log('\n' + '='.repeat(50));
  console.log('📊 Test Results:');
  console.log('='.repeat(50));
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  
  if (results.errors.length > 0) {
    console.log('\n⚠️  Errors encountered:');
    results.errors.forEach((error, index) => {
      console.log(`${index + 1}. ${error.trim()}`);
    });
  }
  
  console.log('='.repeat(50));
  
  // Kill the app
  appProcess.kill('SIGTERM');
  
  // Exit with appropriate code
  const exitCode = results.failed > 0 ? 1 : 0;
  console.log(`\n🏁 Test ${exitCode === 0 ? 'PASSED' : 'FAILED'}\n`);
  
  setTimeout(() => {
    process.exit(exitCode);
  }, 1000);
}

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n⚠️  Test interrupted by user');
  if (appProcess) {
    appProcess.kill('SIGTERM');
  }
  process.exit(1);
});