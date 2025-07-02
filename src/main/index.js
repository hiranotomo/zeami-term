const { app, BrowserWindow, Menu, ipcMain, shell, dialog, Notification } = require('electron');
const path = require('path');
const { PtyService } = require('./ptyService');
const { SessionManager } = require('./sessionManager');
const AutoUpdaterManager = require('./autoUpdater');
const ZeamiErrorRecorder = require('./zeamiErrorRecorder');
const { TerminalProcessManager } = require('./terminalProcessManager');
const { MonitorWindow } = require('./monitorWindow');
const { MessageCenterWindow } = require('./messageCenterWindow');
const { MessageCenterService } = require('./services/MessageCenterService');
// const { PreferenceManager } = require('../features/preferences/PreferenceManager');

// Get version from package.json
const packageInfo = require('../../package.json');
const appVersion = packageInfo.version;

// Keep a global reference of the window object
let mainWindow;
let ptyService;
let sessionManager;
let autoUpdaterManager;
let errorRecorder;
let terminalProcessManager;
let monitorWindow;
let messageCenterWindow;
let messageCenterService;
// let preferenceManager;
const windows = new Set();

function createNewWindow() {
  const window = createWindow(false);
  windows.add(window);
  window.on('closed', () => {
    windows.delete(window);
  });
  return window;
}

function createWindow(isMain = true) {
  // Create the browser window with VS Code-like appearance
  const window = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 600,
    minHeight: 400,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true
    },
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    vibrancy: process.platform === 'darwin' ? 'sidebar' : undefined,
    transparent: process.platform === 'darwin' ? true : false,
    trafficLightPosition: process.platform === 'darwin' ? { x: 15, y: 15 } : undefined,
    title: `ZeamiTerm (ver.${appVersion})`,
    backgroundColor: process.platform === 'darwin' ? '#00000000' : '#1e1e1e',
    show: false,
    icon: path.join(__dirname, '../../assets/icon.png')
  });
  
  // Show window when ready to prevent visual flash
  window.once('ready-to-show', () => {
    window.show();
    // Open dev tools in development - Enable for debugging
    // Disabled by default - use menu to open
    // if (process.env.NODE_ENV !== 'production') {
    //   window.webContents.openDevTools();
    // }
  });

  // Load the index.html file
  window.loadFile(path.join(__dirname, '../renderer/index.html'));

  // Handle window closed
  // Handle window close event
  window.on('close', (e) => {
    e.preventDefault();
    
    const choice = dialog.showMessageBoxSync(window, {
      type: 'warning',
      buttons: ['キャンセル', '閉じる'],
      defaultId: 0,
      cancelId: 0,
      message: 'ウィンドウを閉じますか？',
      detail: '実行中のターミナルセッションが終了します。'
    });
    
    if (choice === 1) {
      window.destroy();
    }
  });
  
  window.on('closed', () => {
    if (isMain) {
      // Remove all event listeners from ptyService before nulling mainWindow
      if (ptyService) {
        ptyService.removeAllListeners();
      }
      mainWindow = null;
    }
  });
  
  // Track window state
  window.on('focus', () => {
    window.webContents.send('window:stateChange', { isFocused: true });
  });
  
  window.on('blur', () => {
    window.webContents.send('window:stateChange', { isFocused: false });
  });
  
  window.on('minimize', () => {
    window.webContents.send('window:stateChange', { isMinimized: true });
  });
  
  window.on('restore', () => {
    window.webContents.send('window:stateChange', { isMinimized: false });
  });
  
  if (isMain) {
    mainWindow = window;
  }
  
  return window;
}

