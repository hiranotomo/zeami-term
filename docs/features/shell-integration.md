# シェル統合

> 🤖 **Claude Code最適化ドキュメント**  
> ターミナルとシェルの深い統合。コマンド追跡から自動補完まで。

## 🎯 クイックリファレンス

| 機能 | 対応シェル | 実装状態 |
|-----|-----------|---------|
| コマンド追跡 | bash, zsh | ✅ 実装済み |
| プロンプトマーカー | bash, zsh | ✅ 実装済み |
| ディレクトリ追跡 | bash, zsh | ✅ 実装済み |
| 自動補完 | zsh | 🚧 計画中 |
| コマンド履歴統合 | bash, zsh | 🚧 計画中 |

## 📋 シェル統合の概要

```yaml
目的: シェルとターミナルの緊密な連携
実装方式: OSC（Operating System Command）シーケンス
プロトコル: OSC 133（VS Code互換）
主な機能:
  - コマンドの開始/終了検出
  - 作業ディレクトリの自動追跡
  - プロンプトの識別
  - 実行結果の自動判定
```

## 🏗️ 統合アーキテクチャ

### OSCシーケンスプロトコル

```bash
# OSC 133 シーケンス
OSC 133 ; A ST    # プロンプト開始
OSC 133 ; B ST    # プロンプト終了
OSC 133 ; C ST    # コマンド実行開始
OSC 133 ; D ; <exit-code> ST    # コマンド実行終了

# OSC 7 シーケンス
OSC 7 ; file://hostname/path ST    # 作業ディレクトリ

# OSC 1337 シーケンス（iTerm2互換）
OSC 1337 ; CurrentDir=/path ST    # 作業ディレクトリ（代替）
```

## 🔧 実装詳細

### シェル統合スクリプト（Bash）

```bash
# 📍 shell-integration/bash-integration.sh

# ZeamiTerm検出
if [ -n "$ZEAMI_TERM" ]; then
    # プロンプトコマンドの設定
    __zeami_prompt_command() {
        local exit_code=$?
        
        # コマンド終了マーカー
        printf "\033]133;D;%s\007" "$exit_code"
        
        # 作業ディレクトリの送信
        printf "\033]7;file://%s%s\007" "$HOSTNAME" "$PWD"
        
        # プロンプト開始マーカー
        printf "\033]133;A\007"
    }
    
    # 既存のPROMPT_COMMANDを保持
    if [ -n "$PROMPT_COMMAND" ]; then
        PROMPT_COMMAND="__zeami_prompt_command; $PROMPT_COMMAND"
    else
        PROMPT_COMMAND="__zeami_prompt_command"
    fi
    
    # PS1の拡張（プロンプト終了マーカー）
    PS1="\[\033]133;B\007\]$PS1"
    
    # コマンド実行前フック
    trap '__zeami_preexec' DEBUG
    
    __zeami_preexec() {
        # DEBUGトラップの無限ループ防止
        if [ "$BASH_COMMAND" = "__zeami_prompt_command" ]; then
            return
        fi
        
        # コマンド開始マーカー
        printf "\033]133;C\007"
    }
    
    # エイリアス
    alias clear='printf "\033[2J\033[H"; __zeami_prompt_command'
fi
```

### シェル統合スクリプト（Zsh）

```bash
# 📍 shell-integration/zsh-integration.sh

# ZeamiTerm検出
if [ -n "$ZEAMI_TERM" ]; then
    # プロンプト関数
    __zeami_precmd() {
        local exit_code=$?
        
        # コマンド終了マーカー
        printf "\033]133;D;%s\007" "$exit_code"
        
        # 作業ディレクトリ
        printf "\033]7;file://%s%s\007" "$HOST" "$PWD"
        
        # プロンプト開始マーカー
        printf "\033]133;A\007"
    }
    
    # コマンド実行前
    __zeami_preexec() {
        # コマンド開始マーカー
        printf "\033]133;C\007"
    }
    
    # フックの登録
    precmd_functions+=(__zeami_precmd)
    preexec_functions+=(__zeami_preexec)
    
    # PS1の拡張
    PS1="%{$(printf '\033]133;B\007')%}$PS1"
    
    # 自動補完の拡張
    if [ -f ~/.zeamiterm/completions/zeami.zsh ]; then
        source ~/.zeamiterm/completions/zeami.zsh
    fi
fi
```

