# Zeami Term オフライン耐性改善仕様

## 背景

Claude Codeが以下のような通信エラーに遭遇した場合のZeami Termの振る舞いを改善する：
- Connection error (fetch failed)
- Request timed out
- OAuth token expired
- API rate limit exceeded

## 現状分析

### 現在の実装
- Zeami TermはClaude Codeプロセスを起動・管理
- エラーハンドリングは主にElectron IPCとターミナル操作に焦点
- Claude APIとの直接通信は行わない
- オフライン機能は未実装

### 問題点
1. Claude Codeが通信エラーで応答しない時、ユーザーへのフィードバックが不十分
2. エラー状態の視覚的表示がない
3. オフライン時の代替機能がない
4. エラーパターンの学習・記録機能がない

## 改善提案

### 1. エラー状態の視覚的フィードバック

**実装内容：**
```javascript
// src/renderer/errorStateIndicator.js
class ErrorStateIndicator {
  constructor(terminal) {
    this.terminal = terminal;
    this.errorPatterns = {
      'Connection error': { color: '#ff6b6b', icon: '🔌' },
      'Request timed out': { color: '#ffd93d', icon: '⏱️' },
      'OAuth token': { color: '#ff9f1a', icon: '🔑' }
    };
  }

  detectAndDisplay(output) {
    for (const [pattern, config] of Object.entries(this.errorPatterns)) {
      if (output.includes(pattern)) {
        this.showErrorBanner(pattern, config);
        this.logError(pattern, output);
      }
    }
  }

  showErrorBanner(type, config) {
    // ステータスバーにエラー表示
    // 一定時間後に自動非表示
  }
}
```

**メリット：**
- ユーザーがエラー状態を即座に認識できる
- エラーの種類を視覚的に区別可能
- UXの向上

**デメリット：**
- UI実装の複雑性増加
- 画面領域の消費

### 2. ローカルコマンドのフォールバック

**実装内容：**
```javascript
// src/main/localCommandFallback.js
class LocalCommandFallback {
  constructor() {
    this.offlineCommands = {
      'zeami': this.executeZeamiLocally,
      'ls': this.executeLs,
      'cd': this.executeCd,
      'pwd': this.executePwd
    };
  }

  async handleCommand(command) {
    const [cmd, ...args] = command.trim().split(' ');
    
    if (this.isClaudeOffline && this.offlineCommands[cmd]) {
      return await this.offlineCommands[cmd](args);
    }
    
    return null; // Claude Codeに転送
  }

  async executeZeamiLocally(args) {
    // Zeami CLIをローカルで実行
    const zeamiPath = path.join(__dirname, '../../bin/zeami');
    return await execFile(zeamiPath, args);
  }
}
```

**メリット：**
- 基本的な操作は継続可能
- Zeami CLIの機能は利用可能
- 完全なオフラインでも部分的に作業継続

**デメリット：**
- Claude Codeの高度な機能は利用不可
- コマンドの互換性維持が必要
- セキュリティ考慮が必要

### 3. エラーパターンの学習と自動リトライ

**実装内容：**
```javascript
// src/main/errorLearningSystem.js
class ErrorLearningSystem {
  constructor() {
    this.errorHistory = [];
    this.retryStrategies = new Map();
  }

  recordError(error, context) {
    this.errorHistory.push({
      timestamp: Date.now(),
      error: error.message,
      context,
      resolved: false
    });
    
    // Zeami learn systemに記録
    this.syncWithZeamiLearn(error);
  }

  async autoRetry(command, error) {
    const strategy = this.getRetryStrategy(error);
    
    if (strategy === 'wait_and_retry') {
      await this.delay(5000);
      return true;
    } else if (strategy === 'refresh_token') {
      await this.refreshOAuthToken();
      return true;
    }
    
    return false;
  }
}
```

**メリット：**
- エラーパターンの蓄積による改善
- 自動回復の可能性
- Zeamiエコシステムとの統合

**デメリット：**
- 実装の複雑性
- 誤った自動リトライのリスク
- ストレージ使用量の増加

### 4. オフラインモードの明示的切り替え

**実装内容：**
```javascript
// src/renderer/offlineModeToggle.js
class OfflineModeToggle {
  constructor() {
    this.isOfflineMode = false;
    this.localTerminal = null;
  }

  toggleOfflineMode() {
    this.isOfflineMode = !this.isOfflineMode;
    
    if (this.isOfflineMode) {
      // ローカルシェルに切り替え
      this.localTerminal = new LocalTerminal();
      this.showOfflineBanner();
    } else {
      // Claude Codeに再接続試行
      this.reconnectToClaude();
    }
  }
}
```

**メリット：**
- ユーザーが明示的に制御可能
- 予測可能な動作
- オフライン作業の継続性

**デメリット：**
- ユーザーの手動操作が必要
- モード切り替えの複雑性

## 実装優先順位

1. **エラー状態の視覚的フィードバック**（優先度：高）
   - 実装が簡単で即効性がある
   - UX改善効果が高い

2. **エラーパターンの学習**（優先度：中）
   - 長期的な改善につながる
   - Zeamiエコシステムとの相乗効果

3. **ローカルコマンドのフォールバック**（優先度：中）
   - 基本機能の継続性を確保
   - 段階的に実装可能

4. **オフラインモードの切り替え**（優先度：低）
   - 完全な実装には時間がかかる
   - 他の改善後に検討

## セキュリティ考慮事項

- ローカルコマンド実行時のサンドボックス化
- エラーログに含まれる機密情報の除去
- OAuth tokenの安全な保管と更新

## テスト計画

1. **通信エラーシミュレーション**
   - 各種エラーパターンの再現テスト
   - エラー表示の動作確認

2. **フォールバック機能テスト**
   - オフライン時のコマンド実行
   - エラー時の自動回復

3. **パフォーマンステスト**
   - エラー検知のオーバーヘッド
   - UI更新の応答性

## まとめ

これらの改善により、Zeami TermはClaude Codeの通信エラー時でも：
- 明確なエラー状態の表示
- 基本的な操作の継続
- エラーからの自動回復
- より良いユーザー体験

を提供できるようになります。