// Setup IPC handlers
function setupIpcHandlers() {
  // File save handler
  ipcMain.handle('file:save', async (event, { content, defaultFilename, filters }) => {
    try {
      const result = await dialog.showSaveDialog(mainWindow, {
        defaultPath: defaultFilename,
        filters: filters || [
          { name: 'All Files', extensions: ['*'] }
        ]
      });
      
      if (!result.canceled && result.filePath) {
        const fs = require('fs').promises;
        await fs.writeFile(result.filePath, content, 'utf8');
        return { success: true, path: result.filePath };
      }
      
      return { success: false, canceled: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Create new terminal session
  ipcMain.handle('terminal:create', async (event, options) => {
    try {
      console.log('[Main] Creating terminal with options:', options);
      const result = await ptyService.createProcess(options);
      console.log('[Main] Terminal created:', result);
      return { success: true, ...result };
    } catch (error) {
      console.error('[Main] Failed to create terminal:', error);
      return { success: false, error: error.message };
    }
  });
  
  // Send input to terminal
  ipcMain.handle('terminal:input', async (event, { id, data }) => {
    try {
      ptyService.writeToProcess(id, data);
      return { success: true };
    } catch (error) {
      console.error('[Main] Failed to send input:', error);
      return { success: false, error: error.message };
    }
  });
  
  // Resize terminal
  ipcMain.handle('terminal:resize', async (event, { id, cols, rows }) => {
    try {
      ptyService.resizeProcess(id, cols, rows);
      return { success: true };
    } catch (error) {
      console.error('[Main] Failed to resize terminal:', error);
      return { success: false, error: error.message };
    }
  });
  
  // Kill terminal
  ipcMain.handle('terminal:kill', async (event, { id }) => {
    try {
      ptyService.killProcess(id);
      return { success: true };
    } catch (error) {
      console.error('[Main] Failed to kill terminal:', error);
      return { success: false, error: error.message };
    }
  });
  
  // Handle data from PTY to renderer
  ptyService.on('data', ({ id, data }) => {
    console.log(`[Main] Sending PTY data to renderer: id=${id}, length=${data.length}`);
    
    
    // Send to all windows
    BrowserWindow.getAllWindows().forEach(win => {
      if (!win.isDestroyed()) {
        win.webContents.send('terminal:data', { id, data });
      }
    });
  });
  
  // Handle PTY exit
  ptyService.on('exit', ({ id, code, signal, error }) => {
    // Send to all windows
    BrowserWindow.getAllWindows().forEach(win => {
      if (!win.isDestroyed()) {
        win.webContents.send('terminal:exit', { id, code, signal, error });
      }
    });
  });
  
  // Create new window
  ipcMain.on('create-new-window', () => {
    createNewWindow();
  });
  
  // Handle menu actions from main process
  ipcMain.on('menu-action', (event, action) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('menu-action', action);
    }
  });
  
  // Session management handlers
  ipcMain.handle('session:save', async (event, sessionData) => {
    try {
      const success = sessionManager.saveSession(sessionData);
      return { success };
    } catch (error) {
      console.error('[Main] Failed to save session:', error);
      return { success: false, error: error.message };
    }
  });
  
  ipcMain.handle('session:load', async (event) => {
    try {
      const session = sessionManager.loadSession();
      return { success: true, session };
    } catch (error) {
      console.error('[Main] Failed to load session:', error);
      return { success: false, error: error.message };
    }
  });
  
  ipcMain.handle('session:clear', async (event) => {
    try {
      const success = sessionManager.clearSession();
      return { success };
    } catch (error) {
      console.error('[Main] Failed to clear session:', error);
      return { success: false, error: error.message };
    }
  });
  
  // Handle error recording
  ipcMain.handle('record-error', async (event, errorData) => {
    try {
      if (errorRecorder) {
        await errorRecorder.recordError(errorData);
        return { success: true };
      } else {
        console.warn('Error recorder not initialized');
        return { success: false, error: 'Error recorder not initialized' };
      }
    } catch (error) {
      console.error('[Main] Failed to record error:', error);
      return { success: false, error: error.message };
    }
  });
  
  // Handle fullscreen toggle
  ipcMain.on('toggle-fullscreen', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.setFullScreen(!mainWindow.isFullScreen());
    }
  });
  
  // Monitor window handlers
  ipcMain.on('monitor:open', () => {
    if (monitorWindow) {
      monitorWindow.create();
    }
  });
  
  ipcMain.on('monitor:request-history', (event) => {
    // History is automatically sent when window is created
    // This is handled in MonitorWindow class
  });
  
  // Profile management handlers
  ipcMain.handle('profiles:get', async () => {
    try {
      return {
        profiles: terminalProcessManager.getProfiles(),
        defaultProfileId: terminalProcessManager.getDefaultProfile()?.id
      };
    } catch (error) {
      console.error('[Main] Failed to get profiles:', error);
      return { profiles: [], defaultProfileId: null };
    }
  });
  
  ipcMain.handle('profiles:add', async (event, profile) => {
    try {
      const newProfile = await terminalProcessManager.addProfile(profile);
      return { success: true, profile: newProfile };
    } catch (error) {
      console.error('[Main] Failed to add profile:', error);
      return { success: false, error: error.message };
    }
  });
  
  ipcMain.handle('profiles:update', async (event, { id, updates }) => {
    try {
      const updatedProfile = await terminalProcessManager.updateProfile(id, updates);
      return { success: true, profile: updatedProfile };
    } catch (error) {
      console.error('[Main] Failed to update profile:', error);
      return { success: false, error: error.message };
    }
  });
  
  ipcMain.handle('profiles:delete', async (event, id) => {
    try {
      const deleted = await terminalProcessManager.deleteProfile(id);
      return { success: deleted };
    } catch (error) {
      console.error('[Main] Failed to delete profile:', error);
      return { success: false, error: error.message };
    }
  });
  
  ipcMain.handle('profiles:setDefault', async (event, id) => {
    try {
      await terminalProcessManager.setDefaultProfile(id);
      return { success: true };
    } catch (error) {
      console.error('[Main] Failed to set default profile:', error);
      return { success: false, error: error.message };
    }
  });
  
  // File operations
  ipcMain.handle('file:open', async (event, options) => {
    try {
      const result = await dialog.showOpenDialog(mainWindow, options);
      return result;
    } catch (error) {
      console.error('[Main] Failed to open file dialog:', error);
      return { canceled: true, filePaths: [] };
    }
  });
  
  // External URL handler
  ipcMain.handle('shell:openExternal', async (event, url) => {
    try {
      await shell.openExternal(url);
      return { success: true };
    } catch (error) {
      console.error('[Main] Failed to open external URL:', error);
      return { success: false, error: error.message };
    }
  });
  
  // App version handler
  ipcMain.handle('app:getVersion', () => {
    return app.getVersion();
  });
  
  // Notification handler with sound support
  ipcMain.handle('show-notification', async (event, options) => {
    try {
      const { Notification } = require('electron');
      
      // Create notification options
      const notificationOptions = {
        title: options.title,
        body: options.body,
        icon: path.join(__dirname, '../../assets/icon.png'),
        silent: options.silent
      };
      
      // Add sound for macOS
      if (process.platform === 'darwin' && options.sound && !options.silent) {
        notificationOptions.sound = options.sound;
      }
      
      const notification = new Notification(notificationOptions);
      
      // Handle click event
      notification.on('click', () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        }
      });
      
      notification.show();
      
      return { success: true };
    } catch (error) {
      console.error('[Main] Failed to show notification:', error);
      return { success: false, error: error.message };
    }
  });
  
  // Command tracking handlers
  ipcMain.handle('command:trackStart', async (event, { commandId, commandLine }) => {
    try {
      // TODO: Implement command tracking if needed
      return { success: true };
    } catch (error) {
      console.error('[Main] Failed to track command start:', error);
      return { success: false, error: error.message };
    }
  });
  
  ipcMain.handle('command:trackEnd', async (event, { commandId, exitCode }) => {
    try {
      // TODO: Implement command tracking if needed
      return { success: true };
    } catch (error) {
      console.error('[Main] Failed to track command end:', error);
      return { success: false, error: error.message };
    }
  });
  
  // File size helper
  ipcMain.handle('file:getSize', async (event, filename) => {
    try {
      const fs = require('fs').promises;
      const stats = await fs.stat(filename);
      return stats.size;
    } catch (error) {
      console.error('[Main] Failed to get file size:', error);
      return 0;
    }
  });
  
  // File system handlers
  ipcMain.handle('fs:listDirectory', async (event, dirPath) => {
    try {
      const fs = require('fs').promises;
      const path = require('path');
      
      const files = await fs.readdir(dirPath, { withFileTypes: true });
      const fileList = await Promise.all(files.map(async (dirent) => {
        const filePath = path.join(dirPath, dirent.name);
        try {
          const stats = await fs.stat(filePath);
          return {
            name: dirent.name,
            path: filePath,
            isDirectory: dirent.isDirectory(),
            size: stats.size,
            modified: stats.mtime,
            hidden: dirent.name.startsWith('.')
          };
        } catch (error) {
          // Handle permission errors
          return {
            name: dirent.name,
            path: filePath,
            isDirectory: dirent.isDirectory(),
            size: 0,
            modified: null,
            hidden: dirent.name.startsWith('.'),
            error: error.message
          };
        }
      }));
      
      return { success: true, files: fileList };
    } catch (error) {
      console.error('[Main] Failed to list directory:', error);
      return { success: false, error: error.message };
    }
  });
  
  // Shell integration handlers
  ipcMain.handle('shellIntegration:check', async (event, shellPath) => {
    try {
      const isInstalled = await terminalProcessManager.isShellIntegrationInstalled(shellPath);
      return { success: true, installed: isInstalled };
    } catch (error) {
      console.error('[Main] Failed to check shell integration:', error);
      return { success: false, error: error.message };
    }
  });
  
  ipcMain.handle('shellIntegration:install', async (event, shellPath) => {
    try {
      const result = await terminalProcessManager.installShellIntegration(shellPath);
      return { success: true, ...result };
    } catch (error) {
      console.error('[Main] Failed to install shell integration:', error);
      return { success: false, error: error.message };
    }
  });
  
  ipcMain.handle('shellIntegration:getCommand', async (event, shellPath) => {
    try {
      const command = terminalProcessManager.getShellIntegrationCommand(shellPath);
      return { success: true, command };
    } catch (error) {
      console.error('[Main] Failed to get shell integration command:', error);
      return { success: false, error: error.message };
    }
  });
  
  // Message Center handlers
  ipcMain.handle('messageCenter:sendToTerminal', async (event, { targetWindowId, targetTerminalId, message }) => {
    try {
      return messageCenterService.sendToTerminal(targetWindowId, targetTerminalId, message);
    } catch (error) {
      console.error('[Main] Failed to send message to terminal:', error);
      return { success: false, error: error.message };
    }
  });
  
  ipcMain.handle('messageCenter:broadcast', async (event, message) => {
    try {
      return messageCenterService.broadcastMessage(message);
    } catch (error) {
      console.error('[Main] Failed to broadcast message:', error);
      return { success: false, error: error.message };
    }
  });
  
  ipcMain.handle('messageCenter:resendNotification', async (event, messageId) => {
    try {
      // Find the message in history
      const messages = messageCenterWindow.messageHistory;
      const message = messages.find(m => m.id === messageId);
      
      if (message && message.notification) {
        await ipcMain.handle('show-notification', event, message.notification);
        return { success: true };
      }
      
      return { success: false, error: 'Message not found or has no notification data' };
    } catch (error) {
      console.error('[Main] Failed to resend notification:', error);
      return { success: false, error: error.message };
    }
  });
  
  ipcMain.handle('messageCenter:clearHistory', async () => {
    try {
      messageCenterService.clearHistory();
      return { success: true };
    } catch (error) {
      console.error('[Main] Failed to clear history:', error);
      return { success: false, error: error.message };
    }
  });
  
  ipcMain.handle('messageCenter:getFiltered', async (event, filter) => {
    try {
      const messages = messageCenterWindow.getFilteredMessages(filter);
      return { success: true, messages };
    } catch (error) {
      console.error('[Main] Failed to get filtered messages:', error);
      return { success: false, error: error.message };
    }
  });
  
  // Send message to Message Center
  ipcMain.handle('sendToMessageCenter', async (event, message) => {
    try {
      return messageCenterService.forwardNotification(message);
    } catch (error) {
      console.error('[Main] Failed to send to Message Center:', error);
      return { success: false, error: error.message };
    }
  });
  
  // Get window ID
  ipcMain.handle('getWindowId', (event) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    return window ? window.id : null;
  });
  
  // Message Center window handlers
  ipcMain.on('messageCenter:open', () => {
    if (messageCenterWindow) {
      messageCenterWindow.create();
    }
  });
  
  ipcMain.on('messageCenter:requestData', (event) => {
    if (messageCenterWindow) {
      messageCenterWindow.sendHistory();
    }
  });
  
  // Handle terminal messages
  ipcMain.on('terminal:message', (event, { targetId, message }) => {
    // Forward to renderer
    const window = BrowserWindow.fromWebContents(event.sender);
    if (window) {
      window.webContents.send('terminal:incomingMessage', {
        targetId,
        message
      });
    }
  });
}

