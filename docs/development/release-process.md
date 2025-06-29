# ZeamiTerm リリースプロセス

## 概要

このドキュメントでは、ZeamiTermの新バージョンをリリースする際の標準的な手順を説明します。

## リリース前の準備

### 1. コードの最終確認

```bash
# テストの実行
npm run test:all

# リントチェック
npm run lint

# 型チェック
npm run type-check

# 開発環境での動作確認
npm run dev
```

### 2. CHANGELOGの更新

`CHANGELOG.md`に新バージョンの変更内容を記載：

```markdown
## [0.1.x] - YYYY-MM-DD

### Added
- 新機能の説明

### Fixed
- 修正したバグの説明

### Changed
- 変更内容の説明
```

### 3. バージョン番号の更新

```bash
# パッチリリース (0.1.3 → 0.1.4)
npm version patch

# マイナーリリース (0.1.x → 0.2.0)
npm version minor

# メジャーリリース (0.x.x → 1.0.0)
npm version major
```

## リリース実行

### 1. 環境変数の確認

```bash
# .envファイルが正しく設定されているか確認
cat .env | grep APPLE

# 必要な環境変数：
# APPLE_ID=tomo@teleport.jp
# APPLE_APP_SPECIFIC_PASSWORD=jewh-mrqd-puzh-yzya
# APPLE_TEAM_ID=CV92DCV37B
```

### 2. ビルドと公証

```bash
# macOS版のビルド・公証・GitHubへのアップロード
npm run publish:mac

# このコマンドで以下が自動的に実行されます：
# 1. アプリケーションのビルド
# 2. コード署名
# 3. Apple公証
# 4. DMGとZIPファイルの作成
# 5. GitHubリリースへのアップロード
# 6. 自動更新用のYAMLファイル生成
```

### 3. リリースの確認

1. GitHubのReleasesページを開く
2. 新しいリリースが作成されていることを確認
3. アップロードされたファイルを確認：
   - `ZeamiTerm-x.x.x-arm64.dmg` - インストーラー
   - `ZeamiTerm-x.x.x-arm64-mac.zip` - 自動更新用
   - `latest-mac.yml` - 更新情報ファイル

### 4. リリースノートの編集

GitHubのリリースページで、自動生成されたリリースノートを編集：

```markdown
## ZeamiTerm v0.1.x

### 新機能
- 🚀 機能1の説明
- 🎨 機能2の説明

### バグ修正
- 🐛 修正1の説明
- 🐛 修正2の説明

### 改善
- 📝 改善1の説明
- 🔧 改善2の説明

### ダウンロード
- [ZeamiTerm-0.1.x-arm64.dmg](リンク) - macOS用インストーラー
```

## 自動更新の確認

### 1. 既存ユーザーへの配信確認

- 既存のZeamiTermユーザーには自動的に更新通知が表示されます
- 更新は`latest-mac.yml`ファイルを通じて配信されます

### 2. 手動での更新テスト

```bash
# 旧バージョンのZeamiTermを起動
# メニューから「アップデートを確認」を選択
# 新バージョンがダウンロード・インストールされることを確認
```

## トラブルシューティング

### ビルドエラー

```bash
# node_modulesの再インストール
rm -rf node_modules
npm install

# node-ptyの再ビルド
npm run rebuild
```

### 公証エラー

- [Apple公証ガイド](./apple-notarization-guide.md)を参照
- 認証情報が正しいか確認
- ネットワーク接続を確認

### GitHub リリースエラー

- GitHubトークンが正しく設定されているか確認
- リポジトリへの書き込み権限があるか確認

## クイックリリーススクリプト

簡単なパッチリリースの場合：

```bash
# 自動的にバージョン更新・ビルド・公証・リリースを実行
npm run release:patch
```

## チェックリスト

- [ ] テストがすべてパスしている
- [ ] CHANGELOGを更新した
- [ ] バージョン番号を更新した
- [ ] .envファイルに正しい認証情報が設定されている
- [ ] ネットワーク接続が安定している
- [ ] GitHubへのアクセス権限がある

## 参考情報

- [Apple公証ガイド](./apple-notarization-guide.md)
- [Electron Builder ドキュメント](https://www.electron.build/)
- [GitHub Releases](https://docs.github.com/en/repositories/releasing-projects-on-github)