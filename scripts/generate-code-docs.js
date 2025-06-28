#!/usr/bin/env node

/**
 * Code Documentation Generator for ZeamiTerm
 * Generates comprehensive documentation from source code
 */

const fs = require('fs');
const path = require('path');

class CodeDocumentGenerator {
  constructor() {
    this.sourceRoot = path.join(__dirname, '..', 'src');
    this.docsRoot = path.join(__dirname, '..', 'docs', 'api');
    this.dependencyGraph = new Map();
  }

  /**
   * Main entry point
   */
  async generate() {
    console.log('🔍 Starting code documentation generation...');
    
    // Ensure docs directory exists
    fs.mkdirSync(this.docsRoot, { recursive: true });
    
    // Generate documentation for each directory
    await this.generateMainProcessDocs();
    await this.generateRendererProcessDocs();
    await this.generateCommonDocs();
    
    // Generate dependency graph
    await this.generateDependencyGraph();
    
    // Generate index
    await this.generateIndex();
    
    console.log('✅ Documentation generation complete!');
  }

  /**
   * Generate documentation for main process
   */
  async generateMainProcessDocs() {
    const mainDir = path.join(this.sourceRoot, 'main');
    const files = fs.readdirSync(mainDir).filter(f => f.endsWith('.js'));
    
    const mainDocs = ['# Main Process API Documentation\n\n'];
    
    for (const file of files) {
      const filePath = path.join(mainDir, file);
      const doc = this.generateModuleDoc(filePath);
      mainDocs.push(doc);
    }
    
    fs.writeFileSync(
      path.join(this.docsRoot, 'main-process.md'),
      mainDocs.join('\n')
    );
  }

  /**
   * Generate documentation for renderer process
   */
  async generateRendererProcessDocs() {
    const rendererDir = path.join(this.sourceRoot, 'renderer');
    const files = fs.readdirSync(rendererDir).filter(f => f.endsWith('.js'));
    
    const rendererDocs = ['# Renderer Process API Documentation\n\n'];
    
    for (const file of files) {
      const filePath = path.join(rendererDir, file);
      const doc = this.generateModuleDoc(filePath);
      rendererDocs.push(doc);
    }
    
    fs.writeFileSync(
      path.join(this.docsRoot, 'renderer-process.md'),
      rendererDocs.join('\n')
    );
  }

  /**
   * Generate documentation for common modules
   */
  async generateCommonDocs() {
    const commonDir = path.join(this.sourceRoot, 'common');
    const files = fs.readdirSync(commonDir).filter(f => f.endsWith('.js'));
    
    const commonDocs = ['# Common Modules API Documentation\n\n'];
    
    for (const file of files) {
      const filePath = path.join(commonDir, file);
      const doc = this.generateModuleDoc(filePath);
      commonDocs.push(doc);
    }
    
    fs.writeFileSync(
      path.join(this.docsRoot, 'common-modules.md'),
      commonDocs.join('\n')
    );
  }

