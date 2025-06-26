# ZeamiTerm 自動アップデート機能

## 概要

ZeamiTermには、GitHub Releasesを使用した自動アップデート機能が実装されています。
ユーザーは手動でダウンロードすることなく、新しいバージョンを自動的に取得・インストールできます。

## 機能

- **自動チェック**: アプリ起動後5秒で自動的にアップデートをチェック
- **手動チェック**: Help → Check for Updates... から手動でチェック可能
- **プログレス表示**: ダウンロード進捗を視覚的に表示
- **日本語UI**: すべてのダイアログとメッセージは日本語で表示

## セットアップ手順

### 1. GitHubリポジトリの準備

1. GitHubでリポジトリを作成（例: `your-username/zeami-term`）
2. `electron-builder.yml`の設定を更新:
   ```yaml
   publish:
     provider: github
     owner: your-github-username  # ← あなたのGitHubユーザー名
     repo: zeami-term             # ← リポジトリ名
   ```

### 2. GitHub Personal Access Tokenの設定

リリースをアップロードするために必要：

1. GitHub → Settings → Developer settings → Personal access tokens
2. "Generate new token (classic)" をクリック
3. 以下の権限を付与:
   - `repo` (Full control of private repositories)
4. トークンをコピー
5. 環境変数に設定:
   ```bash
   export GH_TOKEN=your_github_token_here
   ```

### 3. リリースの作成

```bash
# バージョンを更新
npm version patch  # または minor, major

# ビルドと公開
npm run publish:mac  # macOS用
npm run publish:win  # Windows用
npm run publish:linux  # Linux用
```

### 4. テスト環境での確認

開発環境でテストする場合：

1. ローカルサーバーを起動:
   ```bash
   # releasesディレクトリを作成
   mkdir -p releases
   
   # テスト用のリリースファイルを配置
   cp dist/*.dmg releases/
   cp dist/*.zip releases/
   cp dist/latest-mac.yml releases/
   
   # HTTPサーバーを起動
   npx http-server ./releases -p 8080 --cors
   ```

2. 環境変数を設定してアプリを起動:
   ```bash
   export NODE_ENV=development
   npm run dev
   ```

## アップデートフロー

1. **自動チェック**
   - アプリ起動5秒後に自動実行
   - バックグラウンドで静かにチェック

2. **アップデート検出**
   - 新バージョンが見つかるとダイアログ表示
   - ユーザーが「ダウンロード」を選択

3. **ダウンロード**
   - プログレスバーで進捗表示
   - 右下に通知ウィンドウ表示

4. **インストール**
   - ダウンロード完了後、再起動を促すダイアログ
   - 「今すぐ再起動」でアップデート適用

## トラブルシューティング

### アップデートが動作しない場合

1. **署名の問題（macOS）**
   - 未署名のアプリはアップデートできない場合があります
   - 開発版では `dev-app-update.yml` を使用してテスト

2. **権限の問題**
   - アプリケーションフォルダへの書き込み権限を確認
   - 管理者権限が必要な場合があります

3. **ネットワークの問題**
   - プロキシ環境では追加設定が必要
   - ファイアウォールでGitHubへのアクセスを許可

### ログの確認

アップデートのログは以下に保存されます：
- macOS: `~/Library/Logs/zeami-term/`
- Windows: `%USERPROFILE%\AppData\Roaming\zeami-term\logs\`
- Linux: `~/.config/zeami-term/logs/`

## セキュリティ

- HTTPS経由でのみアップデートをダウンロード
- GitHub Releasesの署名検証（設定可能）
- 差分アップデートによる効率化

## 今後の改善点

- [ ] 差分アップデートの実装
- [ ] バックグラウンドダウンロード
- [ ] アップデート履歴の表示
- [ ] ベータチャンネルのサポート
- [ ] 自動アップデートのオン/オフ設定