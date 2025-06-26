#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('Building ZeamiTerm (Simple Build)...\n');

// Create temporary build configuration
const simpleBuildConfig = {
  appId: "com.zeami.term",
  productName: "ZeamiTerm",
  directories: {
    output: "dist"
  },
  files: [
    "src/**/*",
    "node_modules/**/*",
    "package.json",
    "!node_modules/**/test/**",
    "!node_modules/**/*.md",
    "!node_modules/**/*.map"
  ],
  mac: {
    category: "public.app-category.developer-tools",
    target: "dir" // Simple directory output instead of DMG
  },
  compression: "store", // No compression for faster build
  asar: false // Disable asar for compatibility
};

// Write temporary config
fs.writeFileSync('electron-builder-simple.json', JSON.stringify(simpleBuildConfig, null, 2));

try {
  // Run electron-builder with simple config
  console.log('Running electron-builder...');
  execSync('npx electron-builder --config electron-builder-simple.json --mac', { 
    stdio: 'inherit',
    env: { ...process.env, CSC_IDENTITY_AUTO_DISCOVERY: 'false' } // Skip code signing
  });
  
  console.log('\n✅ Build completed successfully!');
  console.log('📁 Application can be found in: dist/mac-arm64/ZeamiTerm.app');
  console.log('\nTo run the app:');
  console.log('  open dist/mac-arm64/ZeamiTerm.app');
  
} catch (error) {
  console.error('\n❌ Build failed:', error.message);
  console.log('\nTrying alternative approach...');
  
  // Alternative: Create a simple app bundle manually
  createManualBundle();
} finally {
  // Clean up temporary config
  if (fs.existsSync('electron-builder-simple.json')) {
    fs.unlinkSync('electron-builder-simple.json');
  }
}

function createManualBundle() {
  console.log('\nCreating manual app bundle...');
  
  const appName = 'ZeamiTerm';
  const bundlePath = `dist/manual/${appName}.app`;
  const contentsPath = `${bundlePath}/Contents`;
  const resourcesPath = `${contentsPath}/Resources`;
  const macOSPath = `${contentsPath}/MacOS`;
  
  // Create directory structure
  fs.mkdirSync(bundlePath, { recursive: true });
  fs.mkdirSync(contentsPath, { recursive: true });
  fs.mkdirSync(resourcesPath, { recursive: true });
  fs.mkdirSync(macOSPath, { recursive: true });
  
  // Create Info.plist
  const infoPlist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleExecutable</key>
  <string>${appName}</string>
  <key>CFBundleIdentifier</key>
  <string>com.zeami.term</string>
  <key>CFBundleName</key>
  <string>${appName}</string>
  <key>CFBundlePackageType</key>
  <string>APPL</string>
  <key>CFBundleShortVersionString</key>
  <string>0.1.0</string>
  <key>CFBundleVersion</key>
  <string>1</string>
  <key>LSMinimumSystemVersion</key>
  <string>10.15.0</string>
  <key>NSHighResolutionCapable</key>
  <true/>
</dict>
</plist>`;
  
  fs.writeFileSync(`${contentsPath}/Info.plist`, infoPlist);
  
  // Create start script
  const startScript = `#!/bin/bash
cd "$(dirname "$0")/../Resources"
electron .
`;
  
  fs.writeFileSync(`${macOSPath}/${appName}`, startScript);
  fs.chmodSync(`${macOSPath}/${appName}`, '755');
  
  // Copy app files
  console.log('Copying application files...');
  execSync(`cp -R . "${resourcesPath}/"`, { stdio: 'ignore' });
  
  console.log('\n✅ Manual bundle created!');
  console.log(`📁 Application bundle: ${bundlePath}`);
  console.log('\nTo run: open ' + bundlePath);
}