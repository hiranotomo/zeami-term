# ZeamiTerm 新ドキュメント構造設計

## 設計方針
- コードベースの実際の構造に基づいた正確なドキュメント
- 開発者とユーザーの両方に価値のある内容
- メンテナンスしやすい構造
- 現在の実装状態を正確に反映

## 提案する新しいドキュメント構造

```
zeami-term/
├── README.md                          # プロジェクト概要（簡潔に）
├── CLAUDE.md                          # AI開発アシスタント用ガイドライン（維持）
├── PROJECT_KNOWLEDGE.md               # プロジェクト固有の知識（維持）
├── CHANGELOG.md                       # バージョン履歴（維持）
│
├── docs/
│   ├── README.md                      # ドキュメントインデックス
│   │
│   ├── getting-started/               # 導入ガイド
│   │   ├── installation.md            # インストール手順
│   │   ├── quick-start.md             # クイックスタート
│   │   └── configuration.md           # 初期設定
│   │
│   ├── architecture/                  # アーキテクチャ
│   │   ├── overview.md                # 全体設計
│   │   ├── main-process.md            # メインプロセス設計
│   │   ├── renderer-process.md        # レンダラープロセス設計
│   │   ├── ipc-communication.md       # IPC通信設計
│   │   └── xterm-integration.md       # xterm.js統合
│   │
│   ├── api/                           # APIリファレンス
│   │   ├── main-api.md                # メインプロセスAPI
│   │   ├── renderer-api.md            # レンダラーAPI
│   │   ├── ipc-channels.md            # IPCチャンネル一覧
│   │   └── commands.md                # 内蔵コマンド一覧
│   │
│   ├── features/                      # 機能ドキュメント
│   │   ├── terminal-management.md     # ターミナル管理
│   │   ├── profile-system.md          # プロファイルシステム
│   │   ├── session-persistence.md     # セッション永続化
│   │   ├── paste-handling.md          # ペースト処理
│   │   ├── notification-system.md     # 通知システム
│   │   ├── shell-integration.md       # シェル統合
│   │   └── auto-update.md             # 自動アップデート
│   │
│   ├── development/                   # 開発ガイド（2025-06,07月のみ保持）
│   │   └── *.md                       # 最新の開発ログ
│   │
│   ├── deployment/                    # デプロイメント
│   │   ├── build-guide.md             # ビルド手順
│   │   ├── release-process.md         # リリースプロセス
│   │   ├── notarization.md            # macOS公証
│   │   └── code-signing.md            # コード署名
│   │
│   ├── troubleshooting/               # トラブルシューティング
│   │   ├── common-issues.md           # よくある問題
│   │   ├── debugging-guide.md         # デバッグガイド
│   │   └── faq.md                     # FAQ
│   │
│   └── logs/                          # 開発ログ（2025-06,07月のみ保持）
│       └── 2025-0[67]/
```

## 各ドキュメントの内容（コードベースから生成）

### 1. アーキテクチャドキュメント
- 実際のディレクトリ構造に基づく
- 各モジュールの責務を明確に記載
- データフローを図解

### 2. APIリファレンス
- 実装されているIPCチャンネルを網羅
- 各APIのパラメータと戻り値を記載
- 使用例を含める

### 3. 機能ドキュメント
- 実装済み機能のみを記載
- 使用方法を具体的に説明
- 設定オプションを明記

### 4. デプロイメントガイド
- 実際のビルドスクリプトに基づく
- プラットフォーム別の手順
- リリースチェックリスト

## 自動生成対象

以下のドキュメントはコードから自動生成可能：

1. **IPCチャンネル一覧**
   - src/common/ipcChannels.jsから抽出
   - src/preload/index.jsから抽出

2. **内蔵コマンド一覧**
   - src/commands/から抽出

3. **依存関係グラフ**
   - package.jsonから生成

4. **モジュール構造図**
   - srcディレクトリ構造から生成

## 実装計画

1. 新しいディレクトリ構造の作成
2. 既存の価値あるコンテンツの移行
3. コードベースからの自動生成
4. 不足している重要なドキュメントの作成
5. インデックスページの作成

## メンテナンス方針

- コード変更時は対応するドキュメントも更新
- 月次で古いログをアーカイブ
- 四半期でドキュメントの整合性を確認
- リリース時にCHANGELOGを更新