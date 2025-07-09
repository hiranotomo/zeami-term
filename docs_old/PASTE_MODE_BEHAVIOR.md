# Paste Mode Behavior - Data Flow Analysis

## Overview

This document traces the exact data flow from paste event in xterm.js to the Claude Code process through ZeamiTerm's architecture.

## Complete Data Flow

### 1. Paste Event in Browser (xterm.js)

When user pastes text:
- **xterm.js** with `bracketedPasteMode: true` automatically wraps pasted content with escape sequences
- Start marker: `\x1b[200~` (ESC [ 200 ~)
- End marker: `\x1b[201~` (ESC [ 201 ~)

### 2. ZeamiTerminal Layer (`src/xterm-zeami/ZeamiTerminal.js`)

```javascript
// Line 68-99: _handleData method
_handleData(data) {
    // Simple pass-through - let xterm.js handle bracketed paste mode
    console.log('[ZeamiTerminal] _handleData:', data.length, 'bytes');
    
    // Pass all data directly to PTY - including bracketed paste markers
    if (this._ptyHandler) {
        this._ptyHandler(data);
        return;
    }
}
```

**Key Points:**
- All paste handling code is DISABLED (commented out lines 101-209)
- Data flows through unchanged, including paste markers
- The `_ptyHandler` is set by ZeamiTermManager

### 3. ZeamiTermManager (`src/renderer/core/ZeamiTermManager.js`)

```javascript
// Line 673-709: setPtyHandler
session.terminal.setPtyHandler((data) => {
    console.log(`[Renderer] Sending user input to PTY: ${JSON.stringify(data)}`);
    
    // Enhanced logging for paste debugging
    const hasStartMarker = data.includes('\x1b[200~');
    const hasEndMarker = data.includes('\x1b[201~');
    
    if (hasStartMarker || hasEndMarker) {
        console.log('[PASTE DEBUG] Data from setPtyHandler contains markers');
        pasteDebugger.log('info', 'setPtyHandler received data with markers', { 
            hasStartMarker,
            hasEndMarker,
            length: data.length
        });
    }
    
    // Send data to PTY
    if (window.electronAPI) {
        window.electronAPI.sendInput(session.process.id, data);
    }
});
```

**Key Points:**
- Paste markers are logged but passed through unchanged
- Uses IPC to send data to main process via `electronAPI.sendInput`

### 4. IPC Bridge (`src/preload/index.js`)

```javascript
// Line 15: sendInput definition
sendInput: (id, data) => ipcRenderer.invoke('terminal:input', { id, data }),
```

**Key Points:**
- Simple pass-through using Electron IPC
- Data remains unchanged

### 5. Main Process Handler (`src/main/index.js`)

```javascript
// Line 147-151: Handle terminal:input
ipcMain.handle('terminal:input', async (event, { id, data }) => {
    console.log(`[Main] Received terminal:input: id=${id}, data length=${data ? data.length : 0}`);
    const service = terminalManager.getService();
    service.writeToProcess(id, data);
    return { success: true };
});
```

### 6. PtyService (`src/main/ptyService.js`)

```javascript
// Line 388-431: writeToProcess
writeToProcess(id, data) {
    // Debug bracketed paste sequences
    if (data.includes('\x1b[200~') || data.includes('\x1b[201~')) {
        const bytes = Array.from(Buffer.from(data)).map(b => `0x${b.toString(16).padStart(2, '0')}`);
        console.log(`[PtyService] Sending paste sequence:`, bytes.join(' '));
    }
    
    // If using WorkingPty, write directly to it
    if (processInfo.ptyWrapper) {
        processInfo.ptyWrapper.write(data);
        return;
    }
}
```

### 7. WorkingPty (`src/main/workingPty.js`)

```javascript
// Line 246-265: write method
write(data) {
    if (!this.process || !this.isRunning || !this.process.stdin) {
        console.log('[WorkingPty] Cannot write - process not ready');
        return;
    }
    
    try {
        // Debug log for received data
        console.log('[WorkingPty] Received input:', data.split('').map(c => {
            const code = c.charCodeAt(0);
            if (code < 32 || code === 127) return `\\x${code.toString(16).padStart(2, '0')}`;
            return c;
        }).join(''));
        
        // Write data to Python script's stdin
        this.process.stdin.write(data);
    } catch (error) {
        console.error('[WorkingPty] Write error:', error);
    }
}
```

### 8. Python PTY Script (embedded in `workingPty.js`)

The Python script creates a proper pseudo-terminal and forwards data:

```python
# Line 154-163: Main input loop
if sys.stdin in rfds:
    try:
        # Read available data (up to 65536 bytes for large pastes)
        data = os.read(sys.stdin.fileno(), 65536)
        if data:
            # Write immediately to PTY
            os.write(master_fd, data)
    except OSError as e:
        if e.errno != 11:  # Ignore EAGAIN
            pass
```

**Key Points:**
- Reads up to 64KB at once for large pastes
- Writes immediately to the PTY master file descriptor
- The shell process (Claude Code) reads from the PTY slave

### 9. Shell Process (Claude Code)

The shell process started by the Python script:
- Receives data through the PTY slave file descriptor
- Claude Code sees the bracketed paste markers
- Claude Code displays "Pasting ..." when it detects `\x1b[200~`
- Processes the pasted content
- Returns to normal mode when it sees `\x1b[201~`

## Important Configuration

### Terminal Creation (`ZeamiTermManager.js`)
```javascript
// Line 246: ENABLE bracketed paste mode
bracketedPasteMode: true,
```

### Environment Variables (`ptyConfig.js`)
```javascript
// Line 24-27: Tell Claude Code not to intercept paste
ZEAMI_DISABLE_PASTE_INTERCEPT: '1',
CLAUDE_DISABLE_PASTE_INDICATOR: '1',
```

### Shell Initialization (`workingPty.js` Python script)
```python
# Line 113: Enable bracketed paste mode support
os.environ['BRACKETED_PASTE_MODE'] = '1'
```

## Summary

1. **xterm.js** automatically adds paste markers when `bracketedPasteMode: true`
2. **ZeamiTerminal** passes data through unchanged (all custom paste handling disabled)
3. **IPC layer** transmits data to main process without modification
4. **PtyService** routes data to WorkingPty
5. **WorkingPty** writes to Python script stdin
6. **Python script** forwards to PTY master FD
7. **Claude Code** reads from PTY slave FD and handles paste mode

The entire flow preserves the bracketed paste escape sequences, allowing Claude Code to detect and properly handle paste operations. The "Pasting ..." indicator is displayed by Claude Code itself, not by ZeamiTerm.