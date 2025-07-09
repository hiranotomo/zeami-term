# Main Process API Documentation


## ansiParser

**File**: `main/ansiParser.js`

**Description**: ANSI Escape Sequence Parser Handles terminal control sequences for proper rendering

### Classes

#### AnsiParser

**Methods**:
- `colors()`
- `color()`

---

## autoUpdater

**File**: `main/autoUpdater.js`

**Description**: Auto Updater Module for ZeamiTerm Handles automatic updates using electron-updater

### Dependencies

- electron-updater
- electron
- electron-log
- ../../package.json

### Exports

- AutoUpdaterManager

### Classes

#### AutoUpdaterManager

**Methods**:
- `checkIfEnabled()`
- `if()`

---

## commandFormatter

**File**: `main/commandFormatter.js`

**Description**: Command Output Formatter Formats common command outputs for better readability

### Classes

#### CommandFormatter

---

## emulatedPty

**File**: `main/emulatedPty.js`

**Description**: Emulated PTY - Works without real PTY support Simulates PTY behavior for environments where true PTY is not available

### Dependencies

- child_process
- events
- os
- readline

### Classes

#### EmulatedPty

---

## finalPty

**File**: `main/finalPty.js`

**Description**: Final PTY implementation - Simple and working Uses available system commands without complex PTY handling

### Dependencies

- child_process
- events
- os

### Classes

#### FinalPty

---

## flowControlledPty

**File**: `main/flowControlledPty.js`

**Description**: Flow-controlled PTY implementation inspired by VS Code Handles input chunking and buffering to prevent freezing

### Dependencies

- child_process
- events
- os

### Classes

#### FlowControlledPty

---

## githubReleaseProvider

**File**: `main/githubReleaseProvider.js`

**Description**: Custom GitHub Release Provider for private repos with public releases

### Dependencies

- electron-updater
- electron

### Exports

- GitHubPublicReleaseProvider

### Classes

#### GitHubPublicReleaseProvider

**Methods**:
- `super()`

---

## index-old

**File**: `main/index-old.js`

### Dependencies

- electron
- path
- ./terminalProcessManager

### Functions

#### createWindow
```javascript
function createWindow()
```

### IPC Channels

- `zeami:start-session`: handle - No description
- `zeami:request-context`: handle - No description
- `zeami:send-input`: on - No description

---

## index

**File**: `main/index.js`

### Dependencies

- electron
- path
- ./ptyService
- ./sessionManager
- ./autoUpdater
- ./zeamiErrorRecorder
- ../../package.json
- electron
- electron
- electron

### Functions

#### createWindow
```javascript
function createWindow()
```

#### setupIpcHandlers
```javascript
function setupIpcHandlers()
```

#### createApplicationMenu
```javascript
function createApplicationMenu()
```

#### cleanupPtyProcesses
```javascript
async function cleanupPtyProcesses()
```

### IPC Channels

- `terminal:create`: handle - No description
- `terminal:input`: handle - No description
- `terminal:resize`: handle - No description
- `terminal:kill`: handle - No description
- `session:save`: handle - No description
- `session:load`: handle - No description
- `session:clear`: handle - No description
- `record-error`: handle - No description
- `menu-action`: on - No description

---

## messageRouter

**File**: `main/messageRouter.js`

### Classes

#### MessageRouter

**Methods**:
- `replace()`

---

## nodePty

**File**: `main/nodePty.js`

**Description**: Node-pty based PTY implementation Proper pseudo-terminal support with native bindings

### Dependencies

- events
- os
- node-pty
- ./unbufferPty

### Classes

#### NodePty

---

## patternDetector

**File**: `main/patternDetector.js`

### Classes

#### PatternDetector

---

## ptyBinding

**File**: `main/ptyBinding.js`

**Description**: PTY Binding - Platform-specific terminal implementation Inspired by VS Code's terminal implementation

### Dependencies

- events
- child_process
- os

### Classes

#### PtyBinding

---

## ptyConfig

**File**: `main/ptyConfig.js`

