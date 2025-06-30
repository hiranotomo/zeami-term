#!/usr/bin/env node

/**
 * リリースファイル検証スクリプト
 * 自動アップデートに必要な全ファイルが存在することを確認
 */

const fs = require('fs');
const path = require('path');
const packageJson = require('../package.json');

const version = packageJson.version;
const red = '\x1b[31m';
const green = '\x1b[32m';
const yellow = '\x1b[33m';
const reset = '\x1b[0m';

console.log(`\n📋 ZeamiTerm v${version} リリースファイルを検証中...\n`);

// 必須ファイルリスト
const requiredFiles = [
  {
    file: `dist/ZeamiTerm-${version}-arm64.dmg`,
    description: 'macOS DMGインストーラー'
  },
  {
    file: `dist/ZeamiTerm-${version}-arm64.dmg.blockmap`,
    description: 'DMG用ブロックマップ（差分更新用）'
  },
  {
    file: `dist/latest-mac.yml`,
    description: '⚠️  自動アップデート用メタデータ（必須！）'
  },
  {
    file: `dist/ZeamiTerm-${version}-arm64-mac.zip`,
    description: 'macOS ZIPアーカイブ'
  },
  {
    file: `dist/ZeamiTerm-${version}-arm64-mac.zip.blockmap`,
    description: 'ZIP用ブロックマップ（差分更新用）'
  }
];

let hasError = false;
const missingFiles = [];

// 各ファイルをチェック
requiredFiles.forEach(({ file, description }) => {
  const exists = fs.existsSync(file);
  if (exists) {
    const stats = fs.statSync(file);
    const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
    console.log(`${green}✅${reset} ${file} (${sizeMB} MB)`);
    console.log(`   ${description}`);
  } else {
    console.log(`${red}❌${reset} ${file}`);
    console.log(`   ${description}`);
    missingFiles.push(file);
    hasError = true;
  }
  console.log('');
});

// 結果サマリー
console.log('─'.repeat(60));
if (hasError) {
  console.log(`\n${red}❌ リリースファイルが不完全です！${reset}\n`);
  console.log('不足しているファイル:');
  missingFiles.forEach(file => {
    console.log(`  - ${file}`);
  });
  console.log(`\n${yellow}対処法:${reset}`);
  console.log('1. npm run build を実行してビルドしてください');
  console.log('2. 特に latest-mac.yml が生成されることを確認してください');
  console.log('3. その後、npm run publish:mac でリリースしてください\n');
  process.exit(1);
} else {
  console.log(`\n${green}✅ 全てのリリースファイルが揃っています！${reset}`);
  console.log('\n次のステップ:');
  console.log('1. npm run publish:mac でGitHubにリリース');
  console.log('2. または手動でGitHubリリースページに全ファイルをアップロード');
  console.log(`   ${yellow}※ 特に latest-mac.yml を忘れずにアップロードしてください${reset}\n`);
  process.exit(0);
}