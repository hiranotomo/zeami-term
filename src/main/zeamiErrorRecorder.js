/**
 * Zeami エラー記録システム
 * エラーパターンをZeami CLIの学習システムに記録
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs').promises;

class ZeamiErrorRecorder {
  constructor() {
    this.zeamiPath = this.findZeamiCLI();
    this.errorQueue = [];
    this.isProcessing = false;
  }

  /**
   * Zeami CLIのパスを検索
   */
  findZeamiCLI() {
    // プロジェクトルートからの相対パス
    const possiblePaths = [
      path.join(__dirname, '../../../../bin/zeami'),
      path.join(__dirname, '../../zeami'), // シンボリックリンク
      '/usr/local/bin/zeami' // グローバルインストール
    ];

    for (const zeamiPath of possiblePaths) {
      try {
        if (require('fs').existsSync(zeamiPath)) {
          console.log(`Zeami CLI found at: ${zeamiPath}`);
          return zeamiPath;
        }
      } catch (err) {
        // Continue to next path
      }
    }

    console.warn('Zeami CLI not found, error recording will be disabled');
    return null;
  }

  /**
   * エラーを記録
   */
  async recordError(errorData) {
    if (!this.zeamiPath) {
      console.warn('Zeami CLI not available, skipping error recording');
      return;
    }

    // キューに追加
    this.errorQueue.push(errorData);

    // 処理中でなければ開始
    if (!this.isProcessing) {
      this.processQueue();
    }
  }

  /**
   * エラーキューを処理
   */
  async processQueue() {
    if (this.errorQueue.length === 0) {
      this.isProcessing = false;
      return;
    }

    this.isProcessing = true;
    const errorData = this.errorQueue.shift();

    try {
      // Zeami learn errorコマンドを実行
      await this.executeZeamiCommand([
        'learn',
        'error',
        errorData.error,
        errorData.solution || `${errorData.error}が発生しました。${this.getSuggestion(errorData.error)}`
      ]);

      // 成功したらログに記録
      console.log(`Error pattern recorded: ${errorData.error}`);
    } catch (err) {
      console.error('Failed to record error to Zeami:', err);
      
      // 失敗した場合はローカルファイルに保存
      await this.saveToLocalFile(errorData);
    }

    // 次のアイテムを処理
    setTimeout(() => this.processQueue(), 1000);
  }

  /**
   * Zeamiコマンドを実行
   */
  executeZeamiCommand(args) {
    return new Promise((resolve, reject) => {
      const zeami = spawn(this.zeamiPath, args, {
        cwd: path.dirname(this.zeamiPath)
      });

      let stdout = '';
      let stderr = '';

      zeami.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      zeami.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      zeami.on('close', (code) => {
        if (code === 0) {
          resolve(stdout);
        } else {
          reject(new Error(`Zeami command failed with code ${code}: ${stderr}`));
        }
      });

      zeami.on('error', (err) => {
        reject(err);
      });
    });
  }

  /**
   * エラータイプに基づく提案を生成
   */
  getSuggestion(errorType) {
    const suggestions = {
      'Connection error': 'ネットワーク接続を確認し、プロキシ設定を見直してください。',
      'Request timed out': 'ネットワークが不安定な可能性があります。時間をおいて再試行してください。',
      'OAuth token has expired': 'Claude Codeに再ログインしてください。',
      'API Error: 401': '認証情報を確認し、必要に応じて再認証してください。',
      'fetch failed': 'DNSやファイアウォールの設定を確認してください。'
    };

    return suggestions[errorType] || '詳細なエラー情報を確認してください。';
  }

  /**
   * ローカルファイルに保存（フォールバック）
   */
  async saveToLocalFile(errorData) {
    try {
      const errorLogPath = path.join(__dirname, '../../.zeami-knowledge/offline-errors.json');
      
      // ディレクトリが存在しない場合は作成
      await fs.mkdir(path.dirname(errorLogPath), { recursive: true });

      let errors = [];
      try {
        const content = await fs.readFile(errorLogPath, 'utf-8');
        errors = JSON.parse(content);
      } catch (err) {
        // ファイルが存在しない場合は空配列
      }

      errors.push({
        ...errorData,
        recordedAt: new Date().toISOString(),
        syncedToZeami: false
      });

      await fs.writeFile(errorLogPath, JSON.stringify(errors, null, 2));
      console.log('Error saved to local file for later sync');
    } catch (err) {
      console.error('Failed to save error to local file:', err);
    }
  }

  /**
   * オフラインエラーを同期
   */
  async syncOfflineErrors() {
    if (!this.zeamiPath) return;

    try {
      const errorLogPath = path.join(__dirname, '../../.zeami-knowledge/offline-errors.json');
      const content = await fs.readFile(errorLogPath, 'utf-8');
      const errors = JSON.parse(content);

      const unsyncedErrors = errors.filter(e => !e.syncedToZeami);

      for (const error of unsyncedErrors) {
        try {
          await this.executeZeamiCommand([
            'learn',
            'error',
            error.error,
            error.solution
          ]);
          
          error.syncedToZeami = true;
        } catch (err) {
          console.error('Failed to sync error:', err);
        }
      }

      // 更新したデータを保存
      await fs.writeFile(errorLogPath, JSON.stringify(errors, null, 2));
      console.log(`Synced ${unsyncedErrors.length} offline errors to Zeami`);
    } catch (err) {
      // ファイルが存在しない場合は無視
    }
  }

  /**
   * 統計情報を取得
   */
  async getErrorStats() {
    try {
      // Zeami CLIから統計を取得
      const output = await this.executeZeamiCommand(['learn', 'stats', '--json']);
      return JSON.parse(output);
    } catch (err) {
      console.error('Failed to get error stats:', err);
      return null;
    }
  }
}

module.exports = ZeamiErrorRecorder;