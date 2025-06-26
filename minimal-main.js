const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { NodePty } = require('./src/main/nodePty');

let mainWindow;
const sessions = new Map();

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'src/preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.loadFile('minimal-test.html');
  mainWindow.webContents.openDevTools();
}

app.whenReady().then(createWindow);

// IPC handlers
ipcMain.handle('zeami:start-session', async (event) => {
  console.log('[MINIMAL] Starting session');
  const sessionId = 'test-' + Date.now();
  
  try {
    const pty = new NodePty({
      shell: '/bin/bash',
      cwd: process.env.HOME,
      env: process.env
    });
    
    pty.on('data', (data) => {
      console.log('[MINIMAL] PTY data:', data.length, 'bytes');
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('zeami:terminal-data', { sessionId, data });
      }
    });
    
    pty.spawn();
    sessions.set(sessionId, pty);
    
    return { success: true, sessionId };
  } catch (error) {
    console.error('[MINIMAL] Error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.on('zeami:send-input', (event, { sessionId, data }) => {
  console.log('[MINIMAL] Input received:', JSON.stringify(data));
  const pty = sessions.get(sessionId);
  if (pty) {
    pty.write(data);
  }
});