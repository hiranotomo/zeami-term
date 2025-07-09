# デバッグガイド

> 🤖 **Claude Code最適化ドキュメント**  
> ZeamiTermの問題を効率的に調査・解決。開発者向けデバッグ完全ガイド。

## 🎯 デバッグツールキット

```bash
# 開発モードで起動（全デバッグ機能有効）
DEBUG=* npm run dev

# 特定モジュールのデバッグ
DEBUG=zeami:pty npm run dev
DEBUG=zeami:ipc npm run dev
DEBUG=zeami:terminal npm run dev
```

## 📋 デバッグ環境設定

### 環境変数

```bash
# 📍 .env.development
NODE_ENV=development
DEBUG=zeami:*
ZEAMI_LOG_LEVEL=debug
ZEAMI_ENABLE_DEVTOOLS=true
ZEAMI_DISABLE_HARDWARE_ACCELERATION=false
PASTE_DEBUG=true
SHELL_INTEGRATION_DEBUG=true
```

### VS Code起動設定

```json
// 📍 .vscode/launch.json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug Main Process",
      "type": "node",
      "request": "launch",
      "runtimeExecutable": "${workspaceFolder}/node_modules/.bin/electron",
      "args": [".", "--inspect=5858"],
      "env": {
        "NODE_ENV": "development",
        "DEBUG": "zeami:*"
      },
      "console": "integratedTerminal"
    },
    {
      "name": "Debug Renderer Process",
      "type": "chrome",
      "request": "launch",
      "runtimeExecutable": "${workspaceFolder}/node_modules/.bin/electron",
      "runtimeArgs": [
        "${workspaceFolder}",
        "--remote-debugging-port=9223"
      ],
      "webRoot": "${workspaceFolder}"
    }
  ]
}
```

## 🔧 プロセス別デバッグ

### メインプロセスのデバッグ

```javascript
// 📍 src/main/index.js にデバッグコード追加

// グローバルデバッグオブジェクト
global.DEBUG = {
    pty: require('debug')('zeami:pty'),
    ipc: require('debug')('zeami:ipc'),
    session: require('debug')('zeami:session')
};

// デバッグ情報の出力
global.DEBUG.pty('Starting PTY service...');

// ブレークポイント
if (process.env.DEBUG_BREAK) {
    debugger;
}
```

**Chrome DevToolsでのデバッグ**:
```bash
# インスペクタ付きで起動
electron --inspect=5858 .

# Chrome で chrome://inspect を開く
```

### レンダラープロセスのデバッグ

```javascript
// 📍 src/renderer/index.js

// デバッグユーティリティ
window.ZeamiDebug = {
    terminals: () => termManager.terminals,
    layout: () => termManager.layoutManager.getState(),
    performance: () => performance.getEntriesByType('measure'),
    
    // ターミナルデータのモニタリング
    monitorTerminal: (id) => {
        const terminal = termManager.terminals.get(id);
        terminal.onData(data => {
            console.log('[Terminal Input]', {
                id,
                data,
                hex: Array.from(data).map(c => c.charCodeAt(0).toString(16))
            });
        });
    }
};

// React Developer Tools（もし使用している場合）
if (process.env.NODE_ENV === 'development') {
    const { default: installExtension, REACT_DEVELOPER_TOOLS } = require('electron-devtools-installer');
    installExtension(REACT_DEVELOPER_TOOLS);
}
```

### PTYプロセスのデバッグ

```python
# 📍 src/main/pty/working_pty.py

import logging
import sys

# デバッグログの設定
if os.environ.get('PTY_DEBUG'):
    logging.basicConfig(
        level=logging.DEBUG,
        format='[PTY %(levelname)s] %(message)s',
        handlers=[
            logging.FileHandler('/tmp/zeami-pty.log'),
            logging.StreamHandler(sys.stderr)
        ]
    )
    
    logger = logging.getLogger(__name__)
    logger.debug(f'PTY started with args: {sys.argv}')
```

## 📊 パフォーマンスプロファイリング

### レンダリングパフォーマンス

