# ビルドガイド

> 🤖 **Claude Code最適化ドキュメント**  
> ZeamiTermのビルドから配布まで。プロダクションビルドの完全ガイド。

## 🎯 クイックビルド

```bash
# 開発ビルド（現在のプラットフォーム）
npm run build

# プロダクションビルド（配布用）
npm run dist

# 全プラットフォーム向けビルド
npm run dist:all
```

## 📋 ビルド要件

### 必須ツール

| ツール | バージョン | 用途 |
|--------|-----------|------|
| Node.js | 18.0.0+ | ビルド実行 |
| Python | 3.8+ | node-ptyビルド |
| Git | 2.30.0+ | ソース管理 |

### プラットフォーム別要件

#### macOS
- Xcode Command Line Tools
- macOS 10.15以上（ビルドマシン）
- Apple Developer ID（署名用）

#### Windows
- Visual Studio 2019/2022
- Windows SDK
- .NET Framework 4.6.2+

#### Linux
- build-essential
- libnss3-dev
- libgtk-3-dev

## 🏗️ ビルド設定

### package.json設定

```json
{
  "build": {
    "appId": "com.zeami.zeamiterm",
    "productName": "ZeamiTerm",
    "copyright": "Copyright © 2024 Zeami Team",
    
    "directories": {
      "output": "dist",
      "buildResources": "build"
    },
    
    "files": [
      "dist/**/*",
      "src/**/*",
      "!src/**/*.ts",
      "!src/**/*.map",
      "node_modules/**/*",
      "package.json"
    ],
    
    "asarUnpack": [
      "**/node_modules/node-pty/**/*",
      "**/src/main/pty/working_pty.py"
    ],
    
    "mac": {
      "category": "public.app-category.developer-tools",
      "target": [
        {
          "target": "dmg",
          "arch": ["x64", "arm64"]
        },
        {
          "target": "zip",
          "arch": ["x64", "arm64"]
        }
      ],
      "icon": "build/icon.icns",
      "hardenedRuntime": true,
      "gatekeeperAssess": false,
      "entitlements": "build/entitlements.mac.plist",
      "entitlementsInherit": "build/entitlements.mac.plist"
    },
    
    "win": {
      "target": [
        {
          "target": "nsis",
          "arch": ["x64", "ia32"]
        },
        {
          "target": "portable",
          "arch": ["x64"]
        }
      ],
      "icon": "build/icon.ico"
    },
    
    "linux": {
      "target": [
        {
          "target": "AppImage",
          "arch": ["x64"]
        },
        {
          "target": "deb",
          "arch": ["x64", "arm64"]
        }
      ],
      "icon": "build/icon.png",
      "category": "Development"
    }
  }
}
```

### TypeScriptビルド設定

```json
// 📍 tsconfig.json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020", "DOM"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "moduleResolution": "node",
    "sourceMap": true,
    "declaration": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.test.ts"]
}
```

## 🔧 ビルドプロセス

### 1. クリーンビルド

```bash
# ビルドディレクトリのクリーンアップ
npm run clean

# 具体的な処理
rm -rf dist/
rm -rf out/
rm -rf node_modules/.cache
```

### 2. 依存関係の準備

```bash
# プロダクション依存関係のみインストール
npm ci --production

# ネイティブモジュールの再ビルド
npm run rebuild

# 具体的な処理
electron-rebuild -f -w node-pty
```

### 3. ソースコードのトランスパイル

```bash
# TypeScriptのコンパイル
npm run compile

# 具体的な処理
tsc -p tsconfig.json

# アセットのコピー
npm run copy-assets
```

### 4. パッケージング

```bash
# Electron Forgeでパッケージング
npm run package

# プラットフォーム別
npm run package:mac
npm run package:win
npm run package:linux
```

## 🎨 プラットフォーム別ビルド

### macOS（Universal Binary）

```bash
# Intel + Apple Siliconの Universal Binary
npm run dist:mac

# アーキテクチャ別
npm run dist:mac:x64   # Intel Mac
npm run dist:mac:arm64 # Apple Silicon
```

**重要な設定**:
```javascript
// 📍 forge.config.js
{
  packagerConfig: {
    osxUniversal: {
      x64ArchFiles: '**/node_modules/node-pty/build/Release/pty.node',
      arm64ArchFiles: '**/node_modules/node-pty/build/Release/pty.node',
      mergeASARs: true
    }
  }
}
```

