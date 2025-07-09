# Renderer Process API Documentation


## errorStateIndicator

**File**: `renderer/errorStateIndicator.js`

**Description**: エラー状態インジケーター Claude Codeの通信エラーを検知して視覚的にフィードバックを提供

### Classes

#### ErrorStateIndicator

**Methods**:
- `rgba()`

---

## fix-selection-final

**File**: `renderer/fix-selection-final.js`

**Description**: Final solution for xterm.js selection transparency Use hex format with alpha channel

### Classes

#### FinalSelectionFix

**Methods**:
- `rgba()`
- `120()`
- `150()`
- `200()`
- `5()`
- `rgba()`
- `init()`

---

## index

**File**: `renderer/index.js`

### Functions

#### initializeTerminal
```javascript
async function initializeTerminal()
```

#### startSession
```javascript
async function startSession()
```

#### setupIPCListeners
```javascript
function setupIPCListeners()
```

#### handlePatternDetected
```javascript
function handlePatternDetected(pattern)
```

#### showActionSuggestion
```javascript
function showActionSuggestion(action)
```

#### updateStatus
```javascript
function updateStatus(text, elementId)
```

---

## selection-debug

**File**: `renderer/selection-debug.js`

**Description**: Advanced debug script for xterm.js selection rendering This investigates the actual color values being used

---

## selection-fix-canvas

**File**: `renderer/selection-fix-canvas.js`

**Description**: Canvas/WebGL specific selection color fix for xterm.js This handles the different rendering approach used by Canvas/WebGL renderers

### Classes

#### CanvasSelectionFix

**Methods**:
- `rgba()`
- `waitForTerminals()`

---

## selection-override

**File**: `renderer/selection-override.js`

**Description**: Selection color override using Canvas/WebGL renderer hooks This approach directly modifies the renderer's selection layer

### Classes

#### SelectionOverride

---

## selectionFix

**File**: `renderer/selectionFix.js`

**Description**: Selection Fix for xterm.js Forces transparent selection by monitoring and overriding inline styles

### Classes

#### SelectionFix

**Methods**:
- `rgba()`

---

## splitManager

**File**: `renderer/splitManager.js`

**Description**: Split View Manager - Handles terminal split view with resizable panes

### Classes

#### SplitManager

**Methods**:
- `getElementById()`

---

## startup-animation

**File**: `renderer/startup-animation.js`

**Description**: Startup Animation for ZeamiTerm Matrix-style terminal initialization effect

### Classes

#### StartupAnimation

---

## terminal-basic

**File**: `renderer/terminal-basic.js`

### Classes

#### BasicTerminal

**Methods**:
- `setupUI()`
- `setupEventHandlers()`

---

## terminal-loader

**File**: `renderer/terminal-loader.js`

---

## terminal-patch

**File**: `renderer/terminal-patch.js`

**Description**: Terminal Patch - Direct override of xterm.js defaults This ensures our selection color is applied regardless of how xterm.js is initialized

### Functions

#### patchXtermDefaults
```javascript
function patchXtermDefaults()
```

---

## terminalManager

**File**: `renderer/terminalManager.js`

**Description**: Terminal Manager - Advanced xterm.js integration for ZeamiTerm Includes WebGL rendering, selection, search, and advanced tab management

### Classes

#### TerminalManager

**Methods**:
- `Map()`
- `selection()`

---

## themeManager-v2

**File**: `renderer/themeManager-v2.js`

**Description**: Theme Manager V2 for ZeamiTerm Properly handles xterm.js theme application for Canvas/WebGL renderers

### Classes

#### ThemeManagerV2

**Methods**:
- `Map()`

---

## themeManager

**File**: `renderer/themeManager.js`

**Description**: Theme Manager for ZeamiTerm Manages terminal and UI themes with CSS variable support

### Classes

#### ThemeManager

**Methods**:
- `Map()`

---

## updateNotifier

**File**: `renderer/updateNotifier.js`

**Description**: Update Notifier UI Component Shows update progress and notifications in the terminal

### Classes

#### UpdateNotifier

**Methods**:
- `createNotificationUI()`
- `setupEventListeners()`

---
