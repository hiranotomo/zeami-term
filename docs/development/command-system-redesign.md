# ZeamiTerm Command System Redesign

## 概要

ZeamiTermのコマンドシステムを根本から再設計し、xterm.jsフォークの利点を最大限に活用する。

## 現状の問題点

### 1. アーキテクチャの混乱
```
現在の構造（混乱）:
├── メインプロセス
│   ├── commandInterceptor.js（未使用）
│   └── messageRouter.js（最小限の実装）
└── レンダラープロセス
    ├── matrix-command.js（動作せず、モンキーパッチ）
    ├── startup-animation.js（独立したmatrix実装）
    └── terminalManager.js（複雑な依存関係）
```

### 2. 主な問題
- コマンドインターセプトが複数箇所で試みられている
- IPCメッセージの送受信が確立されていない
- xterm.jsの内部APIへの不適切なアクセス
- デバッグが困難な複雑な実装

## 新しい設計

### 1. アーキテクチャ概要
```
提案する構造（クリーン）:
├── xterm-zeami/
│   ├── ZeamiTerminal.js（xterm.jsを拡張）
│   └── CommandInterceptor.js（内蔵）
├── commands/
│   ├── CommandRegistry.js（統一管理）
│   ├── builtin/（ビルトインコマンド）
│   │   ├── HelpCommand.js
│   │   ├── ClearCommand.js
│   │   └── MenuCommand.js
│   └── effects/（エフェクトコマンド）
│       └── MatrixCommand.js
└── ZeamiTermManager.js（シンプルな管理）
```

### 2. コア実装

#### ZeamiTerminal（xterm.js拡張）
```javascript
// src/xterm-zeami/ZeamiTerminal.js
import { Terminal } from '../xterm-fork/src/Terminal';
import { CommandInterceptor } from './CommandInterceptor';
import { CommandRegistry } from '../commands/CommandRegistry';

export class ZeamiTerminal extends Terminal {
  constructor(options = {}) {
    super(options);
    
    // コマンドシステムの初期化
    this.commandRegistry = new CommandRegistry();
    this.commandInterceptor = new CommandInterceptor(this, this.commandRegistry);
    
    // ビルトインコマンドの登録
    this._registerBuiltinCommands();
  }
  
  // PTYへの送信前にコマンドをインターセプト
  write(data, callback) {
    if (this.commandInterceptor.shouldIntercept(data)) {
      const result = this.commandInterceptor.process(data);
      if (result.handled) {
        // コマンドが処理された場合はPTYに送らない
        if (callback) callback();
        return;
      }
    }
    
    // 通常の処理
    super.write(data, callback);
  }
  
  registerCommand(name, handler, options = {}) {
    this.commandRegistry.register(name, handler, options);
  }
}
```

#### CommandRegistry（統一管理）
```javascript
// src/commands/CommandRegistry.js
export class CommandRegistry {
  constructor() {
    this.commands = new Map();
    this.categories = new Map();
  }
  
  register(name, handler, options = {}) {
    const command = {
      name,
      handler,
      description: options.description || '',
      usage: options.usage || name,
      category: options.category || 'user',
      aliases: options.aliases || []
    };
    
    this.commands.set(name, command);
    
    // エイリアスも登録
    command.aliases.forEach(alias => {
      this.commands.set(alias, command);
    });
    
    // カテゴリに追加
    if (!this.categories.has(command.category)) {
      this.categories.set(command.category, []);
    }
    this.categories.get(command.category).push(command);
  }
  
  get(name) {
    return this.commands.get(name);
  }
  
  getAll() {
    return Array.from(this.commands.values());
  }
  
  getByCategory(category) {
    return this.categories.get(category) || [];
  }
}
```

#### MatrixCommand（クリーンな実装）
```javascript
// src/commands/effects/MatrixCommand.js
export class MatrixCommand {
  constructor(terminal) {
    this.terminal = terminal;
    this.webglEffect = null;
  }
  
  execute(args = []) {
    const subcommand = args[0] || 'start';
    
    switch (subcommand) {
      case 'start':
        this.start(args.slice(1));
        break;
      case 'stop':
        this.stop();
        break;
      case 'stress':
        this.stress(args[1]);
        break;
      default:
        this.showHelp();
    }
  }
  
  start(options = []) {
    // クリーンな実装
    if (this.webglEffect) {
      this.terminal.writeln('Matrix effect is already running.');
      return;
    }
    
    // キャンバスを作成してWebGLエフェクトを開始
    this.webglEffect = new MatrixWebGL(this.terminal);
    this.webglEffect.start(options);
  }
}
```

### 3. 移行計画

#### Phase 1: 基盤の準備（1日）
- [ ] ZeamiTerminalクラスの実装
- [ ] CommandRegistryの実装
- [ ] CommandInterceptorの実装

#### Phase 2: コマンドの移行（1日）
- [ ] ビルトインコマンドの実装（help, clear, ?）
- [ ] MatrixCommandのクリーンな再実装
- [ ] 既存の混乱したコードの削除

#### Phase 3: テストと検証（半日）
- [ ] 単体テストの追加
- [ ] 統合テストの実装
- [ ] パフォーマンステスト

### 4. 期待される効果

1. **保守性の向上**
   - シンプルで理解しやすい構造
   - 明確な責任分離
   - テストが容易

2. **拡張性の確保**
   - 新しいコマンドの追加が簡単
   - プラグインシステムへの発展が可能
   - xterm.jsのアップデートへの追従が容易

3. **パフォーマンスの改善**
   - 不要な処理の削減
   - 効率的なコマンドインターセプト
   - メモリ使用量の削減

## まとめ

この再設計により、ZeamiTermは真にxterm.jsフォークの利点を活かしたターミナルエミュレータとなる。クリーンなアーキテクチャは、将来の機能追加や保守を容易にし、プロジェクトの長期的な成功に貢献する。