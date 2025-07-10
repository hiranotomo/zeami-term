/**
 * Shell Integration Installer
 * Automatically installs shell integration scripts
 */

const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const { app } = require('electron');

class ShellIntegrationInstaller {
  constructor() {
    this.integrationDir = path.join(
      app.getPath('userData'),
      'shell-integration'
    );
    
    this.scriptsDir = path.join(__dirname, '../../shell-integration');
  }
  
  async ensureDirectories() {
    try {
      await fs.mkdir(this.integrationDir, { recursive: true });
      return true;
    } catch (error) {
      console.error('[ShellIntegrationInstaller] Failed to create directories:', error);
      return false;
    }
  }
  
  async install(shellPath) {
    const shellName = path.basename(shellPath);
    
    console.log(`[ShellIntegrationInstaller] Installing for shell: ${shellName}`);
    
    switch (shellName) {
      case 'bash':
        return await this._installBash();
      case 'zsh':
        return await this._installZsh();
      default:
        return {
          success: false,
          error: `Unsupported shell: ${shellName}`
        };
    }
  }
  
  async _installBash() {
    try {
      // Ensure directories exist
      await this.ensureDirectories();
      
      // Copy integration script
      const sourcePath = path.join(this.scriptsDir, 'bash-integration.sh');
      const targetPath = path.join(this.integrationDir, 'bash-integration.sh');
      
      await fs.copyFile(sourcePath, targetPath);
      
      // Make executable
      await fs.chmod(targetPath, 0o755);
      
      // Check and update .bashrc
      const bashrcPath = path.join(os.homedir(), '.bashrc');
      const sourceCommand = `\n# ZeamiTerm Shell Integration\n[ -f "${targetPath}" ] && source "${targetPath}"\n`;
      
      try {
        const bashrcContent = await fs.readFile(bashrcPath, 'utf8');
        
        if (bashrcContent.includes('ZeamiTerm Shell Integration')) {
          console.log('[ShellIntegrationInstaller] Bash integration already installed');
          return {
            success: true,
            message: 'Bash integration already installed',
            alreadyInstalled: true
          };
        }
        
        // Append to .bashrc
        await fs.appendFile(bashrcPath, sourceCommand);
        
        return {
          success: true,
          message: 'Bash integration installed successfully. Please restart your terminal or run: source ~/.bashrc',
          scriptPath: targetPath
        };
      } catch (error) {
        // .bashrc doesn't exist, create it
        await fs.writeFile(bashrcPath, sourceCommand);
        
        return {
          success: true,
          message: 'Created .bashrc with ZeamiTerm integration',
          scriptPath: targetPath
        };
      }
    } catch (error) {
      console.error('[ShellIntegrationInstaller] Bash installation failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  async _installZsh() {
    try {
      // Ensure directories exist
      await this.ensureDirectories();
      
      // Copy integration script
      const sourcePath = path.join(this.scriptsDir, 'zsh-integration.sh');
      const targetPath = path.join(this.integrationDir, 'zsh-integration.sh');
      
      await fs.copyFile(sourcePath, targetPath);
      
      // Make executable
      await fs.chmod(targetPath, 0o755);
      
      // Check and update .zshrc
      const zshrcPath = path.join(os.homedir(), '.zshrc');
      const sourceCommand = `\n# ZeamiTerm Shell Integration\n[ -f "${targetPath}" ] && source "${targetPath}"\n`;
      
      try {
        const zshrcContent = await fs.readFile(zshrcPath, 'utf8');
        
        if (zshrcContent.includes('ZeamiTerm Shell Integration')) {
          console.log('[ShellIntegrationInstaller] Zsh integration already installed');
          return {
            success: true,
            message: 'Zsh integration already installed',
            alreadyInstalled: true
          };
        }
        
        // Append to .zshrc
        await fs.appendFile(zshrcPath, sourceCommand);
        
        return {
          success: true,
          message: 'Zsh integration installed successfully. Please restart your terminal or run: source ~/.zshrc',
          scriptPath: targetPath
        };
      } catch (error) {
        // .zshrc doesn't exist, create it
        await fs.writeFile(zshrcPath, sourceCommand);
        
        return {
          success: true,
          message: 'Created .zshrc with ZeamiTerm integration',
          scriptPath: targetPath
        };
      }
    } catch (error) {
      console.error('[ShellIntegrationInstaller] Zsh installation failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  async check(shellPath) {
    const shellName = path.basename(shellPath);
    const scriptPath = path.join(
      this.integrationDir,
      `${shellName}-integration.sh`
    );
    
    try {
      await fs.access(scriptPath);
      
      // Also check if it's sourced in shell rc file
      const rcFile = shellName === 'bash' ? '.bashrc' : '.zshrc';
      const rcPath = path.join(os.homedir(), rcFile);
      
      try {
        const rcContent = await fs.readFile(rcPath, 'utf8');
        const isSourced = rcContent.includes('ZeamiTerm Shell Integration');
        
        return {
          installed: true,
          sourced: isSourced,
          scriptPath
        };
      } catch (error) {
        return {
          installed: true,
          sourced: false,
          scriptPath
        };
      }
    } catch (error) {
      return {
        installed: false,
        sourced: false
      };
    }
  }
  
  async uninstall(shellPath) {
    const shellName = path.basename(shellPath);
    
    try {
      // Remove script
      const scriptPath = path.join(
        this.integrationDir,
        `${shellName}-integration.sh`
      );
      
      await fs.unlink(scriptPath);
      
      // Remove from rc file
      const rcFile = shellName === 'bash' ? '.bashrc' : '.zshrc';
      const rcPath = path.join(os.homedir(), rcFile);
      
      try {
        let rcContent = await fs.readFile(rcPath, 'utf8');
        
        // Remove ZeamiTerm section
        const lines = rcContent.split('\n');
        const filteredLines = [];
        let inZeamiSection = false;
        
        for (const line of lines) {
          if (line.includes('# ZeamiTerm Shell Integration')) {
            inZeamiSection = true;
            continue;
          }
          if (inZeamiSection && line.includes('source') && line.includes('zeamiterm')) {
            inZeamiSection = false;
            continue;
          }
          if (!inZeamiSection) {
            filteredLines.push(line);
          }
        }
        
        await fs.writeFile(rcPath, filteredLines.join('\n'));
        
        return {
          success: true,
          message: `${shellName} integration removed successfully`
        };
      } catch (error) {
        return {
          success: true,
          message: 'Script removed but could not update rc file'
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = { ShellIntegrationInstaller };