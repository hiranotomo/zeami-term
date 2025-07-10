# ZeamiTerm リリースプロセス

このドキュメントは、ZeamiTermのリリースプロセスを統一した公式ガイドです。

## 📋 前提条件

### 1. 環境設定
```bash
# .env.example を .env にコピーして値を設定
cp .env.example .env
```

必要な環境変数：
- `APPLE_ID`: Apple Developer アカウントのメールアドレス
- `APPLE_ID_PASSWORD`: App-specific password（通常のパスワードではない）
- `APPLE_TEAM_ID`: Developer証明書のTeam ID（例: CV92DCV37B）
- `GH_TOKEN`: GitHub Personal Access Token（repo権限が必要）

### 2. 証明書の確認
```bash
# Developer ID証明書が存在することを確認
security find-identity -v -p codesigning | grep "Developer ID Application"
```

### 3. GitHub CLIのインストール
```bash
# Homebrewでインストール
brew install gh

# ログイン
gh auth login
```

## 🚀 リリース手順

### 統一リリーススクリプトを使用

すべてのリリースは `scripts/release.sh` を通じて行います：

```bash
# パッチリリース（バグ修正）
npm run release:patch

# マイナーリリース（新機能）
npm run release:minor

# メジャーリリース（破壊的変更）
npm run release:major

# 現在のバージョンでリリース（バージョン変更なし）
npm run release:current

# 対話式でリリースタイプを選択
npm run release
```

### リリーススクリプトの動作

1. **環境チェック**
   - 必要な環境変数の確認
   - Developer証明書の確認

2. **バージョン管理**
   - 指定されたタイプに応じてバージョンを更新
   - package.jsonのバージョンを自動更新

3. **CHANGELOG確認**
   - 新バージョンのエントリーがCHANGELOGに存在することを確認
   - リリースノートはCHANGELOGから自動抽出

4. **ビルドと公証**
   - クリーンビルドの実行
   - macOS向けの自動公証（notarization）
   - DMGとZIPファイルの生成

5. **検証**
   - ZIPファイルのシンボリックリンク確認
   - 必要に応じて自動修正

6. **GitHubリリース**
   - 自動的にGitHubリリースを作成
   - すべての必要なアーティファクトをアップロード

7. **Gitコミット**
   - バージョン変更をコミット
   - Gitタグの作成

## 📝 CHANGELOGの書き方

リリース前に必ずCHANGELOGを更新してください：

```markdown
## [0.1.16] - 2025-01-10

### 追加
- 新機能の説明

### 変更
- 変更内容の説明

### 修正
- バグ修正の説明

### 削除
- 削除された機能
```

## ⚠️ よくある問題と解決方法

### 公証エラー
```
Error: The operation couldn't be completed. Unable to locate a Java Runtime.
```
解決: Xcodeのコマンドラインツールをインストール
```bash
xcode-select --install
```

### 証明書エラー
```
Developer ID証明書が見つかりません
```
解決: 
1. Apple Developerサイトから証明書をダウンロード
2. キーチェーンアクセスにインポート

### App-specific passwordエラー
```
Error: Invalid username and password combination
```
解決: 通常のApple IDパスワードではなく、App-specific passwordを使用
1. https://appleid.apple.com にログイン
2. セキュリティ → アプリ用パスワード → 生成

### ZIPファイルサイズの問題
```
ZIPファイルが小さすぎます（シンボリックリンクの問題の可能性）
```
解決: スクリプトが自動的に修正しますが、手動で修正する場合：
```bash
cd dist/mac-arm64
zip -ry ../ZeamiTerm-VERSION-arm64-mac.zip ZeamiTerm.app
```

## 🔄 自動アップデート

リリース後、既存のユーザーは自動的にアップデート通知を受け取ります。

### アップデートの仕組み
1. アプリケーションが起動時にGitHubリリースをチェック
2. 新しいバージョンが見つかった場合、通知を表示
3. ユーザーが承認すると、バックグラウンドでダウンロード
4. ダウンロード完了後、再起動してアップデート

### アップデートファイル
- `latest-mac.yml`: アップデート情報のメタデータ
- `ZeamiTerm-VERSION-arm64-mac.zip`: 実際のアップデートファイル
- `*.blockmap`: 差分アップデート用のファイル

## 📊 リリース後の確認

1. GitHubリリースページで全ファイルが正しくアップロードされているか確認
2. 既存のインストールで自動アップデートが動作するか確認
3. 新規ダウンロードでDMGが正しく開けるか確認

## 🚨 緊急時の対応

リリースに問題があった場合：

1. GitHubリリースを削除
2. Gitタグを削除: `git tag -d vX.X.X && git push origin :vX.X.X`
3. 問題を修正
4. 同じバージョン番号で再リリース（または新しいバージョンでリリース）

## 📚 参考リンク

- [Electron Builder Documentation](https://www.electron.build/)
- [Apple Notarization Guide](https://developer.apple.com/documentation/security/notarizing_macos_software_before_distribution)
- [GitHub Releases API](https://docs.github.com/en/rest/releases)