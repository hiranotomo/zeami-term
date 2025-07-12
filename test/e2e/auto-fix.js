/**
 * Automatic fix script for ZeamiTerm
 * Reads test results and applies fixes for common issues
 */

const fs = require('fs').promises;
const path = require('path');

class AutoFixer {
  constructor() {
    this.fixReport = null;
    this.appliedFixes = [];
  }

  async loadReport() {
    const reportPath = path.join(__dirname, '../../test-results', 'fix-report.json');
    try {
      const data = await fs.readFile(reportPath, 'utf-8');
      this.fixReport = JSON.parse(data);
      return true;
    } catch (error) {
      console.error('Failed to load fix report:', error.message);
      return false;
    }
  }

  async applyFixes() {
    if (!this.fixReport) {
      console.error('No fix report loaded');
      return;
    }

    console.log('=== ZeamiTerm Auto-Fix Starting ===');
    console.log(`Found ${this.fixReport.failed.length} failures to fix`);

    for (const failure of this.fixReport.failed) {
      await this.fixFailure(failure);
    }

    console.log('\n=== Applied Fixes ===');
    this.appliedFixes.forEach(fix => {
      console.log(`✓ ${fix}`);
    });
  }

  async fixFailure(failure) {
    console.log(`\nFixing: ${failure.test}`);
    console.log(`Reason: ${failure.reason}`);

    switch (failure.test) {
      case 'Basic Terminal Functionality':
        await this.fixTerminalOutput();
        break;
      
      case 'Terminal Split':
        await this.fixTerminalSplit();
        break;
      
      case 'Copy/Paste':
        await this.fixCopyPaste();
        break;
      
      case 'Command Intelligence Hub':
        await this.fixCommandIntelligence();
        break;
      
      case 'Terminal Responsiveness':
        await this.fixTerminalResponsiveness();
        break;
      
      default:
        console.log(`No automatic fix available for: ${failure.test}`);
    }
  }

