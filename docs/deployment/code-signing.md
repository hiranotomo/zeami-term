# コード署名

> 🤖 **Claude Code最適化ドキュメント**  
> 信頼されるアプリケーションの配布。全プラットフォームの署名完全ガイド。

## 🎯 クイック署名

```bash
# macOS
npm run sign:mac

# Windows
npm run sign:win

# 自動署名（ビルド時）
npm run dist  # 署名設定があれば自動実行
```

## 📋 コード署名の概要

```yaml
目的: アプリケーションの信頼性と完全性を保証
プラットフォーム別要件:
  macOS:
    - Developer ID Application証明書
    - Apple Developer Program ($99/年)
  Windows:
    - Code Signing証明書
    - 信頼されたCAから購入 ($200-500/年)
  Linux:
    - GPG署名（オプション）
    - 無料
```

## 🏗️ プラットフォーム別設定

### macOS署名

#### 1. 証明書の準備

```bash
# インストール済み証明書の確認
security find-identity -v -p codesigning

# 出力例
1) ABCDEF1234567890 "Developer ID Application: Your Name (TEAM_ID)"
2) 1234567890ABCDEF "Developer ID Installer: Your Name (TEAM_ID)"
```

#### 2. 署名設定

```javascript
// 📍 forge.config.js
module.exports = {
  packagerConfig: {
    osxSign: {
      identity: 'Developer ID Application: Your Name (TEAM_ID)',
      'hardened-runtime': true,
      'gatekeeper-assess': false,
      entitlements: 'build/entitlements.mac.plist',
      'entitlements-inherit': 'build/entitlements.mac.plist',
      'signature-flags': 'library'
    }
  }
};
```

#### 3. 手動署名

```bash
# アプリケーション全体に署名
codesign --force --deep --verbose \
  --sign "Developer ID Application: Your Name (TEAM_ID)" \
  --options runtime \
  --entitlements build/entitlements.mac.plist \
  dist/mac/ZeamiTerm.app

# 署名の検証
codesign --verify --deep --strict --verbose=2 dist/mac/ZeamiTerm.app
```

### Windows署名

#### 1. 証明書の準備

```powershell
# 証明書ストアの確認
certutil -store My

# PFXファイルからインポート
certutil -user -p PASSWORD -importPFX certificate.pfx
```

#### 2. 署名設定

```javascript
// 📍 forge.config.js
module.exports = {
  makers: [{
    name: '@electron-forge/maker-squirrel',
    config: {
      certificateFile: process.env.WINDOWS_CERTIFICATE_FILE,
      certificatePassword: process.env.WINDOWS_CERTIFICATE_PASSWORD,
      signWithParams: '/tr http://timestamp.digicert.com /td sha256 /fd sha256'
    }
  }]
};
```

#### 3. 手動署名

```powershell
# SignToolで署名
signtool sign /tr http://timestamp.digicert.com /td sha256 /fd sha256 /a "dist\win-unpacked\ZeamiTerm.exe"

# 署名の検証
signtool verify /pa /v "dist\win-unpacked\ZeamiTerm.exe"
```

### Linux署名（GPG）

#### 1. GPGキーの準備

```bash
# GPGキーの生成
gpg --full-generate-key

# キーIDの確認
gpg --list-secret-keys --keyid-format=long

# 公開鍵のエクスポート
gpg --armor --export YOUR_KEY_ID > zeamiterm.asc
```

#### 2. AppImageの署名

```bash
# AppImageに署名
gpgsign --detach-sign dist/ZeamiTerm-1.0.0.AppImage

# 署名の検証
gpg --verify dist/ZeamiTerm-1.0.0.AppImage.sig
```

## 🔧 自動署名スクリプト

### クロスプラットフォーム署名