```javascript
// 📍 src/renderer/debug/performanceMonitor.js

class PerformanceMonitor {
    constructor() {
        this.metrics = {
            fps: 0,
            renderTime: 0,
            memoryUsage: 0
        };
        
        this.startMonitoring();
    }
    
    startMonitoring() {
        // FPS計測
        let lastTime = performance.now();
        let frames = 0;
        
        const measureFPS = () => {
            frames++;
            const currentTime = performance.now();
            
            if (currentTime >= lastTime + 1000) {
                this.metrics.fps = frames;
                frames = 0;
                lastTime = currentTime;
                
                this.updateDisplay();
            }
            
            requestAnimationFrame(measureFPS);
        };
        
        measureFPS();
        
        // メモリ使用量
        if (performance.memory) {
            setInterval(() => {
                this.metrics.memoryUsage = performance.memory.usedJSHeapSize;
            }, 1000);
        }
    }
    
    measureRender(name, fn) {
        performance.mark(`${name}-start`);
        const result = fn();
        performance.mark(`${name}-end`);
        
        performance.measure(name, `${name}-start`, `${name}-end`);
        const measure = performance.getEntriesByName(name)[0];
        
        console.log(`[Performance] ${name}: ${measure.duration.toFixed(2)}ms`);
        
        return result;
    }
    
    updateDisplay() {
        if (!this.displayElement) {
            this.displayElement = document.createElement('div');
            this.displayElement.id = 'performance-monitor';
            this.displayElement.style.cssText = `
                position: fixed;
                top: 10px;
                right: 10px;
                background: rgba(0, 0, 0, 0.8);
                color: #0f0;
                padding: 10px;
                font-family: monospace;
                font-size: 12px;
                z-index: 10000;
            `;
            document.body.appendChild(this.displayElement);
        }
        
        this.displayElement.innerHTML = `
            FPS: ${this.metrics.fps}<br>
            Memory: ${(this.metrics.memoryUsage / 1048576).toFixed(2)} MB<br>
            Terminals: ${termManager.terminals.size}
        `;
    }
}

// 開発環境で自動有効化
if (process.env.NODE_ENV === 'development') {
    window.perfMonitor = new PerformanceMonitor();
}
```

### メモリリークの検出

```javascript
// 📍 src/renderer/debug/memoryLeakDetector.js

class MemoryLeakDetector {
    constructor() {
        this.snapshots = [];
        this.threshold = 50 * 1024 * 1024; // 50MB
    }
    
    takeSnapshot(label) {
        if (!performance.memory) {
            console.warn('Performance.memory not available');
            return;
        }
        
        const snapshot = {
            label,
            timestamp: Date.now(),
            usedJSHeapSize: performance.memory.usedJSHeapSize,
            totalJSHeapSize: performance.memory.totalJSHeapSize
        };
        
        this.snapshots.push(snapshot);
        
        // リーク検出
        if (this.snapshots.length > 2) {
            const first = this.snapshots[0];
            const last = snapshot;
            const growth = last.usedJSHeapSize - first.usedJSHeapSize;
            
            if (growth > this.threshold) {
                console.warn('⚠️ Potential memory leak detected:', {
                    growth: `${(growth / 1048576).toFixed(2)} MB`,
                    duration: `${(last.timestamp - first.timestamp) / 1000}s`
                });
            }
        }
        
        return snapshot;
    }
    
    compareSnapshots(label1, label2) {
        const snap1 = this.snapshots.find(s => s.label === label1);
        const snap2 = this.snapshots.find(s => s.label === label2);
        
        if (!snap1 || !snap2) {
            console.error('Snapshots not found');
            return;
        }
        
        const diff = {
            memoryGrowth: snap2.usedJSHeapSize - snap1.usedJSHeapSize,
            timeElapsed: snap2.timestamp - snap1.timestamp
        };
        
        console.table({
            [label1]: {
                memory: `${(snap1.usedJSHeapSize / 1048576).toFixed(2)} MB`,
                time: new Date(snap1.timestamp).toLocaleTimeString()
            },
            [label2]: {
                memory: `${(snap2.usedJSHeapSize / 1048576).toFixed(2)} MB`,
                time: new Date(snap2.timestamp).toLocaleTimeString()
            },
            difference: {
                memory: `${(diff.memoryGrowth / 1048576).toFixed(2)} MB`,
                time: `${(diff.timeElapsed / 1000).toFixed(2)}s`
            }
        });
    }
}
```

## 🐛 デバッグシナリオ

### シナリオ1: ペースト処理のデバッグ