### ShellIntegrationAddon実装

```javascript
// 📍 src/renderer/addons/ShellIntegrationAddon.js

class ShellIntegrationAddon {
    constructor() {
        this.terminal = null;
        this.currentCommand = null;
        this.currentPrompt = null;
        this.cwd = process.env.HOME;
        
        // コールバック
        this.onCommandStart = null;
        this.onCommandEnd = null;
        this.onPromptStart = null;
        this.onPromptEnd = null;
        this.onCwdChange = null;
    }
    
    activate(terminal) {
        this.terminal = terminal;
        
        // OSCハンドラーの登録
        this._registerOscHandlers();
        
        // デコレーション用のマーカー
        this._setupDecorations();
    }
    
    _registerOscHandlers() {
        // OSC 133 - シェル統合
        this.terminal.parser.registerOscHandler(133, (data) => {
            const [type, ...args] = data.split(';');
            
            switch (type) {
                case 'A': // プロンプト開始
                    this._handlePromptStart();
                    break;
                    
                case 'B': // プロンプト終了
                    this._handlePromptEnd();
                    break;
                    
                case 'C': // コマンド開始
                    this._handleCommandStart();
                    break;
                    
                case 'D': // コマンド終了
                    this._handleCommandEnd(args[0]);
                    break;
            }
            
            return true;
        });
        
        // OSC 7 - 作業ディレクトリ
        this.terminal.parser.registerOscHandler(7, (data) => {
            this._handleCwdChange(data);
            return true;
        });
        
        // OSC 1337 - iTerm2互換
        this.terminal.parser.registerOscHandler(1337, (data) => {
            const [key, value] = data.split('=');
            if (key === 'CurrentDir') {
                this._handleCwdChange(`file://${value}`);
            }
            return true;
        });
    }
    
    _handlePromptStart() {
        this.currentPrompt = {
            line: this.terminal.buffer.active.cursorY,
            startTime: Date.now()
        };
        
        if (this.onPromptStart) {
            this.onPromptStart(this.currentPrompt);
        }
        
        // プロンプト行にデコレーション
        this._addPromptDecoration(this.currentPrompt.line);
    }
    
    _handleCommandStart() {
        const commandLine = this._extractCommand();
        
        this.currentCommand = {
            id: crypto.randomUUID(),
            command: commandLine,
            startLine: this.terminal.buffer.active.cursorY,
            startTime: Date.now(),
            cwd: this.cwd
        };
        
        if (this.onCommandStart) {
            this.onCommandStart(this.currentCommand);
        }
        
        // コマンド行にデコレーション
        this._addCommandDecoration(this.currentCommand.startLine);
    }
    
    _handleCommandEnd(exitCode) {
        if (!this.currentCommand) return;
        
        const endData = {
            ...this.currentCommand,
            exitCode: parseInt(exitCode || '0'),
            endTime: Date.now(),
            duration: Date.now() - this.currentCommand.startTime,
            endLine: this.terminal.buffer.active.cursorY
        };
        
        if (this.onCommandEnd) {
            this.onCommandEnd(endData);
        }
        
        // 実行結果に基づくデコレーション
        this._addResultDecoration(
            this.currentCommand.startLine,
            endData.endLine,
            endData.exitCode
        );
        
        this.currentCommand = null;
    }
    
    _handleCwdChange(data) {
        // file://hostname/path 形式をパース
        const match = data.match(/^file:\/\/([^/]*)(.*)$/);
        if (match) {
            const [, hostname, path] = match;
            this.cwd = path || '/';
            
            if (this.onCwdChange) {
                this.onCwdChange(this.cwd);
            }
        }
    }
    
    _extractCommand() {
        // プロンプト終了位置から現在位置までのテキストを取得
        if (!this.currentPrompt) return '';
        
        const buffer = this.terminal.buffer.active;
        const startY = this.currentPrompt.line;
        const endY = buffer.cursorY;
        
        let command = '';
        for (let y = startY; y <= endY; y++) {
            const line = buffer.getLine(y);
            if (line) {
                command += line.translateToString().trim() + ' ';
            }
        }
        
        return command.trim();
    }
}
```

### 自動インストーラー

```javascript
// 📍 src/main/shellIntegrationInstaller.js

