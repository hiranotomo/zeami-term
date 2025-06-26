#!/usr/bin/env node

/**
 * Test script to verify PTY functionality
 */

console.log('Testing PTY implementations...\n');

// Test 1: Node-pty
console.log('1. Testing node-pty:');
try {
  const pty = require('node-pty');
  const ptyProcess = pty.spawn('bash', [], {
    name: 'xterm-256color',
    cols: 80,
    rows: 30,
    cwd: process.env.HOME,
    env: process.env
  });

  console.log('   ✓ node-pty loaded successfully');
  console.log('   ✓ PTY spawned with PID:', ptyProcess.pid);
  
  ptyProcess.onData((data) => {
    console.log('   Output:', JSON.stringify(data.substring(0, 50) + '...'));
  });

  // Test writing
  setTimeout(() => {
    console.log('   Writing "echo test"...');
    ptyProcess.write('echo test\r');
  }, 1000);

  setTimeout(() => {
    ptyProcess.kill();
    console.log('   ✓ PTY killed\n');
    testUnbufferPty();
  }, 2000);

} catch (error) {
  console.log('   ✗ node-pty error:', error.message);
  console.log('   You may need to run: npm rebuild node-pty\n');
  testUnbufferPty();
}

// Test 2: UnbufferPty
function testUnbufferPty() {
  console.log('2. Testing UnbufferPty:');
  const { UnbufferPty } = require('./src/main/unbufferPty');
  
  const pty = new UnbufferPty({
    shell: '/bin/bash',
    cwd: process.env.HOME,
    env: process.env
  });

  pty.on('data', (data) => {
    console.log('   Output:', JSON.stringify(data.substring(0, 50) + '...'));
  });

  pty.on('error', (error) => {
    console.log('   ✗ Error:', error.message);
  });

  pty.spawn();
  
  setTimeout(() => {
    console.log('   Writing "echo test"...');
    pty.write('echo test\n');
  }, 1000);

  setTimeout(() => {
    pty.kill();
    console.log('   ✓ Process killed\n');
    process.exit(0);
  }, 2000);
}