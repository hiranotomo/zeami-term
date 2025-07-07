/**
 * ShellIntegrationSetup - UI component for shell integration setup
 */

export class ShellIntegrationSetup {
  constructor() {
    this.container = null;
    this.onClose = null;
  }

  async show(shellPath) {
    // DISABLED: Shell integration is no longer supported
    console.log('[ShellIntegrationSetup] Shell integration is disabled');
    return { action: 'skip' };
    
    /* Original code disabled
    // Check if integration is already installed
    const checkResult = await window.api.shellIntegration.check(shellPath);
    
    if (checkResult.success && checkResult.installed) {
      return { action: 'already_installed' };
    }

    return new Promise((resolve) => {
      this.createDialog(shellPath, resolve);
    });
    */
  }

  createDialog(shellPath, resolve) {
    // Create overlay
    const overlay = document.createElement('div');
    overlay.className = 'shell-integration-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
    `;

    // Create dialog
    const dialog = document.createElement('div');
    dialog.className = 'shell-integration-dialog';
    dialog.style.cssText = `
      background-color: var(--vscode-editor-background);
      color: var(--vscode-editor-foreground);
      border: 1px solid var(--vscode-panel-border);
      border-radius: 4px;
      padding: 20px;
      width: 500px;
      max-width: 90%;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
    `;

    const shellName = shellPath.split('/').pop();
    
    dialog.innerHTML = `
      <h2 style="margin-top: 0; color: var(--vscode-editor-foreground);">Enable Shell Integration</h2>
      <p>ZeamiTerm can enhance your shell experience with command tracking and better integration.</p>
      
      <div style="background-color: var(--vscode-textBlockQuote-background); padding: 10px; border-radius: 4px; margin: 15px 0;">
        <p style="margin: 0; font-size: 0.9em;">Shell integration for <strong>${shellName}</strong> will provide:</p>
        <ul style="margin: 5px 0; padding-left: 20px; font-size: 0.9em;">
          <li>Command execution tracking</li>
          <li>Exit code visualization</li>
          <li>Command duration measurement</li>
          <li>Enhanced navigation (Ctrl+Up/Down)</li>
        </ul>
      </div>
      
      <div class="integration-options" style="margin: 15px 0;">
        <label style="display: flex; align-items: center; margin-bottom: 10px; cursor: pointer;">
          <input type="radio" name="integration-method" value="permanent" checked style="margin-right: 8px;">
          <div>
            <strong>Install permanently</strong>
            <div style="font-size: 0.85em; opacity: 0.8;">Adds integration to your shell configuration file</div>
          </div>
        </label>
        <label style="display: flex; align-items: center; cursor: pointer;">
          <input type="radio" name="integration-method" value="session" style="margin-right: 8px;">
          <div>
            <strong>This session only</strong>
            <div style="font-size: 0.85em; opacity: 0.8;">Integration will be active until you close this terminal</div>
          </div>
        </label>
      </div>
      
      <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 20px;">
        <button class="never-btn" style="
          background-color: transparent;
          color: var(--vscode-textLink-foreground);
          border: none;
          padding: 6px 0;
          cursor: pointer;
          text-decoration: underline;
          font-size: 0.9em;
        ">Don't ask again</button>
        <div style="display: flex; gap: 10px;">
          <button class="cancel-btn" style="
            background-color: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
            border: none;
            padding: 6px 14px;
            border-radius: 2px;
            cursor: pointer;
          ">Skip</button>
          <button class="install-btn" style="
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 6px 14px;
            border-radius: 2px;
            cursor: pointer;
          ">Enable</button>
        </div>
      </div>
    `;

    // Add event listeners
    const cancelBtn = dialog.querySelector('.cancel-btn');
    const installBtn = dialog.querySelector('.install-btn');
    const neverBtn = dialog.querySelector('.never-btn');
    
    cancelBtn.addEventListener('click', () => {
      overlay.remove();
      resolve({ action: 'skip' });
    });
    
    neverBtn.addEventListener('click', () => {
      overlay.remove();
      resolve({ action: 'never' });
    });

    installBtn.addEventListener('click', async () => {
      const checkedInput = dialog.querySelector('input[name="integration-method"]:checked');
      const method = checkedInput ? checkedInput.value : 'session';
      
      if (method === 'permanent') {
        // Install permanently
        const installResult = await window.api.shellIntegration.install(shellPath);
        overlay.remove();
        
        if (installResult.success && installResult.installed) {
          this.showSuccessNotification(installResult.rcFile);
          resolve({ action: 'installed', method: 'permanent', rcFile: installResult.rcFile });
        } else {
          this.showErrorNotification(installResult.reason || 'Installation failed');
          resolve({ action: 'failed', reason: installResult.reason });
        }
      } else {
        // Session only
        overlay.remove();
        resolve({ action: 'session_only' });
      }
    });

    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    // Focus on install button
    installBtn.focus();
  }

  showSuccessNotification(rcFile) {
    const notification = document.createElement('div');
    notification.className = 'shell-integration-notification success';
    notification.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      background-color: var(--vscode-notificationCenterHeader-background);
      color: var(--vscode-notificationCenterHeader-foreground);
      padding: 12px 16px;
      border-radius: 4px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
      max-width: 400px;
      z-index: 10001;
      display: flex;
      align-items: center;
      gap: 10px;
    `;

    notification.innerHTML = `
      <span style="color: #4ec9b0;">✓</span>
      <div>
        <strong>Shell integration installed!</strong>
        <div style="font-size: 0.85em; opacity: 0.8; margin-top: 2px;">
          Added to ${rcFile}. Restart your shell or source the file to activate.
        </div>
      </div>
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
      notification.style.opacity = '0';
      notification.style.transition = 'opacity 0.3s';
      setTimeout(() => notification.remove(), 300);
    }, 5000);
  }

  showErrorNotification(reason) {
    const notification = document.createElement('div');
    notification.className = 'shell-integration-notification error';
    notification.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      background-color: var(--vscode-notificationCenterHeader-background);
      color: var(--vscode-notificationCenterHeader-foreground);
      padding: 12px 16px;
      border-radius: 4px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
      max-width: 400px;
      z-index: 10001;
      display: flex;
      align-items: center;
      gap: 10px;
    `;

    notification.innerHTML = `
      <span style="color: #f48771;">✗</span>
      <div>
        <strong>Installation failed</strong>
        <div style="font-size: 0.85em; opacity: 0.8; margin-top: 2px;">
          ${reason === 'write_error' ? 'Could not write to shell configuration file' : 
            reason === 'no_rc_file' ? 'Shell configuration file not found' : 
            'Unknown error occurred'}
        </div>
      </div>
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
      notification.style.opacity = '0';
      notification.style.transition = 'opacity 0.3s';
      setTimeout(() => notification.remove(), 300);
    }, 5000);
  }
}