// Create application menu
function createApplicationMenu() {
  const isMac = process.platform === 'darwin';
  
  const template = [
    // App menu (macOS only)
    ...(isMac ? [{
      label: 'ZeamiTerm',
      submenu: [
        { label: 'About ZeamiTerm', role: 'about' },
        { type: 'separator' },
        { label: 'Preferences...', accelerator: 'Cmd+,', click: () => {
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('menu-action', 'preferences');
          }
        }},
        { type: 'separator' },
        { label: 'Services', role: 'services', submenu: [] },
        { type: 'separator' },
        { label: 'Hide ZeamiTerm', accelerator: 'Cmd+H', role: 'hide' },
        { label: 'Hide Others', accelerator: 'Cmd+Shift+H', role: 'hideothers' },
        { label: 'Show All', role: 'unhide' },
        { type: 'separator' },
        { label: 'Quit ZeamiTerm', accelerator: 'Cmd+Q', role: 'quit' }
      ]
    }] : []),
    
    // Terminal menu
    {
      label: 'ターミナル',
      submenu: [
        { 
          label: '新規ウィンドウ', 
          accelerator: isMac ? 'Cmd+Shift+N' : 'Ctrl+Shift+N', 
          click: () => {
            createNewWindow();
          }
        },
        { type: 'separator' },
        { 
          label: '現在のターミナルを保存', 
          accelerator: isMac ? 'Cmd+S' : 'Ctrl+S',
          click: () => {
            const window = BrowserWindow.getFocusedWindow();
            if (window && !window.isDestroyed()) {
              window.webContents.send('menu-action', 'save-terminal');
            }
          }
        },
        { type: 'separator' },
        { 
          label: 'ウィンドウを閉じる', 
          accelerator: isMac ? 'Cmd+W' : 'Ctrl+W', 
          click: async (menuItem, browserWindow) => {
            const window = browserWindow || BrowserWindow.getFocusedWindow();
            if (window) {
              const choice = dialog.showMessageBoxSync(window, {
                type: 'warning',
                buttons: ['キャンセル', '閉じる'],
                defaultId: 0,
                cancelId: 0,
                message: 'ウィンドウを閉じますか？',
                detail: '実行中のターミナルセッションが終了します。'
              });
              
              if (choice === 1) {
                window.close();
              }
            }
          }
        }
      ]
    },
    
    // Edit menu
    {
      label: '編集',
      submenu: [
        { label: '元に戻す', accelerator: 'CmdOrCtrl+Z', role: 'undo' },
        { label: 'やり直す', accelerator: isMac ? 'Shift+Cmd+Z' : 'Ctrl+Y', role: 'redo' },
        { type: 'separator' },
        { label: '切り取り', accelerator: 'CmdOrCtrl+X', role: 'cut' },
        { label: 'コピー', accelerator: 'CmdOrCtrl+C', role: 'copy' },
        { label: '貼り付け', accelerator: 'CmdOrCtrl+V', role: 'paste' },
        { label: 'すべて選択', accelerator: 'CmdOrCtrl+A', role: 'selectAll' },
        { type: 'separator' },
        { 
          label: '検索', 
          accelerator: 'CmdOrCtrl+F', 
          click: () => {
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.webContents.send('menu-action', 'find');
            }
          }
        },
        // Add Preferences for non-macOS platforms
        ...(!isMac ? [
          { type: 'separator' },
          { 
            label: 'Preferences...', 
            accelerator: 'Ctrl+,', 
            click: () => {
              if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send('menu-action', 'preferences');
              }
            }
          }
        ] : [])
      ]
    },
    
    // View menu
    {
      label: '表示',
      submenu: [
        { label: '再読み込み', accelerator: 'CmdOrCtrl+R', role: 'reload' },
        { label: '強制再読み込み', accelerator: 'CmdOrCtrl+Shift+R', role: 'forceReload' },
        { label: '開発者ツール', accelerator: isMac ? 'Alt+Cmd+I' : 'Ctrl+Shift+I', role: 'toggleDevTools' },
        { type: 'separator' },
        { label: '実際のサイズ', accelerator: 'CmdOrCtrl+0', role: 'resetZoom' },
        { label: 'ズームイン', accelerator: 'CmdOrCtrl+=', role: 'zoomIn' },
        { label: 'ズームアウト', accelerator: 'CmdOrCtrl+-', role: 'zoomOut' },
        { type: 'separator' },
        { label: 'フルスクリーン', accelerator: isMac ? 'Ctrl+Cmd+F' : 'F11', role: 'togglefullscreen' },
        { type: 'separator' },
        { 
          label: 'データモニター', 
          accelerator: isMac ? 'Cmd+Shift+M' : 'Ctrl+Shift+M',
          click: () => {
            if (monitorWindow) {
              monitorWindow.create();
            }
          }
        },
        { 
          label: 'Message Center', 
          accelerator: isMac ? 'Cmd+Shift+C' : 'Ctrl+Shift+C',
          click: () => {
            if (messageCenterWindow) {
              messageCenterWindow.create();
            }
          }
        }
      ]
    },
    
    // Window menu
    {
      label: 'ウィンドウ',
      submenu: [
        { label: '最小化', accelerator: 'CmdOrCtrl+M', role: 'minimize' },
        { 
          label: '閉じる', 
          accelerator: 'CmdOrCtrl+W', 
          click: async (menuItem, browserWindow) => {
            const window = browserWindow || BrowserWindow.getFocusedWindow();
            if (window) {
              const choice = dialog.showMessageBoxSync(window, {
                type: 'warning',
                buttons: ['キャンセル', '閉じる'],
                defaultId: 0,
                cancelId: 0,
                message: 'ウィンドウを閉じますか？',
                detail: '実行中のターミナルセッションが終了します。'
              });
              
              if (choice === 1) {
                window.close();
              }
            }
          }
        },
        ...(isMac ? [
          { type: 'separator' },
          { label: 'すべてを前面に', role: 'front' }
        ] : [])
      ]
    },
    
    // Help menu
    {
      label: 'ヘルプ',
      submenu: [
        {
          label: 'アップデートを確認...',
          click: () => {
            if (autoUpdaterManager) {
              autoUpdaterManager.checkForUpdatesManually();
            }
          }
        },
        { type: 'separator' },
        {
          label: 'Learn More',
          click: async () => {
            const { shell } = require('electron');
            await shell.openExternal('https://github.com/hiranotomo/zeami-term');
          }
        },
        {
          label: 'Documentation',
          click: async () => {
            const { shell } = require('electron');
            await shell.openExternal('https://github.com/hiranotomo/zeami-term/wiki');
          }
        },
        { type: 'separator' },
        {
          label: 'Report Issue',
          click: async () => {
            const { shell } = require('electron');
            await shell.openExternal('https://github.com/hiranotomo/zeami-term/issues');
          }
        },
        { type: 'separator' },
        {
          label: 'Toggle Developer Tools',
          accelerator: isMac ? 'Alt+Cmd+I' : 'Ctrl+Shift+I',
          click: () => {
            const focusedWindow = BrowserWindow.getFocusedWindow();
            if (focusedWindow) {
              focusedWindow.webContents.toggleDevTools();
            }
          }
        }
      ]
    }
  ];
  
  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// App event handlers
