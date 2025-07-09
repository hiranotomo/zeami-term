# 設定ガイド

> 🤖 **Claude Code最適化ドキュメント**  
> ZeamiTermを自分好みにカスタマイズ。全設定オプションを網羅。

## 🎯 設定ファイルの場所

| OS | 設定ファイルパス |
|----|-----------------|
| macOS | `~/Library/Application Support/zeami-term/config.json` |
| Windows | `%APPDATA%\zeami-term\config.json` |
| Linux | `~/.config/zeami-term/config.json` |

## 📋 設定ファイル構造

```json
{
  "general": {
    "theme": "vs-dark",
    "language": "ja",
    "autoUpdate": true,
    "telemetry": false
  },
  "terminal": {
    "fontSize": 14,
    "fontFamily": "Menlo, Monaco, 'Courier New', monospace",
    "lineHeight": 1.2,
    "letterSpacing": 0,
    "cursorStyle": "block",
    "cursorBlink": true,
    "scrollback": 10000,
    "bellStyle": "sound"
  },
  "profiles": {
    "default": {
      "name": "Default",
      "shell": "/bin/bash",
      "args": [],
      "env": {},
      "cwd": "~"
    }
  },
  "keybindings": {
    "newTerminal": "cmd+t",
    "toggleLayout": "cmd+d",
    "switchTerminal": "cmd+tab"
  },
  "paste": {
    "bracketedPasteMode": true,
    "chunkSize": 30,
    "delayMs": 50,
    "warningThreshold": 1000
  },
  "notifications": {
    "enabled": true,
    "minDuration": 5000,
    "sound": "Glass"
  }
}
```

## 🎨 外観設定

### テーマ設定

```json
{
  "terminal": {
    "theme": "vs-dark"  // 利用可能: vs-dark, monokai, solarized-dark, custom
  }
}
```

#### カスタムテーマの作成

```json
{
  "terminal": {
    "theme": "custom",
    "customTheme": {
      "foreground": "#ffffff",
      "background": "#1e1e1e",
      "cursor": "#ffffff",
      "cursorAccent": "#000000",
      "selectionBackground": "#3a3d41",
      
      "black": "#000000",
      "red": "#cd3131",
      "green": "#0dbc79",
      "yellow": "#e5e510",
      "blue": "#2472c8",
      "magenta": "#bc3fbc",
      "cyan": "#11a8cd",
      "white": "#e5e5e5",
      
      "brightBlack": "#666666",
      "brightRed": "#f14c4c",
      "brightGreen": "#23d18b",
      "brightYellow": "#f5f543",
      "brightBlue": "#3b8eea",
      "brightMagenta": "#d670d6",
      "brightCyan": "#29b8db",
      "brightWhite": "#ffffff"
    }
  }
}
```

### フォント設定

```json
{
  "terminal": {
    "fontSize": 14,                // 8-24
    "fontFamily": "Monaco",        // システムフォント名
    "fontWeight": "normal",        // normal, bold, 100-900
    "fontWeightBold": "bold",      // 太字の太さ
    "lineHeight": 1.2,             // 1.0-2.0
    "letterSpacing": 0             // -5-5
  }
}
```

推奨フォント：
- **macOS**: Monaco, SF Mono, Menlo
- **Windows**: Consolas, Cascadia Code
- **Linux**: Ubuntu Mono, DejaVu Sans Mono

## ⚙️ 動作設定

### スクロール設定

```json
{
  "terminal": {
    "scrollback": 10000,           // 最大履歴行数
    "scrollSensitivity": 1,        // スクロール感度
    "fastScrollModifier": "shift", // 高速スクロール修飾キー
    "fastScrollSensitivity": 5     // 高速スクロール倍率
  }
}
```

### カーソル設定

```json
{
  "terminal": {
    "cursorStyle": "block",        // block, underline, bar
    "cursorBlink": true,           // 点滅有無
    "cursorWidth": 2               // bar スタイル時の幅
  }
}
```

## 👤 プロファイル設定

### 複数プロファイルの定義

```json
{
  "profiles": {
    "default": {
      "name": "Default",
      "shell": "/bin/bash",
      "icon": "🖥️"
    },
    "zsh": {
      "name": "Zsh",
      "shell": "/bin/zsh",
      "args": ["--login"],
      "env": {
        "TERM": "xterm-256color"
      },
      "icon": "🐚"
    },
    "python": {
      "name": "Python REPL",
      "shell": "/usr/bin/python3",
      "args": ["-i"],
      "cwd": "~/projects",
      "icon": "🐍"
    },
    "node": {
      "name": "Node.js REPL",
      "shell": "/usr/local/bin/node",
      "env": {
        "NODE_ENV": "development"
      },
      "icon": "📦"
    }
  },
  "defaultProfile": "default"
}
```

### 環境変数の設定

