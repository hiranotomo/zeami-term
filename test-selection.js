/**
 * Test script to verify selection transparency is working
 * Run this in the browser console when ZeamiTerm is open
 */

console.log('=== Testing Selection Transparency ===\n');

// Check if theme manager is loaded
if (window.ThemeManager) {
  console.log('✓ ThemeManager is loaded');
  
  const themeManager = document.querySelector('#terminal-container') ? 
    window.terminalManager?.themeManager : null;
  
  if (themeManager) {
    console.log('✓ ThemeManager instance found');
    
    const currentTheme = themeManager.getCurrentTheme();
    if (currentTheme) {
      console.log(`✓ Current theme: ${currentTheme.name}`);
      console.log(`  Selection color: ${currentTheme.colors.terminal.selection}`);
    }
  }
} else {
  console.log('✗ ThemeManager not loaded');
}

// Check selection elements
const selectionDivs = document.querySelectorAll('.xterm-selection-layer div');
console.log(`\nFound ${selectionDivs.length} selection divs`);

selectionDivs.forEach((div, index) => {
  const bgColor = div.style.backgroundColor;
  if (bgColor) {
    console.log(`Selection ${index + 1}: ${bgColor}`);
    
    // Check if it's the old gray color
    if (bgColor.includes('58, 61, 65') || bgColor === 'rgb(58, 61, 65)') {
      console.log('  ⚠️  Using old gray color - needs update');
    } else if (bgColor.includes('120, 150, 200')) {
      console.log('  ✓ Using transparent blue color');
    }
  }
});

// Test creating a selection
console.log('\n=== Manual Test Instructions ===');
console.log('1. Select some text in the terminal');
console.log('2. Check if the selection is transparent blue instead of opaque gray');
console.log('3. Run this script again to see the updated selection colors');

// Check if MutationObserver is active
if (window.terminalManager?.themeManager?.selectionObserver) {
  console.log('\n✓ Selection MutationObserver is active');
} else {
  console.log('\n✗ Selection MutationObserver not found');
}

// Force update any existing selections
console.log('\nForcing selection color update...');
document.querySelectorAll('.xterm-selection-layer div').forEach(div => {
  if (div.style.backgroundColor && 
      (div.style.backgroundColor.includes('58, 61, 65') ||
       div.style.backgroundColor === 'rgb(58, 61, 65)')) {
    div.style.backgroundColor = 'rgba(120, 150, 200, 0.3)';
    console.log('Updated a selection div to transparent blue');
  }
});

console.log('\nTest complete. Try selecting text to see the transparent selection.');