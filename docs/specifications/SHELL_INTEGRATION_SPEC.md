# Shell Integration Technical Specification

## 概要

ZeamiTermにVS Code風のシェル統合機能を実装するための技術仕様書です。この機能により、コマンドの実行状態を視覚的に追跡し、開発効率を大幅に向上させます。

## 機能要件

### 1. コマンドライフサイクル追跡
- コマンドの開始と終了を検出
- 終了コードの取得と表示
- コマンド実行時間の計測
- 作業ディレクトリの変更追跡

### 2. 視覚的フィードバック
- コマンド境界の明確な表示
- 成功/失敗の色分け表示
- 実行時間の表示
- ホバー時の詳細情報表示

### 3. ナビゲーション機能
- コマンド間のジャンプ（Ctrl+Up/Down）
- コマンド履歴の検索
- 失敗したコマンドへの直接ジャンプ

## 技術設計

### OSCシーケンス定義

```javascript
// OSC (Operating System Command) sequences
const OSC_SEQUENCES = {
  // Prompt tracking
  PROMPT_START: '\x1b]133;A\x07',
  PROMPT_END: '\x1b]133;B\x07',
  
  // Command tracking
  COMMAND_START: '\x1b]133;C\x07',
  COMMAND_EXECUTED: '\x1b]133;D\x07',
  COMMAND_FINISHED: '\x1b]133;D;%s\x07', // %s = exit code
  
  // Working directory
  SET_CWD: '\x1b]1337;CurrentDir=%s\x07',
  
  // Custom sequences for ZeamiTerm
  COMMAND_TIME: '\x1b]633;CommandTime=%s\x07',
  COMMAND_LINE: '\x1b]633;CommandLine=%s\x07'
};
```

### データ構造

```typescript
interface ICommand {
  id: string;
  commandLine: string;
  startLine: number;
  endLine: number;
  startTime: number;
  endTime?: number;
  exitCode?: number;
  cwd: string;
  output: string[];
}

interface IShellIntegrationState {
  commands: Map<string, ICommand>;
  currentCommand?: ICommand;
  promptStart?: number;
  isExecuting: boolean;
}
```

### xterm.js統合

```javascript
// Custom OSC handler registration
export class ShellIntegrationAddon {
  constructor() {
    this._commands = new Map();
    this._decorations = new Map();
  }
  
  activate(terminal) {
    this._terminal = terminal;
    
    // Register OSC handlers
    terminal.parser.registerOscHandler(133, this._handlePromptSequence.bind(this));
    terminal.parser.registerOscHandler(633, this._handleCustomSequence.bind(this));
    terminal.parser.registerOscHandler(1337, this._handleITermSequence.bind(this));
    
    // Register decoration provider
    terminal.registerDecorationType('command-decoration', {
      backgroundColor: 'rgba(0, 0, 0, 0.1)',
      overviewRulerColor: '#007acc'
    });
  }
  
  _handlePromptSequence(data) {
    const [type, ...args] = data.split(';');
    
    switch (type) {
      case 'A': // Prompt start
        this._onPromptStart();
        break;
      case 'B': // Prompt end
        this._onPromptEnd();
        break;
      case 'C': // Command start
        this._onCommandStart();
        break;
      case 'D': // Command end
        this._onCommandEnd(args[0]);
        break;
    }
  }
}
```

### 装飾レンダリング

```javascript
class CommandDecorationRenderer {
  renderGutter(command) {
    const element = document.createElement('div');
    element.className = 'command-decoration-gutter';
    
    // Exit code indicator
    if (command.exitCode !== undefined) {
      const indicator = document.createElement('span');
      indicator.className = command.exitCode === 0 ? 'success' : 'error';
      indicator.textContent = command.exitCode === 0 ? '✓' : '✗';
      element.appendChild(indicator);
    }
    
    // Duration
    if (command.endTime) {
      const duration = document.createElement('span');
      duration.className = 'duration';
      duration.textContent = this._formatDuration(command.endTime - command.startTime);
      element.appendChild(duration);
    }
    
    return element;
  }
  
  _formatDuration(ms) {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
  }
}
```

### シェル設定スクリプト

#### Bash/Zsh
```bash
# ~/.zeamiterm/shell-integration.bash
# Source this file in .bashrc or .zshrc

# Send OSC sequences
_zeami_prompt_start() {
  printf '\033]133;A\007'
}

_zeami_prompt_end() {
  printf '\033]133;B\007'
}

_zeami_command_start() {
  printf '\033]133;C\007'
  printf '\033]633;CommandLine=%s\007' "$BASH_COMMAND"
}

_zeami_command_end() {
  local exit_code=$?
  printf '\033]133;D;%s\007' "$exit_code"
  printf '\033]1337;CurrentDir=%s\007' "$PWD"
  return $exit_code
}

# Hook into shell
PS1="\$(_zeami_prompt_start)$PS1\$(_zeami_prompt_end)"
trap '_zeami_command_start' DEBUG
PROMPT_COMMAND="_zeami_command_end;$PROMPT_COMMAND"
```

#### Fish
```fish
# ~/.zeamiterm/shell-integration.fish

function _zeami_prompt_start --on-event fish_prompt
    printf '\033]133;A\007'
end

function _zeami_prompt_end --on-event fish_prompt
    printf '\033]133;B\007'
end

function _zeami_command_start --on-event fish_preexec
    printf '\033]133;C\007'
    printf '\033]633;CommandLine=%s\007' "$argv"
end

function _zeami_command_end --on-event fish_postexec
    printf '\033]133;D;%s\007' "$status"
    printf '\033]1337;CurrentDir=%s\007' "$PWD"
end
```

## UI/UX設計

### ガター表示
```
┌─────┬─────────────────────────────
│ ✓ 2s│ $ npm install
│     │ added 150 packages...
│ ✗ 0s│ $ npm test
│     │ Error: Test failed
│ ▶   │ $ |
```

### ホバー情報
```
╭─────────────────────────────╮
│ Command: npm test           │
│ Exit Code: 1 (Error)        │
│ Duration: 523ms             │
│ Directory: /home/user/proj  │
│ Time: 2025-06-27 14:30:21   │
╰─────────────────────────────╯
```

## 実装フェーズ

### Phase 1: 基本実装
1. OSCシーケンスパーサー
2. コマンドデータ構造
3. 基本的な装飾表示

### Phase 2: UI強化
1. ガターレンダリング
2. ホバー情報表示
3. コマンドナビゲーション

### Phase 3: 高度な機能
1. コマンド履歴検索
2. 統計情報表示
3. エクスポート機能

## パフォーマンス考慮事項

- 装飾は viewport 内のみレンダリング
- コマンド履歴は最大1000件まで保持
- 非アクティブなタブでは装飾更新を停止

## テスト計画

### ユニットテスト
- OSCシーケンスパーサー
- コマンドライフサイクル管理
- 装飾レンダリング

### 統合テスト
- 各シェル（bash、zsh、fish）での動作確認
- 大量出力時のパフォーマンス
- エッジケース（ネストしたコマンド、バックグラウンドジョブ）

## 参考資料

- [VS Code Terminal Shell Integration](https://code.visualstudio.com/docs/terminal/shell-integration)
- [iTerm2 Shell Integration](https://iterm2.com/documentation-shell-integration.html)
- [OSC Sequences](https://invisible-island.net/xterm/ctlseqs/ctlseqs.html#h3-Operating-System-Commands)