class ShellIntegrationInstaller {
    constructor() {
        this.integrationDir = path.join(
            app.getPath('userData'), 
            'shell-integration'
        );
    }
    
    async install(shellPath) {
        const shellName = path.basename(shellPath);
        
        switch (shellName) {
            case 'bash':
                return await this._installBash();
            case 'zsh':
                return await this._installZsh();
            default:
                return { 
                    success: false, 
                    error: `Unsupported shell: ${shellName}` 
                };
        }
    }
    
    async _installBash() {
        try {
            // 統合スクリプトをコピー
            const scriptPath = path.join(
                this.integrationDir, 
                'bash-integration.sh'
            );
            
            await fs.copyFile(
                path.join(__dirname, '../shell-integration/bash-integration.sh'),
                scriptPath
            );
            
            // .bashrcに追加
            const bashrcPath = path.join(os.homedir(), '.bashrc');
            const sourceCommand = `\n# ZeamiTerm Shell Integration\n[ -f "${scriptPath}" ] && source "${scriptPath}"\n`;
            
            // 既に追加されているかチェック
            const bashrc = await fs.readFile(bashrcPath, 'utf8');
            if (!bashrc.includes('ZeamiTerm Shell Integration')) {
                await fs.appendFile(bashrcPath, sourceCommand);
            }
            
            return { 
                success: true, 
                message: 'Bash統合をインストールしました。新しいターミナルで有効になります。' 
            };
        } catch (error) {
            return { 
                success: false, 
                error: error.message 
            };
        }
    }
    
    async _installZsh() {
        // 同様の実装
        const scriptPath = path.join(
            this.integrationDir, 
            'zsh-integration.sh'
        );
        
        // .zshrcに追加
        const zshrcPath = path.join(os.homedir(), '.zshrc');
        // ... 実装
    }
    
    async check(shellPath) {
        const shellName = path.basename(shellPath);
        const scriptPath = path.join(
            this.integrationDir,
            `${shellName}-integration.sh`
        );
        
        return {
            installed: await this._fileExists(scriptPath),
            path: scriptPath
        };
    }
}
```

## 🎨 UI統合

### コマンドデコレーション

```javascript
// 📍 src/renderer/features/CommandDecorations.js

class CommandDecorations {
    constructor(terminal) {
        this.terminal = terminal;
        this.decorations = new Map();
    }
    
    // プロンプトのデコレーション
    addPromptDecoration(line) {
        const decoration = this.terminal.registerDecoration({
            line,
            x: 1
        });
        
        decoration.onRender(element => {
            element.classList.add('prompt-line');
            element.title = '📍 プロンプト';
        });
        
        this.decorations.set(`prompt-${line}`, decoration);
    }
    
    // コマンドのデコレーション
    addCommandDecoration(startLine, command) {
        const decoration = this.terminal.registerDecoration({
            line: startLine,
            x: 1
        });
        
        decoration.onRender(element => {
            element.classList.add('command-line');
            
            // 実行時間インジケーター
            const indicator = document.createElement('span');
            indicator.className = 'command-indicator running';
            indicator.innerHTML = '⏱️';
            element.appendChild(indicator);
        });
        
        this.decorations.set(`command-${startLine}`, decoration);
    }
    
    // 結果のデコレーション
    addResultDecoration(startLine, endLine, exitCode) {
        const isSuccess = exitCode === 0;
        
        // コマンド行の更新
        const commandDeco = this.decorations.get(`command-${startLine}`);
        if (commandDeco) {
            commandDeco.onRender(element => {
                element.classList.remove('running');
                element.classList.add(isSuccess ? 'success' : 'error');
                
                const indicator = element.querySelector('.command-indicator');
                if (indicator) {
                    indicator.innerHTML = isSuccess ? '✅' : '❌';
                }
            });
        }
        
        // 結果範囲のハイライト
        for (let line = startLine; line <= endLine; line++) {
            const decoration = this.terminal.registerDecoration({
                line,
                x: 1,
                width: this.terminal.cols
            });
            
            decoration.onRender(element => {
                element.classList.add('command-output');
                element.classList.add(isSuccess ? 'output-success' : 'output-error');
            });
        }
    }
}
```

### ステータスバー表示

```javascript
// 📍 src/renderer/components/ShellIntegrationStatus.js

