/**
 * Auto Updater Module for ZeamiTerm
 * Handles automatic updates using electron-updater
 */

const { autoUpdater } = require('electron-updater');
const { dialog, BrowserWindow, app } = require('electron');
const log = require('electron-log');

class AutoUpdaterManager {
  constructor() {
    this.mainWindow = null;
    this.updateAvailable = false;
    this.downloadProgress = 0;
    this.isEnabled = false; // Disabled by default until properly configured
    
    // Configure logger
    log.transports.file.level = 'info';
    autoUpdater.logger = log;
    
    // Check if auto-update should be enabled
    this.checkIfEnabled();
    
    if (this.isEnabled) {
      // Disable auto download - we'll control when to download
      autoUpdater.autoDownload = false;
      autoUpdater.autoInstallOnAppQuit = true;
      
      this.setupEventHandlers();
    }
  }
  
  checkIfEnabled() {
    // Don't enable in development
    if (process.env.NODE_ENV === 'development') {
      log.info('Auto-update disabled in development mode');
      return;
    }
    
    // Check if publish configuration exists in package.json
    try {
      const packageInfo = require('../../package.json');
      
      // Only enable if repository is properly configured
      if (packageInfo.repository && packageInfo.repository.url) {
        const repoUrl = packageInfo.repository.url;
        // Check if it's a real repository URL, not a placeholder
        if (repoUrl.includes('github.com') && !repoUrl.includes('your-github-username')) {
          this.isEnabled = true;
          log.info('Auto-update enabled');
        } else {
          log.info('Auto-update disabled: repository not configured');
        }
      } else {
        log.info('Auto-update disabled: no repository information in package.json');
      }
    } catch (error) {
      log.info('Auto-update disabled: configuration not found');
    }
  }
  
  setMainWindow(window) {
    this.mainWindow = window;
  }
  
  setupEventHandlers() {
    // Check for update available
    autoUpdater.on('checking-for-update', () => {
      log.info('Checking for update...');
      this.sendStatusToWindow('checking-for-update');
    });
    
    // Update available
    autoUpdater.on('update-available', (info) => {
      log.info('Update available:', info);
      this.updateAvailable = true;
      this.sendStatusToWindow('update-available', info);
      
      // Show update available dialog
      const response = dialog.showMessageBoxSync(this.mainWindow, {
        type: 'info',
        title: 'アップデートが利用可能',
        message: `新しいバージョン ${info.version} が利用可能です。現在のバージョンは ${autoUpdater.currentVersion} です。`,
        detail: 'ダウンロードしてインストールしますか？',
        buttons: ['ダウンロード', '後で'],
        defaultId: 0,
        cancelId: 1
      });
      
      if (response === 0) {
        autoUpdater.downloadUpdate();
      }
    });
    
    // No update available
    autoUpdater.on('update-not-available', (info) => {
      log.info('Update not available');
      this.sendStatusToWindow('update-not-available', info);
    });
    
    // Error
    autoUpdater.on('error', (err) => {
      log.error('Update error:', err);
      this.sendStatusToWindow('update-error', err.message);
    });
    
    // Download progress
    autoUpdater.on('download-progress', (progressObj) => {
      this.downloadProgress = progressObj.percent;
      log.info('Download progress:', progressObj);
      this.sendStatusToWindow('download-progress', progressObj);
    });
    
    // Update downloaded
    autoUpdater.on('update-downloaded', (info) => {
      log.info('Update downloaded:', info);
      this.sendStatusToWindow('update-downloaded', info);
      
      const response = dialog.showMessageBoxSync(this.mainWindow, {
        type: 'info',
        title: 'アップデート準備完了',
        message: 'アップデートがダウンロードされました。',
        detail: 'アプリケーションを再起動してアップデートを適用しますか？',
        buttons: ['今すぐ再起動', '後で'],
        defaultId: 0,
        cancelId: 1
      });
      
      if (response === 0) {
        setImmediate(() => autoUpdater.quitAndInstall());
      }
    });
  }
  
  sendStatusToWindow(event, data = null) {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('update-status', { event, data });
    }
  }
  
  checkForUpdates() {
    if (!this.isEnabled) {
      log.info('Auto-update is disabled');
      return;
    }
    
    autoUpdater.checkForUpdates().catch(err => {
      log.error('Failed to check for updates:', err);
    });
  }
  
  checkForUpdatesManually() {
    if (!this.isEnabled) {
      dialog.showMessageBox(this.mainWindow, {
        type: 'info',
        title: 'アップデート機能',
        message: 'アップデート機能はまだ設定されていません。',
        detail: 'GitHubリポジトリを作成し、package.jsonにrepository情報を追加してください。',
        buttons: ['OK']
      });
      return;
    }
    
    autoUpdater.checkForUpdates().catch(err => {
      log.error('Manual update check failed:', err);
      dialog.showErrorBox(
        'アップデート確認エラー',
        'アップデートの確認に失敗しました。\n' + err.message
      );
    });
  }
  
  getUpdateInfo() {
    return {
      currentVersion: autoUpdater.currentVersion,
      updateAvailable: this.updateAvailable,
      downloadProgress: this.downloadProgress
    };
  }
}

module.exports = AutoUpdaterManager;