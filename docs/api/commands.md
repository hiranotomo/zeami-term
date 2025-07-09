# 内蔵コマンドリファレンス

> 🤖 **Claude Code最適化ドキュメント**  
> ZeamiTermの内蔵コマンド完全リファレンス。ターミナル内で使える特別なコマンド。

## 🎯 クイックリファレンス

| コマンド | 説明 | エイリアス |
|---------|------|-----------|
| `help` | ヘルプを表示 | `?`, `h` |
| `clear` | 画面をクリア | `cls` |
| `save` | ターミナル内容を保存 | `export` |
| `matrix` | マトリックス表示 | - |
| `theme` | テーマを変更 | - |
| `profile` | プロファイル管理 | - |
| `session` | セッション管理 | - |

## 📋 コマンド詳細

### help - ヘルプ表示

使用可能なコマンドとキーボードショートカットを表示します。

```bash
# 基本ヘルプ
help

# 特定のトピック
help shortcuts    # キーボードショートカット
help commands     # コマンド一覧
help profiles     # プロファイルヘルプ
```

**実装**:
```javascript
// 📍 src/commands/help.js
CommandRegistry.register('help', {
    aliases: ['?', 'h'],
    description: 'Show help information',
    execute: async (args, terminal) => {
        const topic = args[0] || 'general';
        const helpText = HelpGenerator.generate(topic);
        terminal.writeln(helpText);
    }
});
```

### clear - 画面クリア

ターミナルバッファをクリアして、カーソルを左上に移動します。

```bash
# 画面クリア
clear

# エイリアス
cls
```

**オプション**:
- `--history`: スクロールバック履歴も含めてクリア
- `--keep-prompt`: プロンプトを保持

**実装**:
```javascript
// 📍 src/commands/clear.js
CommandRegistry.register('clear', {
    aliases: ['cls'],
    description: 'Clear terminal screen',
    execute: async (args, terminal) => {
        if (args.includes('--history')) {
            terminal.clear();
        } else {
            terminal.write('\x1b[2J\x1b[H');
        }
        
        if (!args.includes('--keep-prompt')) {
            terminal.write(terminal.prompt);
        }
    }
});
```

### save - ターミナル内容保存

現在のターミナル内容をファイルに保存します。

```bash
# デフォルトファイル名で保存
save

# ファイル名を指定
save output.txt

# HTMLとして保存
save --format=html terminal.html

# 選択範囲のみ保存
save --selection-only
```

**オプション**:
- `--format`: 出力形式 (`text`, `html`, `json`)
- `--selection-only`: 選択範囲のみ保存
- `--include-colors`: ANSIカラーコードを含める

**実装**:
```javascript
// 📍 src/commands/save.js
CommandRegistry.register('save', {
    aliases: ['export'],
    description: 'Save terminal content to file',
    execute: async (args, terminal) => {
        const options = parseArgs(args);
        const content = await terminal.serialize({
            format: options.format || 'text',
            includeColors: options.includeColors,
            selectionOnly: options.selectionOnly
        });
        
        const result = await window.electronAPI.saveFile({
            content,
            defaultFilename: options.filename || `terminal-${Date.now()}.txt`,
            filters: getFiltersForFormat(options.format)
        });
        
        if (result.success) {
            terminal.writeln(`\n✅ Saved to: ${result.path}`);
        }
    }
});
```

### matrix - マトリックス表示

映画「マトリックス」風のアニメーションを表示します（イースターエッグ）。

```bash
# マトリックス開始
matrix

# 速度指定
matrix --speed=fast
matrix --speed=slow

# 色指定
matrix --color=green
matrix --color=blue
```

**オプション**:
- `--speed`: アニメーション速度 (`slow`, `normal`, `fast`)
- `--color`: 文字色 (`green`, `blue`, `red`, `white`)
- `--duration`: 実行時間（秒）

**実装**:
```javascript
// 📍 src/commands/matrix.js
CommandRegistry.register('matrix', {
    description: 'Show matrix rain animation',
    execute: async (args, terminal) => {
        const options = parseArgs(args);
        const matrix = new MatrixRain(terminal, {
            speed: options.speed || 'normal',
            color: options.color || 'green',
            duration: options.duration || Infinity
        });
        
        matrix.start();
        
        // ESCまたはCtrl+Cで停止
        const disposable = terminal.onData(data => {
            if (data === '\x1b' || data === '\x03') {
                matrix.stop();
                disposable.dispose();
            }
        });
    }
});
```

### theme - テーマ変更

ターミナルのカラーテーマを変更します。

```bash
# 利用可能なテーマ一覧
theme list

# テーマ変更
theme monokai
theme solarized-dark

# 現在のテーマ
theme current
```

**利用可能なテーマ**:
- `vs-dark`: Visual Studio Dark（デフォルト）
- `monokai`: Monokai
- `solarized-dark`: Solarized Dark
- `solarized-light`: Solarized Light
- `dracula`: Dracula
- `nord`: Nord

