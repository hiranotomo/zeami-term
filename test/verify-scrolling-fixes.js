#!/usr/bin/env node

/**
 * Verify Scrolling Fixes
 * 
 * This script checks that the CSS fixes for scrolling issues have been properly applied
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Verifying ZeamiTerm Scrolling Fixes...\n');

// Files to check
const filesToCheck = [
  {
    path: '../src/renderer/styles/preferences.css',
    checks: [
      {
        name: 'Preference content min-height fix',
        pattern: /\.preference-content\s*{[^}]*min-height:\s*0/s,
        expected: true
      },
      {
        name: 'Preference panels container setup',
        pattern: /\.preference-panels\s*{[^}]*position:\s*relative/s,
        expected: true
      },
      {
        name: 'Preference panel absolute positioning',
        pattern: /\.preference-panel\s*{[^}]*position:\s*absolute/s,
        expected: true
      },
      {
        name: 'Preference panel scrollbar styling',
        pattern: /\.preference-panel::-webkit-scrollbar\s*{/,
        expected: true
      }
    ]
  },
  {
    path: '../src/renderer/styles/layout.css',
    checks: [
      {
        name: 'Inactive terminal overlay pointer-events',
        pattern: /\.terminal-wrapper\.inactive::before\s*{[^}]*pointer-events:\s*none/s,
        expected: true
      },
      {
        name: 'Inactive terminal cursor pointer',
        pattern: /\.terminal-wrapper\.inactive\s*{[^}]*cursor:\s*pointer/s,
        expected: true
      }
    ]
  },
  {
    path: '../src/renderer/core/ZeamiTermManager.js',
    checks: [
      {
        name: 'Terminal wrapper click handler',
        pattern: /wrapper\.addEventListener\('click'/,
        expected: true
      },
      {
        name: 'Inactive terminal activation check',
        pattern: /wrapper\.classList\.contains\('inactive'\)/,
        expected: true
      }
    ]
  }
];

let allPassed = true;

filesToCheck.forEach(file => {
  console.log(`📄 Checking ${file.path}...`);
  
  const filePath = path.join(__dirname, file.path);
  
  if (!fs.existsSync(filePath)) {
    console.log(`   ❌ File not found: ${filePath}`);
    allPassed = false;
    return;
  }
  
  const content = fs.readFileSync(filePath, 'utf8');
  
  file.checks.forEach(check => {
    const found = check.pattern.test(content);
    const passed = found === check.expected;
    
    if (passed) {
      console.log(`   ✅ ${check.name}`);
    } else {
      console.log(`   ❌ ${check.name} - ${check.expected ? 'not found' : 'should not exist'}`);
      allPassed = false;
    }
  });
  
  console.log('');
});

// Summary
console.log('━'.repeat(50));
if (allPassed) {
  console.log('✅ All scrolling fixes have been properly applied!');
  console.log('\nNext steps:');
  console.log('1. Run the application: npm run dev');
  console.log('2. Test preference window scrolling:');
  console.log('   - Open preferences (Cmd+,)');
  console.log('   - Navigate to a panel with lots of content (e.g., Appearance)');
  console.log('   - Verify you can scroll through all settings');
  console.log('3. Test inactive terminal scrolling:');
  console.log('   - Switch to split view (Horizontal or Vertical)');
  console.log('   - Try scrolling the inactive terminal');
  console.log('   - Click on inactive terminal to activate it');
} else {
  console.log('❌ Some fixes are missing. Please check the files above.');
}

// Test with HTML test file
console.log('\n📊 You can also open the test file in a browser:');
console.log(`   file://${path.join(__dirname, 'scrolling-fixes-test.html')}`);