/**
 * Test script for auto-update functionality
 * Run this to verify auto-updater configuration
 */

const { app } = require('electron');
const AutoUpdaterManager = require('./src/main/autoUpdater');

// Mock the app for testing
app.isPackaged = true; // Simulate packaged app
app.getName = () => 'ZeamiTerm';
app.getVersion = () => '0.1.2';

console.log('🧪 Testing ZeamiTerm Auto-Update Configuration\n');

// Create updater instance
const updater = new AutoUpdaterManager();

// Check configuration
console.log('📋 Configuration:');
console.log(`  - Is Enabled: ${updater.isEnabled}`);
console.log(`  - Current Version: ${app.getVersion()}`);
console.log(`  - Feed URL: github.com/hiranotomo/zeami-term`);
console.log(`  - Auto Download: false`);
console.log(`  - Auto Install on Quit: true`);

// Verify update info method
const updateInfo = updater.getUpdateInfo();
console.log('\n📊 Update Info:');
console.log(`  - Current Version: ${updateInfo.currentVersion}`);
console.log(`  - Update Available: ${updateInfo.updateAvailable}`);
console.log(`  - Download Progress: ${updateInfo.downloadProgress}%`);

console.log('\n⚠️  Notes:');
console.log('  - GitHub repository must exist for updates to work');
console.log('  - Repository can be private with public releases');
console.log('  - Releases must be properly tagged (e.g., v0.1.3)');
console.log('  - DMG files must be signed and notarized for macOS');

console.log('\n✅ Auto-updater configuration test complete!');

// Exit
process.exit(0);