# リリースプロセス

> 🤖 **Claude Code最適化ドキュメント**  
> 安全で確実なリリースフロー。バージョニングから配布まで完全ガイド。

## 🎯 リリースチェックリスト

```markdown
## リリース前チェックリスト
- [ ] 全テストがパス
- [ ] CHANGELOGを更新
- [ ] バージョン番号を更新
- [ ] ドキュメントを更新
- [ ] セキュリティスキャン実行
- [ ] 依存関係の脆弱性チェック

## ビルドチェックリスト
- [ ] クリーンビルド実行
- [ ] 全プラットフォームでビルド
- [ ] 署名確認（macOS/Windows）
- [ ] 公証完了（macOS）
- [ ] インストーラーテスト

## リリース後チェックリスト
- [ ] GitHubリリース作成
- [ ] 自動アップデート確認
- [ ] ダウンロードリンク確認
- [ ] リリースノート公開
- [ ] ソーシャルメディア告知
```

## 📋 バージョニング

### セマンティックバージョニング

```
MAJOR.MINOR.PATCH

1.2.3
│ │ └─ パッチ: バグ修正
│ └─── マイナー: 機能追加（後方互換）
└───── メジャー: 破壊的変更
```

### バージョン更新

```bash
# パッチリリース（1.0.0 → 1.0.1）
npm version patch

# マイナーリリース（1.0.0 → 1.1.0）
npm version minor

# メジャーリリース（1.0.0 → 2.0.0）
npm version major

# プレリリース（1.0.0 → 1.0.1-beta.0）
npm version prerelease --preid=beta
```

## 🏗️ リリースワークフロー

### 1. 準備フェーズ

```bash
# 1. フィーチャーブランチをマージ
git checkout main
git pull origin main

# 2. 依存関係を更新
npm update
npm audit fix

# 3. テストスイート実行
npm test
npm run e2e

# 4. リントとフォーマット
npm run lint:fix
npm run format
```

### 2. バージョン更新

```bash
# 1. CHANGELOGを更新
npm run changelog

# 2. バージョンを更新（自動的にgit tagも作成）
npm version minor -m "Release v%s"

# 3. 変更をプッシュ
git push origin main --tags
```

### 3. ビルドフェーズ

```bash
# 1. クリーンビルド
npm run clean
npm ci

# 2. 全プラットフォームビルド
npm run dist:all

# 3. ビルド成果物の検証
npm run verify:dist
```

## 🔧 CHANGELOG管理

### CHANGELOG.md形式

```markdown
# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.2.0] - 2024-01-20

### Added
- プロファイルシステムの実装
- シェル統合機能
- 自動アップデート機能

### Changed
- ペースト処理のパフォーマンス改善
- UIレイアウトの最適化

### Fixed
- メモリリークの修正
- Windows環境でのクラッシュ修正

### Security
- 依存関係の脆弱性修正
```

### 自動CHANGELOG生成

```javascript
// 📍 scripts/generate-changelog.js

const conventionalChangelog = require('conventional-changelog');
const fs = require('fs');

async function generateChangelog() {
    const changelogStream = conventionalChangelog({
        preset: 'angular',
        releaseCount: 0
    });
    
    const chunks = [];
    
    changelogStream.on('data', (chunk) => {
        chunks.push(chunk);
    });
    
    changelogStream.on('end', () => {
        const changelog = Buffer.concat(chunks).toString();
        
        // 既存のCHANGELOGに追加
        const existingChangelog = fs.readFileSync('CHANGELOG.md', 'utf8');
        const updatedChangelog = changelog + '\n' + existingChangelog;
        
        fs.writeFileSync('CHANGELOG.md', updatedChangelog);
    });
}
```

## 🚀 GitHub Releasesへの公開

### リリース作成スクリプト

