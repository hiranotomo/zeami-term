/**
 * TimelineView - タイムライン表示ビュー
 * コマンドを時系列でスイムレーン表示
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ExecutorBadge } from '../widgets/ExecutorBadge.js';
import { formatDuration, formatTime, getRelativeTime } from '../utils/formatters.js';

export const TimelineView = ({ commands, selectedCommand, onSelectCommand, ipcService }) => {
  const [timeScale, setTimeScale] = useState('1min'); // 10sec, 1min, 10min, 1hour, 1day
  const [autoScroll, setAutoScroll] = useState(true);
  const timelineRef = useRef(null);
  const containerRef = useRef(null);

  // 自動スクロール（最新を下に表示）
  useEffect(() => {
    if (autoScroll && commands.length > 0 && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [commands, autoScroll]);

  // 時間スケールに基づいてグループ化
  const groupedCommands = useMemo(() => {
    const groups = new Map();
    const now = Date.now();
    const scaleMs = getScaleMilliseconds(timeScale);
    
    commands.forEach(cmd => {
      // ターミナルごとにグループ化
      const terminalKey = `${cmd.context.window.id}-${cmd.context.terminal.id}`;
      if (!groups.has(terminalKey)) {
        groups.set(terminalKey, {
          terminal: cmd.context.terminal,
          window: cmd.context.window,
          commands: []
        });
      }
      
      // 時間スケールに応じてコマンドを配置
      const relativeTime = now - cmd.timestamp;
      const position = Math.max(0, 1 - (relativeTime / scaleMs));
      
      groups.get(terminalKey).commands.push({
        ...cmd,
        position,
        relativeTime
      });
    });
    
    return groups;
  }, [commands, timeScale]);

  // 時間スケールをミリ秒に変換
  function getScaleMilliseconds(scale) {
    switch (scale) {
      case '10sec': return 10 * 1000;
      case '1min': return 60 * 1000;
      case '10min': return 10 * 60 * 1000;
      case '1hour': return 60 * 60 * 1000;
      case '1day': return 24 * 60 * 60 * 1000;
      default: return 60 * 1000;
    }
  }

  // コマンドのクリックハンドル
  const handleCommandClick = (command) => {
    onSelectCommand(command);
    
    // 詳細パネルを開く（別のビューと連携）
    ipcService.send('command:show-details', command.id);
  };

  // 実行中のコマンドの強調表示
  const getCommandClassName = (command) => {
    const classes = ['timeline-command'];
    
    if (command.execution.status === 'running') {
      classes.push('running');
    } else if (command.execution.status === 'error') {
      classes.push('error');
    } else if (command.execution.status === 'success') {
      classes.push('success');
    }
    
    if (selectedCommand && selectedCommand.id === command.id) {
      classes.push('selected');
    }
    
    if (command.command.sensitivity === 'dangerous') {
      classes.push('dangerous');
    } else if (command.command.sensitivity === 'sensitive') {
      classes.push('sensitive');
    }
    
    return classes.join(' ');
  };

  // タイムスケールボタン
  const TimeScaleButton = ({ scale, label }) => (
    <button
      className={timeScale === scale ? 'active' : ''}
      onClick={() => setTimeScale(scale)}
      title={`表示範囲: ${label}`}
    >
      {label}
    </button>
  );

  return (
    <div className="timeline-view">
      {/* コントロールバー */}
      <div className="timeline-controls">
        <div className="time-scale-selector">
          <span>表示範囲:</span>
          <TimeScaleButton scale="10sec" label="10秒" />
          <TimeScaleButton scale="1min" label="1分" />
          <TimeScaleButton scale="10min" label="10分" />
          <TimeScaleButton scale="1hour" label="1時間" />
          <TimeScaleButton scale="1day" label="1日" />
        </div>
        <div className="timeline-options">
          <label>
            <input
              type="checkbox"
              checked={autoScroll}
              onChange={(e) => setAutoScroll(e.target.checked)}
            />
            自動スクロール
          </label>
        </div>
      </div>

      {/* タイムライン */}
      <div className="timeline-container" ref={containerRef}>
        <div className="timeline-grid" ref={timelineRef}>
          {/* 縦型時間軸 */}
          <div className="time-axis">
            <div className="time-marker now">現在</div>
            <div className="time-marker">
              {getTimeLabel(0.75, timeScale)}
            </div>
            <div className="time-marker">
              {getTimeLabel(0.5, timeScale)}
            </div>
            <div className="time-marker">
              {getTimeLabel(0.25, timeScale)}
            </div>
            <div className="time-marker past">
              {getTimeLabel(0, timeScale)}
            </div>
          </div>

          {/* スイムレーンコンテナ */}
          <div className="timeline-swimlanes">
            {Array.from(groupedCommands.entries()).map(([terminalKey, group]) => (
            <div key={terminalKey} className="timeline-swimlane">
              {/* スイムレーンヘッダー */}
              <div className="swimlane-header">
                <div className="terminal-info">
                  <i className="codicon codicon-terminal"></i>
                  <span className="terminal-label">{group.terminal.label || 'Terminal'}</span>
                  <span className="window-id">Window {group.window.index + 1}</span>
                </div>
                <div className="command-count">
                  {group.commands.length} コマンド
                </div>
              </div>

              {/* コマンド表示 */}
              <div className="swimlane-content">
                {group.commands.map(cmd => (
                  <div
                    key={cmd.id}
                    className={getCommandClassName(cmd)}
                    style={{ top: `${(1 - cmd.position) * 100}%` }}
                    onClick={() => handleCommandClick(cmd)}
                    title={`${cmd.command.raw}\n実行時刻: ${formatTime(cmd.timestamp)}\n状態: ${cmd.execution.status}`}
                  >
                    {/* コマンドブロック */}
                    <div className="command-block">
                      <ExecutorBadge executor={cmd.executor} small />
                      <div className="command-info">
                        <div className="command-text">{cmd.command.raw}</div>
                        {cmd.execution.status === 'running' ? (
                          <div className="command-status">
                            <i className="codicon codicon-sync animate-spin"></i>
                            実行中...
                          </div>
                        ) : (
                          <div className="command-duration">
                            {formatDuration(cmd.execution.duration)}
                          </div>
                        )}
                      </div>
                      {cmd.execution.status === 'error' && (
                        <i className="codicon codicon-error status-icon"></i>
                      )}
                    </div>

                    {/* 実行中の進行バー */}
                    {cmd.execution.status === 'running' && (
                      <div className="progress-bar">
                        <div className="progress-indeterminate"></div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
            ))}
          </div>
        </div>
      </div>

      {/* 凡例 */}
      <div className="timeline-legend">
        <div className="legend-item">
          <span className="legend-color success"></span>
          成功
        </div>
        <div className="legend-item">
          <span className="legend-color error"></span>
          エラー
        </div>
        <div className="legend-item">
          <span className="legend-color running"></span>
          実行中
        </div>
        <div className="legend-item">
          <span className="legend-color sensitive"></span>
          要注意
        </div>
      </div>
    </div>
  );

  // 時間ラベルの生成
  function getTimeLabel(position, scale) {
    const scaleMs = getScaleMilliseconds(scale);
    const timeAgo = scaleMs * (1 - position);
    
    if (timeAgo < 60000) {
      return `${Math.round(timeAgo / 1000)}秒前`;
    } else if (timeAgo < 3600000) {
      return `${Math.round(timeAgo / 60000)}分前`;
    } else {
      return `${Math.round(timeAgo / 3600000)}時間前`;
    }
  }
};