app.whenReady().then(async () => {
  // Initialize services before creating window
  ptyService = new PtyService();
  console.log('[Main] PtyService initialized');
  
  sessionManager = new SessionManager();
  console.log('[Main] SessionManager initialized');
  
  terminalProcessManager = new TerminalProcessManager();
  console.log('[Main] TerminalProcessManager initialized');
  
  monitorWindow = new MonitorWindow();
  global.monitorWindow = monitorWindow; // Make it globally accessible
  console.log('[Main] MonitorWindow initialized');
  
  // Initialize Message Center
  messageCenterWindow = new MessageCenterWindow();
  messageCenterService = new MessageCenterService();
  messageCenterService.initialize(messageCenterWindow);
  console.log('[Main] Message Center initialized');
  
  // Setup IPC handlers
  setupIpcHandlers();
  console.log('[Main] IPC handlers setup complete');
  
  createApplicationMenu();
  createWindow();
  
  // Initialize error recorder and sync offline errors
  try {
    errorRecorder = new ZeamiErrorRecorder();
    await errorRecorder.syncOfflineErrors();
  } catch (err) {
    console.warn('Failed to initialize error recorder:', err);
    // Continue without error recording if initialization fails
  }
  
  // Initialize auto updater
  autoUpdaterManager = new AutoUpdaterManager();
  autoUpdaterManager.setMainWindow(mainWindow);
  
  // Check for updates after 5 seconds (initial check)
  setTimeout(() => {
    console.log('[Main] Performing initial update check');
    autoUpdaterManager.checkForUpdates();
    
    // Start periodic checks after the initial check
    autoUpdaterManager.startPeriodicChecks();
  }, 5000);
  
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  // Set mainWindow to null immediately to prevent access after close
  mainWindow = null;
  
  // Clean up all PTY processes before quitting
  cleanupPtyProcesses().then(() => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  }).catch((error) => {
    console.error('[Main] Error during cleanup:', error);
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });
});

