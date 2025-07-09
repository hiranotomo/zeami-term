# Claude Code Paste Limitation and Workarounds

## Problem
Claude Code has a known issue with handling long paste operations. When pasting large amounts of text, Claude Code displays "Pasting text..." and may freeze or become unresponsive.

## Root Cause
This is a limitation in Claude Code itself, not in ZeamiTerm or xterm.js. Claude Code truncates long pasted text and shows it as "[Pasted text +linecnt]" which can cause processing issues.

## Workarounds

### 1. Use Piping Instead of Pasting
Instead of copying and pasting, pipe the content:
```bash
cat yourfile.txt | claude
```

### 2. Break Up Long Pastes
Paste text in smaller chunks (e.g., 500 lines at a time)

### 3. Use File Input
Save your content to a file and reference it in your prompt:
```bash
claude "Please analyze the content in myfile.txt"
```

### 4. Implement Auto-Chunking in ZeamiTerm
We could add a feature to automatically detect large pastes and break them into smaller chunks with delays between each chunk.

## Implementation Ideas for ZeamiTerm

### Auto-Chunk Large Pastes
```javascript
// In ZeamiTermManager.js
terminal.onPaste = (data) => {
  const lines = data.split('\n');
  const MAX_LINES_PER_CHUNK = 100;
  
  if (lines.length > MAX_LINES_PER_CHUNK) {
    // Warn user and offer to chunk
    showNotification('Large paste detected. Use Cmd+Shift+V for chunked paste.');
    return false;
  }
  
  return true; // Normal paste for small data
};
```

### Add Chunked Paste Command
Create a special command or keyboard shortcut (e.g., Cmd+Shift+V) that automatically chunks large pastes.

## References
- https://github.com/anthropics/claude-code/issues/143 (Better ergonomics for long text)
- https://github.com/anthropics/claude-code/issues/1554 (Hanging/Freezing issues)
- https://github.com/anthropics/claude-code/issues/619 (CLI hangs in WSL)