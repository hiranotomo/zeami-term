/**
 * Minimal main process for testing
 */

const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

// Import our services
const { PtyService } = require('../src/main/ptyService');

let mainWindow;
let ptyService;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    webPreferences: {
      preload: path.join(__dirname, '../src/preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'minimal-test.html'));
  mainWindow.webContents.openDevTools();

  // Initialize PTY service
  ptyService = new PtyService();
  console.log('[MinimalMain] PtyService initialized');

  // Setup handlers
  setupHandlers();
}

function setupHandlers() {
  // Terminal creation
  ipcMain.handle('terminal:create', async (event, options) => {
    console.log('[MinimalMain] Creating terminal...');
    try {
      const result = await ptyService.createProcess(options);
      console.log('[MinimalMain] Terminal created:', result);
      return { success: true, ...result };
    } catch (error) {
      console.error('[MinimalMain] Error:', error);
      return { success: false, error: error.message };
    }
  });

  // Terminal input
  ipcMain.handle('terminal:input', async (event, { id, data }) => {
    console.log(`[MinimalMain] Input: id=${id}, data=${JSON.stringify(data)}`);
    try {
      ptyService.writeToProcess(id, data);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // PTY data events
  ptyService.on('data', ({ id, data }) => {
    console.log(`[MinimalMain] PTY data: id=${id}, length=${data.length}`);
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('terminal:data', { id, data });
    }
  });

  // PTY exit events
  ptyService.on('exit', ({ id, code, signal }) => {
    console.log(`[MinimalMain] PTY exit: id=${id}, code=${code}`);
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('terminal:exit', { id, code, signal });
    }
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

console.log('[MinimalMain] Starting minimal test app...');