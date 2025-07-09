# ZeamiTerm Renderer Process Guide

## Overview

レンダラープロセスは、ユーザーインターフェースとターミナル表示を管理します。xterm.jsを中心に、高度なターミナル機能を提供します。

## Core Components

### 1. Terminal Manager (`terminalManager.js`)

**責務**: ターミナルインスタンスの作成・管理、タブシステム、分割ビュー

**アーキテクチャ**:
```javascript
class TerminalManager {
  constructor() {
    this.terminals = new Map()     // terminalId → {terminal, fitAddon, ...}
    this.activeTerminalId = null
    this.terminalIdCounter = 0
    this.splitManager = new SplitManager(this)
    this.themeManager = new ThemeManager()
  }
}
```

**ターミナル作成フロー**:
```javascript
createTerminal() {
  // 1. DOM要素作成
  const wrapper = createTerminalWrapper()
  
  // 2. xterm.js インスタンス作成
  const terminal = new Terminal({
    theme: themeManager.getXtermTheme(),
    fontSize: 14,
    fontFamily: 'SF Mono, Monaco, Menlo, monospace',
    allowTransparency: true,
    macOptionIsMeta: true,
    scrollback: 10000
  })
  
  // 3. アドオン登録
  terminal.loadAddon(new WebglAddon())  // GPUレンダリング
  terminal.loadAddon(fitAddon)          // 自動サイズ調整
  terminal.loadAddon(searchAddon)       // 検索機能
  terminal.loadAddon(webLinksAddon)    // URLクリック
  
  // 4. イベントハンドラー設定
  setupTerminalHandlers(terminal, terminalId)
  
  // 5. バックエンド接続
  connectTerminal(terminalId)
}
```

**キーボードショートカット**:
- `Cmd/Ctrl+T`: 新規タブ
- `Cmd/Ctrl+W`: タブを閉じる
- `Cmd/Ctrl+K`: 画面クリア
- `Cmd/Ctrl+F`: 検索
- `Cmd/Ctrl+1-9`: タブ切り替え
- `Cmd/Ctrl+D`: 垂直分割
- `Cmd/Ctrl+Shift+D`: 水平分割

### 2. Theme Manager v2 (`themeManager-v2.js`)

**責務**: テーマシステムの統一管理

**テーマ構造**:
```javascript
{
  name: "Default Dark",
  colors: {
    terminal: {
      background: '#1e1e1e',
      foreground: '#cccccc',
      selectionBackground: '#7896C84D',  // 透明度付き選択色
      // ANSI 16色
    },
    ui: {
      background: '#252526',
      foreground: '#cccccc',
      tabBackground: '#2d2d30',
      // UIコンポーネント色
    }
  }
}
```

**テーマ適用プロセス**:
```javascript
applyTheme(themeName) {
  // 1. テーマファイル読み込み
  const theme = await loadTheme(themeName)
  
  // 2. ターミナルテーマ生成
  const xtermTheme = {
    background: theme.colors.terminal.background,
    foreground: theme.colors.terminal.foreground,
    selectionBackground: theme.colors.terminal.selectionBackground,
    // ... 他の色設定
  }
  
  // 3. 既存ターミナルに適用
  terminals.forEach(({terminal}) => {
    terminal.options.theme = xtermTheme
  })
  
  // 4. UI CSS変数更新
  updateUIStyles(theme.colors.ui)
}
```

### 3. Split Manager (`splitManager.js`)

**責務**: ターミナル分割ビューの実装

**分割レイアウト構造**:
```html
<div class="split-container horizontal">
  <div class="split-pane" style="flex: 1">
    <div class="terminal-wrapper">...</div>
  </div>
  <div class="split-splitter"></div>
  <div class="split-pane" style="flex: 1">
    <div class="terminal-wrapper">...</div>
  </div>
</div>
```

**リサイズ処理**:
```javascript
handleSplitterDrag(e) {
  const containerRect = container.getBoundingClientRect()
  const position = isHorizontal ? e.clientX : e.clientY
  const size = isHorizontal ? containerRect.width : containerRect.height
  
  // 10% - 90% の制限
  const ratio = Math.max(0.1, Math.min(0.9, position / size))
  
  pane1.style.flex = ratio
  pane2.style.flex = 1 - ratio
  
  // ターミナルのリサイズ
  resizeTerminals()
}
```

### 4. Error State Indicator (`errorStateIndicator.js`)

**責務**: エラーの視覚的フィードバック

**エラー検出パターン**:
```javascript
errorPatterns = {
  'Connection error': {
    color: '#ff6b6b',
    icon: '🔌',
    message: 'ネットワーク接続エラー'
  },
  'Request timed out': {
    color: '#ffa94d',
    icon: '⏱️',
    message: 'リクエストタイムアウト'
  },
  'OAuth token expired': {
    color: '#ff922b',
    icon: '🔑',
    message: 'トークンの有効期限切れ'
  }
}
```

**エラーバナー表示**:
```javascript
showError(pattern, originalText) {
  const banner = createErrorBanner(pattern)
  
  // スライドイン アニメーション
  banner.style.transform = 'translateY(-100%)'
  container.prepend(banner)
  
  requestAnimationFrame(() => {
    banner.style.transform = 'translateY(0)'
  })
  
  // 30秒後に自動非表示
  setTimeout(() => hideError(banner), 30000)
}
```

## xterm.js Integration Details

### 1. レンダラー選択

