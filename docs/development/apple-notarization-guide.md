# Apple公証ガイド - ZeamiTerm

## 概要

Apple公証（Notarization）は、macOS用アプリケーションの配布に必須のプロセスです。公証により、アプリがAppleによって審査され、悪意のあるソフトウェアでないことが確認されます。

## 認証情報の設定

### 必要な情報

1. **Apple ID**: `tomo@teleport.jp`
2. **App-specific password**: `jewh-mrqd-puzh-yzya`
3. **Team ID**: `CV92DCV37B` (TELEPORT Co., LTD)

### 環境変数の設定

`.env`ファイルに以下を記載：

```bash
APPLE_ID=tomo@teleport.jp
APPLE_ID_PASSWORD=jewh-mrqd-puzh-yzya
APPLE_APP_SPECIFIC_PASSWORD=jewh-mrqd-puzh-yzya
APPLE_TEAM_ID=CV92DCV37B
```

## リリース手順

### 1. バージョン更新

```bash
# package.json のバージョンを更新
npm version patch  # または minor/major
```

### 2. ビルドと公証

```bash
# 環境変数が正しく設定されていることを確認
cat .env | grep APPLE

# ビルド・公証・リリースを一括実行
npm run publish:mac
```

### 3. リリースの確認

1. GitHubのReleasesページを確認
2. アップロードされたファイルを確認：
   - `ZeamiTerm-x.x.x-arm64.dmg`
   - `ZeamiTerm-x.x.x-arm64-mac.zip`
   - `latest-mac.yml`

## トラブルシューティング

### 認証エラーが発生する場合

1. **Apple IDの確認**
   - 正しいメールアドレス: `tomo@teleport.jp`
   - 間違った例: `ceo@teleport.co.jp`

2. **パスワードの確認**
   - App-specific password（16文字、ハイフン付き）を使用
   - Apple IDのログインパスワードではない

3. **Team IDの確認**
   - TELEPORT Co., LTDのTeam ID: `CV92DCV37B`

### 公証が遅い場合

- 公証プロセスは通常5-10分かかります
- ピーク時は30分以上かかることもあります
- タイムアウトした場合は再実行してください

## 重要な注意事項

1. `.env`ファイルは絶対にGitにコミットしない（.gitignoreに含まれています）
2. App-specific passwordは定期的に再生成することを推奨
3. 公証は必ずリリース前に実行する

## 参考リンク

- [Apple Developer - Notarizing macOS Software](https://developer.apple.com/documentation/security/notarizing_macos_software_before_distribution)
- [Electron Builder - Code Signing](https://www.electron.build/code-signing)