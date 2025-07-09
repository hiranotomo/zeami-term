# セッション永続化

> 🤖 **Claude Code最適化ドキュメント**  
> 作業状態を完全保存。中断しても、続きから再開できるセッション管理。

## 🎯 クイックリファレンス

| 機能 | 操作方法 | 実装箇所 |
|-----|---------|---------|
| 自動保存 | 30秒ごとに自動実行 | `SessionManager.js:123-145` |
| 手動保存 | `Cmd+S` | `ZeamiTermManager.js:678-689` |
| セッション復元 | 起動時に自動提案 | `SessionManager.js:234-256` |
| セッションクリア | メニュー → セッション → クリア | `SessionManager.js:345-356` |

## 📋 セッション永続化の概要

```yaml
目的: 作業状態の完全な保存と復元
保存内容:
  - ターミナルバッファ（出力内容）
  - 作業ディレクトリ
  - 環境変数
  - スクロール位置
  - レイアウト設定
  - アクティブターミナル
保存タイミング:
  - 30秒ごとの自動保存
  - アプリケーション終了時
  - 手動保存
```

## 🏗️ セッションデータ構造

### セッションファイルフォーマット

```javascript
// 📍 ~/.zeamiterm/session.json

{
    "version": "2.0.0",
    "timestamp": 1700000000000,
    "sessionId": "550e8400-e29b-41d4-a716-446655440000",
    
    "terminals": {
        "terminal-a": {
            "buffer": {
                "serialized": "base64エンコードされたバッファ内容",
                "format": "xterm-serialize-v1"
            },
            "state": {
                "cwd": "/Users/user/projects/zeami-term",
                "shell": "/bin/bash",
                "env": {
                    "CUSTOM_VAR": "value"
                },
                "pid": 12345,
                "exitCode": null
            },
            "viewport": {
                "scrollback": 1234,
                "cursorX": 10,
                "cursorY": 5,
                "selection": null
            },
            "dimensions": {
                "cols": 80,
                "rows": 24
            }
        },
        "terminal-b": {
            // 同様の構造
        }
    },
    
    "layout": {
        "type": "split",
        "splitPosition": 50,
        "activeTerminal": "terminal-a"
    },
    
    "metadata": {
        "appVersion": "1.0.0",
        "platform": "darwin",
        "lastActivity": 1700000000000,
        "sessionDuration": 3600000
    }
}
```

## 🔧 実装詳細

### SessionManager（メインプロセス）

```javascript
// 📍 src/main/sessionManager.js

class SessionManager {
    constructor(userDataPath) {
        this.sessionPath = path.join(userDataPath, 'session.json');
        this.backupPath = path.join(userDataPath, 'session.backup.json');
        this.autoSaveInterval = 30000; // 30秒
        this.autoSaveTimer = null;
    }
    
    // セッション保存
    async saveSession(sessionData) {
        try {
            // 既存のセッションをバックアップ
            if (await this._fileExists(this.sessionPath)) {
                await fs.copyFile(this.sessionPath, this.backupPath);
            }
            
            // バージョン情報とメタデータを追加
            const fullSession = {
                version: '2.0.0',
                timestamp: Date.now(),
                sessionId: crypto.randomUUID(),
                ...sessionData,
                metadata: {
                    appVersion: app.getVersion(),
                    platform: process.platform,
                    lastActivity: Date.now()
                }
            };
            
            // 原子的な書き込み
            const tempPath = `${this.sessionPath}.tmp`;
            await fs.writeFile(tempPath, JSON.stringify(fullSession, null, 2));
            await fs.rename(tempPath, this.sessionPath);
            
            return { success: true };
        } catch (error) {
            console.error('Session save failed:', error);
            return { success: false, error: error.message };
        }
    }
    
    // セッション読み込み
    async loadSession() {
        try {
            const data = await fs.readFile(this.sessionPath, 'utf8');
            const session = JSON.parse(data);
            
            // バージョン互換性チェック
            if (!this._isCompatibleVersion(session.version)) {
                throw new Error('Incompatible session version');
            }
            
            // セッションの妥当性検証
            this._validateSession(session);
            
            return session;
        } catch (error) {
            // バックアップから復元を試みる
            if (await this._fileExists(this.backupPath)) {
                try {
                    const backup = await fs.readFile(this.backupPath, 'utf8');
                    return JSON.parse(backup);
                } catch (backupError) {
                    console.error('Backup restore failed:', backupError);
                }
            }
            
            return null;
        }
    }
    
    // 自動保存の開始
    startAutoSave(callback) {
        this.stopAutoSave();
        
        this.autoSaveTimer = setInterval(async () => {
            const sessionData = await callback();
            if (sessionData) {
                await this.saveSession(sessionData);
            }
        }, this.autoSaveInterval);
    }
    
    // 自動保存の停止
    stopAutoSave() {
        if (this.autoSaveTimer) {
            clearInterval(this.autoSaveTimer);
            this.autoSaveTimer = null;
        }
    }
}
```