```javascript
// WebGL → Canvas フォールバック
try {
  const webglAddon = new WebglAddon()
  webglAddon.onContextLoss(() => {
    webglAddon.dispose()
    terminal.loadAddon(new CanvasAddon())
  })
  terminal.loadAddon(webglAddon)
} catch (e) {
  terminal.loadAddon(new CanvasAddon())
}
```

### 2. パフォーマンス最適化

```javascript
// テクスチャアトラス有効化
terminal.options.drawBoldTextInBrightColors = false
terminal.options.minimumContrastRatio = 1
terminal.options.allowTransparency = true

// スクロール最適化
terminal.attachCustomKeyEventHandler((e) => {
  if (e.type === 'keydown' && e.shiftKey) {
    // Shift + スクロールで10倍速
    terminal.scrollLines(e.deltaY > 0 ? 10 : -10)
    return false
  }
})
```

### 3. 選択とコピー

```javascript
// 自動コピー実装
terminal.onSelectionChange(() => {
  const selection = terminal.getSelection()
  if (selection) {
    navigator.clipboard.writeText(selection)
  }
})

// 右クリックペースト
terminal.element.addEventListener('contextmenu', (e) => {
  e.preventDefault()
  navigator.clipboard.readText().then(text => {
    terminal.paste(text)
  })
})
```

## DOM 操作パターン

### 1. タブシステム

```javascript
// タブ作成
function createTab(terminalId) {
  const tab = document.createElement('div')
  tab.className = 'terminal-tab'
  tab.dataset.terminalId = terminalId
  tab.innerHTML = `
    <span class="tab-title">Terminal ${terminalId}</span>
    <button class="tab-close">×</button>
  `
  
  // ドラッグ&ドロップ
  tab.draggable = true
  tab.addEventListener('dragstart', handleDragStart)
  tab.addEventListener('dragover', handleDragOver)
  tab.addEventListener('drop', handleDrop)
  
  return tab
}
```

### 2. 検索UI

```javascript
// オーバーレイ検索ボックス
function showSearchBox() {
  const searchBox = document.createElement('div')
  searchBox.className = 'search-overlay'
  searchBox.innerHTML = `
    <input type="text" class="search-input" placeholder="Search...">
    <button class="search-prev">↑</button>
    <button class="search-next">↓</button>
    <button class="search-close">×</button>
  `
  
  terminalWrapper.appendChild(searchBox)
  searchBox.querySelector('.search-input').focus()
}
```

## IPC 通信パターン

### 送信（Renderer → Main）

```javascript
// ターミナル入力
window.api.sendInput(terminalId, data)

// ターミナル作成
window.api.createTerminal()

// リサイズ通知
window.api.resizeTerminal(terminalId, cols, rows)

// エラー記録
window.api.recordError(errorType, errorMessage, suggestion)
```

### 受信（Main → Renderer）

```javascript
// ターミナルデータ
window.api.onTerminalData(terminalId, (data) => {
  const terminal = terminals.get(terminalId)?.terminal
  if (terminal) {
    terminal.write(data)
  }
})

// パターン検出
window.api.onPatternDetected(terminalId, (pattern) => {
  highlightPattern(terminalId, pattern)
})

// エラー通知
window.api.onError((error) => {
  errorStateIndicator.show(error)
})
```

## パフォーマンス考慮事項

### 1. イベントリスナー最適化

```javascript
// Passive リスナー使用
terminal.element.addEventListener('wheel', handleWheel, { passive: true })

// デバウンス処理
const debouncedResize = debounce(() => {
  fitAddon.fit()
}, 100)
window.addEventListener('resize', debouncedResize)
```

### 2. DOM更新最小化

```javascript
// クラスベースの表示切替
tab.classList.toggle('active', isActive)

// DocumentFragment使用
const fragment = document.createDocumentFragment()
tabs.forEach(tab => fragment.appendChild(tab))
tabContainer.appendChild(fragment)
```

### 3. メモリ管理

```javascript
// ターミナル破棄時のクリーンアップ
function disposeTerminal(terminalId) {
  const terminalData = terminals.get(terminalId)
  if (terminalData) {
    // アドオン破棄
    terminalData.webglAddon?.dispose()
    terminalData.searchAddon?.dispose()
    
    // ターミナル破棄
    terminalData.terminal.dispose()
    
    // DOM削除
    terminalData.wrapper.remove()
    
    // Map から削除
    terminals.delete(terminalId)
  }
}
```

## デバッグツール

### 1. ターミナル状態確認

```javascript
// コンソールでの確認
window.debugTerminals = () => {
  terminals.forEach((data, id) => {
    console.log(`Terminal ${id}:`, {
      rows: data.terminal.rows,
      cols: data.terminal.cols,
      buffer: data.terminal.buffer.active.length
    })
  })
}
```

### 2. パフォーマンス計測

```javascript
// レンダリング時間計測
const measure = performance.measure('render', 'render-start', 'render-end')
console.log(`Rendering took ${measure.duration}ms`)
```

## ベストプラクティス

1. **xterm.js アドオン**: 必要な機能のみロード
2. **イベント処理**: デバウンス/スロットル活用
3. **DOM操作**: バッチ更新、Virtual DOM的アプローチ
4. **メモリ**: 適切なクリーンアップ
5. **セキュリティ**: XSS対策、入力サニタイゼーション

## 今後の拡張ポイント

1. **プラグインシステム**: カスタムアドオン対応
2. **テーマエディタ**: リアルタイムプレビュー
3. **マルチプロファイル**: 設定の切り替え
4. **リモートターミナル**: SSH/WebSocket対応