```json
{
  "profiles": {
    "development": {
      "name": "開発環境",
      "shell": "/bin/bash",
      "env": {
        "NODE_ENV": "development",
        "DEBUG": "*",
        "PATH": "/usr/local/bin:$PATH",
        "CUSTOM_VAR": "value"
      }
    }
  }
}
```

## ⌨️ キーバインディング

### デフォルトキーバインディング

```json
{
  "keybindings": {
    // ターミナル操作
    "newTerminal": "cmd+t",
    "closeTerminal": "cmd+w",
    "switchTerminal": "cmd+tab",
    "switchTerminalReverse": "cmd+shift+tab",
    
    // レイアウト
    "toggleLayout": "cmd+d",
    "focusLeft": "cmd+left",
    "focusRight": "cmd+right",
    
    // 編集
    "copy": "cmd+c",
    "paste": "cmd+v",
    "selectAll": "cmd+a",
    "clear": "cmd+k",
    
    // 検索
    "find": "cmd+f",
    "findNext": "cmd+g",
    "findPrevious": "cmd+shift+g",
    
    // 表示
    "zoomIn": "cmd+plus",
    "zoomOut": "cmd+minus",
    "resetZoom": "cmd+0",
    "fullscreen": "f11"
  }
}
```

### カスタムキーバインディング

```json
{
  "keybindings": {
    // Vimスタイル
    "splitVertical": "ctrl+w v",
    "splitHorizontal": "ctrl+w s",
    "navigateLeft": "ctrl+w h",
    "navigateRight": "ctrl+w l",
    
    // カスタムコマンド
    "runBuild": {
      "key": "cmd+b",
      "command": "npm run build"
    },
    "runTest": {
      "key": "cmd+shift+t",
      "command": "npm test"
    }
  }
}
```

## 📋 ペースト設定

### Claude Code最適化

```json
{
  "paste": {
    "bracketedPasteMode": true,    // 括弧付きペーストモード
    "chunkSize": 30,               // チャンクサイズ（行数）
    "delayMs": 50,                 // チャンク間遅延（ミリ秒）
    "dynamicDelay": true,          // 動的遅延調整
    "warningThreshold": 1000,      // 警告表示しきい値（行数）
    "maxPasteSize": 100000         // 最大ペーストサイズ（文字数）
  }
}
```

### パフォーマンスチューニング

```json
{
  "paste": {
    // 高速環境向け
    "chunkSize": 100,
    "delayMs": 10,
    
    // 低速環境向け
    "chunkSize": 10,
    "delayMs": 100
  }
}
```

## 🔔 通知設定

### 基本設定

```json
{
  "notifications": {
    "enabled": true,               // 通知の有効/無効
    "minDuration": 5000,           // 最小実行時間（ミリ秒）
    "sound": "Glass",              // 通知音（macOS）
    "showInCenter": true,          // メッセージセンターに表示
    "urgency": "normal"            // normal, critical, low
  }
}
```

### 通知フィルター

```json
{
  "notifications": {
    "filters": {
      "excludeCommands": ["ls", "cd", "pwd"],  // 除外コマンド
      "includePatterns": ["build", "test"],    // 含むパターン
      "onlyErrors": false                       // エラーのみ通知
    }
  }
}
```

## 🔧 高度な設定

### パフォーマンス設定

```json
{
  "performance": {
    "rendererType": "webgl",       // webgl, canvas, dom
    "gpuAcceleration": true,       // GPU アクセラレーション
    "offscreenRows": 3,            // オフスクリーン行数
    "maxFps": 60                   // 最大フレームレート
  }
}
```

### デバッグ設定

```json
{
  "debug": {
    "logLevel": "info",            // error, warn, info, debug
    "showDevTools": false,         // 開発者ツール表示
    "logToFile": true,             // ファイルへのログ出力
    "performanceMonitor": false    // パフォーマンスモニター
  }
}
```

## 💾 設定のバックアップと同期

### エクスポート

```bash
# 設定をエクスポート
cp ~/Library/Application\ Support/zeami-term/config.json ./zeami-config-backup.json
```

### インポート

```bash
# 設定をインポート
cp ./zeami-config-backup.json ~/Library/Application\ Support/zeami-term/config.json
```

### 設定のリセット

```bash
# 設定を初期状態に戻す
rm ~/Library/Application\ Support/zeami-term/config.json
# アプリを再起動すると、デフォルト設定が生成される
```

## 🔗 関連情報

- [キーボードショートカット一覧](../reference/keyboard-shortcuts.md)
- [テーマギャラリー](../reference/themes.md)
- [環境変数リファレンス](../reference/environment-variables.md)

---

> 💡 **Claude Codeへのヒント**: 設定変更は即座に反映されます。ただし、一部の設定（レンダラータイプなど）はアプリの再起動が必要です。設定ファイルが壊れた場合は、削除すれば自動的にデフォルトが生成されます。