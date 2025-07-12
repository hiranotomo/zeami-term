/**
 * CommandIntelligenceHub - メインコンテナコンポーネント
 * Command Intelligence Hubの全体的なレイアウトと状態管理
 */

import React, { useState, useEffect, useCallback } from 'react';
import { TimelineView } from './views/TimelineView.js';
import { AnalysisView } from './views/AnalysisView.js';
import { DetailedLogView } from './views/DetailedLogView.js';
import { RealtimeView } from './views/RealtimeView.js';
import { CommandFilter } from './widgets/CommandFilter.js';
import { CommandStats } from './widgets/CommandStats.js';
import { DebugPanel } from './DebugPanel.js';
import './command-intelligence.css';

export const CommandIntelligenceHub = ({ ipcService }) => {
  // 状態管理
  const [activeView, setActiveView] = useState('timeline'); // timeline, analysis, detailed, realtime
  const [commands, setCommands] = useState([]);
  const [realtimeOutputs, setRealtimeOutputs] = useState([]); // NEW: Real-time terminal outputs
  const [filteredCommands, setFilteredCommands] = useState([]);
  const [statistics, setStatistics] = useState({
    global: {
      totalCommands: 0,
      successCount: 0,
      errorCount: 0,
      totalDuration: 0
    },
    byTerminal: {},
    byExecutor: {},
    byCategory: {}
  });
  const [selectedCommand, setSelectedCommand] = useState(null);
  const [filters, setFilters] = useState({
    windowId: null,
    terminalId: null,
    executorType: null,
    status: null,
    category: null,
    timeRange: null,
    search: ''
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // データの初期読み込み
  useEffect(() => {
    loadInitialData();
    
    // IPCイベントリスナーの設定
    const handlers = {
      'command-execution-added': handleCommandAdded,
      'command-execution-updated': handleCommandUpdated,
      'statistics-updated': handleStatisticsUpdated,
      'terminal:output': handleTerminalOutput  // NEW: Handle terminal output
    };
    
    Object.entries(handlers).forEach(([event, handler]) => {
      ipcService.on(event, handler);
    });
    
    return () => {
      Object.entries(handlers).forEach(([event, handler]) => {
        ipcService.off(event, handler);
      });
    };
  }, []);

  // フィルタが変更されたときにコマンドを再フィルタリング
  useEffect(() => {
    applyFilters();
  }, [filters, commands]);

  // 初期データの読み込み
  const loadInitialData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // 既存のコマンド実行履歴を取得
      console.log('[CommandIntelligenceHub] Loading initial data...');
      
      const commandsResult = await ipcService.invoke('command:get-executions', {});
      console.log('[CommandIntelligenceHub] Commands result:', commandsResult);
      
      const statsResult = await ipcService.invoke('command:get-statistics', {});
      console.log('[CommandIntelligenceHub] Stats result:', statsResult);
      
      if (commandsResult && commandsResult.success) {
        setCommands(commandsResult.data || []);
      } else {
        console.error('[CommandIntelligenceHub] Failed to load commands:', commandsResult);
      }
      
      if (statsResult && statsResult.success) {
        setStatistics(statsResult.data || statistics);
      } else {
        console.error('[CommandIntelligenceHub] Failed to load statistics:', statsResult);
      }
    } catch (error) {
      console.error('[CommandIntelligenceHub] Failed to load initial data:', error);
      setError('データの読み込みに失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  // フィルタの適用
  const applyFilters = () => {
    let filtered = [...commands];
    
    // 各フィルタを適用
    if (filters.windowId) {
      filtered = filtered.filter(cmd => cmd.context.window.id === filters.windowId);
    }
    if (filters.terminalId) {
      filtered = filtered.filter(cmd => cmd.context.terminal.id === filters.terminalId);
    }
    if (filters.executorType) {
      filtered = filtered.filter(cmd => cmd.executor.type === filters.executorType);
    }
    if (filters.status) {
      filtered = filtered.filter(cmd => cmd.execution.status === filters.status);
    }
    if (filters.category) {
      filtered = filtered.filter(cmd => cmd.command.category === filters.category);
    }
    if (filters.timeRange) {
      const { start, end } = filters.timeRange;
      filtered = filtered.filter(cmd => 
        cmd.timestamp >= start && cmd.timestamp <= end
      );
    }
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(cmd => 
        cmd.command.raw.toLowerCase().includes(searchLower)
      );
    }
    
    setFilteredCommands(filtered);
  };

  // イベントハンドラー
  const handleCommandAdded = (event, command) => {
    setCommands(prev => [command, ...prev]);
  };

  const handleCommandUpdated = (event, { id, updates }) => {
    setCommands(prev => prev.map(cmd => 
      cmd.id === id ? { ...cmd, ...updates } : cmd
    ));
  };

  const handleStatisticsUpdated = (event, stats) => {
    setStatistics(stats);
  };
  
  // NEW: ターミナル出力のハンドラー
  const handleTerminalOutput = (event, outputData) => {
    // Add to realtime outputs for RealtimeView
    setRealtimeOutputs(prev => [outputData, ...prev].slice(0, 1000)); // Keep last 1000 items
    
    // Also convert terminal output to command-like structure for display in other views
    const terminalCommand = {
      id: outputData.id,
      timestamp: outputData.timestamp,
      type: outputData.type,
      context: outputData.context,
      executor: {
        type: outputData.outputType === 'input' ? 'human' : 'system',
        name: outputData.outputType === 'input' ? 'User Input' : 'Terminal Output',
        version: 'latest',
        trigger: outputData.outputType
      },
      command: {
        raw: outputData.data,
        parsed: { program: '', args: [], flags: {} },
        category: 'terminal-io',
        sensitivity: 'normal'
      },
      execution: {
        startTime: outputData.timestamp,
        endTime: outputData.timestamp,
        duration: 0,
        exitCode: null,
        signal: null,
        status: 'info',
        environment: {
          cwd: outputData.collectedData?.currentDirectory || '/',
          env: {}
        }
      },
      output: {
        stdout: { 
          lines: 1, 
          size: outputData.data.length, 
          sample: outputData.data,
          hasMore: false 
        },
        stderr: { lines: 0, size: 0, sample: '', hasMore: false }
      },
      metadata: {
        isTerminalOutput: true,
        outputType: outputData.outputType,
        inClaudeSession: outputData.collectedData?.inClaudeSession || false,
        isCommand: outputData.collectedData?.isCommand || false
      }
    };
    
    // Add to commands list
    setCommands(prev => [terminalCommand, ...prev].slice(0, 1000)); // Keep last 1000 items
  };

  // フィルタの更新
  const updateFilters = useCallback((newFilters) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  // フィルタのリセット
  const resetFilters = useCallback(() => {
    setFilters({
      windowId: null,
      terminalId: null,
      executorType: null,
      status: null,
      category: null,
      timeRange: null,
      search: ''
    });
  }, []);

  // コマンドの選択
  const selectCommand = useCallback((command) => {
    setSelectedCommand(command);
  }, []);

  // ビューの切り替え
  const switchView = useCallback((view) => {
    setActiveView(view);
  }, []);

  // エラー状態の表示
  if (error) {
    return (
      <div className="command-intelligence-hub error">
        <div className="error-message">
          <i className="codicon codicon-error"></i>
          <span>{error}</span>
          <button onClick={loadInitialData}>再試行</button>
        </div>
      </div>
    );
  }

  // ローディング状態の表示
  if (isLoading) {
    return (
      <div className="command-intelligence-hub loading">
        <div className="loading-spinner">
          <i className="codicon codicon-loading animate-spin"></i>
          <span>読み込み中...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="command-intelligence-hub">
      {/* ヘッダー部分 */}
      <div className="hub-header">
        <h2>Command Intelligence Hub</h2>
        <div className="view-switcher">
          <button 
            className={activeView === 'timeline' ? 'active' : ''}
            onClick={() => switchView('timeline')}
            title="タイムラインビュー"
          >
            <i className="codicon codicon-history"></i>
            タイムライン
          </button>
          <button 
            className={activeView === 'analysis' ? 'active' : ''}
            onClick={() => switchView('analysis')}
            title="分析ビュー"
          >
            <i className="codicon codicon-graph"></i>
            分析
          </button>
          <button 
            className={activeView === 'detailed' ? 'active' : ''}
            onClick={() => switchView('detailed')}
            title="詳細ログビュー"
          >
            <i className="codicon codicon-list-unordered"></i>
            詳細ログ
          </button>
          <button 
            className={activeView === 'realtime' ? 'active' : ''}
            onClick={() => switchView('realtime')}
            title="リアルタイムビュー"
          >
            <i className="codicon codicon-pulse"></i>
            リアルタイム
          </button>
        </div>
      </div>

      {/* フィルタとステータス */}
      <div className="hub-controls">
        <CommandFilter 
          filters={filters}
          onFiltersChange={updateFilters}
          onReset={resetFilters}
          terminals={getAvailableTerminals()}
          executors={getAvailableExecutors()}
          categories={getAvailableCategories()}
        />
        <CommandStats statistics={statistics} />
      </div>

      {/* メインビュー */}
      <div className="hub-content">
        {activeView === 'timeline' && (
          <TimelineView 
            commands={filteredCommands}
            selectedCommand={selectedCommand}
            onSelectCommand={selectCommand}
            ipcService={ipcService}
          />
        )}
        {activeView === 'analysis' && (
          <AnalysisView 
            commands={filteredCommands}
            statistics={statistics}
            filters={filters}
            ipcService={ipcService}
          />
        )}
        {activeView === 'detailed' && (
          <DetailedLogView 
            commands={filteredCommands}
            selectedCommand={selectedCommand}
            onSelectCommand={selectCommand}
            filters={filters}
            ipcService={ipcService}
          />
        )}
        {activeView === 'realtime' && (
          <RealtimeView 
            commands={commands}  // Use all commands for realtime view
            realtimeOutputs={realtimeOutputs}  // Pass realtime outputs
            ipcService={ipcService}
          />
        )}
      </div>
      {/* Debug Panel */}
      <DebugPanel />
    </div>
  );

  // ヘルパー関数
  function getAvailableTerminals() {
    const terminals = new Map();
    commands.forEach(cmd => {
      const key = `${cmd.context.window.id}-${cmd.context.terminal.id}`;
      terminals.set(key, {
        windowId: cmd.context.window.id,
        terminalId: cmd.context.terminal.id,
        label: cmd.context.terminal.label || `Terminal ${cmd.context.terminal.id}`
      });
    });
    return Array.from(terminals.values());
  }

  function getAvailableExecutors() {
    const executors = new Set();
    commands.forEach(cmd => executors.add(cmd.executor.type));
    return Array.from(executors);
  }

  function getAvailableCategories() {
    const categories = new Set();
    commands.forEach(cmd => categories.add(cmd.command.category));
    return Array.from(categories);
  }
};