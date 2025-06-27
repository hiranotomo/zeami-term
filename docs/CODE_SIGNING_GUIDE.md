# ZeamiTerm コード署名ガイド

## 概要

macOSアプリケーションの正式な署名には、Apple Developer Programへの参加が必要です。これにより、Gatekeeperの警告なしにアプリを配布できます。

## 手順

### 1. Apple Developer Programへの参加

1. [Apple Developer](https://developer.apple.com/)にアクセス
2. "Enroll"をクリック
3. 個人または組織として登録（年間$99 USD）
4. 承認を待つ（通常24-48時間）

### 2. Developer ID証明書の作成

#### Xcodeを使用する方法（推奨）

1. Xcode → Preferences → Accounts
2. Apple IDでサインイン
3. "Manage Certificates"をクリック
4. "+" → "Developer ID Application"を選択
5. "Developer ID Installer"も作成（DMG配布用）

#### 手動で作成する方法

1. Keychain Accessを開く
2. Keychain Access → Certificate Assistant → Request a Certificate from a Certificate Authority
3. 情報を入力し、"Saved to disk"を選択
4. Apple Developer Portalで証明書を作成
5. ダウンロードしてダブルクリックでインストール

### 3. 証明書の確認

```bash
# インストールされた証明書を確認
security find-identity -v -p codesigning

# 出力例：
# 1) XXXXXXXXXX "Developer ID Application: Your Name (XXXXXXXXXX)"
# 2) XXXXXXXXXX "Developer ID Installer: Your Name (XXXXXXXXXX)"
```

### 4. electron-builderの設定

#### electron-builder.yml を更新

```yaml
mac:
  category: public.app-category.developer-tools
  icon: build/icon.icns
  hardenedRuntime: true
  gatekeeperAssess: false
  entitlements: build/entitlements.mac.plist
  entitlementsInherit: build/entitlements.mac.plist
  # 証明書のアイデンティティを指定
  identity: "Developer ID Application: Your Name (XXXXXXXXXX)"
  
# DMG設定
dmg:
  sign: true
  identity: "Developer ID Installer: Your Name (XXXXXXXXXX)"
```

### 5. Notarization（公証）の設定

#### Apple App-Specific Passwordの作成

1. [appleid.apple.com](https://appleid.apple.com/)にサインイン
2. セキュリティ → App用パスワード → 生成
3. パスワードを安全に保存

#### 環境変数の設定

```bash
# ~/.zshrc または ~/.bash_profile に追加
export APPLE_ID="your-apple-id@example.com"
export APPLE_ID_PASSWORD="xxxx-xxxx-xxxx-xxxx"  # App-specific password
export APPLE_TEAM_ID="XXXXXXXXXX"  # Team IDまたはDeveloper ID
```

#### electron-builder.ymlに追加

```yaml
afterSign: scripts/notarize.js
```

### 6. Notarizationスクリプトの作成

```javascript
// scripts/notarize.js
const { notarize } = require('@electron/notarize');

exports.default = async function notarizing(context) {
  const { electronPlatformName, appOutDir } = context;
  
  if (electronPlatformName !== 'darwin') {
    return;
  }

  const appName = context.packager.appInfo.productFilename;

  return await notarize({
    appBundleId: 'com.zeami.term',
    appPath: `${appOutDir}/${appName}.app`,
    appleId: process.env.APPLE_ID,
    appleIdPassword: process.env.APPLE_ID_PASSWORD,
    teamId: process.env.APPLE_TEAM_ID
  });
};
```

### 7. 必要なパッケージのインストール

```bash
npm install --save-dev @electron/notarize
```

### 8. ビルドと署名

```bash
# 環境変数が設定されていることを確認
echo $APPLE_ID
echo $APPLE_TEAM_ID

# 署名付きビルド
npm run build:mac

# または直接electron-builderを実行
electron-builder --mac --publish never
```

## トラブルシューティング

### 証明書が見つからない

```bash
# Keychainをリセット
security unlock-keychain -p "your-password" ~/Library/Keychains/login.keychain-db
```

### Notarizationが失敗する

1. Apple IDとApp-specific passwordを確認
2. Bundle IDが正しいか確認
3. ハードンドランタイムが有効か確認

### 署名の検証

```bash
# 署名を確認
codesign --verify --deep --strict --verbose=4 "dist/mac-arm64/ZeamiTerm.app"

# Notarizationを確認
spctl -a -t exec -vvv "dist/mac-arm64/ZeamiTerm.app"
```

## コスト

- Apple Developer Program: $99 USD/年
- 証明書は1年ごとに更新が必要

## 代替案

予算が限られている場合：

1. **Ad-hoc署名**（現在の方法）
   - 無料
   - 「開発元不明」の警告は出るが、「壊れている」エラーは回避

2. **TestFlight**
   - Developer Program必要
   - ベータ版として配布
   - 90日間有効

3. **Homebrew Cask**
   - 署名不要
   - コマンドラインでのインストール
   - 技術者向け