app.on('before-quit', (event) => {
  // Prevent immediate quit to allow cleanup
  event.preventDefault();
  
  // Stop periodic update checks
  if (autoUpdaterManager) {
    autoUpdaterManager.stopPeriodicChecks();
  }
  
  // Clean up PTY service
  cleanupPtyProcesses().then(() => {
    // Now actually quit
    app.exit(0);
  });
});

app.on('will-quit', (event) => {
  // Final cleanup attempt
  if (ptyService && ptyService.processes.size > 0) {
    event.preventDefault();
    cleanupPtyProcesses().then(() => {
      app.exit(0);
    });
  }
});

// Helper function to clean up PTY processes
async function cleanupPtyProcesses() {
  if (!ptyService) return;
  
  // Remove all event listeners to prevent further events
  ptyService.removeAllListeners();
  
  console.log('[Main] Cleaning up PTY processes...');
  
  // Kill all processes
  const promises = [];
  ptyService.processes.forEach((processInfo, id) => {
    promises.push(new Promise((resolve) => {
      try {
        console.log(`[Main] Killing process ${id}`);
        ptyService.killProcess(id, 'SIGTERM');
        
        // Force kill after timeout
        setTimeout(() => {
          try {
            ptyService.killProcess(id, 'SIGKILL');
          } catch (e) {
            // Process might already be dead
          }
          resolve();
        }, 1000);
      } catch (error) {
        console.error(`[Main] Error killing process ${id}:`, error);
        resolve();
      }
    }));
  });
  
  await Promise.all(promises);
  console.log('[Main] All PTY processes cleaned up');
}

// Handle certificate errors
app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
  // Prevent certificate errors in development
  if (url.startsWith('https://localhost')) {
    event.preventDefault();
    callback(true);
  } else {
    callback(false);
  }
});

// Security: Prevent new window creation
app.on('web-contents-created', (event, contents) => {
  contents.on('new-window', (event, navigationUrl) => {
    event.preventDefault();
  });
});