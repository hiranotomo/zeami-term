# ZeamiTerm アーキテクチャ概要

> 🤖 **Claude Code最適化ドキュメント**  
> このドキュメントは、Claude Codeが効率的に開発を進められるよう特別に設計されています。

## 🎯 クイックナビゲーション

| 何をしたいか | 参照すべきセクション | 関連ファイル |
|------------|---------------------|-------------|
| 新機能を追加したい | [拡張ポイント](#拡張ポイント) | `src/commands/`, `src/features/` |
| バグを修正したい | [トラブルシューティングマップ](#トラブルシューティングマップ) | 症状別に記載 |
| データフローを理解したい | [データフロー図](#データフロー図) | - |
| IPC通信を追加したい | [IPC通信設計](#ipc通信設計) | `src/common/ipcChannels.js` |
| ペースト処理を修正したい | [ペースト処理](#ペースト処理の特殊性) | `src/renderer/core/ZeamiTermManager.js:345-567` |

## 📋 プロジェクト概要

```yaml
プロジェクト名: ZeamiTerm
目的: Claude Codeとの対話を強化するElectronベースのターミナルエミュレータ
主要技術: Electron v28.1.0, xterm.js v5.3.0, node-pty v0.10.1
特殊制約:
  - 固定2ターミナル構成（Terminal A/B）
  - Claude Code互換のペースト処理
  - Python経由の真のPTY実装
```

## 🏗️ アーキテクチャ構造

### コンポーネント階層図

```
┌─────────────────────────────────────────────────────────────┐
│                     Electron Main Process                    │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────┐    │
│  │  index.js   │  │ ptyService.js │  │ SessionManager  │    │
│  │ (Entry)     │  │  (PTY管理)    │  │  (永続化)       │    │
│  └──────┬──────┘  └───────┬──────┘  └────────┬────────┘    │
│         │                  │                   │             │
│         └──────────────────┴───────────────────┘             │
│                            │                                 │
│                     IPC Bridge (preload)                     │
└─────────────────────────────┬───────────────────────────────┘
                              │
┌─────────────────────────────┴───────────────────────────────┐
│                    Electron Renderer Process                 │
│  ┌─────────────────────┐  ┌──────────────────────────┐     │
│  │ ZeamiTermManager.js  │  │  SimpleLayoutManager.js  │     │
│  │  (統合コントローラ)  │  │   (レイアウト管理)      │     │
│  └──────────┬──────────┘  └──────────┬───────────────┘     │
│             │                         │                      │
│  ┌──────────┴──────────┐  ┌──────────┴───────────────┐     │
│  │  ZeamiTerminal.js   │  │   各種アドオン          │     │
│  │  (xterm.js拡張)    │  │  (Fit,Search,WebLinks)  │     │
│  └────────────────────┘  └──────────────────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

## 🔄 データフロー図

### 入力データフロー（ユーザー → PTY）

```mermaid
graph LR
    A[ユーザー入力] --> B{ペーストモード?}
    B -->|通常| C[ZeamiTerminal._handleData]
    B -->|ペースト| D[ペースト検出<br/>0x1b[200~]
    D --> E[チャンク分割<br/>30-50行]
    C --> F[IPC: terminal:input]
    E --> F
    F --> G[FlowController]
    G --> H[PTY/Python]
```

### 出力データフロー（PTY → 画面）

```mermaid
graph LR
    A[PTY出力] --> B[DataBufferer]
    B --> C[PatternDetector]
    C --> D[CommandFormatter]
    D --> E[IPC: terminal:data]
    E --> F[ZeamiTerminal]
    F --> G[xterm.js表示]
```

## 🚨 クリティカルパス

> ⚠️ **以下の部分は特に慎重に扱う必要があります**

### 1. ペースト処理の特殊性

```javascript
// 📍 src/renderer/core/ZeamiTermManager.js:345-567
// Claude Code互換のため、括弧付きペーストモードを手動制御
_configurePasteHandling(terminal) {
    // ⚠️ 重要: 30-50行の中規模ペーストで特別処理
    // ⚠️ タイムアウト: 3秒（Claude Codeの応答時間を考慮）
}
```

### 2. 固定ターミナル構成

```javascript
// 📍 src/renderer/core/ZeamiTermManager.js:123-145
// Terminal A/Bは削除不可、固定ID
this.terminals = new Map([
    ['terminal-a', null],
    ['terminal-b', null]
]);
```

### 3. Python PTY実装

```javascript
// 📍 src/main/ptyService.js:89-156
// node-ptyの制限を回避するPython実装
const ptyProcess = new WorkingPty(shell, args, options);
```

## 🔧 拡張ポイント

### 新機能追加の推奨場所

| 機能タイプ | 追加場所 | 例 |
|-----------|---------|-----|
| 新コマンド | `src/commands/` | `matrix.js`, `help.js` |
| ターミナル機能 | `src/features/` | 通知、ファイルエクスプローラー |
| IPCチャンネル | `src/common/ipcChannels.js` | 新しい通信パス |
| UIコンポーネント | `src/renderer/components/` | ツールバー、パネル |

### プラグインアーキテクチャ

```javascript
// 📍 src/commands/CommandRegistry.js
// コマンドの動的登録
CommandRegistry.register('mycommand', {
    execute: async (args, terminal) => {
        // 実装
    }
});
```

## 🐛 トラブルシューティングマップ

### 症状別診断ガイド

| 症状 | 考えられる原因 | 調査すべきファイル | デバッグ方法 |
|-----|---------------|-------------------|-------------|
| 入力が二重になる | ペースト処理の競合 | `ZeamiTermManager.js:345` | `PASTE_DEBUG=true` |
| ターミナルが応答しない | PTYプロセスの停止 | `ptyService.js:89` | `ps aux | grep python` |
| レイアウトが崩れる | リサイズ処理の失敗 | `SimpleLayoutManager.js:234` | DevToolsでサイズ確認 |
| 文字化け | エンコーディング問題 | `DataBufferer.js:45` | `terminal.options.encoding` |

## 📊 パフォーマンス考慮事項

### ボトルネックポイント

1. **大量データ出力時**
   - 📍 `DataBufferer.js` - バッファサイズ: 64KB
   - 対策: チャンク処理とスロットリング

2. **リサイズ処理**
   - 📍 `SimpleLayoutManager.js:156` - デバウンス: 150ms
   - 対策: 過度なリサイズイベントを抑制

3. **ペースト処理**
   - 📍 動的遅延: 10-300ms（データ量に応じて）
   - 対策: チャンクサイズの最適化

## 🔐 セキュリティ考慮事項

```javascript
// Electronセキュリティ設定
webPreferences: {
    contextIsolation: true,      // ✅ 有効
    nodeIntegration: false,      // ✅ 無効
    sandbox: true,               // ✅ 有効
    webSecurity: true            // ✅ 有効
}
```

## 📝 開発時の注意事項

### やってはいけないこと ❌

1. Terminal A/Bの削除処理を実装しない
2. 括弧付きペーストモードの自動検出に依存しない
3. PTYへの直接書き込み（必ずFlowController経由）
4. 同期的なファイル操作（必ず非同期）

### 推奨プラクティス ✅

1. エラーは必ずログに記録
2. IPCメッセージは型定義を使用
3. 非同期処理は適切にawait
4. メモリリークに注意（リスナーの解除）

## 🔗 関連ドキュメント

- [IPC通信設計](./ipc-communication.md) - 全IPCチャンネルの詳細
- [ペースト処理詳細](../features/paste-handling.md) - Claude Code対応の特殊処理
- [デバッグガイド](../troubleshooting/debugging-guide.md) - 詳細なデバッグ手順

---

> 💡 **Claude Codeへのヒント**: このドキュメントの各セクションは、特定のタスクに最適化されています。新機能追加なら「拡張ポイント」、バグ修正なら「トラブルシューティングマップ」を参照してください。ファイルパスと行番号は可能な限り具体的に記載しています。