```javascript
// 📍 scripts/sign-all.js

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class CodeSigner {
    constructor() {
        this.platform = process.platform;
    }
    
    async signAll() {
        console.log('🔏 Starting code signing process...');
        
        try {
            switch (this.platform) {
                case 'darwin':
                    await this.signMacOS();
                    break;
                case 'win32':
                    await this.signWindows();
                    break;
                case 'linux':
                    await this.signLinux();
                    break;
            }
            
            console.log('✅ Code signing completed successfully!');
        } catch (error) {
            console.error('❌ Code signing failed:', error);
            throw error;
        }
    }
    
    async signMacOS() {
        const identity = process.env.APPLE_IDENTITY;
        if (!identity) {
            throw new Error('APPLE_IDENTITY not set');
        }
        
        const appPath = 'dist/mac/ZeamiTerm.app';
        
        // すべてのバイナリに署名
        const binaries = this.findBinaries(appPath);
        for (const binary of binaries) {
            console.log(`Signing ${binary}...`);
            execSync(`codesign --force --sign "${identity}" "${binary}"`);
        }
        
        // アプリバンドル全体に署名
        console.log('Signing app bundle...');
        execSync(`
            codesign --force --deep --verbose \
                --sign "${identity}" \
                --options runtime \
                --entitlements build/entitlements.mac.plist \
                "${appPath}"
        `);
        
        // 検証
        execSync(`codesign --verify --deep --strict "${appPath}"`);
    }
    
    async signWindows() {
        const certFile = process.env.WINDOWS_CERTIFICATE_FILE;
        const certPassword = process.env.WINDOWS_CERTIFICATE_PASSWORD;
        
        if (!certFile || !certPassword) {
            throw new Error('Windows certificate not configured');
        }
        
        const exePath = 'dist/win-unpacked/ZeamiTerm.exe';
        
        // タイムスタンプサーバーのリスト（フォールバック）
        const timestampServers = [
            'http://timestamp.digicert.com',
            'http://timestamp.comodoca.com',
            'http://timestamp.globalsign.com/scripts/timstamp.dll'
        ];
        
        let signed = false;
        for (const server of timestampServers) {
            try {
                console.log(`Signing with timestamp server: ${server}`);
                execSync(`
                    signtool sign /f "${certFile}" /p "${certPassword}" \
                        /tr "${server}" /td sha256 /fd sha256 \
                        "${exePath}"
                `);
                signed = true;
                break;
            } catch (error) {
                console.warn(`Failed with ${server}, trying next...`);
            }
        }
        
        if (!signed) {
            throw new Error('All timestamp servers failed');
        }
        
        // 検証
        execSync(`signtool verify /pa "${exePath}"`);
    }
    
    async signLinux() {
        const keyId = process.env.GPG_KEY_ID;
        if (!keyId) {
            console.log('GPG_KEY_ID not set, skipping Linux signing');
            return;
        }
        
        const appImagePath = 'dist/ZeamiTerm-1.0.0.AppImage';
        
        // GPG署名
        execSync(`gpg --detach-sign --armor "${appImagePath}"`);
        
        // チェックサムも生成
        execSync(`sha256sum "${appImagePath}" > "${appImagePath}.sha256"`);
    }
    
    findBinaries(appPath) {
        const binaries = [];
        
        // node_modulesのネイティブバイナリ
        const nodeModulesPath = path.join(appPath, 'Contents/Resources/app/node_modules');
        if (fs.existsSync(nodeModulesPath)) {
            const findCmd = `find "${nodeModulesPath}" -type f -name "*.node"`;
            const result = execSync(findCmd, { encoding: 'utf8' });
            binaries.push(...result.trim().split('\n').filter(Boolean));
        }
        
        // フレームワークとヘルパー
        const frameworksPath = path.join(appPath, 'Contents/Frameworks');
        if (fs.existsSync(frameworksPath)) {
            const findCmd = `find "${frameworksPath}" -type f -perm +111`;
            const result = execSync(findCmd, { encoding: 'utf8' });
            binaries.push(...result.trim().split('\n').filter(Boolean));
        }
        
        return binaries;
    }
}

// 実行
if (require.main === module) {
    const signer = new CodeSigner();
    signer.signAll().catch(process.exit.bind(process, 1));
}

module.exports = CodeSigner;
```

## 🔐 証明書管理

### セキュアな証明書保管

```javascript
// 📍 証明書の暗号化保存

const crypto = require('crypto');
const fs = require('fs');

class CertificateManager {
    static encryptCertificate(certPath, password) {
        const cert = fs.readFileSync(certPath);
        const cipher = crypto.createCipher('aes-256-cbc', password);
        
        const encrypted = Buffer.concat([
            cipher.update(cert),
            cipher.final()
        ]);
        
        fs.writeFileSync(`${certPath}.enc`, encrypted);
        fs.unlinkSync(certPath); // 元のファイルを削除
    }
    
    static decryptCertificate(encPath, password) {
        const encrypted = fs.readFileSync(encPath);
        const decipher = crypto.createDecipher('aes-256-cbc', password);
        
        const decrypted = Buffer.concat([
            decipher.update(encrypted),
            decipher.final()
        ]);
        
        const certPath = encPath.replace('.enc', '');
        fs.writeFileSync(certPath, decrypted);
        
        return certPath;
    }
}
```

