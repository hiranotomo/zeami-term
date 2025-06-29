# ZeamiTerm リリースチェックリスト v2

## ⚠️ 今回の失敗から学んだ教訓

### 失敗の原因分析
1. **不完全な署名**: Ad-hoc署名では公証できない
2. **環境変数の未設定**: ビルド時に認証情報が正しく設定されていなかった
3. **複数の公証試行**: 過去の「In Progress」状態が残り、混乱を招いた
4. **手動ビルドとアップロード**: 自動化されていない部分でミスが発生

## ✅ リリース前の必須確認事項

### 1. 環境設定の確認
```bash
# .envファイルの内容を確認
cat .env | grep APPLE

# 必須の環境変数：
# APPLE_ID=tomo@teleport.jp
# APPLE_ID_PASSWORD=jewh-mrqd-puzh-yzya
# APPLE_APP_SPECIFIC_PASSWORD=jewh-mrqd-puzh-yzya
# APPLE_TEAM_ID=CV92DCV37B
```

### 2. 証明書の確認
```bash
# Developer ID証明書が存在することを確認
security find-identity -v -p codesigning | grep "Developer ID Application"
# → "Developer ID Application: TELEPORT Co., LTD (CV92DCV37B)" が表示されるはず
```

### 3. electron-builder.ymlの確認
```yaml
mac:
  hardenedRuntime: true  # 必須
  identity: "TELEPORT Co., LTD (CV92DCV37B)"  # プレフィックスなし
  entitlements: build/entitlements.mac.plist
  entitlementsInherit: build/entitlements.mac.plist
afterSign: scripts/notarize.js  # 公証スクリプト
```

## 🚀 正しいリリース手順

### 1. バージョン更新とCHANGELOG
```bash
# CHANGELOGを更新
code CHANGELOG.md

# バージョンを更新（自動的にgit tagも作成される）
npm version patch  # または minor/major
```

### 2. 環境変数を明示的にエクスポート
```bash
# 必ず実行すること！
export APPLE_ID="tomo@teleport.jp"
export APPLE_ID_PASSWORD="jewh-mrqd-puzh-yzya"
export APPLE_APP_SPECIFIC_PASSWORD="jewh-mrqd-puzh-yzya"
export APPLE_TEAM_ID="CV92DCV37B"

# 確認
echo $APPLE_ID  # tomo@teleport.jp が表示されるはず
```

### 3. ワンコマンドでビルド・公証・リリース
```bash
# これ一つで全て完了するはず
npm run publish:mac

# または、段階的に実行する場合：
# 1. ビルドと公証
npm run build:mac

# 2. 公証完了を確認
xcrun stapler validate dist/ZeamiTerm-*-arm64.dmg

# 3. GitHubにアップロード
gh release upload vX.X.X dist/ZeamiTerm-*-arm64.dmg dist/ZeamiTerm-*-arm64-mac.zip
```

### 4. 公証状態の確認方法
```bash
# 履歴を確認
xcrun notarytool history --apple-id "$APPLE_ID" --password "$APPLE_ID_PASSWORD" --team-id "$APPLE_TEAM_ID"

# 特定の公証ログを確認（IDは履歴から取得）
xcrun notarytool log <submission-id> --apple-id "$APPLE_ID" --password "$APPLE_ID_PASSWORD" --team-id "$APPLE_TEAM_ID"
```

## 🔥 トラブルシューティング

### 公証が「In Progress」のまま
- 通常5-10分で完了するが、混雑時は30分以上かかることも
- 1時間以上経っても完了しない場合は、Appleのサーバー側の問題の可能性

### 公証が「Invalid」になった場合
```bash
# エラーログを確認
xcrun notarytool log <submission-id> --apple-id "$APPLE_ID" --password "$APPLE_ID_PASSWORD" --team-id "$APPLE_TEAM_ID"

# よくあるエラー：
# - "not signed with a valid Developer ID certificate" → 証明書の問題
# - "hardened runtime not enabled" → electron-builder.ymlの設定ミス
# - "secure timestamp missing" → 署名時のネットワーク問題
```

### GitHubアップロードがタイムアウトする場合
```bash
# ファイルサイズを確認
ls -lh dist/*.dmg dist/*.zip

# 大きなファイルは時間がかかるので、個別にアップロード
gh release upload vX.X.X dist/ZeamiTerm-X.X.X-arm64.dmg
gh release upload vX.X.X dist/ZeamiTerm-X.X.X-arm64-mac.zip
```

## 📋 リリース後の確認

1. **GitHubリリースページの確認**
   - DMGとZIPがアップロードされている
   - latest-mac.ymlが更新されている

2. **自動更新のテスト**
   - 旧バージョンのZeamiTermで更新を確認
   - 新バージョンがダウンロード・インストールされる

3. **公証済みアプリの動作確認**
   - DMGをダウンロードして別のMacで開く
   - 「開発元を検証できません」ではなく正常に起動する

## 🚨 絶対にやってはいけないこと

1. ❌ 環境変数を設定せずにビルド
2. ❌ Ad-hoc署名（sign-app.sh）したものを公証しようとする
3. ❌ 公証前のファイルをGitHubにアップロード
4. ❌ 間違ったApple ID（ceo@teleport.co.jp等）を使用
5. ❌ 公証が完了する前にアップロード

## 🎯 推奨される自動化

### リリーススクリプトの作成
```bash
#!/bin/bash
# scripts/automated-release.sh

# 環境変数の自動読み込み
source .env

# エクスポート
export APPLE_ID
export APPLE_ID_PASSWORD
export APPLE_APP_SPECIFIC_PASSWORD
export APPLE_TEAM_ID

# ビルド・公証・リリース
npm run publish:mac

# 完了通知
echo "🎉 リリース完了！"
```

これにより、次回からは確実に公証済みのアプリケーションをリリースできます。