# ZeamiTerm Troubleshooting Guide

## Terminal Input Issues

### Problem: Characters not displaying correctly, cursor position wrong, last character missing

**Root Cause Analysis:**
The issue stems from conflicting terminal echo settings between:
1. The PTY (Pseudo Terminal) layer
2. xterm.js display layer
3. Shell terminal modes

**Solution Applied:**

1. **Python PTY Script Update** (`workingPty.js`):
   - Removed conflicting `stty -echo` commands
   - Enabled proper echo handling in PTY master attributes
   - Improved input buffering to handle single characters immediately
   - Reduced select timeout from 10ms to 1ms for better responsiveness

2. **Terminal Manager Update** (`terminalManager.js`):
   - Removed input buffering that was causing character delays
   - Send all input immediately to PTY
   - Removed `stty -echo` and `stty raw` commands that disabled echo

3. **PTY Configuration Update** (`ptyConfig.js`):
   - Changed echo mode from `false` to `true`
   - Changed canonical mode from `false` to `true` for proper line editing
   - Use `stty sane` to reset to sensible defaults
   - Keep flow control disabled with `-ixon`

**Testing the Fix:**
1. Build the application: `./create-standalone.sh`
2. Launch the application
3. Test typing single characters - they should appear immediately
4. Test backspace/delete - cursor should move correctly
5. Test multi-character input - all characters should display

**Additional Notes:**
- The PTY layer should handle echo, not xterm.js
- Terminal modes must be consistent between PTY and shell
- Input should flow: xterm.js → IPC → PTY → Shell → PTY → IPC → xterm.js