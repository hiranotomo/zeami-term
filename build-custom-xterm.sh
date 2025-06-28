#!/bin/bash

# Build custom xterm.js with selection transparency patch
# This script clones xterm.js, applies our patch, and builds it

set -e

echo "Building custom xterm.js with selection transparency..."

# Clone xterm.js if not exists
if [ ! -d "xterm.js" ]; then
  echo "Cloning xterm.js..."
  git clone https://github.com/xtermjs/xterm.js.git
  cd xterm.js
  git checkout v5.3.0  # Match our current version
else
  cd xterm.js
  git fetch
  git checkout v5.3.0
fi

# Find and patch selection rendering in source files
echo "Applying selection transparency patches..."

# Patch BaseRenderLayer.ts for selection color
if [ -f "src/browser/renderer/shared/BaseRenderLayer.ts" ]; then
  sed -i.bak 's/this\._colors\.selectionTransparent\.css/\"rgba(120, 150, 200, 0.3)\"/g' src/browser/renderer/shared/BaseRenderLayer.ts
  sed -i.bak 's/this\._colors\.selectionOpaque\.css/\"rgba(120, 150, 200, 0.3)\"/g' src/browser/renderer/shared/BaseRenderLayer.ts
fi

# Patch SelectionRenderLayer.ts
if [ -f "src/browser/renderer/dom/DomRendererRowFactory.ts" ]; then
  sed -i.bak 's/colors\.selectionBackgroundTransparent\.css/\"rgba(120, 150, 200, 0.3)\"/g' src/browser/renderer/dom/DomRendererRowFactory.ts
fi

# Patch canvas renderer selection
find src -name "*.ts" -type f -exec grep -l "selectionTransparent\|selectionOpaque" {} \; | while read file; do
  echo "Patching $file..."
  sed -i.bak 's/selectionTransparent\.css/\"rgba(120, 150, 200, 0.3)\"/g' "$file"
  sed -i.bak 's/selectionOpaque\.css/\"rgba(120, 150, 200, 0.3)\"/g' "$file"
done

# Install dependencies
echo "Installing dependencies..."
npm install

# Build
echo "Building xterm.js..."
npm run build

echo "Build complete! Custom xterm.js is in xterm.js/lib/"
echo ""
echo "To use in ZeamiTerm:"
echo "1. Copy xterm.js/lib/* to node_modules/xterm/lib/"
echo "2. Copy xterm.js/css/xterm.css to node_modules/xterm/css/"
echo "3. Rebuild ZeamiTerm"