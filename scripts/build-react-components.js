/**
 * Build React components for Message Center
 */

const esbuild = require('esbuild');
const path = require('path');
const fs = require('fs');

async function buildReactComponents() {
  console.log('Building React components...');
  
  try {
    // Build CommandIntelligenceHub and its dependencies
    const result = await esbuild.build({
      entryPoints: [
        'src/renderer/components/CommandIntelligence/CommandIntelligenceHub.js',
      ],
      bundle: true,
      format: 'esm',
      platform: 'browser',
      loader: {
        '.js': 'jsx',
        '.css': 'empty', // Ignore CSS imports
      },
      jsx: 'transform',
      jsxFactory: 'React.createElement',
      jsxFragment: 'React.Fragment',
      // IMPORTANT: Treat React and ReactDOM as external
      external: ['react', 'react-dom'],
      sourcemap: true,
      minify: false,
      write: false, // Don't write to disk yet
    });
    
    // Get the output
    const outputCode = result.outputFiles[0].text;
    
    // Wrap the output to use global React
    let processedCode = outputCode;
    
    // Remove all React imports
    processedCode = processedCode.replace(/import\s+React\d*(?:\s*,\s*\{[^}]*\})?\s+from\s+["']react["'];?\s*/g, '');
    processedCode = processedCode.replace(/import\s+\{[^}]*\}\s+from\s+["']react["'];?\s*/g, '');
    processedCode = processedCode.replace(/import\s+\*\s+as\s+React\d*\s+from\s+["']react["'];?\s*/g, '');
    processedCode = processedCode.replace(/import\s+ReactDOM\s+from\s+["']react-dom["'];?\s*/g, '');
    
    // Replace React references
    processedCode = processedCode.replace(/React\d+/g, 'React');
    processedCode = processedCode.replace(/useState\d+/g, 'useState');
    processedCode = processedCode.replace(/useEffect\d+/g, 'useEffect');
    processedCode = processedCode.replace(/useRef\d+/g, 'useRef');
    processedCode = processedCode.replace(/useMemo\d+/g, 'useMemo');
    processedCode = processedCode.replace(/useCallback\d+/g, 'useCallback');
    
    const wrappedCode = `
// Command Intelligence Hub Bundle
// This file is auto-generated. Do not edit directly.

// Use global React and ReactDOM
const React = window.React;
const ReactDOM = window.ReactDOM;
const { useState, useEffect, useRef, useMemo, useCallback } = React;

// Component code
${processedCode}
`;
    
    // Write the wrapped code
    const outputPath = path.join('src/renderer/components/CommandIntelligence/dist/CommandIntelligenceHub.js');
    const outputDir = path.dirname(outputPath);
    
    // Ensure directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    fs.writeFileSync(outputPath, wrappedCode);
    
    console.log('✓ React components built successfully!');
  } catch (error) {
    console.error('✗ Failed to build React components:', error);
    process.exit(1);
  }
}

// Run the build
buildReactComponents();