  /**
   * Generate documentation for a single module
   */
  generateModuleDoc(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const fileName = path.basename(filePath);
    const moduleName = fileName.replace('.js', '');
    
    const doc = [`## ${moduleName}\n`];
    doc.push(`**File**: \`${path.relative(this.sourceRoot, filePath)}\`\n`);
    
    // Extract module description from header comment
    const headerMatch = content.match(/^\/\*\*[\s\S]*?\*\//);
    if (headerMatch) {
      const description = this.extractDescription(headerMatch[0]);
      doc.push(`**Description**: ${description}\n`);
    }
    
    // Extract imports/requires
    const imports = this.extractImports(content, filePath);
    if (imports.length > 0) {
      doc.push('### Dependencies\n');
      imports.forEach(imp => {
        doc.push(`- ${imp}`);
      });
      doc.push('');
    }
    
    // Extract exports
    const exports = this.extractExports(content);
    if (exports.length > 0) {
      doc.push('### Exports\n');
      exports.forEach(exp => {
        doc.push(`- ${exp}`);
      });
      doc.push('');
    }
    
    // Extract classes
    const classes = this.extractClasses(content);
    if (classes.length > 0) {
      doc.push('### Classes\n');
      classes.forEach(cls => {
        doc.push(`#### ${cls.name}`);
        if (cls.description) {
          doc.push(cls.description);
        }
        if (cls.methods.length > 0) {
          doc.push('\n**Methods**:');
          cls.methods.forEach(method => {
            doc.push(`- \`${method.name}(${method.params})\`${method.description ? ': ' + method.description : ''}`);
          });
        }
        doc.push('');
      });
    }
    
    // Extract functions
    const functions = this.extractFunctions(content);
    if (functions.length > 0) {
      doc.push('### Functions\n');
      functions.forEach(func => {
        doc.push(`#### ${func.name}`);
        doc.push(`\`\`\`javascript\n${func.signature}\n\`\`\``);
        if (func.description) {
          doc.push(func.description);
        }
        doc.push('');
      });
    }
    
    // Extract IPC channels
    const ipcChannels = this.extractIPCChannels(content);
    if (ipcChannels.length > 0) {
      doc.push('### IPC Channels\n');
      ipcChannels.forEach(channel => {
        doc.push(`- \`${channel.name}\`: ${channel.type} - ${channel.description || 'No description'}`);
      });
      doc.push('');
    }
    
    doc.push('---\n');
    return doc.join('\n');
  }

  /**
   * Extract description from JSDoc comment
   */
  extractDescription(comment) {
    const lines = comment.split('\n');
    const descLines = lines
      .filter(line => !line.includes('@') && !line.includes('/**') && !line.includes('*/'))
      .map(line => line.replace(/^\s*\*\s?/, '').trim())
      .filter(line => line.length > 0);
    return descLines.join(' ');
  }

  /**
   * Extract imports and track dependencies
   */
  extractImports(content, filePath) {
    const imports = [];
    const importRegex = /(?:import\s+.*?\s+from\s+['"](.+?)['"])|(?:require\s*\(['"](.+?)['"]\))/g;
    let match;
    
    while ((match = importRegex.exec(content)) !== null) {
      const importPath = match[1] || match[2];
      imports.push(importPath);
      
      // Track dependency
      const relativePath = path.relative(this.sourceRoot, filePath);
      if (!this.dependencyGraph.has(relativePath)) {
        this.dependencyGraph.set(relativePath, new Set());
      }
      this.dependencyGraph.get(relativePath).add(importPath);
    }
    
    return imports;
  }

  /**
   * Extract exports
   */
  extractExports(content) {
    const exports = [];
    
    // ES6 exports
    const exportRegex = /export\s+(?:default\s+)?(?:class|function|const|let|var)\s+(\w+)/g;
    let match;
    while ((match = exportRegex.exec(content)) !== null) {
      exports.push(match[1]);
    }
    
    // CommonJS exports
    const moduleExportsRegex = /module\.exports\s*=\s*(\w+)/g;
    while ((match = moduleExportsRegex.exec(content)) !== null) {
      exports.push(match[1]);
    }
    
    return exports;
  }

  /**
   * Extract classes and their methods
   */
  extractClasses(content) {
    const classes = [];
    const classRegex = /class\s+(\w+)(?:\s+extends\s+\w+)?\s*{([^}]+)}/g;
    let match;
    
    while ((match = classRegex.exec(content)) !== null) {
      const className = match[1];
      const classBody = match[2];
      
      const methods = [];
      const methodRegex = /(?:async\s+)?(\w+)\s*\([^)]*\)/g;
      let methodMatch;
      
      while ((methodMatch = methodRegex.exec(classBody)) !== null) {
        const methodName = methodMatch[1];
        if (methodName !== 'constructor') {
          methods.push({
            name: methodName,
            params: '',
            description: ''
          });
        }
      }
      
      classes.push({
        name: className,
        description: '',
        methods
      });
    }
    
    return classes;
  }

  /**
   * Extract functions
   */
  extractFunctions(content) {
    const functions = [];
    const funcRegex = /(?:async\s+)?function\s+(\w+)\s*\(([^)]*)\)/g;
    let match;
    
    while ((match = funcRegex.exec(content)) !== null) {
      functions.push({
        name: match[1],
        signature: match[0],
        params: match[2],
        description: ''
      });
    }
    
    return functions;
  }

