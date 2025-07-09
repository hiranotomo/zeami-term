# ZeamiTerm 技術実装詳細

## アーキテクチャ概要

ZeamiTermは、Electronのマルチプロセスアーキテクチャを活用した設計となっています。

```
┌─────────────────────────────────────────────────────────┐
│                    Main Process                          │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────┐ │
│  │   main.js   │  │ sessionMgr   │  │  ipcHandlers   │ │
│  └──────┬──────┘  └──────┬───────┘  └────────┬───────┘ │
│         │                │                    │         │
│         └────────────────┴────────────────────┘         │
│                          │                              │
│                     IPC Bridge                          │
│                          │                              │
└──────────────────────────┼──────────────────────────────┘
                           │
┌──────────────────────────┼──────────────────────────────┐
│                    Renderer Process                      │
│                          │                              │
│  ┌─────────────┐  ┌──────┴───────┐  ┌────────────────┐ │
│  │terminalMgr  │  │  xtermView   │  │  splitManager  │ │
│  └──────┬──────┘  └──────┬───────┘  └────────┬───────┘ │
│         │                │                    │         │
│         └────────────────┴────────────────────┘         │
│                          │                              │
│                    Node PTY Process                     │
│                          │                              │
│  ┌─────────────────────────────────────────────────┐   │
│  │              Shell (zsh/bash/fish)               │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

## コンポーネント詳細

### 1. Main Process (main/index.js)

メインプロセスは、アプリケーションのライフサイクル管理とウィンドウ作成を担当します。

```javascript
// ウィンドウ作成の最適化設定
const mainWindow = new BrowserWindow({
  width: 1200,
  height: 800,
  minWidth: 600,
  minHeight: 400,
  titleBarStyle: 'hiddenInset',
  webPreferences: {
    preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
    contextIsolation: true,
    nodeIntegration: false,
    sandbox: true,
    webSecurity: true
  }
});
```

### 2. Terminal Manager (renderer/terminalManager.js)

ターミナルインスタンスの管理とライフサイクル制御を行います。

#### 主要メソッド

```javascript
class TerminalManager {
  async createTerminal(config = {}) {
    const terminalId = `term-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // ターミナルビューの作成
    const terminalView = new TerminalView(container, {
      id: terminalId,
      cwd: config.cwd || process.env.HOME,
      env: this.getEnvironment(config),
      ...config
    });
    
    // セッションの登録
    this.sessions.set(terminalId, {
      id: terminalId,
      view: terminalView,
      config: config,
      createdAt: new Date()
    });
    
    return terminalId;
  }
}
```

### 3. Terminal View (renderer/terminalView.js)

xterm.jsのラッパーとして、ターミナルUIの管理を行います。

#### パフォーマンス最適化の実装

```javascript
initializeTerminal() {
  // WebGL2サポートチェック
  const supportsWebGL2 = (() => {
    try {
      const canvas = document.createElement('canvas');
      return !!canvas.getContext('webgl2');
    } catch (e) {
      return false;
    }
  })();
  
  this.rendererType = supportsWebGL2 ? 'webgl' : 'canvas';
  
  // ターミナル初期化
  this.terminal = new Terminal({
    fontFamily: '"SF Mono", Monaco, "Cascadia Code", "Roboto Mono", Menlo, monospace',
    fontSize: 14,
    lineHeight: 1.2,
    letterSpacing: 0,
    cursorBlink: true,
    cursorStyle: 'block',
    bellStyle: 'none',
    allowTransparency: true,
    theme: this.getVSCodeTheme(),
    scrollback: 50000,
    rendererType: this.rendererType,
    allowProposedApi: true,
    fastScrollModifier: 'shift',
    smoothScrollDuration: 125
  });
}
```

### 4. Working PTY (renderer/workingPty.js)

PTYプロセスとの通信を管理し、データストリームを処理します。

#### UTF-8対応の実装

```javascript
const ptyProcess = spawn(shell, args, {
  name: 'xterm-256color',
  cols: 80,
  rows: 24,
  cwd: cwd,
  env: env,
  encoding: 'utf8'  // UTF-8エンコーディング
});

// データの即時転送
ptyProcess.onData((data) => {
  // バッファリングせずに即座に出力
  process.stdout.write(data);
});
```

### 5. Shell Configuration (renderer/shellConfig.js)

シェルの初期化と環境設定を管理します。

#### Claude Code統合

```javascript
getShellInitCommands(shell) {
  const commands = [];
  
  // 基本的な環境設定
  commands.push('export TERM=xterm-256color');
  commands.push('export COLORTERM=truecolor');
  
  // Claude Code対応
  if (shell.includes('zsh')) {
    commands.push(`
      # Claude Code wrapper function
      claude() {
        local project_root=$(zeami_find_project_root)
        if [ -n "$project_root" ]; then
          (cd "$project_root" && command claude "$@")
        else
          command claude "$@"
        fi
      }
    `);
  }
  
  return commands;
}
```

### 6. Split Manager (renderer/splitManager.js)

画面分割機能を実装し、複数ターミナルの管理を行います。

#### DOM保持の実装

```javascript
splitTerminal(terminalId, direction = 'vertical') {
  const session = this.terminalManager.sessions.get(terminalId);
  if (!session) return;
  
  const container = session.view.container;
  const parent = container.parentElement;
  
  // 既存のターミナルを保持
  const existingTerminal = container.querySelector('.terminal-wrapper');
  
  // 新しいコンテナ構造を作成
  const splitContainer = document.createElement('div');
  splitContainer.className = `split-container split-${direction}`;
  
  // 既存のターミナルを移動（削除しない）
  const leftPane = document.createElement('div');
  leftPane.className = 'split-pane';
  leftPane.appendChild(existingTerminal);
  
  splitContainer.appendChild(leftPane);
  parent.appendChild(splitContainer);
  
  // リサイズ処理
  session.view.terminal.resize();
}
```

## パフォーマンス最適化詳細

### 1. WebGLレンダラー

GPU加速を活用して描画性能を向上させています。

```javascript
// WebGLレンダラーの設定
if (this.rendererType === 'webgl') {
  // WebGLコンテキストの最適化
  this.terminal.options.rendererType = 'webgl';
  
  // テクスチャアトラスの事前生成
  this.terminal.onRender(() => {
    // レンダリング最適化処理
  });
}
```

### 2. スクロール最適化

```javascript
// スムーズスクロールの実装
setupSmoothScroll() {
  let scrollVelocity = 0;
  let isScrolling = false;
  
  const smoothScroll = () => {
    if (Math.abs(scrollVelocity) > 0.1) {
      this.terminal.scrollLines(scrollVelocity);
      scrollVelocity *= 0.9; // 減衰
      requestAnimationFrame(smoothScroll);
    } else {
      isScrolling = false;
    }
  };
  
  this.terminal.element.addEventListener('wheel', (e) => {
    e.preventDefault();
    
    const multiplier = e.shiftKey ? 10 : 1;
    scrollVelocity = e.deltaY * 0.01 * multiplier;
    
    if (!isScrolling) {
      isScrolling = true;
      requestAnimationFrame(smoothScroll);
    }
  });
}
```

### 3. メモリ管理

```javascript
// 定期的なガベージコレクション
setInterval(() => {
  // 古いスクロールバックの削除
  if (this.terminal.buffer.active.length > 50000) {
    this.terminal.clear();
  }
  
  // 未使用のリソースの解放
  if (global.gc) {
    global.gc();
  }
}, 300000); // 5分ごと
```

## セキュリティ実装

### 1. Context Isolation

```javascript
// preload.js
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // 安全なAPIのみを公開
  sendCommand: (channel, data) => {
    const validChannels = ['terminal:input', 'terminal:resize'];
    if (validChannels.includes(channel)) {
      ipcRenderer.send(channel, data);
    }
  }
});
```

### 2. 入力サニタイゼーション

```javascript
sanitizeInput(input) {
  // 制御文字のフィルタリング
  return input
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .substring(0, 4096); // 最大長制限
}
```

## トラブルシューティング

### 問題: 無限ループ

**原因**: セッション復元時の再帰的な復元処理

**解決策**:
```javascript
// 復元フラグで二重実行を防止
let isRestoring = false;

async restoreSession(sessionData) {
  if (isRestoring) return;
  isRestoring = true;
  
  try {
    // 復元処理
  } finally {
    isRestoring = false;
  }
}
```

### 問題: 文字化け

**原因**: エンコーディングの不整合

**解決策**:
```javascript
// UTF-8を強制
ptyProcess.write(Buffer.from(data, 'utf8'));
```

## 今後の技術的課題

1. **IME対応**: 日本語入力メソッドの完全サポート
2. **GPUメモリ管理**: WebGLレンダラーのメモリリーク対策
3. **プロセス分離**: ターミナルプロセスの更なる分離
4. **ホットリロード**: 開発効率向上のための実装

---

*このドキュメントは、ZeamiTermの技術的な実装詳細を開発者向けに記録したものです。*