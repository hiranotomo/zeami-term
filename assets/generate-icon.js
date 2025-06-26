#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Simple SVG icon for ZeamiTerm
const svgIcon = `
<svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
  <!-- Background -->
  <rect width="1024" height="1024" rx="180" fill="#1e1e1e"/>
  
  <!-- Terminal window frame -->
  <rect x="100" y="200" width="824" height="624" rx="20" fill="#2d2d30" stroke="#464647" stroke-width="4"/>
  
  <!-- Terminal header -->
  <rect x="100" y="200" width="824" height="80" rx="20" fill="#3e3e42"/>
  
  <!-- Window controls -->
  <circle cx="150" cy="240" r="20" fill="#ff5f56"/>
  <circle cx="210" cy="240" r="20" fill="#ffbd2e"/>
  <circle cx="270" cy="240" r="20" fill="#27c93f"/>
  
  <!-- Terminal content area -->
  <rect x="120" y="300" width="784" height="504" fill="#1e1e1e"/>
  
  <!-- Terminal prompt and text -->
  <text x="140" y="350" font-family="monospace" font-size="40" fill="#0dbc79">$</text>
  <text x="180" y="350" font-family="monospace" font-size="40" fill="#cccccc">zeami</text>
  <rect x="340" y="325" width="20" height="35" fill="#ffffff" opacity="0.8"/>
  
  <!-- Some code lines -->
  <text x="140" y="410" font-family="monospace" font-size="30" fill="#569cd6">const</text>
  <text x="240" y="410" font-family="monospace" font-size="30" fill="#cccccc">terminal</text>
  <text x="380" y="410" font-family="monospace" font-size="30" fill="#cccccc">=</text>
  <text x="420" y="410" font-family="monospace" font-size="30" fill="#ce9178">'smart'</text>
  
  <text x="140" y="470" font-family="monospace" font-size="30" fill="#c586c0">await</text>
  <text x="240" y="470" font-family="monospace" font-size="30" fill="#dcdcaa">enhance</text>
  <text x="360" y="470" font-family="monospace" font-size="30" fill="#cccccc">()</text>
  
  <!-- Zeami branding -->
  <text x="512" y="920" font-family="Arial, sans-serif" font-size="120" font-weight="bold" fill="#007acc" text-anchor="middle">ZeamiTerm</text>
</svg>
`;

// Save SVG
fs.writeFileSync(path.join(__dirname, 'icon.svg'), svgIcon.trim());

console.log('Icon generated successfully!');
console.log('Note: You\'ll need to convert this SVG to .icns (Mac) and .ico (Windows) formats.');
console.log('\nFor Mac (.icns):');
console.log('1. Open icon.svg in Preview');
console.log('2. Export as PNG at various sizes (16, 32, 64, 128, 256, 512, 1024)');
console.log('3. Use iconutil or an online converter to create .icns');
console.log('\nFor Windows (.ico):');
console.log('1. Use an online converter to convert SVG to ICO');
console.log('2. Include multiple sizes (16, 32, 48, 256)');