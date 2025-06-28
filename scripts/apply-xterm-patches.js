#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Apply selection transparency patch
function applySelectionTransparencyPatch() {
  const filePath = path.join(__dirname, '../src/xterm/src/browser/services/ThemeService.ts');
  
  if (!fs.existsSync(filePath)) {
    console.error('❌ ThemeService.ts not found. Make sure xterm source is extracted.');
    process.exit(1);
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Check if patch is already applied
  if (content.includes('rgba(120, 150, 200, 0.3)')) {
    console.log('✓ Selection transparency patch already applied');
    return;
  }
  
  // Apply patch
  const originalSelection = `const DEFAULT_SELECTION = {
  css: 'rgba(255, 255, 255, 0.3)',
  rgba: 0xFFFFFF4D
};`;
  
  const patchedSelection = `const DEFAULT_SELECTION = {
  css: 'rgba(120, 150, 200, 0.3)',
  rgba: 0x7896C84D
};`;
  
  if (content.includes(originalSelection)) {
    content = content.replace(originalSelection, patchedSelection);
    fs.writeFileSync(filePath, content);
    console.log('✓ Applied selection transparency patch to ThemeService.ts');
  } else {
    console.error('❌ Could not find patch target in ThemeService.ts');
    console.error('The source code may have changed. Manual patching required.');
    process.exit(1);
  }
}

// Main
console.log('Applying xterm.js patches for ZeamiTerm...');
applySelectionTransparencyPatch();
console.log('✓ All patches applied successfully!');