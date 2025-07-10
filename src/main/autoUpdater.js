/**
 * Auto Updater Module for ZeamiTerm
 * Handles automatic updates using electron-updater
 */

const { autoUpdater } = require('electron-updater');
const { dialog, BrowserWindow, app, shell } = require('electron');
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
    log.transports.file.level = 'debug';
    log.transports.file.fileName = 'zeami-updater.log';
    log.transports.console.level = 'debug';
    autoUpdater.logger = log;
    
    // Log system info for debugging
    log.info('=== ZeamiTerm Auto-Updater Started ===');
    log.info(`App version: ${app.getVersion()}`);
    log.info(`Electron version: ${process.versions.electron}`);
    log.info(`Platform: ${process.platform} ${process.arch}`);
    log.info(`App path: ${app.getAppPath()}`);
    log.info(`Packaged: ${app.isPackaged}`);
    
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
    // Configure timeout for large files
    autoUpdater.requestHeaders = {
      'Cache-Control': 'no-cache'
    };
    
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
      let fullReleaseNotes = '';
      
      if (info.releaseNotes) {
        // Remove HTML tags and convert to plain text
        fullReleaseNotes = this.stripHtmlTags(info.releaseNotes);
        
        // Truncate if too long for dialog
        const maxLength = 500;
        if (fullReleaseNotes.length > maxLength) {
          detail = `更新内容:\n${fullReleaseNotes.substring(0, maxLength)}...\n\nダウンロードしてインストールしますか？`;
        } else {
          detail = `更新内容:\n${fullReleaseNotes}\n\nダウンロードしてインストールしますか？`;
        }
      }
      
      const buttons = fullReleaseNotes.length > 500 ? 
        ['ダウンロード', '詳細を見る', '後で'] : 
        ['ダウンロード', '後で'];
      
      const response = dialog.showMessageBoxSync(this.mainWindow, {
        type: 'info',
        title: 'アップデートが利用可能',
        message: `新しいバージョン ${info.version} が利用可能です。現在のバージョンは ${app.getVersion()} です。`,
        detail: detail,
        buttons: buttons,
        defaultId: 0,
        cancelId: buttons.length - 1
      });
      
      if (response === 0) {
        log.info('User chose to download update');
        autoUpdater.downloadUpdate().catch(err => {
          log.error('Download failed:', err);
          dialog.showErrorBox('ダウンロードエラー', `アップデートのダウンロードに失敗しました:\n${err.message}`);
        });
      } else if (buttons.length === 3 && response === 1) {
        // Show full release notes
        this.showReleaseNotesWindow(info.version, fullReleaseNotes);
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
      
      // Show more helpful error messages
      let errorMessage = 'アップデートエラー';
      let errorDetail = err.message;
      
      if (err.message.includes('net::') || err.message.includes('ETIMEDOUT') || err.message.includes('ECONNRESET')) {
        errorMessage = 'ネットワークエラー';
        errorDetail = 'ダウンロード中にネットワーク接続に問題が発生しました。\n\n' +
                     '以下をお試しください：\n' +
                     '• インターネット接続を確認する\n' +
                     '• しばらく待ってから再試行する\n' +
                     '• 手動でダウンロードする（GitHubリリースページから）';
      } else if (err.message.includes('ENOSPC')) {
        errorMessage = 'ディスク容量不足';
        errorDetail = 'アップデートファイルをダウンロードするための空き容量が不足しています。';
      }
      
      dialog.showErrorBox(errorMessage, errorDetail);
    });
    
    // Download progress
    autoUpdater.on('download-progress', (progressObj) => {
      this.downloadProgress = progressObj.percent;
      const speedInMB = (progressObj.bytesPerSecond / 1048576).toFixed(2);
      const transferredInMB = (progressObj.transferred / 1048576).toFixed(2);
      const totalInMB = (progressObj.total / 1048576).toFixed(2);
      
      log.info(`Download progress: ${progressObj.percent.toFixed(1)}% (${transferredInMB}MB / ${totalInMB}MB) at ${speedInMB}MB/s`);
      this.sendStatusToWindow('download-progress', progressObj);
      
      // Update progress in main window if visible
      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
        this.mainWindow.setProgressBar(progressObj.percent / 100);
        
        // Show download status in window title
        const originalTitle = this.mainWindow.getTitle();
        if (!originalTitle.includes('%')) {
          this.mainWindow.originalTitle = originalTitle;
        }
        this.mainWindow.setTitle(`${this.mainWindow.originalTitle || 'ZeamiTerm'} - ダウンロード中 ${progressObj.percent.toFixed(0)}%`);
      }
    });
    
    // Update downloaded
    autoUpdater.on('update-downloaded', (info) => {
      log.info('Update downloaded:', info);
      this.sendStatusToWindow('update-downloaded', info);
      
      // Clear progress bar and restore title
      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
        this.mainWindow.setProgressBar(-1);
        if (this.mainWindow.originalTitle) {
          this.mainWindow.setTitle(this.mainWindow.originalTitle);
        }
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
        log.info('User chose to restart and install update');
        try {
          // Force quit all windows first
          BrowserWindow.getAllWindows().forEach(window => {
            window.removeAllListeners('close');
            window.close();
          });
          
          // Call quitAndInstall with options
          setImmediate(() => {
            autoUpdater.quitAndInstall(false, true);
          });
        } catch (err) {
          log.error('Failed to quit and install:', err);
          dialog.showErrorBox('インストールエラー', `アップデートのインストールに失敗しました:\n${err.message}`);
        }
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
  
  stripHtmlTags(html) {
    // Remove HTML tags and decode entities
    return html
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\n\s*\n/g, '\n') // Remove extra newlines
      .trim();
  }
  
  showReleaseNotesWindow(version, releaseNotes) {
    const releaseWindow = new BrowserWindow({
      width: 800,
      height: 600,
      title: `バージョン ${version} リリースノート`,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true
      }
    });
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>リリースノート</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            padding: 20px;
            line-height: 1.6;
            color: #333;
          }
          h1 {
            color: #2c3e50;
            border-bottom: 2px solid #3498db;
            padding-bottom: 10px;
          }
          pre {
            background-color: #f4f4f4;
            padding: 15px;
            border-radius: 5px;
            overflow-x: auto;
          }
          .version {
            color: #3498db;
            font-weight: bold;
          }
        </style>
      </head>
      <body>
        <h1>ZeamiTerm <span class="version">v${version}</span> リリースノート</h1>
        <pre>${releaseNotes}</pre>
      </body>
      </html>
    `;
    
    releaseWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`);
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