```javascript
// 📍 scripts/create-release.js

const { Octokit } = require('@octokit/rest');
const fs = require('fs').promises;
const path = require('path');

async function createRelease() {
    const octokit = new Octokit({
        auth: process.env.GITHUB_TOKEN
    });
    
    const version = require('../package.json').version;
    const changelog = await extractLatestChangelog();
    
    // リリース作成
    const { data: release } = await octokit.repos.createRelease({
        owner: 'your-org',
        repo: 'zeami-term',
        tag_name: `v${version}`,
        name: `ZeamiTerm v${version}`,
        body: changelog,
        draft: false,
        prerelease: version.includes('beta') || version.includes('alpha')
    });
    
    // アセットのアップロード
    const distDir = path.join(__dirname, '../dist');
    const files = await fs.readdir(distDir);
    
    for (const file of files) {
        if (file.endsWith('.dmg') || file.endsWith('.exe') || file.endsWith('.AppImage')) {
            await uploadAsset(octokit, release.id, path.join(distDir, file));
        }
    }
}

async function uploadAsset(octokit, releaseId, filePath) {
    const fileName = path.basename(filePath);
    const fileContent = await fs.readFile(filePath);
    
    await octokit.repos.uploadReleaseAsset({
        owner: 'your-org',
        repo: 'zeami-term',
        release_id: releaseId,
        name: fileName,
        data: fileContent
    });
}
```

### GitHub Actions自動リリース

```yaml
# 📍 .github/workflows/release.yml

name: Release

on:
  push:
    tags:
      - 'v*'

jobs:
  release:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Build all platforms
        run: npm run dist:all
        
      - name: Create Release
        uses: softprops/action-gh-release@v1
        with:
          files: |
            dist/*.dmg
            dist/*.exe
            dist/*.AppImage
            dist/*.deb
          body_path: RELEASE_NOTES.md
          draft: false
          prerelease: false
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

## 🔐 セキュリティ考慮事項

### リリース前のセキュリティチェック

```bash
# 1. 依存関係の脆弱性スキャン
npm audit
snyk test

# 2. ライセンスチェック
license-checker --production --summary

# 3. シークレットスキャン
gitleaks detect --source . -v

# 4. SAST（静的解析）
eslint --ext .js,.ts src/
```

### 署名と検証

```bash
# GPG署名付きタグ
git tag -s v1.0.0 -m "Release version 1.0.0"

# 署名の検証
git tag -v v1.0.0

# チェックサムの生成
shasum -a 256 dist/* > checksums.txt
```

## 📊 リリースメトリクス

### 追跡すべき指標

```javascript
// 📍 リリース後の監視項目

const releaseMetrics = {
    // ダウンロード数
    downloads: {
        total: 0,
        byPlatform: {
            mac: 0,
            windows: 0,
            linux: 0
        }
    },
    
    // 自動アップデート
    updates: {
        successful: 0,
        failed: 0,
        skipped: 0
    },
    
    // エラー報告
    crashes: {
        total: 0,
        byVersion: {}
    },
    
    // ユーザーフィードバック
    feedback: {
        issues: 0,
        stars: 0
    }
};
```

## 🔄 ロールバック手順

### 緊急時のロールバック

```bash
# 1. 問題のあるリリースを非公開に
gh release edit v1.2.0 --draft

# 2. 自動アップデートの無効化
# update.json を編集して古いバージョンを指定

# 3. ホットフィックスの作成
git checkout -b hotfix/v1.2.1
# 修正をコミット
git cherry-pick <fix-commit>

# 4. 緊急リリース
npm version patch
npm run dist:all
npm run release:emergency
```

## 📝 リリースノートテンプレート

```markdown
# ZeamiTerm v1.2.0

## 🎉 ハイライト
- 新機能の簡潔な説明
- 主要な改善点
- 重要な修正

## ✨ 新機能
- **プロファイルシステム**: 複数の開発環境を簡単に切り替え
- **シェル統合**: コマンドの自動追跡と通知

## 🚀 改善
- ペースト処理が2倍高速化
- メモリ使用量を30%削減

## 🐛 修正
- Windows環境でのクラッシュを修正 (#123)
- 日本語入力の問題を解決 (#124)

## 💔 破壊的変更
- 設定ファイルの形式を変更（移行ガイドを参照）

## 📦 依存関係の更新
- Electron 28.0.0
- xterm.js 5.3.0

## 🙏 謝辞
このリリースに貢献してくださった皆様に感謝します！
```

## 🔗 関連ドキュメント

- [ビルドガイド](./build-guide.md)
- [コード署名](./code-signing.md)
- [自動アップデート](../features/auto-update.md)

---

> 💡 **Claude Codeへのヒント**: リリースは自動化されていますが、CHANGELOGとリリースノートは人間が確認する必要があります。特に破壊的変更がある場合は、移行ガイドを必ず用意してください。