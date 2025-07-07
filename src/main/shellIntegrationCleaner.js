/**
 * Shell Integration Cleaner
 * Removes shell integration from user's system once
 */

const fs = require('fs').promises;
const path = require('path');
const os = require('os');

class ShellIntegrationCleaner {
  constructor() {
    this.homeDir = os.homedir();
    this.cleanedFlagFile = path.join(this.homeDir, '.config', 'zeami-term', '.shell-integration-cleaned');
  }

  async hasAlreadyCleaned() {
    try {
      await fs.access(this.cleanedFlagFile);
      return true;
    } catch {
      return false;
    }
  }

  async markAsCleaned() {
    try {
      const dir = path.dirname(this.cleanedFlagFile);
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(this.cleanedFlagFile, new Date().toISOString());
    } catch (error) {
      console.error('[ShellIntegrationCleaner] Failed to mark as cleaned:', error);
    }
  }

  async cleanShellConfig(configFile) {
    try {
      const content = await fs.readFile(configFile, 'utf8');
      let modified = content;
      
      // Remove ZeamiTerm integration blocks
      // Pattern: from "# Added on YYYY-MM-DD" to the closing "fi"
      modified = modified.replace(/# Added on \d{4}-\d{2}-\d{2}.*?\nif \[ -z "\${ZEAMI_TERM_INTEGRATED\+x\}" \]; then[\s\S]*?\nfi/gm, '');
      
      // Remove standalone ZEAMI_TERM_INTEGRATED blocks
      modified = modified.replace(/if \[ -z "\${ZEAMI_TERM_INTEGRATED\+x\}" \]; then[\s\S]*?\nfi/gm, '');
      
      // Remove other ZeamiTerm related lines
      const patterns = [
        /.*ZEAMI_TERM_INTEGRATED.*\n/g,
        /.*zeami-term\/shell-integration.*\n/g,
        /# ZeamiTerm Shell Integration.*\n/g,
        /.*precmd_zeami.*\n/g,
        /.*preexec_zeami.*\n/g,
        /.*OSC 133.*zeami.*\n/g,
        /.*PROMPT_COMMAND.*zeami.*\n/g
      ];
      
      for (const pattern of patterns) {
        modified = modified.replace(pattern, '');
      }
      
      // Clean up multiple consecutive empty lines
      modified = modified.replace(/\n\n\n+/g, '\n\n');
      
      // Remove trailing whitespace
      modified = modified.replace(/[ \t]+$/gm, '');
      
      if (modified !== content) {
        // Create backup
        const backupFile = `${configFile}.zeami-backup-${Date.now()}`;
        await fs.writeFile(backupFile, content);
        console.log(`[ShellIntegrationCleaner] Created backup: ${backupFile}`);
        
        // Write cleaned content
        await fs.writeFile(configFile, modified);
        console.log(`[ShellIntegrationCleaner] Cleaned ${configFile}`);
        return true;
      }
      
      return false;
    } catch (error) {
      if (error.code !== 'ENOENT') {
        console.error(`[ShellIntegrationCleaner] Error cleaning ${configFile}:`, error);
      }
      return false;
    }
  }

  async removeIntegrationFiles() {
    const filesToRemove = [
      path.join(this.homeDir, 'Library', 'Application Support', 'zeami-term', 'shell-integration'),
      path.join(this.homeDir, '.config', 'zeami-term', 'shell-integration.zsh'),
      path.join(this.homeDir, '.config', 'zeami-term', 'shell-integration.bash'),
      path.join(this.homeDir, '.config', 'zeami-term', 'shell-integration')
    ];
    
    for (const file of filesToRemove) {
      try {
        const stats = await fs.stat(file);
        if (stats.isDirectory()) {
          await fs.rm(file, { recursive: true, force: true });
          console.log(`[ShellIntegrationCleaner] Removed directory: ${file}`);
        } else {
          await fs.unlink(file);
          console.log(`[ShellIntegrationCleaner] Removed file: ${file}`);
        }
      } catch (error) {
        // Ignore if file doesn't exist
        if (error.code !== 'ENOENT') {
          console.error(`[ShellIntegrationCleaner] Error removing ${file}:`, error);
        }
      }
    }
  }

  async detectShellIntegration() {
    const shellConfigs = [
      path.join(this.homeDir, '.zshrc'),
      path.join(this.homeDir, '.bashrc'),
      path.join(this.homeDir, '.profile'),
      path.join(this.homeDir, '.bash_profile')
    ];
    
    for (const config of shellConfigs) {
      try {
        const content = await fs.readFile(config, 'utf8');
        if (content.includes('ZEAMI_TERM_INTEGRATED') || 
            content.includes('zeami-term/shell-integration')) {
          return true;
        }
      } catch {
        // File doesn't exist, continue
      }
    }
    
    // Check for integration files
    const integrationPath = path.join(this.homeDir, 'Library', 'Application Support', 'zeami-term', 'shell-integration');
    try {
      await fs.access(integrationPath);
      return true;
    } catch {
      // Directory doesn't exist
    }
    
    return false;
  }
  
  async clean(showDialog = true) {
    // Check if already cleaned
    if (await this.hasAlreadyCleaned()) {
      console.log('[ShellIntegrationCleaner] Shell integration already cleaned, skipping...');
      return { cleaned: false, userCancelled: false, alreadyCleaned: true };
    }
    
    // Check if shell integration exists
    const hasIntegration = await this.detectShellIntegration();
    if (!hasIntegration) {
      console.log('[ShellIntegrationCleaner] No shell integration detected');
      await this.markAsCleaned();
      return { cleaned: false, userCancelled: false, alreadyCleaned: false };
    }
    
    // Ask user for confirmation if requested
    if (showDialog) {
      const { dialog } = require('electron');
      const result = await dialog.showMessageBox({
        type: 'question',
        buttons: ['削除する', 'キャンセル'],
        defaultId: 0,
        cancelId: 1,
        title: 'シェル統合の削除',
        message: 'ZeamiTermのシェル統合を削除しますか？',
        detail: '以前のバージョンでインストールされたシェル統合機能を削除します。\n' +
                'これにより、OSC 133によるコマンド追跡機能が無効になります。\n\n' +
                '削除される内容:\n' +
                '• ~/.zshrc, ~/.bashrc の設定\n' +
                '• ~/Library/Application Support/zeami-term/shell-integration'
      });
      
      if (result.response === 1) {
        console.log('[ShellIntegrationCleaner] User cancelled cleanup');
        return { cleaned: false, userCancelled: true, alreadyCleaned: false };
      }
    }

    console.log('[ShellIntegrationCleaner] Starting shell integration cleanup...');
    
    let cleaned = false;
    const cleanedFiles = [];
    const errors = [];
    
    // Clean shell config files
    const shellConfigs = [
      path.join(this.homeDir, '.zshrc'),
      path.join(this.homeDir, '.bashrc'),
      path.join(this.homeDir, '.profile'),
      path.join(this.homeDir, '.bash_profile')
    ];
    
    for (const config of shellConfigs) {
      try {
        if (await this.cleanShellConfig(config)) {
          cleaned = true;
          cleanedFiles.push(config);
        }
      } catch (error) {
        errors.push(`${config}: ${error.message}`);
      }
    }
    
    // Remove integration files
    try {
      await this.removeIntegrationFiles();
      cleaned = true;
    } catch (error) {
      errors.push(`Integration files: ${error.message}`);
    }
    
    // Mark as cleaned
    await this.markAsCleaned();
    
    // Show result dialog
    if (showDialog) {
      const { dialog } = require('electron');
      if (cleaned) {
        await dialog.showMessageBox({
          type: 'info',
          buttons: ['OK'],
          title: '削除完了',
          message: 'シェル統合の削除が完了しました',
          detail: `以下のファイルから設定を削除しました:\n\n` +
                  cleanedFiles.map(f => `• ${f}`).join('\n') +
                  (errors.length > 0 ? `\n\nエラー:\n${errors.join('\n')}` : '')
        });
      } else if (errors.length > 0) {
        await dialog.showMessageBox({
          type: 'error',
          buttons: ['OK'],
          title: 'エラー',
          message: 'シェル統合の削除中にエラーが発生しました',
          detail: errors.join('\n')
        });
      }
    }
    
    if (cleaned) {
      console.log('[ShellIntegrationCleaner] Shell integration cleanup completed successfully');
    } else {
      console.log('[ShellIntegrationCleaner] No shell integration found to clean');
    }
    
    return { cleaned, userCancelled: false, alreadyCleaned: false, cleanedFiles, errors };
  }
}

module.exports = { ShellIntegrationCleaner };