/**
 * Debug script to investigate xterm.js selection rendering
 * Run in browser console to understand what's happening
 */

// Check terminal instances
console.log('=== DEBUGGING XTERM.JS SELECTION ===\n');

// 1. Check if terminals exist
const terminals = window.terminalManager?.terminals;
if (!terminals || terminals.size === 0) {
  console.log('❌ No terminals found');
} else {
  console.log(`✅ Found ${terminals.size} terminal(s)`);
  
  // 2. Check each terminal's configuration
  terminals.forEach((session, id) => {
    console.log(`\n📟 Terminal ${id}:`);
    const terminal = session.terminal;
    
    if (terminal) {
      // Check theme
      console.log('  Theme:', terminal.options?.theme);
      console.log('  Selection color:', terminal.options?.theme?.selection);
      
      // Check renderer type
      console.log('  Renderer:', session.rendererAddon?.constructor?.name || 'Unknown');
      
      // Check selection manager
      if (terminal._core?._selectionService) {
        console.log('  ✅ Selection service exists');
        const selModel = terminal._core._selectionService._model;
        if (selModel) {
          console.log('  Selection model:', {
            startX: selModel.selectionStart?.[0],
            startY: selModel.selectionStart?.[1],
            endX: selModel.selectionEnd?.[0],
            endY: selModel.selectionEnd?.[1],
            length: selModel.length
          });
        }
      }
      
      // Check render service
      if (terminal._core?._renderService) {
        console.log('  ✅ Render service exists');
        const renderer = terminal._core._renderService._renderer;
        console.log('  Renderer implementation:', renderer?.constructor?.name);
        
        // Check if renderer has selection render layer
        if (renderer?._selectionRenderLayer) {
          console.log('  ✅ Selection render layer exists');
          console.log('  Selection layer:', renderer._selectionRenderLayer);
        }
      }
    }
  });
}

// 3. Check DOM for selection elements
console.log('\n🔍 DOM Analysis:');
const selectionLayers = document.querySelectorAll('.xterm-selection-layer');
console.log(`  Selection layers found: ${selectionLayers.length}`);

selectionLayers.forEach((layer, index) => {
  console.log(`  Layer ${index}:`, {
    visible: layer.style.display !== 'none',
    children: layer.children.length,
    innerHTML: layer.innerHTML.substring(0, 100) + '...'
  });
});

// 4. Test manual theme update
console.log('\n🔧 Testing theme update:');
terminals?.forEach((session, id) => {
  const terminal = session.terminal;
  if (terminal && terminal.options) {
    console.log(`  Updating terminal ${id} theme...`);
    
    // Try to force update the theme
    const newTheme = {
      ...terminal.options.theme,
      selection: 'rgba(120, 150, 200, 0.3)'
    };
    
    // Method 1: Update options
    terminal.options.theme = newTheme;
    console.log('  ✅ Updated terminal.options.theme');
    
    // Method 2: If setTheme method exists
    if (terminal.setTheme) {
      terminal.setTheme(newTheme);
      console.log('  ✅ Called terminal.setTheme()');
    }
    
    // Method 3: Force refresh
    if (terminal.refresh) {
      terminal.refresh(0, terminal.rows - 1);
      console.log('  ✅ Called terminal.refresh()');
    }
  }
});

// 5. Introspect xterm internals
console.log('\n🔬 XTerm Internal Structure:');
const firstTerminal = terminals?.values().next().value?.terminal;
if (firstTerminal?._core) {
  const core = firstTerminal._core;
  console.log('Core services:', Object.keys(core).filter(k => k.includes('Service')));
  
  // Check theme service
  if (core._themeService) {
    console.log('Theme service colors:', core._themeService.colors);
  }
}

console.log('\n✨ Debug complete. Now try selecting text to see if the color changed.');