  async fixTerminalOutput() {
    console.log('Attempting to fix terminal output issue...');
    
    // Fix 1: Check PTY data handling
    const ptyServicePath = path.join(__dirname, '../../src/main/ptyService.js');
    const ptyService = await fs.readFile(ptyServicePath, 'utf-8');
    
    // Check if data event is properly emitted
    if (!ptyService.includes('this.emit(\'data\'')) {
      console.log('PTY service not emitting data events properly');
      // Would add the fix here
    }
    
    // Fix 2: Check terminal write method
    const terminalManagerPath = path.join(__dirname, '../../src/renderer/core/ZeamiTermManager.js');
    try {
      const terminalManager = await fs.readFile(terminalManagerPath, 'utf-8');
      
      // Ensure terminal.write is called for data
      if (!terminalManager.includes('terminal.write(')) {
        console.log('Terminal write method may not be called properly');
        
        // Add proper data handling
        const fixedContent = terminalManager.replace(
          /handleData\(data\)\s*{/,
          `handleData(data) {
    if (this.activeTerminal && this.activeTerminal.terminal) {
      this.activeTerminal.terminal.write(data);
    }`
        );
        
        await fs.writeFile(terminalManagerPath, fixedContent);
        this.appliedFixes.push('Added terminal.write() call in handleData');
      }
    } catch (error) {
      console.error('Failed to fix terminal manager:', error.message);
    }
  }

  async fixTerminalSplit() {
    console.log('Attempting to fix terminal split issue...');
    
    // Check if split command handler exists
    const layoutManagerPath = path.join(__dirname, '../../src/renderer/core/LayoutManager.js');
    try {
      const layoutManager = await fs.readFile(layoutManagerPath, 'utf-8');
      
      if (!layoutManager.includes('splitVertical')) {
        console.log('Split methods may be missing');
        // Would add split methods here
      }
    } catch (error) {
      console.error('Failed to check layout manager:', error.message);
    }
  }

  async fixCopyPaste() {
    console.log('Attempting to fix copy/paste issue...');
    
    // Check paste handling
    const indexPath = path.join(__dirname, '../../src/renderer/index.js');
    try {
      const indexContent = await fs.readFile(indexPath, 'utf-8');
      
      // Ensure paste event is handled
      if (!indexContent.includes('paste')) {
        console.log('Paste event handler may be missing');
        
        // Add paste handler
        const pasteHandler = `
  // Handle paste
  document.addEventListener('paste', (e) => {
    const text = e.clipboardData.getData('text/plain');
    if (text && window.terminalManager) {
      const terminal = window.terminalManager.getActiveTerminal();
      if (terminal) {
        terminal.paste(text);
      }
    }
  });`;
        
        const fixedContent = indexContent.replace(
          /document\.addEventListener\('DOMContentLoaded'/,
          pasteHandler + '\n\n  document.addEventListener(\'DOMContentLoaded\''
        );
        
        await fs.writeFile(indexPath, fixedContent);
        this.appliedFixes.push('Added paste event handler');
      }
    } catch (error) {
      console.error('Failed to fix paste handling:', error.message);
    }
  }

  async fixCommandIntelligence() {
    console.log('Attempting to fix Command Intelligence Hub...');
    
    // Check if ShellIntegrationAddon is properly handling OSC sequences
    const shellIntegrationPath = path.join(__dirname, '../../src/renderer/addons/ShellIntegrationAddon.js');
    try {
      const shellIntegration = await fs.readFile(shellIntegrationPath, 'utf-8');
      
      // Ensure OSC 133 handling is present
      if (!shellIntegration.includes('OSC 133')) {
        console.log('OSC 133 handling may be missing');
      }
      
      // Check if commands are being sent to Message Center
      if (!shellIntegration.includes('command:execution-complete')) {
        console.log('Commands may not be sent to Message Center');
        
        // Add command tracking
        const commandTracking = `
    // Send command to Message Center
    if (this.currentCommand) {
      window.electronAPI.invoke('command:execution-complete', {
        timestamp: Date.now(),
        command: {
          raw: this.currentCommand,
          parsed: { program: this.currentCommand.split(' ')[0], args: [], flags: {} }
        },
        execution: {
          startTime: this.commandStartTime,
          endTime: Date.now(),
          exitCode: 0,
          status: 'success'
        }
      });
    }`;
        
        const fixedContent = shellIntegration.replace(
          /_handlePromptSequence\(data\)\s*{/,
          `_handlePromptSequence(data) {${commandTracking}`
        );
        
        await fs.writeFile(shellIntegrationPath, fixedContent);
        this.appliedFixes.push('Added command tracking to ShellIntegrationAddon');
      }
    } catch (error) {
      console.error('Failed to fix shell integration:', error.message);
    }
  }

  async fixTerminalResponsiveness() {
    console.log('Attempting to fix terminal responsiveness...');
    
    // Check flow control settings
    const ptyServicePath = path.join(__dirname, '../../src/main/ptyService.js');
    try {
      const ptyService = await fs.readFile(ptyServicePath, 'utf-8');
      
      // Ensure flow control is not blocking
      if (ptyService.includes('writeInterval: 10')) {
        console.log('Flow control may be too restrictive');
        
        const fixedContent = ptyService.replace(
          /writeInterval:\s*\d+/,
          'writeInterval: 0'
        );
        
        await fs.writeFile(ptyServicePath, fixedContent);
        this.appliedFixes.push('Reduced flow control write interval');
      }
    } catch (error) {
      console.error('Failed to fix flow control:', error.message);
    }
  }

  async generateFixSummary() {
    const summary = {
      timestamp: new Date().toISOString(),
      originalFailures: this.fixReport.failed.length,
      appliedFixes: this.appliedFixes,
      recommendations: [
        'Run tests again to verify fixes',
        'Check console logs for any runtime errors',
        'Rebuild the application after fixes'
      ]
    };
    
    const summaryPath = path.join(__dirname, '../../test-results', 'fix-summary.json');
    await fs.writeFile(summaryPath, JSON.stringify(summary, null, 2));
    
    console.log(`\nFix summary saved to: ${summaryPath}`);
  }
}

// Main execution
async function main() {
  const fixer = new AutoFixer();
  
  if (await fixer.loadReport()) {
    await fixer.applyFixes();
    await fixer.generateFixSummary();
    
    console.log('\n=== Next Steps ===');
    console.log('1. Review the applied fixes');
    console.log('2. Run "npm run build" to rebuild the application');
    console.log('3. Run the tests again to verify fixes');
  }
}

main().catch(console.error);