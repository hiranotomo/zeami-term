// Simple test to verify PTY works outside of Electron
const { spawn } = require('child_process');

console.log('Testing simple PTY...');

const shell = process.env.SHELL || '/bin/bash';
const proc = spawn('script', ['-q', '/dev/null', shell], {
  stdio: ['pipe', 'pipe', 'pipe'],
  env: {
    ...process.env,
    TERM: 'xterm-256color',
    PS1: '$ '
  }
});

proc.stdout.on('data', (data) => {
  process.stdout.write(data);
});

proc.stderr.on('data', (data) => {
  process.stderr.write(data);
});

proc.on('exit', (code) => {
  console.log('\nProcess exited with code:', code);
});

// Send some commands
setTimeout(() => {
  proc.stdin.write('echo "Hello from PTY"\n');
}, 500);

setTimeout(() => {
  proc.stdin.write('pwd\n');
}, 1000);

setTimeout(() => {
  proc.stdin.write('exit\n');
}, 2000);