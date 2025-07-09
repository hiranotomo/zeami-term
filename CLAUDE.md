# ZeamiTerm - AI開発アシスタント用ガイドライン

## 🚨 重要：ドキュメント参照について

**Claude Codeは必ず以下の新しいドキュメント構造を優先的に参照してください：**

### 📚 最優先参照ドキュメント（2025-01月作成）

1. **[docs/README.md](docs/README.md)** - 全ドキュメントのインデックス
2. **[docs/architecture/overview.md](docs/architecture/overview.md)** - システム全体の設計とClaude Code最適化フォーマット
3. **[docs/features/paste-handling.md](docs/features/paste-handling.md)** - Claude Code対応の特殊なペースト処理
4. **[docs/troubleshooting/common-issues.md](docs/troubleshooting/common-issues.md)** - 症状別トラブルシューティング
5. **[docs/api/](docs/api/)** - 全API・IPCチャンネルリファレンス

### 💡 効率的な開発のために

- **🤖 Claude Code最適化フォーマット**: 全ドキュメントに実装済み
- **📍 マーク**: 特に重要なセクションを示す
- **ファイルパスと行番号**: `src/main/index.js:123` 形式で具体的な場所を示す
- **クイックナビゲーション**: 各ドキュメントの冒頭に配置
- **トラブルシューティング表**: 症状→原因→解決方法の形式

古いドキュメント（2025-06月以前）は`docs_old/`に移動されています。最新の実装状態を反映した上記のドキュメントを参照してください。

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

### Phase 2: 最適化実装 (✅ 完了)
- [x] xterm.jsフォーク統合（v5.5.0）
- [x] 選択透明度の修正（ソースレベルで解決！）
- [x] パフォーマンス最適化（レンダーキュー）
- [x] 日本語入力・IMEサポート
- [x] Claude Code出力パーサー
- [x] 双方向通信システム
- [x] プラグインアーキテクチャ
- [x] xterm.jsソースコード分析・ドキュメント化

### Phase 3: コア機能強化 (実装中)
- [ ] シェル統合（OSC 133によるコマンド追跡）
- [ ] 高度なリンク検出（ファイルパス検証、エラー解析）
- [ ] ターミナルプロファイルシステム
- [ ] 検索機能の強化（装飾、カウンター）
- [ ] アクセシビリティ改善

### Phase 4: ユーザビリティ向上 (計画中)
- [ ] Unicode/国際化完全サポート
- [ ] 高度なタブ管理（グループ、永続化）
- [ ] テーママーケットプレイス
- [ ] パフォーマンス最適化（GPU制御、ダーティリージョン）
- [ ] プロセス管理UI

### Phase 5: 高度な機能 (将来)
- [ ] AIパワードコマンド提案
- [ ] メッセージルーター＆自律開発支援（[詳細仕様](docs/specifications/MESSAGE_ROUTER_AND_AUTONOMOUS_DEV_SPEC.md)）
- [ ] 画像/グラフィックスサポート（Sixel、iTerm2）
- [ ] ターミナルリプレイ
- [ ] 高度な統合機能（デバッガー、エディター）
- [ ] Zeami CLIとの深い統合

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

- 2025-01-09: ドキュメント全面再構築完了、Claude Code最適化フォーマット導入
- 2025-06-27: Phase 2完了 - xterm.jsフォーク統合、選択透明度問題の根本解決、ソースコード分析実施
- 2025-06-26: 包括的改善記録の作成、無限ループ問題の修正、パフォーマンス最適化
- 2025-06-25: プロジェクト初期化、基本構造の定義、基本機能の実装完了