# xterm.js統合設計

> 🤖 **Claude Code最適化ドキュメント**  
> ZeamiTermの心臓部、xterm.jsとの統合を完全解説。カスタマイズの全て。

## 🎯 クイックナビゲーション

| やりたいこと | 参照セクション | 主要ファイル |
|------------|--------------|------------|
| 新しいアドオンを追加 | [アドオン実装](#アドオン実装) | `ZeamiTermManager.js:234-345` |
| テーマをカスタマイズ | [テーマ設定](#テーマ設定) | `ZeamiTermManager.js:567-612` |
| キーバインディング追加 | [キーハンドリング](#キーハンドリング) | `ZeamiTerminal.js:345-412` |
| パフォーマンス改善 | [最適化テクニック](#最適化テクニック) | WebGL設定 |

## 📋 xterm.js統合の概要

```yaml
xterm.jsバージョン: 5.3.0
統合方式: npm package + カスタムラッパー
特殊要件:
  - Claude Code互換のペースト処理
  - 日本語IMEサポート
  - 選択透明度の修正（フォーク版）
  - WebGLレンダリング優先
```

## 🏗️ 統合アーキテクチャ

### レイヤー構造

```
┌─────────────────────────────────────┐
│      ZeamiTerminal (拡張層)         │
│  - ペーストモード制御               │
│  - コマンドインターセプト           │
│  - カスタムイベント                 │
├─────────────────────────────────────┤
│      xterm.js Core (コア層)         │
│  - 基本ターミナル機能               │
│  - バッファ管理                     │
│  - レンダリング                     │
├─────────────────────────────────────┤
│      Addons (拡張機能層)            │
│  - FitAddon (自動サイズ調整)        │
│  - SearchAddon (検索)               │
│  - WebLinksAddon (リンク)           │
│  - WebglAddon (GPU描画)             │
└─────────────────────────────────────┘
```

## 🔧 基本設定

### ターミナルオプション

```javascript
// 📍 src/renderer/core/ZeamiTermManager.js:145-189

const terminalOptions = {
    // フォント設定
    fontSize: 14,
    fontFamily: 'Menlo, Monaco, "Courier New", monospace',
    fontWeight: 'normal',
    fontWeightBold: 'bold',
    
    // カラーテーマ（VS Code風）
    theme: {
        foreground: '#cccccc',
        background: '#1e1e1e',
        cursor: '#ffffff',
        cursorAccent: '#000000',
        selectionBackground: '#3a3d41',
        selectionForeground: '#ffffff',
        
        // ANSI カラー
        black: '#000000',
        red: '#cd3131',
        green: '#0dbc79',
        yellow: '#e5e510',
        blue: '#2472c8',
        magenta: '#bc3fbc',
        cyan: '#11a8cd',
        white: '#e5e5e5',
        
        // 明るいバリアント
        brightBlack: '#666666',
        brightRed: '#f14c4c',
        brightGreen: '#23d18b',
        brightYellow: '#f5f543',
        brightBlue: '#3b8eea',
        brightMagenta: '#d670d6',
        brightCyan: '#29b8db',
        brightWhite: '#e5e5e5'
    },
    
    // 動作設定
    cursorBlink: true,
    cursorStyle: 'block',
    scrollback: 10000,
    tabStopWidth: 8,
    
    // プラットフォーム固有
    macOptionIsMeta: true,
    macOptionClickForcesSelection: true,
    
    // パフォーマンス
    fastScrollModifier: 'shift',
    fastScrollSensitivity: 5,
    
    // アクセシビリティ
    screenReaderMode: false,
    
    // ⚠️ 重要: 日本語対応
    allowProposedApi: true,
    unicodeVersion: 11
};
```

## 🎨 アドオン実装

### 標準アドオンの設定

```javascript
// 📍 src/renderer/core/ZeamiTermManager.js:234-345

class ZeamiTermManager {
    _loadAddons(terminal) {
        // 1. FitAddon - 必須
        const fitAddon = new FitAddon();
        terminal.loadAddon(fitAddon);
        terminal.fitAddon = fitAddon; // 後でアクセスするため保存
        
        // 初回フィット
        setTimeout(() => fitAddon.fit(), 0);
        
        // 2. SearchAddon - 検索機能
        const searchAddon = new SearchAddon();
        terminal.loadAddon(searchAddon);
        terminal.searchAddon = searchAddon;
        
        // 検索デコレーション設定
        searchAddon.onDidChangeResults((results) => {
            this._updateSearchStatus(results);
        });
        
        // 3. WebLinksAddon - URLリンク
        const webLinksAddon = new WebLinksAddon();
        terminal.loadAddon(webLinksAddon);
        
        // 4. レンダラー選択（WebGL優先）
        this._setupRenderer(terminal);
        
        // 5. カスタムアドオン
        this._loadCustomAddons(terminal);
    }
    
    _setupRenderer(terminal) {
        // WebGLが利用可能か確認
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
        
        if (gl) {
            try {
                const webglAddon = new WebglAddon();
                
                // WebGL初期化成功の確認
                webglAddon.onContextLoss(() => {
                    console.warn('WebGL context lost, falling back to canvas');
                    webglAddon.dispose();
                    this._loadCanvasRenderer(terminal);
                });
                
                terminal.loadAddon(webglAddon);
                console.log('WebGL renderer loaded successfully');
            } catch (e) {
                console.warn('WebGL initialization failed:', e);
                this._loadCanvasRenderer(terminal);
            }
        } else {
            this._loadCanvasRenderer(terminal);
        }
    }
    
    _loadCanvasRenderer(terminal) {
        const canvasAddon = new CanvasAddon();
        terminal.loadAddon(canvasAddon);
        console.log('Canvas renderer loaded');
    }
}
```

### カスタムアドオン開発

```javascript
// 📍 src/renderer/addons/ShellIntegrationAddon.js

class ShellIntegrationAddon {
    constructor() {
        this._terminal = null;
        this._commandStart = null;
        this._currentCommand = '';
    }
    
    activate(terminal) {
        this._terminal = terminal;
        
        // OSCシーケンスのハンドラー登録
        terminal.parser.registerOscHandler(133, (data) => {
            return this._handleShellIntegration(data);
        });
    }
    
    _handleShellIntegration(data) {
        const [type, ...args] = data.split(';');
        
        switch (type) {
            case 'A': // プロンプト前
                this._onPromptStart();
                break;
            case 'B': // プロンプト後
                this._onPromptEnd();
                break;
            case 'C': // コマンド実行前
                this._onCommandStart();
                break;
            case 'D': // コマンド実行後
                this._onCommandEnd(args[0]);
                break;
        }
        
        return true; // ハンドリング済み
    }
    
    dispose() {
        // クリーンアップ
    }
}
```

## ⌨️ キーハンドリング

### カスタムキーバインディング

```javascript
// 📍 src/renderer/core/ZeamiTerminal.js:345-412

class ZeamiTerminal extends Terminal {
    _setupKeyHandlers() {
        this.attachCustomKeyEventHandler((event) => {
            // Cmd/Ctrl + K: クリア
            if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
                event.preventDefault();
                this.clear();
                return false;
            }
            
            // Cmd/Ctrl + F: 検索
            if ((event.metaKey || event.ctrlKey) && event.key === 'f') {
                event.preventDefault();
                this._showSearchBox();
                return false;
            }
            
            // Cmd/Ctrl + Plus/Minus: フォントサイズ
            if ((event.metaKey || event.ctrlKey)) {
                if (event.key === '+' || event.key === '=') {
                    event.preventDefault();
                    this._increaseFontSize();
                    return false;
                } else if (event.key === '-') {
                    event.preventDefault();
                    this._decreaseFontSize();
                    return false;
                }
            }
            
            // ⚠️ ペースト処理のインターセプト
            if ((event.metaKey || event.ctrlKey) && event.key === 'v') {
                event.preventDefault();
                this._handlePaste();
                return false;
            }
            
            return true; // デフォルト処理を継続
        });
    }
}
```

## 🎨 テーマ設定

### ダイナミックテーマ切り替え

```javascript
// 📍 src/renderer/core/ZeamiTermManager.js:567-612

class ThemeManager {
    static themes = {
        'vs-dark': {
            foreground: '#cccccc',
            background: '#1e1e1e',
            // ... VS Code Dark
        },
        'monokai': {
            foreground: '#f8f8f2',
            background: '#272822',
            // ... Monokai
        },
        'solarized-dark': {
            foreground: '#839496',
            background: '#002b36',
            // ... Solarized Dark
        }
    };
    
    static applyTheme(terminal, themeName) {
        const theme = this.themes[themeName];
        if (!theme) return;
        
        terminal.options.theme = theme;
        
        // CSSカスタムプロパティも更新
        const root = document.documentElement;
        root.style.setProperty('--terminal-bg', theme.background);
        root.style.setProperty('--terminal-fg', theme.foreground);
    }
}
```

## ⚡ 最適化テクニック

### パフォーマンスチューニング

```javascript
// 📍 src/renderer/core/performance-utils.js

// 1. 大量出力の最適化
terminal.write(largeData, () => {
    // 書き込み完了後の処理
    // 非同期で実行されるため、UIがブロックされない
});

// 2. スクロールバックの制限
const optimalScrollback = 5000; // 10000は重い場合がある

// 3. レンダリング最適化
terminal.options.rendererType = 'webgl'; // 最速
terminal.options.scrollSensitivity = 1; // デフォルト値

// 4. 不要な再描画を防ぐ
let writeBuffer = [];
let flushTimeout;

function bufferedWrite(data) {
    writeBuffer.push(data);
    
    clearTimeout(flushTimeout);
    flushTimeout = setTimeout(() => {
        if (writeBuffer.length > 0) {
            terminal.write(writeBuffer.join(''));
            writeBuffer = [];
        }
    }, 16); // 60fps
}
```

### メモリ管理

```javascript
// 📍 バッファサイズの監視と制御

terminal.buffer.active.onTrimmed((amount) => {
    console.log(`Trimmed ${amount} lines from buffer`);
});

// 定期的なガベージコレクション誘発
setInterval(() => {
    if (terminal.buffer.active.length > 8000) {
        // 古い行を削除
        terminal.clear();
        console.log('Buffer cleared due to size');
    }
}, 60000); // 1分ごと
```

## 🐛 既知の問題と対策

### 問題1: 日本語入力の表示位置

```javascript
// 📍 IMEサポートの改善
terminal.onRender(() => {
    // IME候補ウィンドウの位置調整
    const textarea = terminal.textarea;
    if (textarea) {
        const cursor = terminal.buffer.active.cursorX;
        const row = terminal.buffer.active.cursorY;
        
        // textareaの位置を更新
        textarea.style.left = `${cursor * terminal._core.charMeasure.width}px`;
        textarea.style.top = `${row * terminal._core.charMeasure.height}px`;
    }
});
```

### 問題2: 選択時の透明度

```javascript
// 📍 xterm.jsフォーク版での修正
// src/xterm/src/browser/renderer/dom/DomRenderer.ts
// 選択範囲の不透明度を1.0に固定
```

### 問題3: WebGLコンテキストロス

```javascript
// 📍 自動復旧メカニズム
webglAddon.onContextLoss(() => {
    console.warn('WebGL context lost, attempting recovery...');
    
    setTimeout(() => {
        try {
            // 新しいWebGLアドオンで再初期化
            const newWebglAddon = new WebglAddon();
            terminal.loadAddon(newWebglAddon);
            console.log('WebGL context recovered');
        } catch (e) {
            // Canvas rendererにフォールバック
            terminal.loadAddon(new CanvasAddon());
        }
    }, 1000);
});
```

## 🔗 関連リソース

- xterm.js公式ドキュメント: https://xtermjs.org/docs/
- アドオンAPI: https://xtermjs.org/docs/api/addons/
- 内部実装: `src/xterm/` (フォーク版)
- カスタマイズ例: `src/renderer/core/ZeamiTerminal.js`

---

> 💡 **Claude Codeへのヒント**: xterm.jsのアップデート時は、APIの変更に注意。特にアドオンのインターフェースは頻繁に変わります。新機能追加時は、まず公式デモで動作確認してから実装してください。