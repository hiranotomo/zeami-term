# Claude Code Guide for ZeamiTerm Development

## Overview

このガイドは、Claude Codeが ZeamiTerm を効率的に開発・改善するための包括的なリファレンスです。

## Quick Navigation

### 🎯 最重要ファイル
1. **PTY管理**: `src/main/ptyService.js` - ターミナルプロセスの心臓部
2. **UI管理**: `src/renderer/terminalManager.js` - xterm.js統合の中核
3. **テーマ**: `src/renderer/themeManager-v2.js` - 色管理システム
4. **選択問題**: `src/renderer/selection-*.js` - 透明化の試行錯誤

### 📁 ディレクトリ構造
```
src/
├── main/           # Electronメインプロセス
├── renderer/       # ブラウザ環境のUI
├── preload/        # セキュアなIPC通信
└── common/         # 共有定義
```

## Common Development Tasks

### 1. 新機能追加

#### ターミナル機能
```bash
# 1. 機能の影響範囲を確認
grep -r "terminal\." src/renderer/ | grep -v node_modules

# 2. xterm.js APIドキュメント確認
# src/renderer/terminalManager.js の createTerminal() 参照

# 3. テスト
npm run dev
```

#### IPCチャンネル追加
```javascript
// 1. common/ipcChannels.js に定義追加
export const NEW_CHANNEL = 'new:channel'

// 2. main/index.js にハンドラー追加
ipcMain.handle(NEW_CHANNEL, async (event, data) => {
  // 処理
})

// 3. preload/index.js にブリッジ追加
newMethod: (data) => ipcRenderer.invoke(NEW_CHANNEL, data)
```

### 2. デバッグ手順

#### 選択色問題のデバッグ
```javascript
// 1. 現在の選択色を確認
terminal.options.theme.selectionBackground

// 2. レンダラータイプを確認
terminal._core._renderService._renderer.constructor.name

// 3. 色管理を確認
terminal._core._colorManager.colors
```

#### PTY通信デバッグ
```bash
# 環境変数でデバッグ有効化
DEBUG=pty npm run dev

# ログ確認箇所
# - src/main/ptyService.js の console.log
# - src/main/workingPty.js の stderr 出力
```

### 3. パフォーマンス最適化

#### 確認ポイント
1. **レンダリング**: WebGL有効化確認
2. **バッファ**: scrollback サイズ調整
3. **IPC**: データバッファリング確認

```javascript
// パフォーマンス測定
console.time('render')
terminal.write(largeData)
console.timeEnd('render')
```

## xterm.js Fork 実装ガイド

### Phase 2 準備チェックリスト
- [ ] TypeScript環境セットアップ
- [ ] xterm.jsソースコード取得
- [ ] ビルドツール準備
- [ ] テスト環境構築

### 変更予定ファイル
```
src/vendor/xterm/
├── browser/
│   ├── services/
│   │   └── ThemeService.ts      # 選択色処理
│   └── renderer/
│       ├── webgl/
│       │   └── WebglRenderer.ts  # WebGL選択レンダリング
│       └── canvas/
│           └── CanvasRenderer.ts # Canvas選択レンダリング
```

## Useful Commands

### 開発コマンド
```bash
# 開発サーバー起動
npm run dev

# 特定ファイルの変更監視
fswatch src/renderer/terminalManager.js | xargs -n1 -I{} npm run dev

# ビルド（mac-arm64のみ）
npm run build:mac -- --arch=arm64

# ドキュメント生成
node scripts/generate-code-docs.js
node scripts/update-architecture-docs.js

# 上流同期チェック
node scripts/automated-upstream-sync.js
```

### Zeami CLI 統合
```bash
# エラー記録を確認
../../bin/zeami learn list

# 型診断（将来的に統合予定）
../../bin/zeami type diagnose

# プロジェクト状態
../../bin/zeami state get --json
```

## Architecture Patterns

### 1. エラーハンドリング
```javascript
try {
  // メイン処理
} catch (error) {
  // Zeami記録
  this.errorRecorder.recordError(error.message, context)
  // ユーザー通知
  this.errorIndicator.show(error)
  // フォールバック
  this.fallbackStrategy()
}
```

