#!/usr/bin/env node

/**
 * Create GitHub Release Script
 * Automates the release creation process for ZeamiTerm
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Check if GH_TOKEN is set
if (!process.env.GH_TOKEN) {
  console.error('❌ Error: GH_TOKEN environment variable is not set');
  console.error('\nPlease set your GitHub Personal Access Token:');
  console.error('  export GH_TOKEN=your_token_here');
  process.exit(1);
}

// Get package info
const packagePath = path.join(__dirname, '..', 'package.json');
const packageInfo = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
const version = packageInfo.version;

console.log('🚀 ZeamiTerm Release Creator');
console.log('===========================');
console.log(`📦 Version: ${version}`);

// Check if dist files exist
const distPath = path.join(__dirname, '..', 'dist');
const dmgFile = `ZeamiTerm-${version}-arm64.dmg`;
const zipFile = `ZeamiTerm-${version}-arm64-mac.zip`;
const ymlFile = 'latest-mac.yml';

const filesToUpload = [
  path.join(distPath, dmgFile),
  path.join(distPath, zipFile),
  path.join(distPath, ymlFile)
];

// Verify all files exist
console.log('\n📋 Checking release files...');
let allFilesExist = true;
filesToUpload.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`✅ ${path.basename(file)}`);
  } else {
    console.log(`❌ ${path.basename(file)} - NOT FOUND`);
    allFilesExist = false;
  }
});

if (!allFilesExist) {
  console.error('\n❌ Some files are missing. Run "npm run build" first.');
  process.exit(1);
}

// Create release notes
const releaseNotes = `# ZeamiTerm v${version}

## 🎉 新機能
- プライベートリポジトリでの自動アップデート機能
- パフォーマンスの最適化
- UIの改善

## 🐛 バグ修正
- 起動時のエラー修正
- メモリリークの修正

## 📥 ダウンロード
- [macOS (Apple Silicon)](https://github.com/hiranotomo/zeami-term/releases/download/v${version}/${dmgFile})
- [macOS (Intel)](https://github.com/hiranotomo/zeami-term/releases/download/v${version}/${zipFile})

## 🔄 自動アップデート
アプリケーションは自動的に新しいバージョンをチェックし、更新を通知します。

---
**注意**: このリリースはプライベートリポジトリから公開されていますが、リリース自体はパブリックです。
`;

// Save release notes
const releaseNotesPath = path.join(distPath, 'release-notes.md');
fs.writeFileSync(releaseNotesPath, releaseNotes);

console.log('\n📝 Release notes created');

// Create release using GitHub API
console.log('\n🌐 Creating GitHub release...');

try {
  // Use electron-builder to publish
  console.log('Publishing with electron-builder...');
  execSync('npm run publish:mac', { 
    stdio: 'inherit',
    env: { ...process.env }
  });
  
  console.log('\n✅ Release created successfully!');
  console.log(`🔗 Visit: https://github.com/hiranotomo/zeami-term/releases/tag/v${version}`);
} catch (error) {
  console.error('\n❌ Failed to create release:', error.message);
  
  // Fallback instructions
  console.log('\n📋 Manual release creation steps:');
  console.log('1. Go to https://github.com/hiranotomo/zeami-term/releases/new');
  console.log(`2. Tag: v${version}`);
  console.log(`3. Title: ZeamiTerm v${version}`);
  console.log('4. Copy the release notes from dist/release-notes.md');
  console.log('5. Upload these files:');
  filesToUpload.forEach(file => {
    console.log(`   - ${path.basename(file)}`);
  });
  console.log('6. Ensure "This is a pre-release" is UNCHECKED');
  console.log('7. Click "Publish release"');
}

// Cleanup
if (fs.existsSync(releaseNotesPath)) {
  fs.unlinkSync(releaseNotesPath);
}