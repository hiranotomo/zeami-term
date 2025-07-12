/**
 * CommandExecutionModel - 拡張されたコマンド実行データモデル
 * 全てのコマンド実行情報を構造化して保存
 */

const crypto = require('crypto');
const os = require('os');

class CommandExecutionModel {
  constructor(data = {}) {
    // 基本情報
    this.id = data.id || `cmd-${Date.now()}-${crypto.randomUUID().substring(0, 8)}`;
    this.timestamp = data.timestamp || Date.now();
    this.type = data.type || 'command-execution';
    
    // コンテキスト情報（階層的な識別）
    this.context = {
      app: {
        id: 'zeami-term',
        version: require('../../../package.json').version,
        instance: data.context?.app?.instance || process.pid.toString()
      },
      
      window: {
        id: data.context?.window?.id || null,
        index: data.context?.window?.index || 0,
        title: data.context?.window?.title || '',
        pid: data.context?.window?.pid || process.pid
      },
      
      terminal: {
        id: data.context?.terminal?.id || null,
        label: data.context?.terminal?.label || '',
        type: data.context?.terminal?.type || 'standard',
        profile: data.context?.terminal?.profile || 'default'
      },
      
      session: {
        id: data.context?.session?.id || null,
        startTime: data.context?.session?.startTime || Date.now(),
        shell: data.context?.session?.shell || process.env.SHELL || '/bin/bash'
      }
    };
    
    // 実行者情報
    this.executor = {
      type: data.executor?.type || 'human', // human, claude-code, gemini-cli, copilot, shell-script
      name: data.executor?.name || this._detectExecutor(data),
      version: data.executor?.version || 'unknown',
      trigger: data.executor?.trigger || 'user-request' // user-request, auto-fix, scheduled, chain-execution
    };
    
    // コマンド詳細
    this.command = {
      raw: data.command?.raw || '',
      parsed: data.command?.parsed || this._parseCommand(data.command?.raw),
      category: data.command?.category || this._categorizeCommand(data.command?.raw),
      sensitivity: data.command?.sensitivity || this._assessSensitivity(data.command?.raw)
    };
    
    // 実行情報
    this.execution = {
      startTime: data.execution?.startTime || Date.now(),
      endTime: data.execution?.endTime || null,
      duration: data.execution?.duration || null,
      exitCode: data.execution?.exitCode !== undefined ? data.execution.exitCode : null,
      signal: data.execution?.signal || null,
      status: data.execution?.status || 'pending', // pending, running, success, error, cancelled, timeout
      
      environment: {
        cwd: data.execution?.environment?.cwd || process.cwd(),
        env: data.execution?.environment?.env || this._sanitizeEnv()
      },
      
      resources: {
        cpuUsage: data.execution?.resources?.cpuUsage || 0,
        memoryUsage: data.execution?.resources?.memoryUsage || 0,
        outputSize: data.execution?.resources?.outputSize || 0
      }
    };
    
    // 出力情報
    this.output = {
      stdout: {
        lines: data.output?.stdout?.lines || 0,
        size: data.output?.stdout?.size || 0,
        sample: data.output?.stdout?.sample || '',
        hasMore: data.output?.stdout?.hasMore || false
      },
      stderr: {
        lines: data.output?.stderr?.lines || 0,
        size: data.output?.stderr?.size || 0,
        sample: data.output?.stderr?.sample || '',
        hasMore: data.output?.stderr?.hasMore || false
      }
    };
    
    // メタデータ
    this.metadata = {
      tags: data.metadata?.tags || [],
      priority: data.metadata?.priority || 'normal', // low, normal, high, critical
      relatedCommands: data.metadata?.relatedCommands || [],
      gitInfo: data.metadata?.gitInfo || {},
      projectInfo: data.metadata?.projectInfo || {},
      userVars: data.metadata?.userVars || {},
      marks: data.metadata?.marks || [],
      badges: data.metadata?.badges || [],
      hyperlinks: data.metadata?.hyperlinks || []
    };
  }
  
  /**
   * 実行者を検出
   */
  _detectExecutor(data) {
    // Claude Codeの検出パターン
    if (data.command?.raw?.includes('claude') || 
        data.metadata?.userVars?.isClaude ||
        process.env.CLAUDE_CODE) {
      return 'Claude Code';
    }
    
    // 将来の拡張用
    if (data.command?.raw?.includes('gemini')) {
      return 'Gemini CLI';
    }
    
    return 'Human';
  }
  
  /**
   * コマンドを解析
   */
  _parseCommand(raw) {
    if (!raw) return { program: '', args: [], flags: {} };
    
    const parts = raw.trim().split(/\s+/);
    const program = parts[0] || '';
    const args = [];
    const flags = {};
    
    for (let i = 1; i < parts.length; i++) {
      const part = parts[i];
      if (part.startsWith('-')) {
        // フラグの処理
        const nextPart = parts[i + 1];
        if (nextPart && !nextPart.startsWith('-')) {
          flags[part] = nextPart;
          i++;
        } else {
          flags[part] = true;
        }
      } else {
        args.push(part);
      }
    }
    
    return { program, args, flags };
  }
  
  /**
   * コマンドをカテゴリ分類
   */
  _categorizeCommand(raw) {
    if (!raw) return 'other';
    
    const categories = {
      build: /^(npm|yarn|pnpm|make|cargo|go)\s+(run\s+)?(build|compile)/i,
      test: /^(npm|yarn|jest|mocha|pytest|go)\s+(run\s+)?(test|spec)/i,
      deploy: /^(deploy|push|publish|release)/i,
      git: /^git\s+/i,
      file: /^(ls|cd|mkdir|rm|cp|mv|find|grep|cat|echo|touch)/i,
      system: /^(ps|top|kill|df|du|free|systemctl|service)/i,
      install: /^(npm|yarn|pnpm|pip|gem|apt|brew|cargo)\s+(install|add|i)/i,
      zeami: /^(zeami|\.\/zeami|\.\.\/.*zeami)/i
    };
    
    for (const [category, pattern] of Object.entries(categories)) {
      if (pattern.test(raw)) {
        return category;
      }
    }
    
    return 'other';
  }
  
