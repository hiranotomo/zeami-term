const { contextBridge, ipcRenderer } = require('electron');

// Expose monitor-specific APIs
contextBridge.exposeInMainWorld('electronAPI', {
    // Receive monitor data
    onMonitorData: (callback) => {
        ipcRenderer.on('monitor:data', (event, data) => callback(data));
    },
    
    // Request historical data
    requestMonitorHistory: () => {
        ipcRenderer.send('monitor:request-history');
    },
    
    // Clean up
    removeAllListeners: () => {
        ipcRenderer.removeAllListeners('monitor:data');
    }
});