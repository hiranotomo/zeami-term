/**
 * Advanced debug script for xterm.js selection rendering
 * This investigates the actual color values being used
 */

console.log('=== SELECTION COLOR DEBUG ===\n');

// Wait for terminal to be ready
setTimeout(() => {
  const terminals = window.terminalManager?.terminals;
  if (!terminals || terminals.size === 0) {
    console.log('❌ No terminals found');
    return;
  }

  terminals.forEach((session, id) => {
    const terminal = session.terminal;
    if (!terminal) return;

    console.log(`\n📟 Terminal ${id}:`);
    
    // Check theme settings
    console.log('Theme settings:');
    console.log('  options.theme:', terminal.options.theme);
    
    // Access internal theme service
    if (terminal._core?._themeService) {
      const themeService = terminal._core._themeService;
      const colors = themeService.colors;
      
      console.log('\n🎨 Theme Service Colors:');
      console.log('  selectionBackgroundTransparent:', colors.selectionBackgroundTransparent);
      console.log('  selectionBackgroundOpaque:', colors.selectionBackgroundOpaque);
      console.log('  selectionInactiveBackgroundTransparent:', colors.selectionInactiveBackgroundTransparent);
      console.log('  selectionInactiveBackgroundOpaque:', colors.selectionInactiveBackgroundOpaque);
      console.log('  selectionForeground:', colors.selectionForeground);
      
      // Check if colors are being parsed correctly
      if (colors.selectionBackgroundTransparent) {
        const color = colors.selectionBackgroundTransparent;
        console.log('\n🔍 Color Analysis:');
        console.log('  CSS:', color.css);
        console.log('  RGBA:', color.rgba ? `0x${color.rgba.toString(16).toUpperCase()}` : 'N/A');
        
        // Extract RGBA components
        if (color.rgba) {
          const r = (color.rgba >> 24) & 0xFF;
          const g = (color.rgba >> 16) & 0xFF;
          const b = (color.rgba >> 8) & 0xFF;
          const a = color.rgba & 0xFF;
          console.log(`  Components: R=${r}, G=${g}, B=${b}, A=${a} (${(a/255).toFixed(2)})`);
        }
      }
    }
    
    // Check renderer
    if (terminal._core?._renderService?._renderer) {
      const renderer = terminal._core._renderService._renderer;
      console.log('\n🖼️ Renderer Info:');
      console.log('  Type:', renderer.constructor.name);
      
      // For Canvas renderer, check if it has color settings
      if (renderer._colors) {
        console.log('  Renderer colors:', renderer._colors);
      }
    }
    
    // Force a selection to test
    console.log('\n🧪 Testing selection...');
    if (terminal.select && terminal.getSelection) {
      // Select first line
      terminal.select(0, 0, 10);
      console.log('  Created test selection:', terminal.getSelection());
      
      // Check if selection is visible
      setTimeout(() => {
        const selectionLayer = document.querySelector('.xterm-selection-layer');
        if (selectionLayer) {
          console.log('  Selection layer found');
          const selectionDivs = selectionLayer.querySelectorAll('div');
          selectionDivs.forEach((div, i) => {
            if (div.style.backgroundColor) {
              console.log(`  Selection div ${i}: ${div.style.backgroundColor}`);
            }
          });
        }
      }, 100);
    }
  });
  
  // Additional CSS check
  console.log('\n🎨 CSS Styles:');
  const computedStyles = getComputedStyle(document.querySelector('.xterm'));
  console.log('  --selection-background:', computedStyles.getPropertyValue('--selection-background'));
  
}, 1000);