class ShellIntegrationStatus {
    constructor() {
        this.element = this._createElement();
        this.currentCwd = '';
        this.isIntegrated = false;
    }
    
    _createElement() {
        const status = document.createElement('div');
        status.className = 'shell-integration-status';
        
        status.innerHTML = `
            <span class="integration-indicator" title="シェル統合">
                <span class="icon">🔗</span>
                <span class="status">未接続</span>
            </span>
            <span class="cwd-display" title="作業ディレクトリ">
                <span class="icon">📁</span>
                <span class="path">~</span>
            </span>
        `;
        
        return status;
    }
    
    updateIntegrationStatus(isIntegrated) {
        this.isIntegrated = isIntegrated;
        
        const indicator = this.element.querySelector('.integration-indicator');
        const status = indicator.querySelector('.status');
        
        if (isIntegrated) {
            indicator.classList.add('connected');
            status.textContent = '接続済み';
        } else {
            indicator.classList.remove('connected');
            status.textContent = '未接続';
        }
    }
    
    updateCwd(cwd) {
        this.currentCwd = cwd;
        
        const pathElement = this.element.querySelector('.cwd-display .path');
        
        // ホームディレクトリを~に短縮
        const home = process.env.HOME;
        const displayPath = cwd.startsWith(home) 
            ? cwd.replace(home, '~') 
            : cwd;
        
        pathElement.textContent = displayPath;
        pathElement.title = cwd;
    }
}
```

## ⚡ 高度な機能

### コマンド履歴の統合

```javascript
// 📍 将来実装予定

class CommandHistory {
    constructor() {
        this.history = [];
        this.maxHistory = 1000;
    }
    
    // シェル履歴との同期
    async syncWithShell(shellPath) {
        const historyFile = this._getHistoryFile(shellPath);
        
        if (historyFile) {
            const content = await fs.readFile(historyFile, 'utf8');
            const lines = content.split('\n');
            
            // 履歴フォーマットのパース
            this.history = lines
                .filter(line => line.trim())
                .map(line => this._parseHistoryLine(line));
        }
    }
    
    _getHistoryFile(shellPath) {
        const shellName = path.basename(shellPath);
        const home = process.env.HOME;
        
        switch (shellName) {
            case 'bash':
                return path.join(home, '.bash_history');
            case 'zsh':
                return path.join(home, '.zsh_history');
            default:
                return null;
        }
    }
}
```

## 🔍 トラブルシューティング

### 統合が機能しない場合

| 問題 | 原因 | 解決方法 |
|-----|------|---------|
| マーカーが表示される | エスケープシーケンスが可視化 | ターミナル設定確認 |
| コマンドが検出されない | シェル統合未インストール | 自動インストール実行 |
| 作業ディレクトリが更新されない | OSC 7未サポート | シェルアップデート |
| プロンプトが二重になる | PROMPT_COMMAND競合 | 統合スクリプト調整 |

### デバッグモード

```javascript
// シェル統合のデバッグ
window.SHELL_INTEGRATION_DEBUG = true;

// すべてのOSCシーケンスをログ
terminal.parser.registerOscHandler(0, (id, data) => {
    console.log(`OSC ${id}: ${data}`);
    return false; // 処理を続行
});
```

## 🔗 関連ドキュメント

- [通知システム](./notification-system.md)
- [コマンド追跡](../architecture/renderer-process.md#コマンド追跡)
- [OSCプロトコル仕様](https://invisible-island.net/xterm/ctlseqs/ctlseqs.html)

---

> 💡 **Claude Codeへのヒント**: シェル統合は自動的にインストールされますが、ユーザーのシェル設定を尊重してください。既存の設定を破壊しないよう、追加は慎重に行われます。