### 2. 非同期処理
```javascript
// Good: エラー境界付き
async function safeOperation() {
  try {
    return await riskyOperation()
  } catch (error) {
    console.error('[SafeOp]', error)
    return fallbackValue
  }
}

// Better: タイムアウト付き
async function timedOperation() {
  return Promise.race([
    operation(),
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Timeout')), 5000)
    )
  ])
}
```

### 3. リソース管理
```javascript
class ResourceManager {
  constructor() {
    this.resources = new Map()
  }
  
  add(id, resource) {
    this.resources.set(id, resource)
  }
  
  dispose(id) {
    const resource = this.resources.get(id)
    if (resource?.dispose) {
      resource.dispose()
    }
    this.resources.delete(id)
  }
  
  disposeAll() {
    this.resources.forEach((_, id) => this.dispose(id))
  }
}
```

## Troubleshooting

### よくある問題と解決法

#### 1. ターミナルが表示されない
```javascript
// チェック項目
1. terminal.open(element) が呼ばれているか
2. element が DOM に存在するか
3. fitAddon.fit() が呼ばれているか
4. WebGL エラーが出ていないか
```

#### 2. 入力が効かない
```javascript
// チェック項目
1. terminal.onData ハンドラーが設定されているか
2. IPC 通信が確立されているか
3. PTY プロセスが生きているか
4. フォーカスが当たっているか
```

#### 3. 選択が透明にならない
```javascript
// 現在の既知の問題
// xterm.js の内部レンダリングが原因
// → フォーク実装で解決予定

// 一時的な回避策
terminal.options.theme.selectionBackground = '#7896C84D'
// ただし効果は限定的
```

## Code Style Guidelines

### 命名規則
- ファイル: `camelCase.js`
- クラス: `PascalCase`
- 関数/変数: `camelCase`
- 定数: `UPPER_SNAKE_CASE`
- IPCチャンネル: `namespace:action`

### コメント
```javascript
/**
 * 関数の説明（JSDoc形式）
 * @param {string} param - パラメータ説明
 * @returns {Promise<void>}
 */
async function example(param) {
  // 実装の詳細説明
}
```

### エラーメッセージ
```javascript
// Good: コンテキスト付き
throw new Error(`Failed to create terminal: ${reason}`)

// Better: 構造化
throw new TerminalError('CREATE_FAILED', { reason, terminalId })
```

## Performance Metrics

### 目標値
- 起動時間: < 2秒
- ターミナル作成: < 100ms
- 入力レイテンシ: < 16ms
- メモリ使用量: < 200MB

### 計測方法
```javascript
// 起動時間
console.time('app-ready')
app.on('ready', () => {
  console.timeEnd('app-ready')
})

// レンダリング
const observer = new PerformanceObserver((list) => {
  list.getEntries().forEach((entry) => {
    console.log(`${entry.name}: ${entry.duration}ms`)
  })
})
observer.observe({ entryTypes: ['measure'] })
```

## Future Enhancements

### 優先度高
1. xterm.js フォーク実装
2. 選択透明化の根本解決
3. Zeami深層統合

### 優先度中
1. プラグインシステム
2. リモートターミナル対応
3. AI予測補完

### 優先度低
1. テーマエディタ
2. マクロ記録
3. 分割ビュー拡張

## Resources

### 内部ドキュメント
- [Architecture Overview](./architecture/zeami-term-architecture.md)
- [xterm.js Integration](./architecture/xterm-integration-points.md)
- [Fork Implementation Plan](./development/xterm-fork-implementation-plan.md)

### 外部リソース
- [xterm.js API](https://xtermjs.org/docs/)
- [Electron Best Practices](https://www.electronjs.org/docs/latest/tutorial/security)
- [node-pty Documentation](https://github.com/microsoft/node-pty)

## Contact & Support

問題が発生した場合:
1. エラーログを確認
2. Zeami学習システムで類似エラーを検索
3. GitHub Issueで報告

---

*このガイドは定期的に更新されます。最終更新: Phase 1 完了時*