#!/usr/bin/env node

/**
 * Debug escape sequences in terminal
 * This script helps identify what escape sequences are being sent by Claude Code
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Log file for escape sequences
const logFile = path.join(__dirname, 'escape-sequences.log');
const stream = fs.createWriteStream(logFile, { flags: 'a' });

console.log('Escape Sequence Debugger');
console.log('========================');
console.log(`Logging to: ${logFile}`);
console.log('Press Ctrl+C to exit\n');

// Start a shell process
const shell = process.env.SHELL || '/bin/bash';
const child = spawn(shell, [], {
  stdio: ['pipe', 'pipe', 'pipe'],
  env: { ...process.env }
});

// Function to convert buffer to readable format
function bufferToDebugString(buffer) {
  let result = '';
  for (let i = 0; i < buffer.length; i++) {
    const byte = buffer[i];
    
    // Escape sequences
    if (byte === 0x1b) { // ESC
      result += '<ESC>';
    } else if (byte === 0x07) { // BEL
      result += '<BEL>';
    } else if (byte === 0x08) { // BS
      result += '<BS>';
    } else if (byte === 0x09) { // TAB
      result += '<TAB>';
    } else if (byte === 0x0a) { // LF
      result += '<LF>\n';
    } else if (byte === 0x0d) { // CR
      result += '<CR>';
    } else if (byte < 0x20 || byte > 0x7e) {
      // Non-printable characters
      result += `<0x${byte.toString(16).padStart(2, '0')}>`;
    } else {
      // Printable ASCII
      result += String.fromCharCode(byte);
    }
  }
  return result;
}

// Function to detect OSC sequences
function detectOSCSequences(buffer) {
  const text = buffer.toString();
  const oscPattern = /\x1b\](\d+);([^\x07\x1b]*)\x07/g;
  let match;
  const sequences = [];
  
  while ((match = oscPattern.exec(text)) !== null) {
    sequences.push({
      type: 'OSC',
      code: match[1],
      data: match[2],
      raw: match[0]
    });
  }
  
  return sequences;
}

// Log function
function log(prefix, data, buffer) {
  const timestamp = new Date().toISOString();
  const debugStr = bufferToDebugString(buffer);
  const oscSequences = detectOSCSequences(buffer);
  
  // Console output
  console.log(`[${prefix}] ${data}`);
  
  // File output
  stream.write(`\n[${timestamp}] ${prefix}\n`);
  stream.write(`Raw: ${debugStr}\n`);
  
  if (oscSequences.length > 0) {
    stream.write('OSC Sequences detected:\n');
    oscSequences.forEach(seq => {
      stream.write(`  OSC ${seq.code}: ${seq.data}\n`);
      
      // Special handling for known sequences
      if (seq.code === '133') {
        console.log(`  -> Shell Integration OSC 133: ${seq.data}`);
      } else if (seq.code === '633') {
        console.log(`  -> Custom OSC 633: ${seq.data}`);
        // Parse Claude-specific sequences
        if (seq.data.startsWith('ClaudeInput=')) {
          console.log('     🔵 Claude Input detected!');
        } else if (seq.data.startsWith('ClaudeOutput=')) {
          console.log('     🟢 Claude Output detected!');
        } else if (seq.data.startsWith('ClaudeCommand=')) {
          console.log('     🟡 Claude Command detected!');
        }
      } else if (seq.code === '7') {
        console.log(`  -> Directory change: ${seq.data}`);
      }
    });
  }
  
  stream.write('---\n');
}

// Handle stdout from shell
child.stdout.on('data', (data) => {
  log('OUT', data.toString(), data);
  process.stdout.write(data);
});

// Handle stderr from shell
child.stderr.on('data', (data) => {
  log('ERR', data.toString(), data);
  process.stderr.write(data);
});

// Handle stdin from user
process.stdin.on('data', (data) => {
  log('IN', data.toString(), data);
  child.stdin.write(data);
});

// Make stdin raw mode for better capture
process.stdin.setRawMode(true);

// Handle exit
child.on('exit', (code) => {
  console.log(`\nShell exited with code ${code}`);
  process.exit(code);
});

// Handle Ctrl+C
process.on('SIGINT', () => {
  console.log('\nExiting debugger...');
  child.kill();
  stream.end();
  process.exit(0);
});

console.log('\nType "claude" or run Claude Code to see escape sequences...\n');