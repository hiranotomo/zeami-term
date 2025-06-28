# XTerm.js Source Integration

## Overview

ZeamiTerm now includes the full xterm.js v5.5.0 source code for complete control over terminal rendering, particularly for fixing the selection transparency issue.

## Directory Structure

```
zeami-term/
├── src/
│   ├── xterm/                    # xterm.js source code
│   │   ├── src/                  # TypeScript source files
│   │   │   ├── browser/          # Browser-specific code
│   │   │   ├── common/           # Shared code
│   │   │   └── headless/         # Headless terminal
│   │   ├── typings/              # TypeScript definitions
│   │   ├── package.json          # Original xterm package.json
│   │   └── tsconfig.all.json     # TypeScript config
│   └── patches/                  # ZeamiTerm-specific patches
│       └── selection-transparency-fix.ts
├── scripts/
│   └── apply-xterm-patches.js    # Patch application script
├── build/
│   └── xterm.js                  # Built custom xterm (generated)
├── webpack.config.js             # Webpack config for building xterm
└── tsconfig.json                 # TypeScript config for the project
```

## Build Process

1. **Apply Patches**: `npm run patch:xterm`
   - Modifies `DEFAULT_SELECTION` color to transparent blue
   - Changes from `rgba(255, 255, 255, 0.3)` to `rgba(120, 150, 200, 0.3)`

2. **Build XTerm**: `npm run build:xterm`
   - Runs patch script automatically
   - Compiles TypeScript source to JavaScript
   - Creates `build/xterm.js` with webpack

3. **Build App**: `npm run build`
   - Builds custom xterm first
   - Then builds the Electron app

## Selection Transparency Fix

The main issue was that xterm.js uses an opaque white selection by default. Our patch:

1. Changes the default selection color in `ThemeService.ts`
2. From: `rgba(255, 255, 255, 0.3)` (white with 30% opacity)
3. To: `rgba(120, 150, 200, 0.3)` (blue with 30% opacity)

The color values:
- RGB: 120, 150, 200 (a pleasant blue)
- Alpha: 0.3 (30% transparency)
- Hex with alpha: 0x7896C84D

## Custom XTerm Loader

The `src/renderer/xterm-loader.js` module:
- Attempts to load our custom-built xterm.js first
- Falls back to the npm package if custom build is not available
- Provides logging to confirm which version is loaded

## Integration with Terminal Manager

The terminal manager (`src/renderer/terminalManager.js`) now:
1. Imports the custom xterm loader
2. Replaces `window.Terminal` with our custom build
3. All terminal instances use the patched selection color

## Adding More Patches

To add additional patches:

1. Edit `scripts/apply-xterm-patches.js`
2. Add new patch logic following the existing pattern
3. Test with `npm run patch:xterm`
4. Rebuild with `npm run build:xterm`

## Maintaining Compatibility

- The custom build maintains full API compatibility with xterm.js v5.5.0
- All addons (WebGL, Canvas, Search, etc.) work without modification
- The build process can be skipped by removing the `build:xterm` step

## Future Updates

When updating xterm.js:
1. Download new version source
2. Extract to `src/xterm/`
3. Re-apply patches with `npm run patch:xterm`
4. Test thoroughly
5. Update this documentation with any changes

## Troubleshooting

- **Patch fails**: The source code structure may have changed. Check `ThemeService.ts` manually.
- **Build fails**: Ensure all TypeScript dependencies are installed with `npm install`.
- **Selection still opaque**: Clear the build directory and rebuild. Check browser console for which xterm is loaded.