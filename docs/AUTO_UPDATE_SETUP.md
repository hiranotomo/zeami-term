# ZeamiTerm 自動アップデート設定ガイド

## 概要

ZeamiTermの自動アップデート機能について説明します。

### 重要な制限事項

**プライベートリポジトリの場合、リリースアセットへの匿名アクセスはできません。**
以下のいずれかの方法を選択する必要があります：

1. **リポジトリを公開にする**（推奨）
2. **別の公開リポジトリでリリースをホスト**
3. **S3/CDNなど外部サービスを使用**

## 設定方法

### 1. GitHub Repository設定

1. GitHubで`zeami-term`リポジトリを開く
2. Settings → Manage access でリポジトリをPrivateに設定
3. Releases → 新しいリリースを作成時に「Make latest release」を選択

### 2. リリース作成手順

#### 自動リリース（推奨）
```bash
# バージョンをアップデート
npm version patch  # または minor, major

# タグをプッシュ（GitHub Actionsが自動的にビルド・リリース）
git push origin v0.1.3
```

#### 手動リリース
```bash
# ビルド
npm run build:mac

# GitHubでリリース作成
# 1. https://github.com/hiranotomo/zeami-term/releases/new
# 2. タグを作成: v0.1.3
# 3. リリースタイトル: ZeamiTerm v0.1.3
# 4. ビルドされたファイルをアップロード:
#    - dist/ZeamiTerm-0.1.3-arm64.dmg
#    - dist/ZeamiTerm-0.1.3-arm64.dmg.blockmap
#    - dist/latest-mac.yml
# 5. 「Publish release」をクリック
```

### 3. 必要なSecrets設定（GitHub Actions用）

GitHub Repository Settings → Secrets and variables → Actions:

```
APPLE_CERT_BASE64       # Apple Developer証明書（base64エンコード）
APPLE_CERT_PASSWORD     # 証明書のパスワード  
APPLE_ID                # Apple ID（notarization用）
APPLE_ID_PASSWORD       # App-specific password
APPLE_TEAM_ID           # Developer Team ID (例: CV92DCV37B)
```

### 4. アップデートの確認

ユーザーは以下の方法でアップデートを確認できます：

1. **自動確認**: アプリ起動5秒後に自動的にチェック
2. **手動確認**: メニュー → ヘルプ → アップデートを確認

## セキュリティ考慮事項

### 方法1: リポジトリを公開にする（推奨）

**利点**
- 設定が最も簡単
- electron-updaterがそのまま動作
- 追加コスト不要

**実装**
```bash
# リポジトリを公開に変更
gh repo edit hiranotomo/zeami-term --visibility public --accept-visibility-change-consequences
```

### 方法2: 別の公開リポジトリでリリースをホスト

**利点**
- ソースコードは非公開のまま
- リリースのみ公開

**実装**
1. `zeami-term-releases`という公開リポジトリを作成
2. electron-builder.ymlを更新：
```yaml
publish:
  provider: github
  owner: hiranotomo
  repo: zeami-term-releases  # リリース用リポジトリ
```

### 方法3: 認証トークンを使用（非推奨）

**問題点**
- 各ユーザーにトークンを配布する必要がある
- トークン管理が複雑
- ユーザー体験が悪い

## 代替案

より高いセキュリティが必要な場合：

### Option A: S3/CDN配信
```javascript
// autoUpdater.js
autoUpdater.setFeedURL({
  provider: 'generic',
  url: 'https://your-private-cdn.com/zeami-term/releases'
});
```

### Option B: 認証付き配信
```javascript
// カスタムプロバイダーを実装
autoUpdater.setFeedURL({
  provider: 'custom',
  url: 'https://api.zeami.app/updates',
  headers: {
    'Authorization': 'Bearer YOUR_TOKEN'
  }
});
```

## トラブルシューティング

### アップデートが検出されない場合

1. `latest-mac.yml`が正しくアップロードされているか確認
2. バージョン番号が正しく増加しているか確認
3. リリースが「Latest release」として公開されているか確認

### 署名エラーが発生する場合

1. Apple Developer証明書が有効か確認
2. notarization が完了しているか確認
3. `entitlements.mac.plist`の設定を確認

## 開発環境でのテスト

```bash
# 開発環境でアップデートをテスト
NODE_ENV=production npm run dev

# ログを確認
tail -f ~/Library/Logs/zeami-term/main.log
```
