/**
 * formatters.js - フォーマット用ユーティリティ関数
 */

/**
 * 実行時間をフォーマット
 * @param {number} ms - ミリ秒
 * @returns {string} フォーマットされた時間
 */
export function formatDuration(ms) {
  if (ms === null || ms === undefined) return '-';
  
  if (ms < 1000) {
    return `${ms}ms`;
  } else if (ms < 60000) {
    return `${(ms / 1000).toFixed(1)}秒`;
  } else if (ms < 3600000) {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}分${seconds}秒`;
  } else {
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    return `${hours}時間${minutes}分`;
  }
}

/**
 * タイムスタンプを時刻にフォーマット
 * @param {number} timestamp - UNIXタイムスタンプ
 * @returns {string} フォーマットされた時刻
 */
export function formatTime(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  
  // 今日の場合は時刻のみ
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString('ja-JP', { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    });
  }
  
  // 昨日の場合
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) {
    return `昨日 ${date.toLocaleTimeString('ja-JP', { 
      hour: '2-digit', 
      minute: '2-digit' 
    })}`;
  }
  
  // それ以外は日付と時刻
  return date.toLocaleString('ja-JP', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * 相対時間を取得
 * @param {number} timestamp - UNIXタイムスタンプ
 * @returns {string} 相対時間（例: "5分前"）
 */
export function getRelativeTime(timestamp) {
  const now = Date.now();
  const diff = now - timestamp;
  
  if (diff < 60000) {
    return '今';
  } else if (diff < 3600000) {
    const minutes = Math.floor(diff / 60000);
    return `${minutes}分前`;
  } else if (diff < 86400000) {
    const hours = Math.floor(diff / 3600000);
    return `${hours}時間前`;
  } else {
    const days = Math.floor(diff / 86400000);
    return `${days}日前`;
  }
}

/**
 * パーセンテージをフォーマット
 * @param {number} value - パーセンテージ値
 * @param {number} decimals - 小数点以下の桁数
 * @returns {string} フォーマットされたパーセンテージ
 */
export function formatPercentage(value, decimals = 1) {
  if (value === null || value === undefined || isNaN(value)) return '0%';
  return `${value.toFixed(decimals)}%`;
}

/**
 * バイト数をフォーマット
 * @param {number} bytes - バイト数
 * @returns {string} フォーマットされたサイズ
 */
export function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${units[i]}`;
}

/**
 * 数値を3桁区切りでフォーマット
 * @param {number} num - 数値
 * @returns {string} フォーマットされた数値
 */
export function formatNumber(num) {
  return num.toLocaleString('ja-JP');
}

/**
 * 日付を標準フォーマットに変換
 * @param {Date|string|number} date - 日付
 * @returns {string} YYYY-MM-DD形式の日付
 */
export function formatDate(date) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 実行者タイプを日本語に変換
 * @param {string} executorType - 実行者タイプ
 * @returns {string} 日本語の実行者名
 */
export function formatExecutorType(executorType) {
  const types = {
    'human': '人間',
    'claude-code': 'Claude Code',
    'gemini-cli': 'Gemini CLI',
    'copilot': 'GitHub Copilot',
    'shell-script': 'シェルスクリプト'
  };
  return types[executorType] || executorType;
}

/**
 * コマンドカテゴリを日本語に変換
 * @param {string} category - カテゴリ
 * @returns {string} 日本語のカテゴリ名
 */
export function formatCategory(category) {
  const categories = {
    'build': 'ビルド',
    'test': 'テスト',
    'deploy': 'デプロイ',
    'git': 'Git',
    'file': 'ファイル操作',
    'system': 'システム',
    'install': 'インストール',
    'zeami': 'Zeami',
    'other': 'その他'
  };
  return categories[category] || category;
}

/**
 * ステータスを日本語に変換
 * @param {string} status - ステータス
 * @returns {string} 日本語のステータス
 */
export function formatStatus(status) {
  const statuses = {
    'pending': '待機中',
    'running': '実行中',
    'success': '成功',
    'error': 'エラー',
    'cancelled': 'キャンセル',
    'timeout': 'タイムアウト'
  };
  return statuses[status] || status;
}

/**
 * 機密レベルを日本語に変換
 * @param {string} sensitivity - 機密レベル
 * @returns {string} 日本語の機密レベル
 */
export function formatSensitivity(sensitivity) {
  const levels = {
    'normal': '通常',
    'sensitive': '要注意',
    'dangerous': '危険'
  };
  return levels[sensitivity] || sensitivity;
}