**Description**: PTY Configuration - Terminal mode settings for proper input handling

### Dependencies

- os

---

## ptyService

**File**: `main/ptyService.js`

**Description**: PTY Service - Advanced PTY management inspired by VS Code Handles process spawning, data buffering, and shell integration

### Dependencies

- events
- child_process
- os
- path
- fs
- ./ptyConfig
- ./patternDetector
- ./commandFormatter
- fs
- fs
- ./workingPty
- child_process
- readline

### Classes

#### PtyService

**Methods**:
- `super()`
- `Map()`
- `Map()`
- `Map()`
- `PatternDetector()`
- `Map()`
- `detectDefaultShell()`
- `homedir()`
- `prepareEnvironment()`

#### DataBufferer

#### FlowController

**Methods**:
- `now()`

---

## pythonPty

**File**: `main/pythonPty.js`

**Description**: Python-based PTY implementation Uses Python's built-in pty module for proper pseudo-terminal support

### Dependencies

- child_process
- events
- os
- path

### Classes

#### PythonPty

---

## robustPty

**File**: `main/robustPty.js`

**Description**: Robust PTY implementation that works without node-pty Uses different strategies based on platform availability

### Dependencies

- child_process
- events
- os
- child_pty
- child_pty

### Classes

#### RobustPty

---

## scriptPty

**File**: `main/scriptPty.js`

**Description**: Script-based PTY implementation Uses the 'script' command available on macOS/Linux to create a proper PTY

### Dependencies

- child_process
- events
- os
- fs
- path

### Classes

#### ScriptPty

---

## sessionManager

**File**: `main/sessionManager.js`

**Description**: Session Manager - Persist and restore terminal sessions

### Dependencies

- fs
- path
- os

### Classes

#### SessionManager

**Methods**:
- `join()`
- `ensureSessionDir()`

---

## simplePty

**File**: `main/simplePty.js`

**Description**: Simple PTY implementation using Unix commands Avoids complex expect scripts that can freeze

### Dependencies

- child_process
- events
- os
- fs
- path

### Classes

#### SimplePty

---

## simplestPty

**File**: `main/simplestPty.js`

**Description**: Simplest working PTY implementation Focus on getting basic functionality working

### Dependencies

- child_process
- events
- os

### Classes

#### SimplestPty

---

## terminalBackend

**File**: `main/terminalBackend.js`

### Dependencies

- events
- ./simplestPty

### Classes

#### TerminalBackend

---

## terminalProcessManager

**File**: `main/terminalProcessManager.js`

### Dependencies

- events
- ./zeamiInstance

### Classes

#### TerminalProcessManager

**Methods**:
- `super()`
- `Map()`

---

## unbufferPty

**File**: `main/unbufferPty.js`

**Description**: Unbuffer-based PTY implementation for macOS Simple and reliable PTY using unbuffer command

### Dependencies

- child_process
- events
- os
- child_process

### Classes

#### UnbufferPty

---

## updaterConfig

**File**: `main/updaterConfig.js`

**Description**: Auto-updater configuration for private repository

---

## workingPty

**File**: `main/workingPty.js`

**Description**: Working PTY implementation without native dependencies Based on VS Code's approach but using available system commands

### Dependencies

- child_process
- events
- os
- fs
- path

### Classes

#### WorkingPty

---

## zeamiErrorRecorder

**File**: `main/zeamiErrorRecorder.js`

**Description**: Zeami エラー記録システム エラーパターンをZeami CLIの学習システムに記録

### Dependencies

- child_process
- path
- fs
- fs

### Exports

- ZeamiErrorRecorder

### Classes

#### ZeamiErrorRecorder

**Methods**:
- `findZeamiCLI()`

---

## zeamiInstance

**File**: `main/zeamiInstance.js`

### Dependencies

- events
- ./messageRouter
- ./patternDetector
- ./terminalBackend

### Classes

#### ZeamiInstance

**Methods**:
- `super()`
- `MessageRouter()`
- `PatternDetector()`

---