### CI/CDでの証明書管理

```yaml
# 📍 .github/workflows/sign.yml

jobs:
  sign:
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        os: [macos-latest, windows-latest]
    
    steps:
      - name: Import macOS Certificate
        if: matrix.os == 'macos-latest'
        env:
          CERTIFICATE_BASE64: ${{ secrets.MACOS_CERTIFICATE_BASE64 }}
          CERTIFICATE_PASSWORD: ${{ secrets.MACOS_CERTIFICATE_PASSWORD }}
        run: |
          # Base64デコード
          echo "$CERTIFICATE_BASE64" | base64 --decode > certificate.p12
          
          # 一時キーチェーンを作成
          security create-keychain -p actions temp.keychain
          security default-keychain -s temp.keychain
          security unlock-keychain -p actions temp.keychain
          
          # 証明書をインポート
          security import certificate.p12 -k temp.keychain \
            -P "$CERTIFICATE_PASSWORD" -T /usr/bin/codesign
          
          security set-key-partition-list -S apple-tool:,apple:,codesign: \
            -s -k actions temp.keychain
            
      - name: Import Windows Certificate
        if: matrix.os == 'windows-latest'
        env:
          CERTIFICATE_BASE64: ${{ secrets.WINDOWS_CERTIFICATE_BASE64 }}
          CERTIFICATE_PASSWORD: ${{ secrets.WINDOWS_CERTIFICATE_PASSWORD }}
        run: |
          $cert = [System.Convert]::FromBase64String($env:CERTIFICATE_BASE64)
          [IO.File]::WriteAllBytes("certificate.pfx", $cert)
          
          certutil -user -p $env:CERTIFICATE_PASSWORD -importPFX certificate.pfx
```

## ⚡ 署名の最適化

### 並列署名

```javascript
// 📍 複数ファイルの並列署名

async function signInParallel(files) {
    const chunks = [];
    const chunkSize = 5; // 同時実行数
    
    for (let i = 0; i < files.length; i += chunkSize) {
        chunks.push(files.slice(i, i + chunkSize));
    }
    
    for (const chunk of chunks) {
        await Promise.all(
            chunk.map(file => signFile(file))
        );
    }
}
```

### 署名キャッシュ

```javascript
// 📍 署名済みファイルのキャッシュ

class SignatureCache {
    constructor() {
        this.cacheFile = '.signature-cache.json';
        this.cache = this.loadCache();
    }
    
    needsSigning(filePath) {
        const stats = fs.statSync(filePath);
        const cached = this.cache[filePath];
        
        if (!cached) return true;
        
        return stats.mtime.getTime() > cached.signedAt;
    }
    
    markSigned(filePath) {
        this.cache[filePath] = {
            signedAt: Date.now(),
            hash: this.calculateHash(filePath)
        };
        
        this.saveCache();
    }
}
```

## 🐛 トラブルシューティング

### 一般的な署名エラー

| エラー | 原因 | 解決方法 |
|-------|------|---------|
| "Certificate not found" | 証明書未インストール | 証明書をインポート |
| "Timestamp server error" | タイムスタンプサーバー障害 | 別のサーバーを使用 |
| "Code object is not signed" | 深い署名が必要 | --deepオプションを追加 |
| "The signature is invalid" | 証明書の期限切れ | 証明書を更新 |

### デバッグコマンド

```bash
# macOS: 署名情報の詳細表示
codesign -dv --verbose=4 dist/mac/ZeamiTerm.app

# Windows: 証明書チェーンの確認
certutil -verify -urlfetch dist/win-unpacked/ZeamiTerm.exe

# Linux: GPG署名の詳細確認
gpg --verify --verbose dist/ZeamiTerm-1.0.0.AppImage.sig
```

## 🔗 関連ドキュメント

- [公証（macOS）](./notarization.md)
- [ビルドガイド](./build-guide.md)
- [リリースプロセス](./release-process.md)

---

> 💡 **Claude Codeへのヒント**: 署名は配布の重要なステップです。開発中はスキップできますが、リリース時は必須です。証明書の有効期限に注意し、更新を忘れないでください。