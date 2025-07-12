/**
 * AnalysisView - 分析ビュー
 * コマンド実行の統計と分析を表示
 */

import React, { useState, useMemo } from 'react';
import { Chart } from '../widgets/Chart.js';
import { StatCard } from '../widgets/StatCard.js';
import { formatDuration, formatPercentage } from '../utils/formatters.js';

export const AnalysisView = ({ commands, statistics, filters, ipcService }) => {
  const [analysisType, setAnalysisType] = useState('overview'); // overview, performance, errors, patterns
  const [timeRange, setTimeRange] = useState('1hour'); // 1hour, 1day, 1week, all

  // 時間範囲でフィルタリング
  const filteredCommands = useMemo(() => {
    if (timeRange === 'all') return commands;
    
    const now = Date.now();
    const ranges = {
      '1hour': 60 * 60 * 1000,
      '1day': 24 * 60 * 60 * 1000,
      '1week': 7 * 24 * 60 * 60 * 1000
    };
    
    const cutoff = now - ranges[timeRange];
    return commands.filter(cmd => cmd.timestamp >= cutoff);
  }, [commands, timeRange]);

  // 分析データの計算
  const analysisData = useMemo(() => {
    return {
      overview: calculateOverview(filteredCommands, statistics),
      performance: calculatePerformance(filteredCommands),
      errors: calculateErrors(filteredCommands),
      patterns: calculatePatterns(filteredCommands)
    };
  }, [filteredCommands, statistics]);

  // 概要統計の計算
  function calculateOverview(commands, stats) {
    const totalCommands = commands.length;
    const successRate = totalCommands > 0 
      ? (commands.filter(cmd => cmd.execution.status === 'success').length / totalCommands) * 100
      : 0;
    
    const avgDuration = totalCommands > 0
      ? commands.reduce((sum, cmd) => sum + (cmd.execution.duration || 0), 0) / totalCommands
      : 0;
    
    const executorBreakdown = {};
    const categoryBreakdown = {};
    
    commands.forEach(cmd => {
      // 実行者別
      executorBreakdown[cmd.executor.type] = (executorBreakdown[cmd.executor.type] || 0) + 1;
      
      // カテゴリ別
      categoryBreakdown[cmd.command.category] = (categoryBreakdown[cmd.command.category] || 0) + 1;
    });
    
    return {
      totalCommands,
      successRate,
      avgDuration,
      executorBreakdown,
      categoryBreakdown,
      recentActivity: calculateRecentActivity(commands)
    };
  }

  // パフォーマンス分析
  function calculatePerformance(commands) {
    const performanceData = {
      byCategory: {},
      byExecutor: {},
      timeDistribution: [],
      slowestCommands: []
    };
    
    // カテゴリ別平均実行時間
    const categoryGroups = {};
    commands.forEach(cmd => {
      const category = cmd.command.category;
      if (!categoryGroups[category]) {
        categoryGroups[category] = [];
      }
      categoryGroups[category].push(cmd.execution.duration || 0);
    });
    
    Object.entries(categoryGroups).forEach(([category, durations]) => {
      performanceData.byCategory[category] = {
        avg: durations.reduce((a, b) => a + b, 0) / durations.length,
        min: Math.min(...durations),
        max: Math.max(...durations),
        count: durations.length
      };
    });
    
    // 実行時間分布
    const buckets = [0, 100, 500, 1000, 5000, 10000, 30000, 60000, Infinity];
    const distribution = new Array(buckets.length - 1).fill(0);
    
    commands.forEach(cmd => {
      const duration = cmd.execution.duration || 0;
      for (let i = 0; i < buckets.length - 1; i++) {
        if (duration >= buckets[i] && duration < buckets[i + 1]) {
          distribution[i]++;
          break;
        }
      }
    });
    
    performanceData.timeDistribution = distribution.map((count, i) => ({
      range: `${buckets[i]}ms - ${buckets[i + 1] === Infinity ? '∞' : buckets[i + 1] + 'ms'}`,
      count
    }));
    
    // 最も遅いコマンド
    performanceData.slowestCommands = [...commands]
      .filter(cmd => cmd.execution.duration)
      .sort((a, b) => b.execution.duration - a.execution.duration)
      .slice(0, 10);
    
    return performanceData;
  }

  // エラー分析
  function calculateErrors(commands) {
    const errorCommands = commands.filter(cmd => cmd.execution.status === 'error');
    
    const errorsByCategory = {};
    const errorsByExecutor = {};
    const commonErrors = {};
    
    errorCommands.forEach(cmd => {
      // カテゴリ別
      errorsByCategory[cmd.command.category] = (errorsByCategory[cmd.command.category] || 0) + 1;
      
      // 実行者別
      errorsByExecutor[cmd.executor.type] = (errorsByExecutor[cmd.executor.type] || 0) + 1;
      
      // エラーパターンの抽出（簡易版）
      const errorKey = `exit:${cmd.execution.exitCode}`;
      if (!commonErrors[errorKey]) {
        commonErrors[errorKey] = {
          pattern: errorKey,
          count: 0,
          examples: []
        };
      }
      commonErrors[errorKey].count++;
      if (commonErrors[errorKey].examples.length < 3) {
        commonErrors[errorKey].examples.push(cmd);
      }
    });
    
    return {
      totalErrors: errorCommands.length,
      errorRate: commands.length > 0 ? (errorCommands.length / commands.length) * 100 : 0,
      byCategory: errorsByCategory,
      byExecutor: errorsByExecutor,
      commonPatterns: Object.values(commonErrors).sort((a, b) => b.count - a.count),
      recentErrors: errorCommands.slice(0, 10)
    };
  }

  // パターン分析
  function calculatePatterns(commands) {
    const patterns = {
      frequentCommands: {},
      commandSequences: [],
      peakHours: new Array(24).fill(0),
      dangerousCommands: []
    };
    
    // 頻出コマンド
    commands.forEach(cmd => {
      const baseCommand = cmd.command.parsed.program;
      patterns.frequentCommands[baseCommand] = (patterns.frequentCommands[baseCommand] || 0) + 1;
      
      // 危険なコマンドの検出
      if (cmd.command.sensitivity === 'dangerous' || cmd.command.sensitivity === 'sensitive') {
        patterns.dangerousCommands.push(cmd);
      }
      
      // 時間帯別の集計
      const hour = new Date(cmd.timestamp).getHours();
      patterns.peakHours[hour]++;
    });
    
    // コマンドシーケンスの検出（簡易版）
    for (let i = 0; i < commands.length - 1; i++) {
      const current = commands[i];
      const next = commands[i + 1];
      
      if (current.context.terminal.id === next.context.terminal.id &&
          next.timestamp - current.timestamp < 60000) { // 1分以内
        patterns.commandSequences.push({
          first: current.command.parsed.program,
          second: next.command.parsed.program,
          gap: next.timestamp - current.timestamp
        });
      }
    }
    
    return patterns;
  }

  // 最近のアクティビティ
  function calculateRecentActivity(commands) {
    const now = Date.now();
    const intervals = [
      { label: '過去1時間', duration: 60 * 60 * 1000 },
      { label: '過去24時間', duration: 24 * 60 * 60 * 1000 },
      { label: '過去7日間', duration: 7 * 24 * 60 * 60 * 1000 }
    ];
    
    return intervals.map(interval => ({
      ...interval,
      count: commands.filter(cmd => now - cmd.timestamp <= interval.duration).length
    }));
  }

  // 分析タイプの選択
  const renderAnalysisContent = () => {
    switch (analysisType) {
      case 'overview':
        return <OverviewAnalysis data={analysisData.overview} />;
      case 'performance':
        return <PerformanceAnalysis data={analysisData.performance} />;
      case 'errors':
        return <ErrorAnalysis data={analysisData.errors} />;
      case 'patterns':
        return <PatternAnalysis data={analysisData.patterns} />;
      default:
        return null;
    }
  };

  return (
    <div className="analysis-view">
      {/* ヘッダー */}
      <div className="analysis-header">
        <div className="analysis-tabs">
          <button
            className={analysisType === 'overview' ? 'active' : ''}
            onClick={() => setAnalysisType('overview')}
          >
            <i className="codicon codicon-dashboard"></i>
            概要
          </button>
          <button
            className={analysisType === 'performance' ? 'active' : ''}
            onClick={() => setAnalysisType('performance')}
          >
            <i className="codicon codicon-pulse"></i>
            パフォーマンス
          </button>
          <button
            className={analysisType === 'errors' ? 'active' : ''}
            onClick={() => setAnalysisType('errors')}
          >
            <i className="codicon codicon-warning"></i>
            エラー分析
          </button>
          <button
            className={analysisType === 'patterns' ? 'active' : ''}
            onClick={() => setAnalysisType('patterns')}
          >
            <i className="codicon codicon-graph-line"></i>
            パターン
          </button>
        </div>
        
        <div className="time-range-selector">
          <select value={timeRange} onChange={(e) => setTimeRange(e.target.value)}>
            <option value="1hour">過去1時間</option>
            <option value="1day">過去24時間</option>
            <option value="1week">過去7日間</option>
            <option value="all">全期間</option>
          </select>
        </div>
      </div>

      {/* 分析コンテンツ */}
      <div className="analysis-content">
        {renderAnalysisContent()}
      </div>
    </div>
  );
};