  /**
   * Extract IPC channel definitions
   */
  extractIPCChannels(content) {
    const channels = [];
    
    // ipcMain.handle patterns
    const handleRegex = /ipcMain\.handle\(['"]([^'"]+)['"]/g;
    let match;
    while ((match = handleRegex.exec(content)) !== null) {
      channels.push({ name: match[1], type: 'handle' });
    }
    
    // ipcMain.on patterns
    const onRegex = /ipcMain\.on\(['"]([^'"]+)['"]/g;
    while ((match = onRegex.exec(content)) !== null) {
      channels.push({ name: match[1], type: 'on' });
    }
    
    // ipcRenderer.send patterns
    const sendRegex = /ipcRenderer\.send\(['"]([^'"]+)['"]/g;
    while ((match = sendRegex.exec(content)) !== null) {
      channels.push({ name: match[1], type: 'send' });
    }
    
    return channels;
  }

  /**
   * Generate dependency graph in Mermaid format
   */
  async generateDependencyGraph() {
    const mermaid = ['# Dependency Graph\n'];
    mermaid.push('```mermaid');
    mermaid.push('graph TD');
    
    this.dependencyGraph.forEach((deps, file) => {
      const nodeId = file.replace(/[/\-.]/g, '_');
      deps.forEach(dep => {
        if (dep.startsWith('.')) {
          // Internal dependency
          const depFile = path.join(path.dirname(file), dep);
          const depId = depFile.replace(/[/\-.]/g, '_');
          mermaid.push(`    ${nodeId} --> ${depId}`);
        }
      });
    });
    
    mermaid.push('```');
    
    fs.writeFileSync(
      path.join(this.docsRoot, '..', 'architecture', 'dependency-graph.md'),
      mermaid.join('\n')
    );
  }

  /**
   * Generate index file
   */
  async generateIndex() {
    const index = [
      '# ZeamiTerm API Documentation\n',
      '## Generated Documentation\n',
      '- [Main Process API](./main-process.md)',
      '- [Renderer Process API](./renderer-process.md)',
      '- [Common Modules API](./common-modules.md)',
      '\n## Architecture Documentation\n',
      '- [Architecture Overview](../architecture/zeami-term-architecture.md)',
      '- [Technology Stack](../architecture/technology-stack.md)',
      '- [Main Process Guide](../architecture/main-process-guide.md)',
      '- [Renderer Process Guide](../architecture/renderer-process-guide.md)',
      '- [xterm.js Integration Points](../architecture/xterm-integration-points.md)',
      '- [Dependency Graph](../architecture/dependency-graph.md)',
      '\n## Development Documentation\n',
      '- [xterm.js Fork Implementation Plan](../development/xterm-fork-implementation-plan.md)',
      '- [Paradigm Shift: xterm.js Fork](../development/paradigm-shift-xterm-fork.md)',
      '\n---\n',
      `*Generated on ${new Date().toISOString()}*`
    ];
    
    fs.writeFileSync(
      path.join(this.docsRoot, 'index.md'),
      index.join('\n')
    );
  }
}

// Run if called directly
if (require.main === module) {
  const generator = new CodeDocumentGenerator();
  generator.generate().catch(console.error);
}

module.exports = CodeDocumentGenerator;