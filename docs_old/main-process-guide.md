# ZeamiTerm Main Process Guide

## Overview

メインプロセスは、Electronアプリケーションの心臓部であり、システムリソースへのアクセス、プロセス管理、IPC通信の中核を担います。

## Core Components

### 1. Main Entry Point (`index.js`)

**責務**: アプリケーションのライフサイクル管理とウィンドウ作成

```javascript
// 主要な初期化フロー
app.whenReady()
  → createWindow()
  → setupIpcHandlers()
  → createApplicationMenu()
  → AutoUpdaterManager.init()
```

**IPC ハンドラー**:
- `terminal:create` - 新規ターミナル作成
- `terminal:input` - ユーザー入力処理
- `terminal:resize` - ターミナルサイズ変更
- `terminal:kill` - ターミナル終了
- `session:save/load/clear` - セッション管理
- `record-error` - エラー記録

**セキュリティ設定**:
```javascript
webPreferences: {
  contextIsolation: true,
  nodeIntegration: false,
  sandbox: true,
  preload: path.join(__dirname, '../preload/index.js')
}
```

### 2. PTY Service (`ptyService.js`)

**責務**: 疑似ターミナルプロセスの作成と管理

**アーキテクチャ**:
```
User Input
    ↓
Flow Controller (チャンク分割)
    ↓
PTY Process (複数戦略)
    ↓
Data Bufferer (100ms集約)
    ↓
Pattern Detector
    ↓
IPC to Renderer
```

**PTY作成戦略（優先順位順）**:
1. **WorkingPty** (Python実装) - 最も信頼性が高い
2. **PTY Wrapper** (Node.js) - 互換性フォールバック
3. **Shell Environment** - 特殊環境設定付き
4. **Basic Spawn** - 最終手段

**フロー制御**:
```javascript
// 適応的チャンクサイズ
if (performanceRatio < 0.5) {
  chunkSize *= 0.8;  // 処理が遅い場合は縮小
} else if (performanceRatio > 0.9) {
  chunkSize *= 1.2;  // 処理が速い場合は拡大
}
```

### 3. Working PTY (`workingPty.js`)

**責務**: Python を使用した真の PTY 実装

**実装詳細**:
```python
# 一時的なPythonスクリプトを生成
master, slave = pty.openpty()
process = subprocess.Popen(
    command,
    stdin=slave,
    stdout=slave,
    stderr=slave,
    preexec_fn=os.setsid
)
```

**特徴**:
- 真のPTY機能（端末制御シーケンス完全サポート）
- SIGWINCHによるリサイズ対応
- ログインシェル対応（.zshrc/.bashrc読み込み）

### 4. Terminal Process Manager (`terminalProcessManager.js`)

**責務**: 高レベルのセッション管理

**セッション管理**:
```javascript
sessions = new Map()  // sessionId → ZeamiInstance

// セッションライフサイクル
createSession() → new ZeamiInstance() → sessions.set()
closeSession() → instance.destroy() → sessions.delete()
```

### 5. Message Router (`messageRouter.js`)

**責務**: 入力メッセージの補強と変換

**補強ルール**:
```javascript
rules = [
  {
    pattern: /^zeami\s/,
    enhance: (input) => input.replace('zeami', '../../bin/zeami')
  },
  {
    pattern: /^claude\s/,
    enhance: enhanceClaudeCommand
  }
]
```

### 6. Pattern Detector (`patternDetector.js`)

**責務**: 出力パターンの検出とハイライト

**検出カテゴリ**:
- **エラーパターン**: TypeScriptエラー、モジュール未検出、テスト失敗
- **成功パターン**: ビルド成功、テスト合格
- **警告パターン**: Git競合、deprecation警告
- **構文ハイライト**: JSON、ファイルパス、URL

**パフォーマンス最適化**:
```javascript
// パターンはプリコンパイルされ、優先度順にソート
patterns.sort((a, b) => b.priority - a.priority)
```

