#!/bin/bash

# xterm.js fork setup script for ZeamiTerm

set -e

echo "🚀 Setting up xterm.js fork for ZeamiTerm..."

# 1. Create vendor directory
mkdir -p src/vendor

# 2. Copy xterm.js source
echo "📦 Copying xterm.js source..."
cp -r node_modules/xterm/src src/vendor/xterm
cp node_modules/xterm/package.json src/vendor/xterm/
cp node_modules/xterm/tsconfig.json src/vendor/xterm/ || echo "No tsconfig found, will create one"

# 3. Create our tsconfig if needed
if [ ! -f src/vendor/xterm/tsconfig.json ]; then
  cat > src/vendor/xterm/tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ES2020",
    "lib": ["ES2020", "DOM"],
    "outDir": "../../lib/xterm",
    "rootDir": ".",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": [
    "**/*.ts"
  ],
  "exclude": [
    "node_modules",
    "**/*.test.ts"
  ]
}
EOF
fi

# 4. Create build script
cat > scripts/build-xterm.js << 'EOF'
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔨 Building xterm.js from source...');

try {
  // Install TypeScript if needed
  if (!fs.existsSync('node_modules/typescript')) {
    console.log('📦 Installing TypeScript...');
    execSync('npm install --save-dev typescript', { stdio: 'inherit' });
  }

  // Compile TypeScript
  console.log('🏗️ Compiling TypeScript...');
  execSync('npx tsc -p src/vendor/xterm/tsconfig.json', { stdio: 'inherit' });

  // Copy CSS files
  console.log('🎨 Copying CSS files...');
  const cssSource = 'node_modules/xterm/css';
  const cssDest = 'src/lib/xterm/css';
  
  if (!fs.existsSync(cssDest)) {
    fs.mkdirSync(cssDest, { recursive: true });
  }
  
  fs.readdirSync(cssSource).forEach(file => {
    if (file.endsWith('.css')) {
      fs.copyFileSync(
        path.join(cssSource, file),
        path.join(cssDest, file)
      );
    }
  });

  console.log('✅ xterm.js build complete!');
} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}
EOF

# 5. Make scripts executable
chmod +x scripts/build-xterm.js

# 6. Update package.json scripts
echo "📝 Updating package.json..."
node -e "
const pkg = require('./package.json');
pkg.scripts['build:xterm'] = 'node scripts/build-xterm.js';
pkg.scripts['prebuild'] = 'npm run build:xterm';
pkg.scripts['watch:xterm'] = 'tsc -p src/vendor/xterm/tsconfig.json --watch';
require('fs').writeFileSync('./package.json', JSON.stringify(pkg, null, 2));
"

echo "✅ Fork setup complete!"
echo ""
echo "Next steps:"
echo "1. Run 'npm run build:xterm' to build xterm.js"
echo "2. Update HTML to use 'src/lib/xterm/xterm.js' instead of 'node_modules/xterm/lib/xterm.js'"
echo "3. Apply custom modifications to src/vendor/xterm/"
echo ""
echo "🎯 Key files to modify for selection transparency:"
echo "  - src/vendor/xterm/browser/services/ThemeService.ts"
echo "  - src/vendor/xterm/browser/renderer/shared/CellColorResolver.ts"