  /**
   * コマンドの機密性を評価
   */
  _assessSensitivity(raw) {
    if (!raw) return 'normal';
    
    const dangerousPatterns = [
      /rm\s+-rf\s+\//,
      /:(){ :|:& };:/,  // Fork bomb
      /dd\s+if=.*of=\/dev\//,
      /mkfs/,
      /> \/dev\/sda/
    ];
    
    const sensitivePatterns = [
      /password|passwd|token|secret|key|credential/i,
      /ssh\s+/,
      /sudo\s+/,
      /chmod\s+777/,
      /curl.*(-d|--data)/
    ];
    
    for (const pattern of dangerousPatterns) {
      if (pattern.test(raw)) {
        return 'dangerous';
      }
    }
    
    for (const pattern of sensitivePatterns) {
      if (pattern.test(raw)) {
        return 'sensitive';
      }
    }
    
    return 'normal';
  }
  
  /**
   * 環境変数をサニタイズ（機密情報を除外）
   */
  _sanitizeEnv() {
    const sensitiveKeys = [
      'PASSWORD', 'TOKEN', 'SECRET', 'KEY', 'CREDENTIAL',
      'AWS_SECRET', 'GITHUB_TOKEN', 'NPM_TOKEN'
    ];
    
    const sanitized = {};
    for (const [key, value] of Object.entries(process.env)) {
      const isImportant = ['NODE_ENV', 'PATH', 'SHELL', 'USER', 'HOME', 'PWD'].includes(key);
      const isSensitive = sensitiveKeys.some(sensitive => key.includes(sensitive));
      
      if (isImportant && !isSensitive) {
        sanitized[key] = value;
      }
    }
    
    return sanitized;
  }
  
  /**
   * コマンド実行の開始を記録
   */
  markStart(commandText) {
    this.command.raw = commandText;
    this.command.parsed = this._parseCommand(commandText);
    this.command.category = this._categorizeCommand(commandText);
    this.command.sensitivity = this._assessSensitivity(commandText);
    this.execution.startTime = Date.now();
    this.execution.status = 'running';
  }
  
  /**
   * コマンド実行の終了を記録
   */
  markEnd(exitCode, signal = null) {
    this.execution.endTime = Date.now();
    this.execution.duration = this.execution.endTime - this.execution.startTime;
    this.execution.exitCode = exitCode;
    this.execution.signal = signal;
    this.execution.status = exitCode === 0 ? 'success' : 'error';
  }
  
  /**
   * 出力を追加
   */
  addOutput(type, data) {
    const output = this.output[type];
    if (!output) return;
    
    const lines = data.split('\n').length;
    const size = Buffer.byteLength(data, 'utf8');
    
    output.lines += lines;
    output.size += size;
    
    // サンプルを更新（最初の1000文字まで）
    if (output.sample.length < 1000) {
      output.sample += data.substring(0, 1000 - output.sample.length);
    }
    
    output.hasMore = output.size > 1000;
  }
  
  /**
   * メタデータを更新
   */
  updateMetadata(key, value) {
    if (key in this.metadata) {
      if (Array.isArray(this.metadata[key])) {
        this.metadata[key].push(value);
      } else if (typeof this.metadata[key] === 'object') {
        Object.assign(this.metadata[key], value);
      } else {
        this.metadata[key] = value;
      }
    }
  }
  
  /**
   * 既存のメッセージ形式との互換性
   */
  toLegacyFormat() {
    return {
      id: this.id,
      type: 'command-notification',
      timestamp: this.timestamp,
      source: {
        windowId: this.context.window.id,
        terminalId: this.context.terminal.id,
        terminalName: `Terminal ${this.context.terminal.label}`
      },
      data: {
        command: this.command.raw,
        duration: this.execution.duration,
        exitCode: this.execution.exitCode,
        isClaude: this.executor.type === 'claude-code',
        cwd: this.execution.environment.cwd
      },
      notification: this.execution.status === 'error' ? {
        title: 'コマンドエラー',
        body: `${this.command.raw} が失敗しました (exit: ${this.execution.exitCode})`
      } : null
    };
  }
  
  /**
   * 検証
   */
  validate() {
    const errors = [];
    
    if (!this.command.raw) {
      errors.push('Command text is required');
    }
    
    if (!this.context.terminal.id) {
      errors.push('Terminal ID is required');
    }
    
    if (!this.context.window.id) {
      errors.push('Window ID is required');
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
  
  /**
   * JSONシリアライズ
   */
  toJSON() {
    return {
      id: this.id,
      timestamp: this.timestamp,
      type: this.type,
      context: this.context,
      executor: this.executor,
      command: this.command,
      execution: this.execution,
      output: this.output,
      metadata: this.metadata
    };
  }
  
  /**
   * ファクトリメソッド
   */
  static fromJSON(json) {
    return new CommandExecutionModel(json);
  }
  
  /**
   * 簡易作成メソッド
   */
  static create(windowId, terminalId, terminalLabel, commandText) {
    return new CommandExecutionModel({
      context: {
        window: { id: windowId },
        terminal: { id: terminalId, label: terminalLabel }
      },
      command: { raw: commandText }
    });
  }
}

module.exports = { CommandExecutionModel };