# プライベートリポジトリでのパブリックリリース設定

## 概要

ZeamiTermはプライベートGitHubリポジトリを使用しながら、パブリックリリースを通じて自動アップデートを提供します。

## セットアップ手順

### 1. GitHubリポジトリの設定

1. GitHubで `hiranotomo/zeami-term` リポジトリを作成（まだない場合）
2. Settings → General → Danger Zone で **Change repository visibility** をクリック
3. **Make private** を選択してプライベートに変更

### 2. GitHub Personal Access Token (PAT) の作成

リリースの作成に必要なトークンを生成：

1. GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. **Generate new token (classic)** をクリック
3. 以下の権限を付与：
   - `repo` - Full control of private repositories（必須）
   - `write:packages` - Upload packages to GitHub Package Registry
4. トークンをコピーして安全に保管

### 3. 環境変数の設定

```bash
# .env.local ファイルを作成（Gitにはコミットしない）
echo "GH_TOKEN=your_github_personal_access_token_here" > .env.local

# または、シェルで直接設定
export GH_TOKEN=your_github_personal_access_token_here
```

### 4. リリースの作成とアップロード

```bash
# バージョンを更新
npm version patch  # 0.1.0 → 0.1.1

# ビルドとリリースの公開（トークンが必要）
npm run publish:mac

# または手動でリリースを作成
npm run build
# GitHubのリリースページで手動でアップロード
```

### 5. パブリックリリースの確認

1. GitHubで Releases ページにアクセス
2. 新しいリリースを作成
3. **これは非公開リポジトリですが、リリースは公開されます**というメッセージが表示される
4. リリースを公開

## 自動アップデートの仕組み

```
プライベートリポジトリ
    ↓
パブリックリリース（誰でもダウンロード可能）
    ↓
electron-updater が latest-mac.yml をチェック
    ↓
新バージョンがあればユーザーに通知
    ↓
ユーザーが承認したらダウンロード（認証不要）
```

## 重要な注意点

1. **リポジトリはプライベート**：ソースコードは非公開
2. **リリースはパブリック**：ビルドされたアプリは誰でもダウンロード可能
3. **トークンは公開時のみ必要**：エンドユーザーには不要
4. **自動アップデートは認証不要**：パブリックURLから直接ダウンロード

## トラブルシューティング

### リリースが表示されない場合
- リリースが下書き（Draft）になっていないか確認
- リリースがプレリリース（Pre-release）になっていないか確認

### 404エラーが発生する場合
- リポジトリ名とオーナー名が正しいか確認
- リリースが公開されているか確認
- `latest-mac.yml` がアップロードされているか確認

### 認証エラーが発生する場合
- GH_TOKENが正しく設定されているか確認
- トークンに必要な権限があるか確認
- トークンの有効期限が切れていないか確認

## セキュリティベストプラクティス

1. **GH_TOKENは絶対にコミットしない**
2. `.gitignore` に `.env.local` を追加
3. CI/CDでは環境変数として設定
4. トークンは定期的に更新
5. 最小限の権限のみ付与

## テスト方法

```bash
# 開発環境でのテスト
NODE_ENV=production npm run dev

# アップデートサーバーのテスト
# 1. 古いバージョンのアプリをインストール
# 2. 新しいバージョンをGitHubにリリース
# 3. アプリを起動してアップデート通知を確認
```