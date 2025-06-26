# ZeamiTerm - AI開発アシスタント用ガイドライン

## プロジェクト概要

ZeamiTermは、Claude Codeとの対話を強化するElectronベースのターミナルエミュレータです。
VS Codeのターミナル実装を参考に、Zeamiエコシステムと統合されたスマートなターミナル環境を提供します。

## 上位層への参照

- [Zeami CLAUDE.md](../../CLAUDE.md) - Zeami全体のガイドライン
- [共有知識ベース](../SHARED_KNOWLEDGE.md) - プロジェクト間の共有知識
- [Zeami CLI](../../bin/zeami) - コマンドラインツール

## 技術スタック

### コアライブラリ
- **Electron** - デスクトップアプリケーションフレームワーク
- **xterm.js** - ターミナルUIライブラリ
- **node-pty** - 疑似ターミナル（PTY）ライブラリ
- **Electron Forge** - ビルド・パッケージングツール

### アーキテクチャ設計

```
zeami-term/
├── src/
│   ├── main/                      # メインプロセス
│   │   ├── index.js              # エントリーポイント
│   │   ├── terminalProcessManager.js  # プロセス管理
│   │   ├── zeamiInstance.js      # 個別セッション管理
│   │   ├── messageRouter.js      # メッセージルーティング
│   │   └── patternDetector.js    # パターン検知
│   ├── renderer/                  # レンダラープロセス
│   │   ├── index.js              # レンダラーエントリー
│   │   ├── terminalView.js       # xterm.js UI
│   │   ├── zeamiStatusBar.js     # ステータス表示
│   │   └── contextPanel.js       # コンテキスト表示
│   ├── preload/                   # プリロードスクリプト
│   │   └── index.js              # IPC通信ブリッジ
│   └── common/                    # 共通モジュール
│       ├── ipcChannels.js        # IPC定義
│       └── zeamiProtocol.js      # 通信プロトコル
```

## 開発コマンド

```bash
# 開発環境の起動
npm run dev

# ビルド
npm run build

# パッケージング
npm run package

# テスト
npm run test

# 型チェック
npm run type-check

# リント
npm run lint
```

## IPC通信設計

### チャンネル定義
```javascript
// メインプロセス → レンダラー
'zeami:terminal-data'      // ターミナル出力データ
'zeami:pattern-detected'   // パターン検知通知
'zeami:suggest-action'     // アクション提案

// レンダラー → メインプロセス
'zeami:start-session'      // セッション開始
'zeami:send-input'         // ユーザー入力送信
'zeami:request-context'    // コンテキスト要求
```

## セキュリティ設定

```javascript
// Electron セキュリティベストプラクティス
{
  contextIsolation: true,
  nodeIntegration: false,
  sandbox: true,
  webSecurity: true
}
```

## 開発フェーズ

### Phase 1: 基本ターミナル (✅ 完了)
- [x] Electron + xterm.js + node-ptyの統合
- [x] Claude Codeプロセスの起動
- [x] 基本的な入出力
- [x] スプリットビュー機能
- [x] カラーリング・パフォーマンス最適化

### Phase 2: メッセージルーティング (開発中)
- [ ] MessageRouterの実装
- [ ] パターン検知機能
- [ ] メッセージ補強機能

### Phase 3: Zeami統合 (計画中)
- [ ] Zeami CLIとの連携
- [ ] ドキュメント参照機能
- [ ] 学習機能の統合

## 主要な改善内容

詳細な改善履歴は [ZEAMITERM_COMPREHENSIVE_IMPROVEMENTS.md](docs/ZEAMITERM_COMPREHENSIVE_IMPROVEMENTS.md) を参照してください。

### 実装済み機能
- ✅ 入力遅延問題の完全解決
- ✅ スプリットビューでのターミナル管理
- ✅ Claude Code完全統合
- ✅ プロジェクトコンテキスト自動認識
- ✅ VS Code風カラーテーマ
- ✅ WebGLによる高速レンダリング
- ✅ 無限ループ問題の修正

## データフロー

```
1. ユーザー入力
   ↓
2. Renderer → Main (IPC)
   ↓
3. MessageRouter で補強
   ↓
4. node-pty → Claude Code
   ↓
5. Claude Code 出力
   ↓
6. PatternDetector で解析
   ↓
7. Main → Renderer (IPC)
   ↓
8. xterm.js で表示 + Zeamiアクション
```

## 開発ガイドライン

### コード規約
- ES6+ モジュール構文を使用
- async/awaitでの非同期処理
- エラーハンドリングの徹底
- TypeScriptの段階的導入を検討

### テスト方針
- 単体テスト: Jest
- E2Eテスト: Spectron/Playwright
- IPCメッセージのモックテスト

### ドキュメント管理
- 機能追加時は必ず`docs/development/`に記録
- 重要な決定は`docs/specifications/`に記載
- 学びは`docs/journals/`に記録

## 更新履歴

- 2025-06-26: 包括的改善記録の作成、無限ループ問題の修正、パフォーマンス最適化
- 2025-06-25: プロジェクト初期化、基本構造の定義、基本機能の実装完了