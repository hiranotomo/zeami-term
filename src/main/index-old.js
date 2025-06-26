const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { TerminalProcessManager } = require('./terminalProcessManager');

// Keep a global reference of the window object
let mainWindow;
let terminalManager;

function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    },
    titleBarStyle: process.platform === 'darwin' ? 'default' : 'default',
    title: 'ZeamiTerm',
    backgroundColor: '#1e1e1e'
  });

  // Load the index.html
  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

  // Open DevTools in development
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// App event handlers
app.whenReady().then(() => {
  createWindow();
  
  // Initialize terminal process manager
  terminalManager = new TerminalProcessManager();
  
  // Set up event listeners after terminalManager is initialized
  terminalManager.on('data', (sessionId, data) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      // Use setImmediate to prevent blocking the main process
      setImmediate(() => {
        try {
          mainWindow.webContents.send('zeami:terminal-data', { sessionId, data });
        } catch (error) {
          console.error('[MAIN] Error sending data to renderer:', error);
        }
      });
    }
  });

  terminalManager.on('pattern-detected', (sessionId, pattern) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('zeami:pattern-detected', { sessionId, pattern });
    }
  });
  
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC handlers
ipcMain.handle('zeami:start-session', async (event, options) => {
  try {
    const sessionId = await terminalManager.createSession(options);
    return { success: true, sessionId };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.on('zeami:send-input', (event, { sessionId, data }) => {
  console.log('[MAIN] IPC received input:', data, 'for session:', sessionId);
  // Process input asynchronously to prevent blocking
  setImmediate(() => {
    try {
      terminalManager.sendInput(sessionId, data);
      console.log('[MAIN] Input forwarded to terminal manager');
    } catch (error) {
      console.error('[MAIN] Error forwarding input:', error);
    }
  });
});

ipcMain.handle('zeami:request-context', async (event, sessionId) => {
  return terminalManager.getSessionContext(sessionId);
});

// Event listeners are set up in app.whenReady()