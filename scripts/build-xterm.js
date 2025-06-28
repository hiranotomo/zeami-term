#!/usr/bin/env node

/**
 * Custom build script for xterm.js with ZeamiTerm patches
 * Handles import resolution issues and applies patches
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// First apply patches
console.log('Applying xterm.js patches...');
execSync('node scripts/apply-xterm-patches.js', { stdio: 'inherit' });

// Create a simple bundler using esbuild instead of webpack for better compatibility
console.log('Building xterm.js with esbuild...');

// Install esbuild if not present
try {
  require.resolve('esbuild');
} catch (e) {
  console.log('Installing esbuild...');
  execSync('npm install --save-dev esbuild', { stdio: 'inherit' });
}

const esbuild = require('esbuild');

// Build configuration
const buildOptions = {
  entryPoints: ['src/xterm/src/browser/public/Terminal.ts'],
  bundle: true,
  outfile: 'build/xterm.js',
  format: 'iife',
  globalName: 'Terminal',
  platform: 'browser',
  target: 'es2020',
  sourcemap: true,
  minify: true,
  loader: {
    '.ts': 'ts',
    '.d.ts': 'ts'
  },
  tsconfig: 'tsconfig.json',
  external: ['fs', 'path', 'node-pty'],
  define: {
    'process.env.NODE_ENV': '"production"'
  },
  resolveExtensions: ['.ts', '.d.ts', '.js'],
  plugins: [
    {
      name: 'ignore-tests',
      setup(build) {
        // Ignore test files
        build.onResolve({ filter: /\.test\.(ts|tsx|js)$/ }, args => {
          return { path: args.path, external: true };
        });
      }
    },
    {
      name: 'resolve-imports',
      setup(build) {
        const xtermRoot = path.resolve(__dirname, '../src/xterm/src');
        
        // Resolve common/* imports
        build.onResolve({ filter: /^common\// }, args => {
          const importPath = args.path.substring('common/'.length);
          let resolvedPath = path.join(xtermRoot, 'common', importPath);
          
          // Try different extensions
          if (fs.existsSync(resolvedPath + '.ts')) {
            return { path: resolvedPath + '.ts' };
          } else if (fs.existsSync(resolvedPath + '.d.ts')) {
            return { path: resolvedPath + '.d.ts' };
          } else if (fs.existsSync(resolvedPath + '.js')) {
            return { path: resolvedPath + '.js' };
          }
          
          return { path: resolvedPath };
        });
        
        // Resolve browser/* imports  
        build.onResolve({ filter: /^browser\// }, args => {
          const importPath = args.path.substring('browser/'.length);
          let resolvedPath = path.join(xtermRoot, 'browser', importPath);
          
          // Try different extensions
          if (fs.existsSync(resolvedPath + '.ts')) {
            return { path: resolvedPath + '.ts' };
          } else if (fs.existsSync(resolvedPath + '.d.ts')) {
            return { path: resolvedPath + '.d.ts' };
          } else if (fs.existsSync(resolvedPath + '.js')) {
            return { path: resolvedPath + '.js' };
          }
          
          return { path: resolvedPath };
        });
      }
    }
  ]
};

// Build
esbuild.build(buildOptions).then(() => {
  console.log('✓ Build completed successfully!');
  
  // Create a wrapper that exports properly for UMD
  const wrapperContent = `
(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    // CommonJS
    module.exports = factory();
  } else {
    // Browser globals
    root.Terminal = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  const module = {};
  ${fs.readFileSync('build/xterm.js', 'utf8')}
  return Terminal.Terminal || Terminal;
}));
`;
  
  fs.writeFileSync('build/xterm.js', wrapperContent);
  console.log('✓ UMD wrapper applied!');
  
}).catch((error) => {
  console.error('Build failed:', error);
  process.exit(1);
});