### 7. Zeami Error Recorder (`zeamiErrorRecorder.js`)

**責務**: エラーパターンの学習システム統合

**処理フロー**:
```
Error Detected
    ↓
Queue Error (最大10件)
    ↓
Find Zeami CLI Path
    ↓
Execute: zeami learn error
    ↓ (失敗時)
Save to Offline Storage
    ↓
Sync When Available
```

**エラー別提案生成**:
```javascript
errorSuggestions = {
  'Cannot find module': 'npm install [module-name]',
  'TypeScript error': 'zeami type diagnose を実行',
  'Permission denied': 'chmod +x または sudo で実行'
}
```

### 8. Auto Updater (`autoUpdater.js`)

**責務**: GitHub Releases を通じた自動更新

**更新フロー**:
1. 起動時に GitHub Releases をチェック
2. 新バージョン検出時に通知
3. ユーザー承認後にダウンロード
4. アプリ再起動で更新適用

**現在の状態**: リリース準備のため一時的に無効化

## Process Lifecycle Management

### 起動シーケンス
```
1. Electron app.whenReady()
2. Create main window
3. Setup IPC handlers
4. Initialize services (PTY, Session, AutoUpdater)
5. Load saved sessions (if any)
```

### 終了シーケンス
```
1. app.on('before-quit')
2. Save current sessions
3. Cleanup PTY processes (5秒タイムアウト)
4. Force kill remaining processes
5. Exit application
```

## Error Handling Strategies

### 1. PTY Creation Failures
```javascript
try {
  // Try WorkingPty
} catch (e1) {
  try {
    // Try PTY wrapper
  } catch (e2) {
    try {
      // Try shell spawn
    } catch (e3) {
      // Use basic spawn
    }
  }
}
```

### 2. Process Communication Errors
- 自動再接続試行
- エラーログ記録
- ユーザーへの通知

### 3. IPC Communication Errors
- メッセージ検証
- タイムアウト処理
- 再送信メカニズム

## Performance Optimizations

### 1. Data Buffering
```javascript
// 100ms間のデータを集約して送信
dataBuffer.push(chunk)
if (!bufferTimeout) {
  bufferTimeout = setTimeout(flushBuffer, 100)
}
```

### 2. Flow Control
```javascript
// 処理速度に応じてチャンクサイズを調整
const performanceRatio = processedChunks / totalChunks
adjustChunkSize(performanceRatio)
```

### 3. Pattern Detection Cache
- 頻出パターンのキャッシュ
- 優先度ベースの処理順序

## Security Considerations

### Process Isolation
- 各ターミナルセッションは独立したプロセス
- プロセス間の直接通信は禁止
- すべての通信はメインプロセス経由

### Input Validation
```javascript
// 危険なコマンドのフィルタリング
const sanitizeInput = (input) => {
  // Remove control characters
  // Validate command structure
  // Check against blocklist
}
```

## Debugging Guide

### ログ出力
```javascript
// 開発時のデバッグログ
if (process.env.NODE_ENV === 'development') {
  console.log('[PtyService]', message)
}
```

### プロセス監視
```bash
# PTYプロセスの確認
ps aux | grep zeami-term

# IPCメッセージの監視
ELECTRON_ENABLE_LOGGING=1 npm run dev
```

## Best Practices

1. **リソース管理**: 必ずプロセスをクリーンアップ
2. **エラーハンドリング**: すべての非同期操作にtry-catch
3. **パフォーマンス**: データは適切にバッファリング
4. **セキュリティ**: 入力は常に検証
5. **ログ**: 重要な操作は記録

## Future Enhancements

1. **Worker Threads**: CPU集約的な処理の分離
2. **WebSocket Support**: リモートターミナル対応
3. **Plugin System**: 拡張可能なアーキテクチャ
4. **AI Integration**: より深いClaude Code統合