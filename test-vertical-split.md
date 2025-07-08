# Test Plan for Vertical Split Corruption Fix

## Problem Summary
When creating a terminal in vertical split mode, Claude Code output appears corrupted initially. The corruption is fixed after switching to tab/horizontal mode and typing something.

## Root Cause
Race condition between:
1. Terminal creation with default dimensions
2. PTY process creation with wrong dimensions
3. Delayed terminal fitting (50ms later)

Claude Code starts outputting immediately with wrong cols/rows values, causing corruption.

## Fix Applied
Added pre-fitting logic before PTY creation when in split mode:
- In `ZeamiTermManager.createTerminal()`, if layout is not 'tabs', immediately fit the terminal
- This ensures correct dimensions are passed to PTY creation
- Prevents Claude Code from starting with wrong terminal size

## Test Steps

### Test 1: Initial Vertical Split
1. Start ZeamiTerm fresh
2. Click vertical split button immediately
3. Observe: Claude Code output should NOT be corrupted
4. Type some commands - output should remain clean

### Test 2: Tab to Vertical Split
1. Start ZeamiTerm in tab mode
2. Create 2 terminals
3. Switch to vertical split
4. Both terminals should display correctly

### Test 3: Create New Terminal in Vertical Split
1. Start in vertical split with 1 terminal
2. The second terminal auto-creates
3. Claude Code output in second terminal should be clean

### Test 4: Performance Check
1. Ensure no noticeable delay when creating terminals
2. Verify console shows "Pre-fit terminal to XXxXX before PTY creation" message

## Expected Results
- No corruption in vertical split mode
- Clean Claude Code output from the start
- No need to switch modes to "fix" the display