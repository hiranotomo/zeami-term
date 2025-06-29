/**
 * Update Notifier UI Component
 * Shows update progress and notifications in the terminal
 */

class UpdateNotifier {
  constructor() {
    this.notificationContainer = null;
    this.progressBar = null;
    this.statusText = null;
    this.isVisible = false;
    
    this.createNotificationUI();
    this.setupEventListeners();
  }
  
  createNotificationUI() {
    // Create notification container
    this.notificationContainer = document.createElement('div');
    this.notificationContainer.className = 'update-notification';
    this.notificationContainer.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: #2d2d30;
      border: 1px solid #007acc;
      border-radius: 4px;
      padding: 15px;
      min-width: 300px;
      max-width: 400px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      z-index: 10000;
      display: none;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    `;
    
    // Create close button
    const closeButton = document.createElement('button');
    closeButton.innerHTML = '×';
    closeButton.style.cssText = `
      position: absolute;
      top: 5px;
      right: 5px;
      background: none;
      border: none;
      color: #cccccc;
      font-size: 20px;
      cursor: pointer;
      padding: 5px;
      line-height: 1;
    `;
    closeButton.onclick = () => this.hide();
    
    // Create title
    const title = document.createElement('h4');
    title.textContent = 'アップデート';
    title.style.cssText = `
      margin: 0 0 10px 0;
      color: #ffffff;
      font-size: 14px;
      font-weight: 600;
    `;
    
    // Create status text
    this.statusText = document.createElement('p');
    this.statusText.style.cssText = `
      margin: 0 0 10px 0;
      color: #cccccc;
      font-size: 13px;
    `;
    
    // Create progress bar container
    const progressContainer = document.createElement('div');
    progressContainer.style.cssText = `
      background: #1e1e1e;
      border-radius: 3px;
      height: 6px;
      overflow: hidden;
      margin: 10px 0;
      display: none;
    `;
    
    // Create progress bar
    this.progressBar = document.createElement('div');
    this.progressBar.style.cssText = `
      background: #007acc;
      height: 100%;
      width: 0%;
      transition: width 0.3s ease;
    `;
    progressContainer.appendChild(this.progressBar);
    
    // Create action buttons container
    this.actionButtons = document.createElement('div');
    this.actionButtons.style.cssText = `
      display: flex;
      gap: 10px;
      margin-top: 10px;
    `;
    
    // Assemble notification
    this.notificationContainer.appendChild(closeButton);
    this.notificationContainer.appendChild(title);
    this.notificationContainer.appendChild(this.statusText);
    this.notificationContainer.appendChild(progressContainer);
    this.notificationContainer.appendChild(this.actionButtons);
    
    // Store progress container reference
    this.progressContainer = progressContainer;
    
    // Add to body
    document.body.appendChild(this.notificationContainer);
  }
  
  setupEventListeners() {
    // Listen for update events from main process
    if (window.electronAPI && window.electronAPI.onUpdateStatus) {
      window.electronAPI.onUpdateStatus((event, data) => {
      switch (event) {
        case 'checking-for-update':
          this.showStatus('アップデートを確認中...');
          break;
          
        case 'update-available':
          this.showUpdateAvailable(data);
          break;
          
        case 'update-not-available':
          this.showStatus('最新バージョンを使用しています', 3000);
          break;
          
        case 'update-error':
          this.showError(data);
          break;
          
        case 'download-progress':
          this.showDownloadProgress(data);
          break;
          
        case 'update-downloaded':
          this.showUpdateReady(data);
          break;
      }
      });
    }
  }
  
  show() {
    this.notificationContainer.style.display = 'block';
    this.isVisible = true;
    
    // Add fade-in animation
    this.notificationContainer.style.opacity = '0';
    setTimeout(() => {
      this.notificationContainer.style.transition = 'opacity 0.3s ease';
      this.notificationContainer.style.opacity = '1';
    }, 10);
  }
  
  hide() {
    this.notificationContainer.style.opacity = '0';
    setTimeout(() => {
      this.notificationContainer.style.display = 'none';
      this.isVisible = false;
    }, 300);
  }
  
  showStatus(message, autoHideDelay = 0) {
    this.statusText.textContent = message;
    this.progressContainer.style.display = 'none';
    this.actionButtons.innerHTML = '';
    this.show();
    
    if (autoHideDelay > 0) {
      setTimeout(() => this.hide(), autoHideDelay);
    }
  }
  
  showUpdateAvailable(info) {
    this.statusText.textContent = `新しいバージョン ${info.version} が利用可能です`;
    this.progressContainer.style.display = 'none';
    this.actionButtons.innerHTML = '';
    
    // Note: Download dialog is handled by main process
    this.show();
  }
  
  showDownloadProgress(progressObj) {
    const { percent, bytesPerSecond, transferred, total } = progressObj;
    
    this.statusText.textContent = `ダウンロード中... ${Math.round(percent)}%`;
    this.progressContainer.style.display = 'block';
    this.progressBar.style.width = percent + '%';
    
    // Show speed and size
    const speed = (bytesPerSecond / 1024 / 1024).toFixed(1);
    const downloadedMB = (transferred / 1024 / 1024).toFixed(1);
    const totalMB = (total / 1024 / 1024).toFixed(1);
    
    this.statusText.textContent += ` (${downloadedMB}/${totalMB} MB - ${speed} MB/s)`;
    
    this.show();
  }
  
  showUpdateReady(info) {
    this.statusText.textContent = `バージョン ${info.version} の準備が完了しました`;
    this.progressContainer.style.display = 'none';
    this.actionButtons.innerHTML = '';
    
    // Note: Restart dialog is handled by main process
    this.show();
  }
  
  showError(errorMessage) {
    this.statusText.textContent = `エラー: ${errorMessage}`;
    this.statusText.style.color = '#f48771';
    this.progressContainer.style.display = 'none';
    this.actionButtons.innerHTML = '';
    
    this.show();
    
    // Reset color after delay
    setTimeout(() => {
      this.statusText.style.color = '#cccccc';
    }, 5000);
  }
}

// Export for use in main terminal manager
window.UpdateNotifier = UpdateNotifier;