**実装**:
```javascript
// 📍 src/commands/theme.js
CommandRegistry.register('theme', {
    description: 'Change terminal theme',
    execute: async (args, terminal) => {
        const subcommand = args[0];
        
        switch (subcommand) {
            case 'list':
                const themes = ThemeManager.getAvailableThemes();
                terminal.writeln('\nAvailable themes:');
                themes.forEach(theme => {
                    terminal.writeln(`  • ${theme.name} - ${theme.description}`);
                });
                break;
                
            case 'current':
                const current = ThemeManager.getCurrentTheme();
                terminal.writeln(`\nCurrent theme: ${current}`);
                break;
                
            default:
                if (subcommand) {
                    const success = await ThemeManager.applyTheme(terminal, subcommand);
                    if (success) {
                        terminal.writeln(`\n✅ Theme changed to: ${subcommand}`);
                    } else {
                        terminal.writeln(`\n❌ Unknown theme: ${subcommand}`);
                    }
                }
        }
    }
});
```

### profile - プロファイル管理

プロファイルの切り替えと管理を行います。

```bash
# プロファイル一覧
profile list

# プロファイル切替
profile switch nodejs
profile use python

# 現在のプロファイル
profile current

# 新規作成
profile create myproject --shell=/bin/zsh

# 削除
profile delete myproject
```

**サブコマンド**:
- `list`: プロファイル一覧表示
- `switch`/`use`: プロファイル切替
- `current`: 現在のプロファイル表示
- `create`: 新規プロファイル作成
- `delete`: プロファイル削除
- `edit`: プロファイル編集

### session - セッション管理

セッションの保存、復元、管理を行います。

```bash
# セッション保存
session save
session save mywork

# セッション復元
session restore
session restore mywork

# セッション一覧
session list

# セッション削除
session delete old-session
```

**サブコマンド**:
- `save`: 現在のセッションを保存
- `restore`: セッションを復元
- `list`: 保存済みセッション一覧
- `delete`: セッションを削除
- `clear`: 現在のセッションをクリア

## 🎨 カスタムコマンドの追加

### コマンド登録の仕組み

```javascript
// 📍 src/commands/CommandRegistry.js

class CommandRegistry {
    static commands = new Map();
    
    static register(name, config) {
        this.commands.set(name, {
            name,
            aliases: config.aliases || [],
            description: config.description,
            execute: config.execute,
            autocomplete: config.autocomplete
        });
        
        // エイリアスも登録
        config.aliases?.forEach(alias => {
            this.commands.set(alias, this.commands.get(name));
        });
    }
    
    static async execute(commandLine, terminal) {
        const [command, ...args] = commandLine.trim().split(/\s+/);
        const handler = this.commands.get(command);
        
        if (handler) {
            try {
                await handler.execute(args, terminal);
                return true;
            } catch (error) {
                terminal.writeln(`\n❌ Error: ${error.message}`);
                return false;
            }
        }
        
        return false; // コマンドが見つからない
    }
}
```

### カスタムコマンドの例

```javascript
// 📍 src/commands/custom/git-status.js

CommandRegistry.register('gs', {
    description: 'Git status shortcut',
    execute: async (args, terminal) => {
        // 実際のgitコマンドを実行
        terminal.writeln('\n📊 Git Status:');
        terminal.paste('git status\n');
    }
});

// より高度な例
CommandRegistry.register('project', {
    description: 'Project management',
    autocomplete: async (partial) => {
        // 自動補完候補を返す
        const projects = await getProjectList();
        return projects.filter(p => p.startsWith(partial));
    },
    execute: async (args, terminal) => {
        const [action, project] = args;
        
        switch (action) {
            case 'open':
                await openProject(project);
                terminal.writeln(`\n📂 Opened project: ${project}`);
                break;
            
            case 'create':
                await createProject(project);
                terminal.writeln(`\n✨ Created project: ${project}`);
                break;
        }
    }
});
```

## ⚡ コマンドインターセプト

### グローバルインターセプト

```javascript
// すべての入力をインターセプト
terminal.setCommandInterceptor((command) => {
    // カスタムコマンドかチェック
    if (CommandRegistry.has(command)) {
        CommandRegistry.execute(command, terminal);
        return { handled: true };
    }
    
    // 通常のシェルコマンドとして処理
    return { handled: false };
});
```

### 条件付きインターセプト

```javascript
// 特定のパターンのみインターセプト
terminal.setCommandInterceptor((command) => {
    // "z "で始まるコマンドをインターセプト
    if (command.startsWith('z ')) {
        const zeamiCommand = command.substring(2);
        executeZeamiCommand(zeamiCommand);
        return { handled: true };
    }
    
    return { handled: false };
});
```

## 🔗 関連ドキュメント

- [ターミナル管理](../features/terminal-management.md)
- [キーボードショートカット](../reference/keyboard-shortcuts.md)
- [拡張開発ガイド](../development/plugin-development.md)

---

> 💡 **Claude Codeへのヒント**: 内蔵コマンドは、通常のシェルコマンドより優先されます。新しいコマンドを追加する際は、既存のシェルコマンドと名前が重複しないよう注意してください。