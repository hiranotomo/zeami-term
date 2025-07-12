/**
 * CommandStats - 統計情報ウィジェット
 * コマンド実行の統計を表示
 */

import React from 'react';
import { formatDuration, formatPercentage } from '../utils/formatters.js';

export const CommandStats = ({ statistics }) => {
  const { global } = statistics;
  
  // 成功率の計算
  const successRate = global.totalCommands > 0 
    ? (global.successCount / global.totalCommands) * 100 
    : 0;
  
  // 平均実行時間の計算
  const avgDuration = global.totalCommands > 0 
    ? global.totalDuration / global.totalCommands 
    : 0;
  
  // エラー率の計算
  const errorRate = global.totalCommands > 0 
    ? (global.errorCount / global.totalCommands) * 100 
    : 0;

  return (
    <div className="command-stats">
      <div className="stat-item">
        <div className="stat-icon">
          <i className="codicon codicon-terminal"></i>
        </div>
        <div className="stat-content">
          <div className="stat-value">{global.totalCommands.toLocaleString()}</div>
          <div className="stat-label">総コマンド数</div>
        </div>
      </div>

      <div className="stat-item success">
        <div className="stat-icon">
          <i className="codicon codicon-check"></i>
        </div>
        <div className="stat-content">
          <div className="stat-value">{formatPercentage(successRate)}</div>
          <div className="stat-label">成功率</div>
        </div>
      </div>

      <div className="stat-item">
        <div className="stat-icon">
          <i className="codicon codicon-clock"></i>
        </div>
        <div className="stat-content">
          <div className="stat-value">{formatDuration(avgDuration)}</div>
          <div className="stat-label">平均実行時間</div>
        </div>
      </div>

      <div className={`stat-item ${errorRate > 10 ? 'error' : ''}`}>
        <div className="stat-icon">
          <i className="codicon codicon-warning"></i>
        </div>
        <div className="stat-content">
          <div className="stat-value">{global.errorCount}</div>
          <div className="stat-label">エラー数</div>
        </div>
      </div>
    </div>
  );
};