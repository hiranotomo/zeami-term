/**
 * ZeamiTerm Selection Transparency Patch
 * 
 * This patch modifies xterm.js to use transparent blue selection color
 * instead of the default white selection.
 */

// Default selection color - transparent blue
export const ZEAMI_SELECTION_COLOR = {
  css: 'rgba(120, 150, 200, 0.3)',
  rgba: 0x7896C84D  // RGBA: 120, 150, 200, 77 (0.3 * 255)
};

// Patch to be applied to ThemeService.ts
export const themeServicePatch = {
  file: 'src/xterm/src/browser/services/ThemeService.ts',
  patches: [
    {
      // Change DEFAULT_SELECTION from white to blue
      find: `const DEFAULT_SELECTION = {
  css: 'rgba(255, 255, 255, 0.3)',
  rgba: 0xFFFFFF4D
};`,
      replace: `const DEFAULT_SELECTION = {
  css: 'rgba(120, 150, 200, 0.3)',
  rgba: 0x7896C84D
};`
    }
  ]
};

// Apply patch function
export function applySelectionTransparencyPatch(fs: any, path: any) {
  const filePath = path.join(__dirname, '../../', themeServicePatch.file);
  let content = fs.readFileSync(filePath, 'utf8');
  
  for (const patch of themeServicePatch.patches) {
    if (content.includes(patch.find)) {
      content = content.replace(patch.find, patch.replace);
      console.log(`✓ Applied selection transparency patch to ${themeServicePatch.file}`);
    } else {
      console.warn(`⚠ Could not find patch target in ${themeServicePatch.file}`);
    }
  }
  
  fs.writeFileSync(filePath, content);
}