# インストールガイド

> 🤖 **Claude Code最適化ドキュメント**  
> ZeamiTermのセットアップから起動まで、スムーズな導入をサポート。

## 🎯 クイックスタート

```bash
# リポジトリのクローン
git clone https://github.com/your-org/zeami-term.git
cd zeami-term

# 依存関係のインストール
npm install

# 開発環境で起動
npm run dev
```

## 📋 システム要件

### 必須要件

| 項目 | 要件 |
|-----|-----|
| OS | macOS 10.15+, Windows 10+, Ubuntu 20.04+ |
| Node.js | v18.0.0 以上 |
| npm | v8.0.0 以上 |
| Python | v3.8 以上（PTY用） |
| メモリ | 4GB RAM 以上推奨 |
| ディスク | 500MB 以上の空き容量 |

### 開発環境要件

| 項目 | 要件 |
|-----|-----|
| Git | v2.30.0 以上 |
| VS Code | 最新版推奨（任意） |
| Xcode | macOSの場合必須 |
| Visual Studio | Windowsの場合推奨 |

## 🔧 詳細なインストール手順

### 1. 前提条件の確認

```bash
# Node.jsバージョン確認
node --version  # v18.0.0以上

# npmバージョン確認
npm --version   # v8.0.0以上

# Pythonバージョン確認
python3 --version  # v3.8以上

# Gitバージョン確認
git --version  # v2.30.0以上
```

### 2. リポジトリのクローン

```bash
# HTTPSでクローン
git clone https://github.com/your-org/zeami-term.git

# または SSHでクローン
git clone git@github.com:your-org/zeami-term.git

cd zeami-term
```

### 3. 依存関係のインストール

```bash
# package-lock.jsonを使用した確実なインストール
npm ci

# または通常のインストール
npm install
```

⚠️ **トラブルシューティング**: native modulesのビルドエラーが出る場合

```bash
# macOS
xcode-select --install

# Windows (管理者権限で実行)
npm install --global windows-build-tools

# Linux
sudo apt-get install build-essential
```

### 4. 初期設定

```bash
# 環境変数ファイルの作成
cp .env.example .env

# 必要に応じて編集
nano .env
```

環境変数の例：
```env
# 開発環境設定
NODE_ENV=development
DEBUG=zeami:*
PASTE_DEBUG=false

# アプリケーション設定
DEFAULT_SHELL=/bin/bash
DEFAULT_THEME=vs-dark
```

## 🚀 起動方法

### 開発環境での起動

```bash
# 開発サーバーの起動（ホットリロード有効）
npm run dev

# デバッグモードで起動
DEBUG=* npm run dev

# ペーストデバッグモードで起動
PASTE_DEBUG=true npm run dev
```

### プロダクションビルド

```bash
# ビルドの実行
npm run build

# ビルド結果の確認
ls -la dist/
```

### パッケージング

```bash
# 現在のプラットフォーム用
npm run package

# 全プラットフォーム用
npm run package:all

# 特定プラットフォーム用
npm run package:mac
npm run package:win
npm run package:linux
```

## 🏗️ プラットフォーム別の注意事項

### macOS

```bash
# コード署名（配布用）
npm run sign:mac

# 公証（App Store外配布用）
npm run notarize:mac
```

必要な環境変数：
```env
APPLE_ID=your-apple-id@example.com
APPLE_ID_PASSWORD=your-app-specific-password
APPLE_TEAM_ID=YOUR_TEAM_ID
```

### Windows

```bash
# 署名証明書のインストール
certutil -user -p PASSWORD -importPFX certificate.pfx

# 署名付きビルド
npm run build:win:signed
```

### Linux

```bash
# AppImageの作成
npm run package:linux

# snapパッケージの作成
npm run package:snap

# debパッケージの作成
npm run package:deb
```

## 🔍 インストール確認

### 基本動作確認

1. **アプリケーション起動**
   ```bash
   npm run dev
   ```

2. **ターミナル作成**
   - アプリが起動したら、Terminal AとTerminal Bが表示されることを確認

3. **基本コマンド実行**
   ```bash
   # ターミナル内で
   echo "Hello, ZeamiTerm!"
   ls -la
   ```

4. **ペースト機能**
   - テキストをコピーして、Cmd+V（Mac）またはCtrl+V（Windows/Linux）でペースト

### 開発ツールの確認

```bash
# ESLintの動作確認
npm run lint

# 型チェックの実行
npm run type-check

# テストの実行
npm test
```

## ⚠️ よくある問題と解決方法

### 問題1: node-ptyのビルドエラー

```bash
# node-ptyの再ビルド
npm rebuild node-pty

# それでも失敗する場合
rm -rf node_modules
npm cache clean --force
npm install
```

### 問題2: Electronの起動失敗

```bash
# Electronのキャッシュクリア
rm -rf ~/.electron
npm install electron --save-dev
```

### 問題3: Python関連のエラー

```bash
# Python3のパスを明示的に指定
export PYTHON=/usr/bin/python3
npm install
```

## 📝 次のステップ

インストールが完了したら：

1. [クイックスタートガイド](./quick-start.md) - 基本的な使い方
2. [設定ガイド](./configuration.md) - カスタマイズ方法
3. [開発ガイド](../development/README.md) - 開発を始める方法

## 🔗 関連リソース

- [トラブルシューティング](../troubleshooting/common-issues.md)
- [システム要件詳細](../architecture/overview.md#システム要件)
- [ビルドガイド](../deployment/build-guide.md)

---

> 💡 **Claude Codeへのヒント**: インストール時の問題は、ほとんどがnative modulesのビルドエラーです。プラットフォーム固有のビルドツールが正しくインストールされているか確認してください。