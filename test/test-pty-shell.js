/**
 * Test PTY with real shell
 */

const path = require('path');
const { WorkingPty } = require(path.join(__dirname, '../src/main/workingPty.js'));

console.log('Testing PTY with real shell...\n');

const pty = new WorkingPty({
  shell: process.env.SHELL || '/bin/bash',
  cols: 80,
  rows: 24
});

let outputReceived = false;

pty.on('data', (data) => {
  outputReceived = true;
  console.log('✓ Shell output received:');
  console.log('---');
  console.log(data);
  console.log('---');
});

pty.on('error', (error) => {
  console.error('❌ PTY error:', error);
});

pty.on('exit', ({ code, signal }) => {
  console.log(`\nPTY exited: code=${code}, signal=${signal}`);
  
  if (!outputReceived) {
    console.error('❌ No output was received from PTY!');
  }
  
  process.exit(outputReceived ? 0 : 1);
});

// Start PTY
console.log('Starting PTY with shell:', process.env.SHELL || '/bin/bash');
pty.spawn();

// Wait a bit for shell to initialize
setTimeout(() => {
  console.log('\nSending command: echo "Hello from ZeamiTerm"');
  pty.write('echo "Hello from ZeamiTerm"\n');
  
  // Wait for output
  setTimeout(() => {
    console.log('\nSending exit command');
    pty.write('exit\n');
  }, 1000);
}, 500);

// Force exit after 5 seconds
setTimeout(() => {
  console.error('\n❌ Test timeout - force exiting');
  pty.kill();
  process.exit(1);
}, 5000);