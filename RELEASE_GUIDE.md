# ZeamiTerm リリースガイド

## クイックスタート

```bash
# 1. GitHub Personal Access Tokenを設定
export GH_TOKEN=your_github_token_here

# 2. バージョンを更新
npm version patch  # or minor, major

# 3. ビルドとリリース
npm run build
./scripts/create-release.js
```

## 詳細手順

### 1. 準備

#### GitHub Personal Access Token (PAT) の作成
1. [GitHub Settings](https://github.com/settings/tokens) にアクセス
2. "Generate new token (classic)" をクリック
3. 以下の権限を付与：
   - `repo` (プライベートリポジトリへのフルアクセス)
4. トークンを環境変数に設定：
   ```bash
   export GH_TOKEN=your_token_here
   ```

### 2. バージョン管理

```bash
# パッチバージョン更新 (0.1.0 → 0.1.1)
npm version patch

# マイナーバージョン更新 (0.1.0 → 0.2.0)
npm version minor

# メジャーバージョン更新 (0.1.0 → 1.0.0)
npm version major
```

### 3. ビルド

```bash
# macOS用ビルド
npm run build:mac

# 全プラットフォーム用ビルド
npm run build
```

### 4. リリース作成

#### 自動リリース（推奨）
```bash
./scripts/create-release.js
```

#### 手動リリース
1. [GitHub Releases](https://github.com/hiranotomo/zeami-term/releases/new) にアクセス
2. 以下を設定：
   - **Tag**: `v0.1.0` (vプレフィックス付き)
   - **Title**: `ZeamiTerm v0.1.0`
   - **Description**: リリースノートを記載
3. 以下のファイルをアップロード：
   - `dist/ZeamiTerm-0.1.0-arm64.dmg`
   - `dist/ZeamiTerm-0.1.0-arm64-mac.zip`
   - `dist/latest-mac.yml` (重要！)
4. "This is a pre-release" のチェックを外す
5. "Publish release" をクリック

### 5. テスト

```bash
# テストスクリプトを使用
./scripts/test-auto-update.sh
```

## 重要な注意事項

### プライベートリポジトリでのパブリックリリース
- リポジトリ自体はプライベート（ソースコード非公開）
- リリースはパブリック（誰でもダウンロード可能）
- 自動アップデートは認証不要で動作

### ファイル構成
必須ファイル：
- `.dmg` - macOS用インストーラー
- `.zip` - ZIP形式のアプリケーション
- `latest-mac.yml` - アップデート情報（超重要！）

### トラブルシューティング

#### "404 Not Found" エラー
- リポジトリ名とオーナー名を確認
- リリースが公開されているか確認
- `latest-mac.yml` がアップロードされているか確認

#### 認証エラー
- `GH_TOKEN` が正しく設定されているか確認
- トークンに `repo` 権限があるか確認

#### アップデートが検出されない
- バージョン番号が正しく更新されているか確認
- `latest-mac.yml` の内容を確認
- キャッシュをクリア：`~/Library/Caches/zeami-term-updater/`

## 自動化のヒント

### GitHub Actions（将来的な実装）
```yaml
name: Release
on:
  push:
    tags:
      - 'v*'
jobs:
  release:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm ci
      - run: npm run build
      - run: npm run publish:mac
        env:
          GH_TOKEN: ${{ secrets.GH_TOKEN }}
```

### ローカル自動化
```bash
# リリース用エイリアス
alias zeami-release="npm version patch && npm run build && ./scripts/create-release.js"
```