### セッション収集（レンダラープロセス）

```javascript
// 📍 src/renderer/core/ZeamiTermManager.js:678-734

class ZeamiTermManager {
    // セッションデータの収集
    async collectSessionData() {
        const sessionData = {
            terminals: {},
            layout: this.layoutManager.getState()
        };
        
        // 各ターミナルの状態を収集
        for (const [id, terminal] of this.terminals) {
            if (!terminal) continue;
            
            sessionData.terminals[id] = {
                buffer: await this._serializeBuffer(terminal),
                state: await this._getTerminalState(id),
                viewport: this._getViewportState(terminal),
                dimensions: {
                    cols: terminal.cols,
                    rows: terminal.rows
                }
            };
        }
        
        return sessionData;
    }
    
    // バッファのシリアライズ
    async _serializeBuffer(terminal) {
        // xterm.jsのSerializeAddonを使用
        if (terminal.serializeAddon) {
            const serialized = terminal.serializeAddon.serialize();
            
            // Base64エンコードして保存サイズを削減
            return {
                serialized: btoa(serialized),
                format: 'xterm-serialize-v1'
            };
        }
        
        // フォールバック: 生のテキスト
        const lines = [];
        for (let i = 0; i < terminal.buffer.active.length; i++) {
            const line = terminal.buffer.active.getLine(i);
            if (line) {
                lines.push(line.translateToString());
            }
        }
        
        return {
            serialized: lines.join('\n'),
            format: 'plain-text'
        };
    }
    
    // ターミナル状態の取得
    async _getTerminalState(id) {
        const info = await window.electronAPI.getTerminalInfo(id);
        
        return {
            cwd: info.cwd,
            shell: info.shell,
            env: info.env,
            pid: info.pid,
            exitCode: info.exitCode
        };
    }
}
```

### セッション復元

```javascript
// 📍 src/renderer/core/SessionRestorer.js

class SessionRestorer {
    constructor(termManager) {
        this.termManager = termManager;
    }
    
    // セッション復元の実行
    async restoreSession(sessionData) {
        try {
            // 1. レイアウトの復元
            await this._restoreLayout(sessionData.layout);
            
            // 2. ターミナルの復元
            for (const [id, termData] of Object.entries(sessionData.terminals)) {
                await this._restoreTerminal(id, termData);
            }
            
            // 3. アクティブターミナルの設定
            if (sessionData.layout.activeTerminal) {
                this.termManager.focusTerminal(sessionData.layout.activeTerminal);
            }
            
            return { success: true };
        } catch (error) {
            console.error('Session restore failed:', error);
            return { success: false, error: error.message };
        }
    }
    
    // 個別ターミナルの復元
    async _restoreTerminal(id, termData) {
        // 新しいターミナルを作成
        const terminal = await this.termManager.createTerminal(id);
        
        // バッファの復元
        if (termData.buffer) {
            await this._restoreBuffer(terminal, termData.buffer);
        }
        
        // 作業ディレクトリの復元
        if (termData.state.cwd) {
            await this._changeCwd(terminal, termData.state.cwd);
        }
        
        // スクロール位置の復元
        if (termData.viewport.scrollback) {
            terminal.scrollToLine(termData.viewport.scrollback);
        }
        
        // サイズの復元
        if (termData.dimensions) {
            terminal.resize(termData.dimensions.cols, termData.dimensions.rows);
        }
    }
    
    // バッファの復元
    async _restoreBuffer(terminal, bufferData) {
        if (bufferData.format === 'xterm-serialize-v1') {
            // Base64デコード
            const decoded = atob(bufferData.serialized);
            
            // SerializeAddonで復元
            if (terminal.serializeAddon) {
                terminal.write(decoded);
            }
        } else if (bufferData.format === 'plain-text') {
            // プレーンテキストとして復元
            terminal.write(bufferData.serialized);
        }
    }
}
```

## 🎨 復元プロンプトUI

### セッション復元ダイアログ

