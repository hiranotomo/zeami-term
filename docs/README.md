# ZeamiTerm ドキュメント

> 🤖 **Claude Code最適化ドキュメント**  
> ZeamiTermの完全なドキュメントへようこそ。効率的な開発のための全情報がここにあります。

## 📚 ドキュメント構成

### 🚀 はじめに

- **[インストールガイド](./getting-started/installation.md)** - セットアップから起動まで
- **[クイックスタート](./getting-started/quick-start.md)** - 5分で始める基本操作
- **[設定ガイド](./getting-started/configuration.md)** - カスタマイズと詳細設定

### 🏗️ アーキテクチャ

- **[アーキテクチャ概要](./architecture/overview.md)** - 📍 システム全体の設計と構造
- **[メインプロセス設計](./architecture/main-process.md)** - Electronバックエンドの詳細
- **[レンダラープロセス設計](./architecture/renderer-process.md)** - UI層の実装
- **[IPC通信設計](./architecture/ipc-communication.md)** - プロセス間通信の全チャンネル
- **[xterm.js統合](./architecture/xterm-integration.md)** - ターミナルUIの中核技術

### ✨ 機能ドキュメント

- **[ターミナル管理](./features/terminal-management.md)** - 固定2ターミナル構成の詳細
- **[ペースト処理](./features/paste-handling.md)** - 📍 Claude Code対応の特殊処理
- **[プロファイルシステム](./features/profile-system.md)** - 複数環境の管理
- **[セッション永続化](./features/session-persistence.md)** - 作業状態の保存と復元
- **[通知システム](./features/notification-system.md)** - スマートな通知機能
- **[シェル統合](./features/shell-integration.md)** - コマンド追跡とOSC対応
- **[自動アップデート](./features/auto-update.md)** - シームレスな更新機能

### 🚢 デプロイメント

- **[ビルドガイド](./deployment/build-guide.md)** - プロダクションビルドの作成
- **[リリースプロセス](./deployment/release-process.md)** - バージョニングから配布まで
- **[コード署名](./deployment/code-signing.md)** - 全プラットフォームの署名
- **[macOS公証](./deployment/notarization.md)** - Gatekeeper対応

### 🔧 トラブルシューティング

- **[よくある問題](./troubleshooting/common-issues.md)** - 📍 症状別の解決方法
- **[デバッグガイド](./troubleshooting/debugging-guide.md)** - 開発者向け調査手法
- **[FAQ](./troubleshooting/faq.md)** - よくある質問と回答

### 📝 開発ドキュメント

最新の開発ログは`development/`ディレクトリにあります：
- 2025-06月: プロジェクト初期化、基本実装
- 2025-07月: 最新の改善と機能追加

### 📖 その他のリソース

- **[CHANGELOG.md](../CHANGELOG.md)** - バージョン履歴
- **[ZEAMITERM_COMPREHENSIVE_IMPROVEMENTS.md](./ZEAMITERM_COMPREHENSIVE_IMPROVEMENTS.md)** - 包括的な改善履歴

## 🎯 用途別ガイド

### 新機能を追加したい

1. [アーキテクチャ概要](./architecture/overview.md#拡張ポイント)で拡張ポイントを確認
2. [IPC通信設計](./architecture/ipc-communication.md)で必要なチャンネルを追加
3. [開発ログ](./development/)で実装例を参照

### バグを修正したい

1. [よくある問題](./troubleshooting/common-issues.md)で既知の問題を確認
2. [デバッグガイド](./troubleshooting/debugging-guide.md)でデバッグ手法を学習
3. 症状に応じた調査を開始

### パフォーマンスを改善したい

1. [アーキテクチャ概要](./architecture/overview.md#パフォーマンス考慮事項)でボトルネックを確認
2. [xterm.js統合](./architecture/xterm-integration.md#最適化テクニック)で最適化方法を学習

### リリースしたい

1. [リリースプロセス](./deployment/release-process.md)でワークフローを確認
2. [ビルドガイド](./deployment/build-guide.md)でビルドを実行
3. [コード署名](./deployment/code-signing.md)と[公証](./deployment/notarization.md)を完了

## 💡 重要な概念

### 固定2ターミナル構成

ZeamiTermは`Terminal A`と`Terminal B`の固定2ターミナル構成を採用しています。これらは削除できず、常に存在します。詳細は[ターミナル管理](./features/terminal-management.md)を参照。

### Claude Code最適化

ペースト処理、コマンド検出、通知システムなど、多くの機能がClaude Codeとの対話に最適化されています。特に[ペースト処理](./features/paste-handling.md)は独自の実装です。

### セキュリティ重視

Electronのセキュリティベストプラクティスに従い、`contextIsolation: true`、`nodeIntegration: false`などの設定を採用しています。

## 🔍 ドキュメント検索のヒント

- **📍 マーク**: 特に重要なセクション
- **ファイルパスと行番号**: `src/main/index.js:123` 形式で具体的な場所を示す
- **コード例**: 実装時にそのまま使える実例
- **トラブルシューティング表**: 症状→原因→解決方法の形式

## 🤝 コントリビューション

ドキュメントの改善提案は歓迎します：

1. 誤字・脱字の修正
2. より分かりやすい説明への改善
3. 新しい例の追加
4. 図表の追加

## 📄 ライセンス

このドキュメントはZeamiTermプロジェクトの一部として、MITライセンスで提供されています。

---

> 💡 **Claude Codeへのヒント**: このインデックスページから必要なドキュメントに素早くアクセスできます。新機能追加時は該当するドキュメントも更新してください。