// 概要分析コンポーネント
const OverviewAnalysis = ({ data }) => (
  <div className="overview-analysis">
    <div className="stat-cards">
      <StatCard
        title="総コマンド数"
        value={data.totalCommands}
        icon="terminal"
        trend={data.recentActivity[0].count}
      />
      <StatCard
        title="成功率"
        value={formatPercentage(data.successRate)}
        icon="check"
        color={data.successRate >= 90 ? 'success' : 'warning'}
      />
      <StatCard
        title="平均実行時間"
        value={formatDuration(data.avgDuration)}
        icon="clock"
      />
    </div>

    <div className="charts-grid">
      <Chart
        title="実行者別分布"
        type="pie"
        data={Object.entries(data.executorBreakdown).map(([key, value]) => ({
          label: key,
          value
        }))}
      />
      <Chart
        title="カテゴリ別分布"
        type="bar"
        data={Object.entries(data.categoryBreakdown).map(([key, value]) => ({
          label: key,
          value
        }))}
      />
    </div>

    <div className="recent-activity">
      <h3>最近のアクティビティ</h3>
      <div className="activity-list">
        {data.recentActivity.map(activity => (
          <div key={activity.label} className="activity-item">
            <span className="activity-label">{activity.label}</span>
            <span className="activity-count">{activity.count} コマンド</span>
          </div>
        ))}
      </div>
    </div>
  </div>
);