```javascript
// デバッグ用ペーストハンドラー
class PasteDebugger {
    static enable() {
        const originalHandlePaste = ZeamiTermManager.prototype._handlePaste;
        
        ZeamiTermManager.prototype._handlePaste = function(event, terminal) {
            console.group('🔍 Paste Debug');
            console.log('Clipboard data:', event.clipboardData.getData('text'));
            console.log('Data length:', event.clipboardData.getData('text').length);
            console.log('Line count:', event.clipboardData.getData('text').split('\n').length);
            console.time('Paste processing');
            
            const result = originalHandlePaste.call(this, event, terminal);
            
            console.timeEnd('Paste processing');
            console.groupEnd();
            
            return result;
        };
    }
}

// 有効化
PasteDebugger.enable();
```

### シナリオ2: IPC通信のトレース

```javascript
// 📍 src/main/debug/ipcTracer.js

class IPCTracer {
    static enable() {
        const { ipcMain } = require('electron');
        
        // すべてのIPCハンドラーをラップ
        const originalHandle = ipcMain.handle.bind(ipcMain);
        
        ipcMain.handle = function(channel, handler) {
            return originalHandle(channel, async (event, ...args) => {
                console.log(`[IPC] → ${channel}`, args);
                const start = performance.now();
                
                try {
                    const result = await handler(event, ...args);
                    const duration = performance.now() - start;
                    
                    console.log(`[IPC] ← ${channel} (${duration.toFixed(2)}ms)`, result);
                    return result;
                } catch (error) {
                    console.error(`[IPC] ✗ ${channel}`, error);
                    throw error;
                }
            });
        };
    }
}
```

### シナリオ3: ターミナル出力の記録

```javascript
// すべてのターミナル出力を記録
class TerminalRecorder {
    constructor() {
        this.recordings = new Map();
    }
    
    startRecording(terminalId) {
        const recording = {
            id: terminalId,
            startTime: Date.now(),
            data: []
        };
        
        const terminal = termManager.terminals.get(terminalId);
        
        const disposable = terminal.onData(data => {
            recording.data.push({
                timestamp: Date.now(),
                type: 'input',
                data
            });
        });
        
        this.recordings.set(terminalId, { recording, disposable });
    }
    
    stopRecording(terminalId) {
        const rec = this.recordings.get(terminalId);
        if (!rec) return;
        
        rec.disposable.dispose();
        
        // 記録をファイルに保存
        const blob = new Blob([JSON.stringify(rec.recording, null, 2)], {
            type: 'application/json'
        });
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `terminal-recording-${terminalId}-${Date.now()}.json`;
        a.click();
    }
}
```

## 🔍 トラブルシューティングツール

### 診断スクリプト

```javascript
// 📍 scripts/diagnose.js

async function runDiagnostics() {
    console.log('🏥 ZeamiTerm Diagnostics');
    console.log('========================\n');
    
    // システム情報
    console.log('📊 System Information:');
    console.table({
        Platform: process.platform,
        Architecture: process.arch,
        Node: process.version,
        Electron: process.versions.electron,
        Chrome: process.versions.chrome,
        V8: process.versions.v8
    });
    
    // プロセス情報
    console.log('\n📈 Process Information:');
    console.table({
        PID: process.pid,
        Uptime: `${process.uptime()}s`,
        Memory: `${(process.memoryUsage().heapUsed / 1048576).toFixed(2)} MB`,
        CPU: process.cpuUsage()
    });
    
    // 設定チェック
    console.log('\n⚙️ Configuration Check:');
    const configPath = path.join(app.getPath('userData'), 'config.json');
    
    try {
        const config = JSON.parse(fs.readFileSync(configPath));
        console.log('✅ Config file found and valid');
        console.log('Theme:', config.terminal?.theme || 'default');
        console.log('Font size:', config.terminal?.fontSize || 14);
    } catch (error) {
        console.log('❌ Config file error:', error.message);
    }
    
    // 依存関係チェック
    console.log('\n📦 Dependencies Check:');
    const criticalDeps = ['node-pty', 'xterm', 'electron'];
    
    for (const dep of criticalDeps) {
        try {
            require.resolve(dep);
            console.log(`✅ ${dep}: OK`);
        } catch {
            console.log(`❌ ${dep}: NOT FOUND`);
        }
    }
}
```

## 🔗 関連ドキュメント

- [よくある問題](./common-issues.md)
- [パフォーマンス最適化](../architecture/overview.md#パフォーマンス考慮事項)
- [開発ガイド](../development/README.md)

---

> 💡 **Claude Codeへのヒント**: デバッグ時は、問題を最小限のコードで再現することが重要です。また、ログは構造化して出力すると、後で分析しやすくなります。