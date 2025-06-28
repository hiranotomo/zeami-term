/**
 * Test PTY output functionality
 */

const { spawn } = require('child_process');
const path = require('path');

console.log('Testing PTY output...\n');

// Test 1: Direct echo command
console.log('Test 1: Direct echo command');
const echo = spawn('echo', ['Hello from PTY']);
echo.stdout.on('data', (data) => {
  console.log('✓ Echo output:', data.toString());
});

// Test 2: Python availability
console.log('\nTest 2: Python availability');
const pythonVersion = spawn('python3', ['--version']);
pythonVersion.stdout.on('data', (data) => {
  console.log('✓ Python3 stdout:', data.toString());
});
pythonVersion.stderr.on('data', (data) => {
  console.log('✓ Python3 stderr:', data.toString());
});
pythonVersion.on('error', (error) => {
  console.error('❌ Python3 not available:', error.message);
});

// Test 3: WorkingPty
setTimeout(() => {
  console.log('\nTest 3: WorkingPty functionality');
  try {
    const { WorkingPty } = require(path.join(__dirname, '../src/main/workingPty.js'));
    const pty = new WorkingPty({
      shell: '/bin/echo',
      args: ['Test output from WorkingPty']
    });
    
    pty.on('data', (data) => {
      console.log('✓ WorkingPty output:', data);
    });
    
    pty.on('error', (error) => {
      console.error('❌ WorkingPty error:', error);
    });
    
    pty.on('exit', ({ code, signal }) => {
      console.log(`✓ WorkingPty exited: code=${code}, signal=${signal}`);
    });
    
    pty.spawn();
    
    // Test writing to PTY
    setTimeout(() => {
      console.log('\nTest 4: Writing to PTY');
      pty.write('test input\n');
    }, 1000);
    
    // Clean up after 3 seconds
    setTimeout(() => {
      pty.kill();
      process.exit(0);
    }, 3000);
    
  } catch (error) {
    console.error('❌ WorkingPty test failed:', error);
  }
}, 1000);