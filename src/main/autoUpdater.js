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
    this.isEnabled = false; // Will be enabled after checkIfEnabled()
    this.checkInterval = null;
    this.CHECK_INTERVAL = 2 * 60 * 60 * 1000; // 2 hours in milliseconds
    
    // Configure logger
    log.transports.file.level = 'info';
    autoUpdater.logger = log;
    
    // Check if auto-update should be enabled
    this.checkIfEnabled();
    
    if (this.isEnabled) {
      // Configure for GitHub releases from private repository
      // GitHub allows public releases even from private repos
      autoUpdater.setFeedURL({
        provider: 'github',
        owner: 'hiranotomo',
        repo: 'zeami-term',
        // No token needed for public releases
        // Auto-updater will fetch from: https://github.com/hiranotomo/zeami-term/releases
      });
      
      // Disable auto download - we'll control when to download
      autoUpdater.autoDownload = false;
      autoUpdater.autoInstallOnAppQuit = true;
      
      this.setupEventHandlers();
    }
  }
  
  
  checkIfEnabled() {
    // Enable auto-update for production builds
    if (app.isPackaged) {
      this.isEnabled = true;
      log.info('Auto-update enabled for packaged app');
      return;
    }
    
    // Enable in development if UPDATE_TEST environment variable is set
    if (process.env.UPDATE_TEST === 'true') {
      this.isEnabled = true;
      log.info('Auto-update enabled in development mode for testing');
      return;
    }
    
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
      
      // Check if it's a security update
      const isSecurity = info.releaseNotes && 
        (info.releaseNotes.toLowerCase().includes('security') ||
         info.releaseNotes.toLowerCase().includes('vulnerability'));
      
      
      // Show update available dialog with release notes
      let detail = 'ダウンロードしてインストールしますか？';
      if (info.releaseNotes) {
        detail = `更新内容:\n${info.releaseNotes}\n\nダウンロードしてインストールしますか？`;
      }
      
      const response = dialog.showMessageBoxSync(this.mainWindow, {
        type: 'info',
        title: 'アップデートが利用可能',
        message: `新しいバージョン ${info.version} が利用可能です。現在のバージョンは ${app.getVersion()} です。`,
        detail: detail,
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
      
      // Update progress in main window if visible
      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
        this.mainWindow.setProgressBar(progressObj.percent / 100);
      }
    });
    
    // Update downloaded
    autoUpdater.on('update-downloaded', (info) => {
      log.info('Update downloaded:', info);
      this.sendStatusToWindow('update-downloaded', info);
      
      // Clear progress bar
      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
        this.mainWindow.setProgressBar(-1);
      }
      
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
    
    // Force check in development with UPDATE_TEST environment variable
    if (process.env.UPDATE_TEST === 'true') {
      log.info('Force checking for updates in development mode');
      autoUpdater.autoDownload = false;
      autoUpdater.forceDevUpdateConfig = true;
    }
    
    autoUpdater.checkForUpdates().catch(err => {
      log.error('Failed to check for updates:', err);
    });
  }
  
  checkForUpdatesManually() {
    if (!this.isEnabled && process.env.UPDATE_TEST !== 'true') {
      dialog.showMessageBox(this.mainWindow, {
        type: 'info',
        title: 'アップデート機能',
        message: '開発環境では自動アップデートは無効です。',
        detail: 'ビルドされたアプリケーションでのみ動作します。',
        buttons: ['OK']
      });
      return;
    }
    
    // Force enable for testing
    if (process.env.UPDATE_TEST === 'true') {
      log.info('Force checking for updates in test mode');
      this.isEnabled = true;
      autoUpdater.forceDevUpdateConfig = true;
    }
    
    autoUpdater.checkForUpdates().catch(err => {
      log.error('Manual update check failed:', err);
      
      // More informative error messages
      let errorDetail = err.message;
      if (err.message.includes('ENOTFOUND')) {
        errorDetail = 'GitHubリポジトリが見つかりません。リポジトリが存在することを確認してください。';
      } else if (err.message.includes('404')) {
        errorDetail = 'リリースが見つかりません。GitHubでリリースを作成してください。';
      }
      
      dialog.showErrorBox(
        'アップデート確認エラー',
        'アップデートの確認に失敗しました。\n\n' + errorDetail
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
  
  startPeriodicChecks() {
    if (!this.isEnabled) {
      log.info('Auto-update is disabled, skipping periodic checks');
      return;
    }
    
    // Clear any existing interval
    this.stopPeriodicChecks();
    
    log.info('Starting periodic update checks (every 2 hours)');
    
    // Set up periodic check
    this.checkInterval = setInterval(() => {
      log.info('Performing periodic update check');
      this.checkForUpdates();
    }, this.CHECK_INTERVAL);
    
    // Also save the interval ID for cleanup
    this.checkInterval.unref(); // Don't keep the app running just for this timer
  }
  
  stopPeriodicChecks() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
      log.info('Stopped periodic update checks');
    }
  }
}

module.exports = AutoUpdaterManager;