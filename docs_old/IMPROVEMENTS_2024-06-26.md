# ZeamiTerm 改善実装記録 - 2024年6月26日

## 概要

`claude`コマンドが動作しない問題を契機に、ZeamiTermの潜在的な問題を深層分析し、即座に実装可能な改善を行いました。

## 実装した改善

### 1. シェル初期化プロセスの改善

#### 問題
- `.zshrc`や`.bashrc`が読み込まれない
- ユーザーのカスタムエイリアスや関数が使えない

#### 解決策
`src/main/workingPty.js`でシェル起動オプションを修正：

```python
# For zsh/bash, use login shell to load RC files
if 'zsh' in shell or 'bash' in shell:
    os.execvp(shell, [shell, '-l', '-i'])
else:
    os.execvp(shell, [shell, '-i'])
```

#### 結果
- `.zshrc`、`.bashrc`が自動的に読み込まれる
- ユーザーのカスタム設定が反映される

### 2. 一般的な開発ツールのPATH自動設定

#### 問題
- Node.js、Python、Ruby等の開発ツールが見つからない
- homebrewでインストールしたツールが使えない

#### 解決策
`src/main/ptyService.js`で開発ツールの一般的なインストール場所をPATHに追加：

```javascript
const devPaths = [
  '/usr/local/bin',
  '/opt/homebrew/bin',
  '/opt/homebrew/sbin',
  `${process.env.HOME}/.npm-global/bin`,
  `${process.env.HOME}/.cargo/bin`,
  `${process.env.HOME}/.rbenv/shims`,
  `${process.env.HOME}/.pyenv/shims`,
  `${process.env.HOME}/.nvm/versions/node/*/bin`,
  `${process.env.HOME}/go/bin`,
  '/usr/local/go/bin',
  `${process.env.HOME}/.local/bin`,
  '/Applications/Visual Studio Code.app/Contents/Resources/app/bin'
];
```

#### 結果
- git、npm、yarn、python、ruby、go、rustなどが自動的に使用可能
- VS Codeの`code`コマンドも使用可能（パスが存在する場合）

### 3. claudeコマンドの修正

#### 問題
- `env -S`オプションがmacOSで認識されない

#### 解決策
`src/main/ptyConfig.js`で自動的にエイリアスを設定：

```javascript
const claudeAlias = "alias claude='node --no-warnings --enable-source-maps $HOME/.npm-global/bin/claude'";
pty.write(claudeAlias + '\r');
```

#### 結果
- `claude`コマンドが正常に動作

### 4. ターミナルセッションの永続化と復元

#### 実装内容

**新規ファイル：**
- `src/main/sessionManager.js` - セッション管理クラス

**修正ファイル：**
- `src/main/index.js` - セッション管理の統合
- `src/renderer/terminalManager.js` - セッション保存・復元機能
- `src/preload/index.js` - IPC API追加
- `src/renderer/splitManager.js` - レイアウト保存機能

#### 機能詳細

1. **自動保存**
   - 30秒ごとに自動保存
   - アプリ終了時に保存
   - ウィンドウクローズ時に保存

2. **保存される内容**
   - ターミナルの表示内容（バッファ）
   - 現在の作業ディレクトリ
   - 使用中のシェル
   - ウィンドウサイズ
   - 分割レイアウト（split状態）
   - アクティブなタブ

3. **保存場所**
   - `~/.zeami-term/sessions/last-session.json`

4. **セッションの有効期限**
   - 7日間（それ以上古いセッションは無視）

#### コード例

```javascript
// セッション保存
async saveSession() {
  const sessionData = {
    terminals: Array.from(this.terminals.entries()).map(([id, session]) => ({
      id: id,
      title: session.title,
      cwd: session.cwd,
      shell: session.shell,
      buffer: session.serializeAddon ? session.serializeAddon.serialize() : '',
      scrollback: session.terminal.buffer.active.length,
      activeCommand: '',
      history: []
    })),
    activeTerminalId: this.activeTerminalId,
    windowBounds: {
      width: window.innerWidth,
      height: window.innerHeight
    },
    splitLayout: this.splitManager ? this.splitManager.getLayout() : null
  };
  
  if (window.electronAPI) {
    await window.electronAPI.saveSession(sessionData);
  }
}
```

## 潜在的な問題の分析結果

### 開発ツール・CLIコマンドの互換性問題
- パッケージマネージャー（npm, yarn, pip, gem等）
- バージョン管理ツール（nvm, rbenv, pyenv等）
- クラウドツール（aws, gcloud, kubectl等）

### シェル環境・初期化の問題
- カスタムプロンプト（oh-my-zsh等）の不適用
- direnvによる自動環境変数設定
- zやautojumpなどのツール

### 日本語・国際化対応
- 文字エンコーディング問題
- 日本語IMEの切り替え
- 日本語ファイル名の表示

### 認証・セキュリティ関連
- ssh-agentの転送
- Git credential helper
- Touch ID認証

### パフォーマンス・UX機能
- コマンド履歴の永続化
- fuzzy finder (fzf) 統合
- tmux/screenサポート

## 今後の実装予定

### 優先度：高
1. Zeami CLI深い統合
2. コマンド履歴の永続化
3. 日本語対応の改善

### 優先度：中
1. VS Code連携強化
2. SSH agent転送
3. エラーパターン学習

### 優先度：低
1. GPU加速（WebGL）
2. 高度な分割レイアウト
3. プラグインシステム

## 使用方法

### セッション機能
```bash
# アプリを終了
Cmd+Q

# 再起動すると自動的に前回の状態が復元される
npm run dev
```

### 開発ツール
```bash
# 以下のコマンドが自動的に使用可能
git status
npm install
yarn add
python --version
ruby --version
go version
cargo --version
code .  # VS Code
```

### claudeコマンド
```bash
# 自動的にエイリアスが設定される
claude

# 手動で設定する場合
alias claude='node --no-warnings --enable-source-maps $HOME/.npm-global/bin/claude'
```

## ビルド情報

```bash
# ビルドコマンド
npm run build

# 出力ファイル
dist/ZeamiTerm-0.1.0-arm64.dmg
dist/ZeamiTerm-0.1.0-arm64-mac.zip
dist/mac-arm64/ZeamiTerm.app
```

## 技術的詳細

### ファイル構成
```
zeami-term/
├── src/
│   ├── main/
│   │   ├── sessionManager.js  # NEW: セッション管理
│   │   ├── ptyService.js      # 改善: PATH設定
│   │   ├── workingPty.js      # 改善: シェル初期化
│   │   └── ptyConfig.js       # 改善: claudeエイリアス
│   └── renderer/
│       └── terminalManager.js  # 改善: セッション保存・復元
└── docs/
    └── IMPROVEMENTS_2024-06-26.md  # このドキュメント
```

### セッションファイル形式
```json
{
  "timestamp": "2024-06-26T08:00:00.000Z",
  "version": "1.0",
  "terminals": [{
    "id": "terminal-1",
    "title": "Terminal 1",
    "cwd": "/Users/hirano/develop",
    "shell": "/bin/zsh",
    "buffer": "...",
    "scrollback": 1000,
    "activeCommand": "",
    "history": []
  }],
  "activeTerminalId": "terminal-1",
  "windowBounds": {
    "width": 1200,
    "height": 800
  },
  "splitLayout": {
    "mode": "horizontal",
    "isActive": true,
    "splitRatio": 0.5,
    "orientation": "horizontal"
  }
}
```

## 参考資料

- [VS Code Terminal Source](https://github.com/microsoft/vscode/tree/main/src/vs/workbench/contrib/terminal)
- [xterm.js Documentation](https://xtermjs.org/)
- [Electron Session Management](https://www.electronjs.org/docs/latest/api/session)

## 更新履歴

- 2024-06-26: 初版作成
  - シェル初期化改善
  - PATH自動設定
  - claudeコマンド修正
  - セッション永続化実装
  - 初期ディレクトリをホームディレクトリに設定