```javascript
// 📍 src/renderer/features/SessionRestorePrompt.js

class SessionRestorePrompt {
    static async show(sessionInfo) {
        const dialog = document.createElement('div');
        dialog.className = 'session-restore-dialog';
        
        dialog.innerHTML = `
            <div class="dialog-content">
                <h3>前回のセッションを復元しますか？</h3>
                
                <div class="session-info">
                    <p>📅 保存日時: ${this._formatDate(sessionInfo.timestamp)}</p>
                    <p>⏱️ セッション時間: ${this._formatDuration(sessionInfo.metadata.sessionDuration)}</p>
                    <p>🖥️ ターミナル数: ${Object.keys(sessionInfo.terminals).length}</p>
                </div>
                
                <div class="session-preview">
                    ${this._generatePreview(sessionInfo)}
                </div>
                
                <div class="dialog-buttons">
                    <button class="restore-btn">復元する</button>
                    <button class="new-btn">新規セッション</button>
                    <button class="view-btn">詳細を見る</button>
                </div>
            </div>
        `;
        
        return new Promise((resolve) => {
            dialog.querySelector('.restore-btn').onclick = () => {
                resolve('restore');
                dialog.remove();
            };
            
            dialog.querySelector('.new-btn').onclick = () => {
                resolve('new');
                dialog.remove();
            };
            
            dialog.querySelector('.view-btn').onclick = () => {
                this._showDetails(sessionInfo);
            };
            
            document.body.appendChild(dialog);
        });
    }
    
    static _generatePreview(sessionInfo) {
        return Object.entries(sessionInfo.terminals).map(([id, term]) => `
            <div class="terminal-preview">
                <h4>${id === 'terminal-a' ? 'Terminal A' : 'Terminal B'}</h4>
                <p>📁 ${term.state.cwd}</p>
                <p>🐚 ${path.basename(term.state.shell)}</p>
            </div>
        `).join('');
    }
}
```

## ⚡ パフォーマンス最適化

### 差分保存

```javascript
// 📍 増分セッション保存

class IncrementalSessionSaver {
    constructor() {
        this.lastSnapshot = null;
        this.changeBuffer = [];
    }
    
    // 変更の検出と記録
    detectChanges(currentSession) {
        if (!this.lastSnapshot) {
            this.lastSnapshot = currentSession;
            return currentSession;
        }
        
        const changes = {};
        
        // ターミナルごとの差分を検出
        Object.keys(currentSession.terminals).forEach(id => {
            const current = currentSession.terminals[id];
            const last = this.lastSnapshot.terminals[id];
            
            if (this._hasChanged(current, last)) {
                changes[id] = this._getDiff(current, last);
            }
        });
        
        return changes;
    }
    
    // 効率的な保存
    async saveIncremental(changes) {
        // 小さな変更はメモリに蓄積
        this.changeBuffer.push({
            timestamp: Date.now(),
            changes
        });
        
        // 一定量溜まったら保存
        if (this.changeBuffer.length > 10) {
            await this.flush();
        }
    }
}
```

### セッションサイズの管理

```javascript
// 📍 セッションサイズの最適化

class SessionOptimizer {
    static optimize(session) {
        const optimized = { ...session };
        
        // 大きなバッファを圧縮
        Object.keys(optimized.terminals).forEach(id => {
            const term = optimized.terminals[id];
            
            // 10000行を超える場合は最新の5000行のみ保持
            if (term.buffer && term.buffer.serialized.length > 100000) {
                term.buffer = this._truncateBuffer(term.buffer);
            }
        });
        
        return optimized;
    }
    
    static _truncateBuffer(buffer) {
        // 最新の内容を保持
        const lines = buffer.serialized.split('\n');
        const truncated = lines.slice(-5000).join('\n');
        
        return {
            ...buffer,
            serialized: truncated,
            truncated: true
        };
    }
}
```

## 🔍 トラブルシューティング

### セッション復元の問題

| 問題 | 原因 | 解決方法 |
|-----|------|---------|
| セッションが復元されない | ファイル破損 | バックアップから復元 |
| 部分的な復元 | バージョン不一致 | セッションクリア |
| 遅い復元 | 大きなバッファ | セッション最適化 |
| 文字化け | エンコーディング | UTF-8で再保存 |

### デバッグコマンド

```javascript
// セッション情報の確認
await window.electronAPI.getSessionInfo();

// セッションの検証
await window.electronAPI.validateSession();

// セッションの修復
await window.electronAPI.repairSession();
```

## 🔗 関連ドキュメント

- [ターミナル管理](./terminal-management.md)
- [プロファイルシステム](./profile-system.md)
- [設定ガイド](../getting-started/configuration.md)

---

> 💡 **Claude Codeへのヒント**: セッションファイルは人間が読めるJSONですが、手動編集は推奨しません。破損した場合は、`.backup`ファイルから復元するか、クリアして新規作成してください。