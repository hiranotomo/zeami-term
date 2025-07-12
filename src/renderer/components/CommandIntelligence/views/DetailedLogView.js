/**
 * DetailedLogView - 詳細ログビュー
 * コマンドの詳細情報を表形式で表示
 */

import React, { useState, useMemo, useCallback } from 'react';
import { ExecutorBadge } from '../widgets/ExecutorBadge.js';
import { formatDuration, formatTime, formatBytes } from '../utils/formatters.js';
import { cleanTerminalOutput } from '../utils/ansiHelpers.js';

export const DetailedLogView = ({ commands, selectedCommand, onSelectCommand, filters, ipcService }) => {
  const [sortColumn, setSortColumn] = useState('timestamp');
  const [sortOrder, setSortOrder] = useState('desc');
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [columns, setColumns] = useState({
    timestamp: true,
    executor: true,
    command: true,
    category: true,
    status: true,
    duration: true,
    terminal: true,
    exitCode: false,
    cwd: false,
    outputSize: false
  });

  // ソートされたコマンド
  const sortedCommands = useMemo(() => {
    const sorted = [...commands];
    
    sorted.sort((a, b) => {
      let aValue = getSortValue(a, sortColumn);
      let bValue = getSortValue(b, sortColumn);
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
    
    return sorted;
  }, [commands, sortColumn, sortOrder]);

  // ソート値の取得
  function getSortValue(command, column) {
    switch (column) {
      case 'timestamp':
        return command.timestamp;
      case 'executor':
        return command.executor.type;
      case 'command':
        return command.command.raw;
      case 'category':
        return command.command.category;
      case 'status':
        return command.execution.status;
      case 'duration':
        return command.execution.duration || 0;
      case 'terminal':
        return command.context.terminal.label;
      case 'exitCode':
        return command.execution.exitCode || 0;
      case 'cwd':
        return command.execution.environment.cwd;
      case 'outputSize':
        return command.output.stdout.size + command.output.stderr.size;
      default:
        return '';
    }
  }

  // カラムのソート
  const handleSort = (column) => {
    if (sortColumn === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortOrder('desc');
    }
  };

  // 行の展開/折りたたみ
  const toggleRowExpansion = (commandId) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(commandId)) {
      newExpanded.delete(commandId);
    } else {
      newExpanded.add(commandId);
    }
    setExpandedRows(newExpanded);
  };

  // コマンドの選択
  const handleSelectCommand = (command) => {
    onSelectCommand(command);
    toggleRowExpansion(command.id);
  };

  // カラムの表示/非表示
  const toggleColumn = (column) => {
    setColumns(prev => ({
      ...prev,
      [column]: !prev[column]
    }));
  };

  // エクスポート機能
  const handleExport = useCallback(async () => {
    const exportData = {
      timestamp: new Date().toISOString(),
      filters: filters,
      commands: sortedCommands.map(cmd => ({
        ...cmd.toJSON(),
        // 機密情報を除外
        execution: {
          ...cmd.execution,
          environment: {
            cwd: cmd.execution.environment.cwd
            // envは除外
          }
        }
      }))
    };
    
    try {
      const result = await ipcService.invoke('command:export', {
        data: exportData,
        format: 'json' // または 'csv'
      });
      
      if (result.success) {
        // 成功通知
        console.log('Export successful:', result.path);
      }
    } catch (error) {
      console.error('Export failed:', error);
    }
  }, [sortedCommands, filters, ipcService]);

  // ステータスアイコンの取得
  const getStatusIcon = (status) => {
    switch (status) {
      case 'success':
        return <i className="codicon codicon-check text-success"></i>;
      case 'error':
        return <i className="codicon codicon-error text-error"></i>;
      case 'running':
        return <i className="codicon codicon-sync animate-spin text-info"></i>;
      case 'cancelled':
        return <i className="codicon codicon-circle-slash text-warning"></i>;
      default:
        return <i className="codicon codicon-question"></i>;
    }
  };

  // カラムヘッダーコンポーネント
  const ColumnHeader = ({ column, label, sortable = true }) => (
    <th 
      className={`column-${column} ${sortable ? 'sortable' : ''} ${sortColumn === column ? 'sorted' : ''}`}
      onClick={sortable ? () => handleSort(column) : undefined}
    >
      <div className="column-header">
        <span>{label}</span>
        {sortable && sortColumn === column && (
          <i className={`codicon codicon-chevron-${sortOrder === 'asc' ? 'up' : 'down'}`}></i>
        )}
      </div>
    </th>
  );

  return (
    <div className="detailed-log-view">
      {/* ツールバー */}
      <div className="log-toolbar">
        <div className="column-selector">
          <button className="column-toggle-btn">
            <i className="codicon codicon-settings"></i>
            カラム設定
          </button>
          <div className="column-dropdown">
            {Object.entries(columns).map(([col, visible]) => (
              <label key={col}>
                <input
                  type="checkbox"
                  checked={visible}
                  onChange={() => toggleColumn(col)}
                />
                {getColumnLabel(col)}
              </label>
            ))}
          </div>
        </div>
        
        <button className="export-btn" onClick={handleExport}>
          <i className="codicon codicon-export"></i>
          エクスポート
        </button>
      </div>

      {/* テーブル */}
      <div className="log-table-container">
        <table className="log-table">
          <thead>
            <tr>
              <th className="expand-column"></th>
              {columns.timestamp && <ColumnHeader column="timestamp" label="実行時刻" />}
              {columns.executor && <ColumnHeader column="executor" label="実行者" />}
              {columns.command && <ColumnHeader column="command" label="コマンド" />}
              {columns.category && <ColumnHeader column="category" label="カテゴリ" />}
              {columns.status && <ColumnHeader column="status" label="状態" />}
              {columns.duration && <ColumnHeader column="duration" label="実行時間" />}
              {columns.terminal && <ColumnHeader column="terminal" label="ターミナル" />}
              {columns.exitCode && <ColumnHeader column="exitCode" label="終了コード" />}
              {columns.cwd && <ColumnHeader column="cwd" label="作業ディレクトリ" />}
              {columns.outputSize && <ColumnHeader column="outputSize" label="出力サイズ" />}
            </tr>
          </thead>
          <tbody>
            {sortedCommands.map(command => (
              <React.Fragment key={command.id}>
                <tr 
                  className={`log-row ${selectedCommand?.id === command.id ? 'selected' : ''} ${command.execution.status}`}
                  onClick={() => handleSelectCommand(command)}
                >
                  <td className="expand-column">
                    <button 
                      className="expand-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleRowExpansion(command.id);
                      }}
                    >
                      <i className={`codicon codicon-chevron-${expandedRows.has(command.id) ? 'down' : 'right'}`}></i>
                    </button>
                  </td>
                  {columns.timestamp && (
                    <td className="timestamp-cell">
                      <time dateTime={new Date(command.timestamp).toISOString()}>
                        {formatTime(command.timestamp)}
                      </time>
                    </td>
                  )}
                  {columns.executor && (
                    <td className="executor-cell">
                      <ExecutorBadge executor={command.executor} />
                    </td>
                  )}
                  {columns.command && (
                    <td className="command-cell">
                      <code>{command.command.raw}</code>
                      {command.command.sensitivity !== 'normal' && (
                        <span className={`sensitivity-badge ${command.command.sensitivity}`}>
                          {command.command.sensitivity}
                        </span>
                      )}
                    </td>
                  )}
                  {columns.category && (
                    <td className="category-cell">
                      <span className={`category-badge ${command.command.category}`}>
                        {command.command.category}
                      </span>
                    </td>
                  )}
                  {columns.status && (
                    <td className="status-cell">
                      {getStatusIcon(command.execution.status)}
                      <span>{command.execution.status}</span>
                    </td>
                  )}
                  {columns.duration && (
                    <td className="duration-cell">
                      {command.execution.duration ? formatDuration(command.execution.duration) : '-'}
                    </td>
                  )}
                  {columns.terminal && (
                    <td className="terminal-cell">
                      {command.context.terminal.label || `Terminal ${command.context.terminal.id}`}
                      <span className="window-info">W{command.context.window.index + 1}</span>
                    </td>
                  )}
                  {columns.exitCode && (
                    <td className="exitcode-cell">
                      {command.execution.exitCode !== null ? command.execution.exitCode : '-'}
                    </td>
                  )}
                  {columns.cwd && (
                    <td className="cwd-cell" title={command.execution.environment.cwd}>
                      {command.execution.environment.cwd}
                    </td>
                  )}
                  {columns.outputSize && (
                    <td className="outputsize-cell">
                      {formatBytes(command.output.stdout.size + command.output.stderr.size)}
                    </td>
                  )}
                </tr>
                
                {/* 展開された詳細行 */}
                {expandedRows.has(command.id) && (
                  <tr className="detail-row">
                    <td colSpan={Object.values(columns).filter(v => v).length + 1}>
                      <div className="command-details">
                        <div className="detail-section">
                          <h4>実行情報</h4>
                          <dl>
                            <dt>開始時刻:</dt>
                            <dd>{formatTime(command.execution.startTime)}</dd>
                            <dt>終了時刻:</dt>
                            <dd>{command.execution.endTime ? formatTime(command.execution.endTime) : '実行中'}</dd>
                            <dt>作業ディレクトリ:</dt>
                            <dd><code>{command.execution.environment.cwd}</code></dd>
                            <dt>シェル:</dt>
                            <dd>{command.context.session.shell}</dd>
                          </dl>
                        </div>
                        
                        <div className="detail-section">
                          <h4>出力情報</h4>
                          <dl>
                            <dt>標準出力:</dt>
                            <dd>{command.output.stdout.lines} 行 ({formatBytes(command.output.stdout.size)})</dd>
                            <dt>標準エラー:</dt>
                            <dd>{command.output.stderr.lines} 行 ({formatBytes(command.output.stderr.size)})</dd>
                          </dl>
                          {command.output.stdout.sample && (
                            <div className="output-sample">
                              <h5>出力サンプル:</h5>
                              <pre>{cleanTerminalOutput(command.output.stdout.sample)}</pre>
                            </div>
                          )}
                        </div>
                        
                        {command.metadata.tags.length > 0 && (
                          <div className="detail-section">
                            <h4>タグ</h4>
                            <div className="tag-list">
                              {command.metadata.tags.map(tag => (
                                <span key={tag} className="tag">{tag}</span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* ステータスバー */}
      <div className="log-statusbar">
        <span>{sortedCommands.length} コマンド</span>
        {selectedCommand && (
          <span>選択: {selectedCommand.command.raw}</span>
        )}
      </div>
    </div>
  );

  // カラムラベルの取得
  function getColumnLabel(column) {
    const labels = {
      timestamp: '実行時刻',
      executor: '実行者',
      command: 'コマンド',
      category: 'カテゴリ',
      status: '状態',
      duration: '実行時間',
      terminal: 'ターミナル',
      exitCode: '終了コード',
      cwd: '作業ディレクトリ',
      outputSize: '出力サイズ'
    };
    return labels[column] || column;
  }
};