// パフォーマンス分析コンポーネント
const PerformanceAnalysis = ({ data }) => (
  <div className="performance-analysis">
    <div className="performance-summary">
      <h3>実行時間分布</h3>
      <Chart
        type="histogram"
        data={data.timeDistribution}
      />
    </div>

    <div className="category-performance">
      <h3>カテゴリ別パフォーマンス</h3>
      <table className="performance-table">
        <thead>
          <tr>
            <th>カテゴリ</th>
            <th>平均</th>
            <th>最小</th>
            <th>最大</th>
            <th>実行数</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(data.byCategory).map(([category, stats]) => (
            <tr key={category}>
              <td>{category}</td>
              <td>{formatDuration(stats.avg)}</td>
              <td>{formatDuration(stats.min)}</td>
              <td>{formatDuration(stats.max)}</td>
              <td>{stats.count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>

    <div className="slowest-commands">
      <h3>最も遅いコマンド</h3>
      <div className="command-list">
        {data.slowestCommands.map(cmd => (
          <div key={cmd.id} className="slow-command">
            <code>{cmd.command.raw}</code>
            <span className="duration">{formatDuration(cmd.execution.duration)}</span>
          </div>
        ))}
      </div>
    </div>
  </div>
);

// エラー分析コンポーネント
const ErrorAnalysis = ({ data }) => (
  <div className="error-analysis">
    <div className="error-summary">
      <StatCard
        title="総エラー数"
        value={data.totalErrors}
        icon="error"
        color="error"
      />
      <StatCard
        title="エラー率"
        value={formatPercentage(data.errorRate)}
        icon="percentage"
        color={data.errorRate < 5 ? 'success' : 'error'}
      />
    </div>

    <div className="error-breakdown">
      <Chart
        title="カテゴリ別エラー"
        type="bar"
        data={Object.entries(data.byCategory).map(([key, value]) => ({
          label: key,
          value
        }))}
      />
    </div>

    <div className="common-errors">
      <h3>一般的なエラーパターン</h3>
      <div className="error-patterns">
        {data.commonPatterns.map(pattern => (
          <div key={pattern.pattern} className="error-pattern">
            <div className="pattern-header">
              <span className="pattern-name">{pattern.pattern}</span>
              <span className="pattern-count">{pattern.count} 回</span>
            </div>
            <div className="pattern-examples">
              {pattern.examples.map(cmd => (
                <code key={cmd.id}>{cmd.command.raw}</code>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

// パターン分析コンポーネント
const PatternAnalysis = ({ data }) => (
  <div className="pattern-analysis">
    <div className="frequent-commands">
      <h3>頻出コマンド</h3>
      <Chart
        type="horizontal-bar"
        data={Object.entries(data.frequentCommands)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10)
          .map(([cmd, count]) => ({ label: cmd, value: count }))}
      />
    </div>

    <div className="peak-hours">
      <h3>時間帯別アクティビティ</h3>
      <Chart
        type="line"
        data={data.peakHours.map((count, hour) => ({
          label: `${hour}時`,
          value: count
        }))}
      />
    </div>

    {data.dangerousCommands.length > 0 && (
      <div className="dangerous-commands">
        <h3>
          <i className="codicon codicon-alert"></i>
          要注意コマンド
        </h3>
        <div className="warning-list">
          {data.dangerousCommands.map(cmd => (
            <div key={cmd.id} className="warning-item">
              <code>{cmd.command.raw}</code>
              <span className="sensitivity">{cmd.command.sensitivity}</span>
            </div>
          ))}
        </div>
      </div>
    )}
  </div>
);