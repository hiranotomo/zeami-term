const { BrowserWindow } = require('electron');
const path = require('path');

class MonitorWindow {
    constructor() {
        this.window = null;
        this.dataBuffer = [];
        this.maxBufferSize = 10000; // Keep last 10k entries
    }
    
    create() {
        if (this.window && !this.window.isDestroyed()) {
            this.window.focus();
            return;
        }
        
        this.window = new BrowserWindow({
            width: 800,
            height: 600,
            minWidth: 600,
            minHeight: 400,
            title: 'ZeamiTerm Data Monitor',
            webPreferences: {
                preload: path.join(__dirname, '../monitor/preload.js'),
                contextIsolation: true,
                nodeIntegration: false,
                sandbox: true
            },
            icon: path.join(__dirname, '../../assets/icon.png'),
            backgroundColor: '#1e1e1e',
            show: false
        });
        
        this.window.loadFile(path.join(__dirname, '../monitor/monitor.html'));
        
        this.window.once('ready-to-show', () => {
            this.window.show();
            
            // Send buffered data
            if (this.dataBuffer.length > 0) {
                this.dataBuffer.forEach(data => {
                    this.window.webContents.send('monitor:data', data);
                });
            }
        });
        
        this.window.on('closed', () => {
            this.window = null;
        });
        
        // Handle history request
        // Note: webContents.ipc is not available, use ipcMain instead
    }
    
    sendData(sessionId, type, data, timestamp = Date.now()) {
        const monitorData = {
            sessionId,
            type,
            data,
            timestamp
        };
        
        // Add to buffer
        this.dataBuffer.push(monitorData);
        if (this.dataBuffer.length > this.maxBufferSize) {
            this.dataBuffer.shift(); // Remove oldest
        }
        
        // Send to window if open
        if (this.window && !this.window.isDestroyed()) {
            this.window.webContents.send('monitor:data', monitorData);
        }
    }
    
    close() {
        if (this.window && !this.window.isDestroyed()) {
            this.window.close();
        }
    }
    
    isOpen() {
        return this.window && !this.window.isDestroyed();
    }
    
    clearBuffer() {
        this.dataBuffer = [];
    }
}

module.exports = { MonitorWindow };