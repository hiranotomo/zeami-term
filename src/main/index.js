const { app, BrowserWindow, Menu, ipcMain } = require('electron');
const path = require('path');
const { PtyService } = require('./ptyService');
const { SessionManager } = require('./sessionManager');
const AutoUpdaterManager = require('./autoUpdater');
const ZeamiErrorRecorder = require('./zeamiErrorRecorder');

// Get version from package.json
const packageInfo = require('../../package.json');
const appVersion = packageInfo.version;

// Keep a global reference of the window object
let mainWindow;
let ptyService;
let sessionManager;
let autoUpdaterManager;
let errorRecorder;

function createWindow() {
  // Create the browser window with VS Code-like appearance
  mainWindow = new BrowserWindow({
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
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    // Open dev tools in development - DISABLED
    // if (process.env.NODE_ENV !== 'production') {
    //   mainWindow.webContents.openDevTools();
    // }
  });

  // Load the index.html file
  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

  // Handle window closed
  mainWindow.on('closed', () => {
    // Remove all event listeners from ptyService before nulling mainWindow
    if (ptyService) {
      ptyService.removeAllListeners();
    }
    mainWindow = null;
  });
  
  // Initialize PTY service
  ptyService = new PtyService();
  
  // Initialize session manager
  sessionManager = new SessionManager();
  
  // Setup IPC handlers for terminal operations
  setupIpcHandlers();
  
  // Load previous session after window is ready - DISABLED
  // setTimeout(() => {
  //   const previousSession = sessionManager.loadSession();
  //   if (previousSession) {
  //     mainWindow.webContents.send('session:restore', previousSession);
  //   }
  // }, 500);
}

// Setup IPC handlers
function setupIpcHandlers() {
  // Create new terminal session
  ipcMain.handle('terminal:create', async (event, options) => {
    try {
      const result = await ptyService.createProcess(options);
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
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('terminal:data', { id, data });
    }
  });
  
  // Handle PTY exit
  ptyService.on('exit', ({ id, code, signal, error }) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('terminal:exit', { id, code, signal, error });
    }
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
      label: 'Terminal',
      submenu: [
        { 
          label: 'New Terminal', 
          accelerator: isMac ? 'Cmd+T' : 'Ctrl+T', 
          click: () => {
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.webContents.send('menu-action', 'new-terminal');
            }
          }
        },
        { 
          label: 'Split Terminal', 
          accelerator: isMac ? 'Cmd+D' : 'Ctrl+D', 
          click: () => {
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.webContents.send('menu-action', 'split-terminal');
            }
          }
        },
        { type: 'separator' },
        { 
          label: 'Clear', 
          accelerator: isMac ? 'Cmd+K' : 'Ctrl+K', 
          click: () => {
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.webContents.send('menu-action', 'clear-terminal');
            }
          }
        },
        { 
          label: 'Close Terminal', 
          accelerator: isMac ? 'Cmd+W' : 'Ctrl+W', 
          click: () => {
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.webContents.send('menu-action', 'close-terminal');
            }
          }
        }
      ]
    },
    
    // Edit menu
    {
      label: 'Edit',
      submenu: [
        { label: 'Undo', accelerator: 'CmdOrCtrl+Z', role: 'undo' },
        { label: 'Redo', accelerator: isMac ? 'Shift+Cmd+Z' : 'Ctrl+Y', role: 'redo' },
        { type: 'separator' },
        { label: 'Cut', accelerator: 'CmdOrCtrl+X', role: 'cut' },
        { label: 'Copy', accelerator: 'CmdOrCtrl+C', role: 'copy' },
        { label: 'Paste', accelerator: 'CmdOrCtrl+V', role: 'paste' },
        { label: 'Select All', accelerator: 'CmdOrCtrl+A', role: 'selectAll' },
        { type: 'separator' },
        { 
          label: 'Find', 
          accelerator: 'CmdOrCtrl+F', 
          click: () => {
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.webContents.send('menu-action', 'find');
            }
          }
        }
      ]
    },
    
    // View menu
    {
      label: 'View',
      submenu: [
        { label: 'Reload', accelerator: 'CmdOrCtrl+R', role: 'reload' },
        { label: 'Force Reload', accelerator: 'CmdOrCtrl+Shift+R', role: 'forceReload' },
        { label: 'Toggle Developer Tools', accelerator: isMac ? 'Alt+Cmd+I' : 'Ctrl+Shift+I', role: 'toggleDevTools' },
        { type: 'separator' },
        { label: 'Actual Size', accelerator: 'CmdOrCtrl+0', role: 'resetZoom' },
        { label: 'Zoom In', accelerator: 'CmdOrCtrl+=', role: 'zoomIn' },
        { label: 'Zoom Out', accelerator: 'CmdOrCtrl+-', role: 'zoomOut' },
        { type: 'separator' },
        { label: 'Toggle Fullscreen', accelerator: isMac ? 'Ctrl+Cmd+F' : 'F11', role: 'togglefullscreen' }
      ]
    },
    
    // Window menu
    {
      label: 'Window',
      submenu: [
        { label: 'Minimize', accelerator: 'CmdOrCtrl+M', role: 'minimize' },
        { label: 'Close', accelerator: 'CmdOrCtrl+W', role: 'close' },
        ...(isMac ? [
          { type: 'separator' },
          { label: 'Bring All to Front', role: 'front' }
        ] : [])
      ]
    },
    
    // Help menu
    {
      label: 'Help',
      submenu: [
        {
          label: 'Check for Updates...',
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
            await shell.openExternal('https://github.com/your-repo/zeami-term');
          }
        },
        {
          label: 'Documentation',
          click: async () => {
            const { shell } = require('electron');
            await shell.openExternal('https://github.com/your-repo/zeami-term/wiki');
          }
        },
        { type: 'separator' },
        {
          label: 'Report Issue',
          click: async () => {
            const { shell } = require('electron');
            await shell.openExternal('https://github.com/your-repo/zeami-term/issues');
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
  
  // Check for updates after 5 seconds
  setTimeout(() => {
    autoUpdaterManager.checkForUpdates();
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