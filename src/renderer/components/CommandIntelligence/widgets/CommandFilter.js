/**
 * CommandFilter - フィルタリングウィジェット
 * コマンドの絞り込み条件を設定
 */

import React, { useState, useEffect } from 'react';

export const CommandFilter = ({ 
  filters, 
  onFiltersChange, 
  onReset,
  terminals = [],
  executors = [],
  categories = []
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [searchInput, setSearchInput] = useState(filters.search || '');
  const [searchDebounceTimer, setSearchDebounceTimer] = useState(null);

  // 検索入力のデバウンス処理
  useEffect(() => {
    if (searchDebounceTimer) {
      clearTimeout(searchDebounceTimer);
    }
    
    const timer = setTimeout(() => {
      onFiltersChange({ search: searchInput });
    }, 300);
    
    setSearchDebounceTimer(timer);
    
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [searchInput]);

  // フィルタのアクティブ数を計算
  const activeFilterCount = Object.entries(filters).filter(([key, value]) => {
    if (key === 'search') return value && value.length > 0;
    return value !== null && value !== undefined;
  }).length;

  // 個別フィルタのハンドラー
  const handleTerminalChange = (e) => {
    const value = e.target.value;
    if (value === '') {
      onFiltersChange({ terminalId: null, windowId: null });
    } else {
      const [windowId, terminalId] = value.split('-');
      onFiltersChange({ windowId, terminalId });
    }
  };

  const handleExecutorChange = (e) => {
    const value = e.target.value;
    onFiltersChange({ executorType: value || null });
  };

  const handleStatusChange = (e) => {
    const value = e.target.value;
    onFiltersChange({ status: value || null });
  };

  const handleCategoryChange = (e) => {
    const value = e.target.value;
    onFiltersChange({ category: value || null });
  };

  const handleTimeRangeChange = (preset) => {
    const now = Date.now();
    let timeRange = null;
    
    switch (preset) {
      case '1hour':
        timeRange = { start: now - 60 * 60 * 1000, end: now };
        break;
      case '24hours':
        timeRange = { start: now - 24 * 60 * 60 * 1000, end: now };
        break;
      case '7days':
        timeRange = { start: now - 7 * 24 * 60 * 60 * 1000, end: now };
        break;
      case 'custom':
        // カスタム日付選択のUIを開く
        break;
      default:
        timeRange = null;
    }
    
    onFiltersChange({ timeRange });
  };

  // リセットハンドラー
  const handleReset = () => {
    setSearchInput('');
    onReset();
  };

  return (
    <div className="command-filter">
      {/* 検索バー */}
      <div className="filter-search">
        <div className="search-input-wrapper">
          <i className="codicon codicon-search"></i>
          <input
            type="text"
            placeholder="コマンドを検索..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="search-input"
          />
          {searchInput && (
            <button 
              className="clear-search"
              onClick={() => setSearchInput('')}
              title="検索をクリア"
            >
              <i className="codicon codicon-close"></i>
            </button>
          )}
        </div>
        
        {/* フィルタ展開ボタン */}
        <button
          className={`filter-toggle ${isExpanded ? 'expanded' : ''}`}
          onClick={() => setIsExpanded(!isExpanded)}
          title={`フィルタ${activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}`}
        >
          <i className="codicon codicon-filter"></i>
          {activeFilterCount > 0 && (
            <span className="filter-count">{activeFilterCount}</span>
          )}
        </button>
      </div>

      {/* 展開されたフィルタオプション */}
      {isExpanded && (
        <div className="filter-options">
          <div className="filter-row">
            {/* ターミナルフィルタ */}
            <div className="filter-group">
              <label>ターミナル</label>
              <select 
                value={filters.terminalId ? `${filters.windowId}-${filters.terminalId}` : ''}
                onChange={handleTerminalChange}
              >
                <option value="">すべて</option>
                {terminals.map(terminal => (
                  <option 
                    key={`${terminal.windowId}-${terminal.terminalId}`}
                    value={`${terminal.windowId}-${terminal.terminalId}`}
                  >
                    {terminal.label} (Window {terminal.windowId})
                  </option>
                ))}
              </select>
            </div>

            {/* 実行者フィルタ */}
            <div className="filter-group">
              <label>実行者</label>
              <select value={filters.executorType || ''} onChange={handleExecutorChange}>
                <option value="">すべて</option>
                {executors.map(executor => (
                  <option key={executor} value={executor}>
                    {getExecutorLabel(executor)}
                  </option>
                ))}
              </select>
            </div>

            {/* 状態フィルタ */}
            <div className="filter-group">
              <label>状態</label>
              <select value={filters.status || ''} onChange={handleStatusChange}>
                <option value="">すべて</option>
                <option value="success">成功</option>
                <option value="error">エラー</option>
                <option value="running">実行中</option>
                <option value="cancelled">キャンセル</option>
              </select>
            </div>

            {/* カテゴリフィルタ */}
            <div className="filter-group">
              <label>カテゴリ</label>
              <select value={filters.category || ''} onChange={handleCategoryChange}>
                <option value="">すべて</option>
                {categories.map(category => (
                  <option key={category} value={category}>
                    {getCategoryLabel(category)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="filter-row">
            {/* 時間範囲フィルタ */}
            <div className="filter-group time-range">
              <label>時間範囲</label>
              <div className="time-range-buttons">
                <button 
                  className={filters.timeRange?.end === Date.now() && 
                            (Date.now() - filters.timeRange?.start) === 60 * 60 * 1000 ? 'active' : ''}
                  onClick={() => handleTimeRangeChange('1hour')}
                >
                  1時間
                </button>
                <button 
                  className={filters.timeRange?.end === Date.now() && 
                            (Date.now() - filters.timeRange?.start) === 24 * 60 * 60 * 1000 ? 'active' : ''}
                  onClick={() => handleTimeRangeChange('24hours')}
                >
                  24時間
                </button>
                <button 
                  className={filters.timeRange?.end === Date.now() && 
                            (Date.now() - filters.timeRange?.start) === 7 * 24 * 60 * 60 * 1000 ? 'active' : ''}
                  onClick={() => handleTimeRangeChange('7days')}
                >
                  7日間
                </button>
                <button 
                  className={!filters.timeRange ? 'active' : ''}
                  onClick={() => handleTimeRangeChange(null)}
                >
                  すべて
                </button>
              </div>
            </div>

            {/* リセットボタン */}
            <div className="filter-actions">
              <button 
                className="reset-filters"
                onClick={handleReset}
                disabled={activeFilterCount === 0}
              >
                <i className="codicon codicon-clear-all"></i>
                フィルタをリセット
              </button>
            </div>
          </div>

          {/* アクティブフィルタの表示 */}
          {activeFilterCount > 0 && (
            <div className="active-filters">
              {filters.search && (
                <span className="filter-tag">
                  検索: "{filters.search}"
                  <button onClick={() => setSearchInput('')}>
                    <i className="codicon codicon-close"></i>
                  </button>
                </span>
              )}
              {filters.terminalId && (
                <span className="filter-tag">
                  ターミナル: {terminals.find(t => 
                    t.terminalId === filters.terminalId && 
                    t.windowId === filters.windowId
                  )?.label || filters.terminalId}
                  <button onClick={() => onFiltersChange({ terminalId: null, windowId: null })}>
                    <i className="codicon codicon-close"></i>
                  </button>
                </span>
              )}
              {filters.executorType && (
                <span className="filter-tag">
                  実行者: {getExecutorLabel(filters.executorType)}
                  <button onClick={() => onFiltersChange({ executorType: null })}>
                    <i className="codicon codicon-close"></i>
                  </button>
                </span>
              )}
              {filters.status && (
                <span className="filter-tag">
                  状態: {getStatusLabel(filters.status)}
                  <button onClick={() => onFiltersChange({ status: null })}>
                    <i className="codicon codicon-close"></i>
                  </button>
                </span>
              )}
              {filters.category && (
                <span className="filter-tag">
                  カテゴリ: {getCategoryLabel(filters.category)}
                  <button onClick={() => onFiltersChange({ category: null })}>
                    <i className="codicon codicon-close"></i>
                  </button>
                </span>
              )}
              {filters.timeRange && (
                <span className="filter-tag">
                  時間範囲: {getTimeRangeLabel(filters.timeRange)}
                  <button onClick={() => onFiltersChange({ timeRange: null })}>
                    <i className="codicon codicon-close"></i>
                  </button>
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );

  // ラベル取得関数
  function getExecutorLabel(executor) {
    const labels = {
      'human': '人間',
      'claude-code': 'Claude Code',
      'gemini-cli': 'Gemini CLI',
      'copilot': 'GitHub Copilot',
      'shell-script': 'シェルスクリプト'
    };
    return labels[executor] || executor;
  }

  function getCategoryLabel(category) {
    const labels = {
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
    return labels[category] || category;
  }

  function getStatusLabel(status) {
    const labels = {
      'success': '成功',
      'error': 'エラー',
      'running': '実行中',
      'cancelled': 'キャンセル',
      'pending': '待機中',
      'timeout': 'タイムアウト'
    };
    return labels[status] || status;
  }

  function getTimeRangeLabel(timeRange) {
    if (!timeRange) return 'すべて';
    
    const duration = timeRange.end - timeRange.start;
    const hours = Math.floor(duration / (60 * 60 * 1000));
    const days = Math.floor(hours / 24);
    
    if (days > 0) {
      return `過去${days}日間`;
    } else if (hours > 0) {
      return `過去${hours}時間`;
    } else {
      return '最近';
    }
  }
};