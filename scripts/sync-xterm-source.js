#!/usr/bin/env node

/**
 * Sync xterm.js source from upstream
 * Usage: node scripts/sync-xterm-source.js [version]
 * Example: node scripts/sync-xterm-source.js 5.5.0
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const { execSync } = require('child_process');

const version = process.argv[2] || '5.5.0';
const sourceDir = path.join(__dirname, '../src/xterm');
const tempFile = path.join(__dirname, `../xterm-${version}.tar.gz`);

console.log(`Syncing xterm.js source version ${version}...`);

// Download the source
function downloadSource() {
  return new Promise((resolve, reject) => {
    const url = `https://github.com/xtermjs/xterm.js/archive/refs/tags/${version}.tar.gz`;
    const file = fs.createWriteStream(tempFile);
    
    https.get(url, (response) => {
      if (response.statusCode === 302 || response.statusCode === 301) {
        // Follow redirect
        https.get(response.headers.location, (redirectResponse) => {
          redirectResponse.pipe(file);
          file.on('finish', () => {
            file.close();
            resolve();
          });
        });
      } else {
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          resolve();
        });
      }
    }).on('error', (err) => {
      fs.unlink(tempFile, () => {});
      reject(err);
    });
  });
}

// Extract source
function extractSource() {
  // Backup current patches
  const patchedFiles = [];
  const themeServicePath = path.join(sourceDir, 'src/browser/services/ThemeService.ts');
  if (fs.existsSync(themeServicePath)) {
    const content = fs.readFileSync(themeServicePath, 'utf8');
    if (content.includes('rgba(120, 150, 200, 0.3)')) {
      console.log('✓ Found existing patches, will reapply after sync');
      patchedFiles.push('ThemeService.ts');
    }
  }
  
  // Remove old source
  if (fs.existsSync(sourceDir)) {
    console.log('Removing old xterm source...');
    execSync(`rm -rf ${sourceDir}`);
  }
  
  // Create directory
  fs.mkdirSync(sourceDir, { recursive: true });
  
  // Extract new source
  console.log('Extracting new source...');
  execSync(`tar -xzf ${tempFile} --strip-components=1 -C ${sourceDir} xterm.js-${version}/src xterm.js-${version}/typings xterm.js-${version}/tsconfig.all.json xterm.js-${version}/package.json`);
  
  // Clean up
  fs.unlinkSync(tempFile);
  
  return patchedFiles.length > 0;
}

// Main
async function main() {
  try {
    console.log(`Downloading xterm.js ${version} source...`);
    await downloadSource();
    
    console.log('Extracting source files...');
    const hadPatches = extractSource();
    
    if (hadPatches) {
      console.log('Reapplying patches...');
      execSync('npm run patch:xterm', { stdio: 'inherit' });
    }
    
    console.log(`✓ Successfully synced xterm.js ${version} source!`);
    console.log('Next steps:');
    console.log('1. Run "npm run build:xterm" to build the custom xterm');
    console.log('2. Test the terminal to ensure everything works');
    
  } catch (error) {
    console.error('Error syncing xterm source:', error);
    process.exit(1);
  }
}

main();