### Windows

```bash
# 64ビット版
npm run dist:win

# 32ビット版（レガシー）
npm run dist:win:ia32

# ポータブル版
npm run dist:win:portable
```

**NSIS設定**:
```javascript
// 📍 build設定
{
  nsis: {
    oneClick: false,
    perMachine: false,
    allowToChangeInstallationDirectory: true,
    createDesktopShortcut: true,
    createStartMenuShortcut: true,
    shortcutName: "ZeamiTerm"
  }
}
```

### Linux

```bash
# AppImage（推奨）
npm run dist:linux:appimage

# Debian/Ubuntu用
npm run dist:linux:deb

# Red Hat/Fedora用
npm run dist:linux:rpm
```

## ⚡ ビルド最適化

### 1. ビルドサイズの削減

```javascript
// 📍 webpack.config.js
module.exports = {
  mode: 'production',
  
  optimization: {
    minimize: true,
    nodeEnv: 'production',
    sideEffects: false,
    usedExports: true,
    
    // Tree shaking
    providedExports: true,
    concatenateModules: true,
    
    // コード分割
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          priority: 10
        }
      }
    }
  },
  
  // 除外設定
  externals: {
    'electron': 'commonjs electron',
    'node-pty': 'commonjs node-pty'
  }
};
```

### 2. ASARアーカイブ設定

```javascript
// 📍 必要なファイルをASARから除外
{
  asarUnpack: [
    // ネイティブモジュール
    '**/node_modules/node-pty/**',
    '**/node_modules/@serialport/**',
    
    // 実行可能ファイル
    '**/src/main/pty/working_pty.py',
    
    // 動的に読み込まれるファイル
    '**/shell-integration/**'
  ]
}
```

### 3. ビルドキャッシュ

```bash
# キャッシュを有効化
export ELECTRON_CACHE=$HOME/.cache/electron
export ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/

# ビルドキャッシュ
npm config set cache-min 9999999
```

## 🐛 ビルドトラブルシューティング

### よくある問題

| 問題 | 原因 | 解決方法 |
|-----|------|---------|
| node-ptyビルドエラー | Python未インストール | Python 3.8+をインストール |
| 署名エラー（macOS） | 証明書なし | Developer IDを設定 |
| ASARエラー | パス長制限 | asarUnpackに追加 |
| メモリ不足 | 大きなプロジェクト | NODE_OPTIONS=--max-old-space-size=4096 |

### デバッグビルド

```bash
# デバッグ情報付きビルド
DEBUG=electron-builder npm run dist

# 詳細ログ
npm run dist -- --verbose

# ドライラン（実際にはビルドしない）
npm run dist -- --dir
```

### ビルド検証

```bash
# ビルドされたアプリの検証
# macOS
codesign -dv --verbose=4 dist/mac/ZeamiTerm.app

# Windows
signtool verify /pa dist/win-unpacked/ZeamiTerm.exe

# Linux
file dist/linux-unpacked/zeamiterm
```

## 📦 ビルド成果物

### 出力ディレクトリ構造

```
dist/
├── mac/
│   ├── ZeamiTerm.app
│   ├── ZeamiTerm-1.0.0-mac.dmg
│   └── ZeamiTerm-1.0.0-mac.zip
├── win/
│   ├── ZeamiTerm Setup 1.0.0.exe
│   └── ZeamiTerm-1.0.0-win.zip
└── linux/
    ├── ZeamiTerm-1.0.0.AppImage
    ├── zeamiterm_1.0.0_amd64.deb
    └── zeamiterm-1.0.0.x86_64.rpm
```

### ビルド後の確認事項

- [ ] アプリケーションが起動する
- [ ] ターミナルが正常に動作する
- [ ] node-ptyが正しく動作する
- [ ] 自動アップデートが機能する
- [ ] 署名が有効（macOS/Windows）

## 🔗 関連ドキュメント

- [リリースプロセス](./release-process.md)
- [コード署名](./code-signing.md)
- [公証（macOS）](./notarization.md)

---

> 💡 **Claude Codeへのヒント**: ビルド時は必ず`npm ci`を使って、package-lock.jsonから正確な依存関係をインストールしてください。開発中の`npm install`とは異なります。