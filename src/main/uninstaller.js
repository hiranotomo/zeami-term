/**
 * ZeamiTerm Uninstaller - Removes shell integration on app uninstall
 */

const { app } = require('electron');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');

class ZeamiUninstaller {
  constructor() {
    this.homeDir = os.homedir();
  }

  async removeShellIntegration() {
    console.log('[Uninstaller] Removing shell integration...');
    
    // Files to clean
    const shellConfigs = [
      path.join(this.homeDir, '.zshrc'),
      path.join(this.homeDir, '.bashrc'),
      path.join(this.homeDir, '.profile')
    ];
    
    // Patterns to remove
    const patterns = [
      /# ZeamiTerm Shell Integration.*$/gm,
      /source.*zeami-shell-integration.*$/gm,
      /.*OSC 133.*zeami.*$/gm,
      /.*precmd_zeami.*$/gm,
      /.*preexec_zeami.*$/gm,
      /.*PROMPT_COMMAND.*zeami.*$/gm,
      /.*printf.*\\e\[?2004[hl].*# ZeamiTerm.*$/gm
    ];
    
    for (const configFile of shellConfigs) {
      try {
        const content = await fs.readFile(configFile, 'utf8');
        let modified = content;
        
        // Remove all patterns
        for (const pattern of patterns) {
          modified = modified.replace(pattern, '');
        }
        
        // Remove empty lines that were left
        modified = modified.replace(/\n\n+/g, '\n\n');
        
        if (modified !== content) {
          // Backup original
          await fs.writeFile(`${configFile}.zeami-backup`, content);
          // Write cleaned version
          await fs.writeFile(configFile, modified);
          console.log(`[Uninstaller] Cleaned ${configFile}`);
        }
      } catch (error) {
        // File doesn't exist or can't be read
        console.log(`[Uninstaller] Skipping ${configFile}: ${error.message}`);
      }
    }
    
    // Remove integration files
    const integrationFiles = [
      path.join(this.homeDir, '.config/zeami-term/shell-integration.zsh'),
      path.join(this.homeDir, '.config/zeami-term/shell-integration.bash'),
      path.join(this.homeDir, '.config/zeami-term')
    ];
    
    for (const file of integrationFiles) {
      try {
        const stats = await fs.stat(file);
        if (stats.isDirectory()) {
          await fs.rmdir(file, { recursive: true });
        } else {
          await fs.unlink(file);
        }
        console.log(`[Uninstaller] Removed ${file}`);
      } catch (error) {
        // File doesn't exist
      }
    }
  }

  async run() {
    try {
      await this.removeShellIntegration();
      console.log('[Uninstaller] Cleanup complete');
    } catch (error) {
      console.error('[Uninstaller] Error during cleanup:', error);
    }
  }
}

// Export for use in main process
module.exports = { ZeamiUninstaller };

// Run if called directly
if (require.main === module) {
  const uninstaller = new ZeamiUninstaller();
  uninstaller.run().then(() => {
    console.log('Uninstall cleanup complete');
    process.exit(0);
  });
}