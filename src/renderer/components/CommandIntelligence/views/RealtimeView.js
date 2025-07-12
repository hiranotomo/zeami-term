/**
 * RealtimeView - Real-time terminal output display
 * Shows ALL terminal input/output as it happens
 */

import React, { useState, useEffect, useRef } from 'react';
import '../command-intelligence.css';
import { cleanTerminalOutput } from '../utils/ansiHelpers.js';

export const RealtimeView = ({ commands, realtimeOutputs = [], ipcService }) => {
  const scrollContainerRef = useRef(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [filter, setFilter] = useState('all'); // all, input, output, claude

  // Debug: Log what we receive
  useEffect(() => {
    console.log('[RealtimeView] Received commands:', commands?.length || 0);
    console.log('[RealtimeView] Received realtimeOutputs:', realtimeOutputs?.length || 0);
    console.log('[RealtimeView] Commands sample:', commands?.slice(0, 3));
    console.log('[RealtimeView] RealtimeOutputs sample:', realtimeOutputs?.slice(0, 3));
  }, [commands, realtimeOutputs]);

  // Apply additional filters
  const filteredOutputs = realtimeOutputs.filter(output => {
    if (filter === 'all') return true;
    if (filter === 'input') return output.outputType === 'input';
    if (filter === 'output') return output.outputType === 'output';
    if (filter === 'claude') return output.collectedData?.inClaudeSession;
    return true;
  });

  // Auto-scroll to top when new content arrives (最新を最上部に表示)
  useEffect(() => {
    if (autoScroll && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
  }, [filteredOutputs, autoScroll]);

  // Format timestamp
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('ja-JP', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3
    });
  };

  // Get output type icon
  const getTypeIcon = (outputType) => {
    switch (outputType) {
      case 'input':
        return '→';
      case 'output':
        return '←';
      default:
        return '•';
    }
  };

  // Get output type class
  const getTypeClass = (output) => {
    const classes = ['realtime-item'];
    if (output.outputType === 'input') {
      classes.push('input-type');
    } else if (output.outputType === 'output') {
      classes.push('output-type');
    }
    if (output.collectedData?.inClaudeSession) {
      classes.push('claude-session');
    }
    return classes.join(' ');
  };

  return (
    <div className="realtime-view">
      {/* Debug Info */}
      <div className="debug-info" style={{ padding: '8px', backgroundColor: '#f0f0f0', border: '1px solid #ccc', marginBottom: '8px' }}>
        <small>
          Total commands: {commands?.length || 0} | 
          Terminal outputs: {realtimeOutputs.length} | 
          Filtered: {filteredOutputs.length}
        </small>
      </div>

      {/* Controls */}
      <div className="realtime-controls">
        <div className="filter-group">
          <button 
            className={filter === 'all' ? 'active' : ''}
            onClick={() => setFilter('all')}
          >
            すべて ({realtimeOutputs.length})
          </button>
          <button 
            className={filter === 'input' ? 'active' : ''}
            onClick={() => setFilter('input')}
          >
            入力のみ
          </button>
          <button 
            className={filter === 'output' ? 'active' : ''}
            onClick={() => setFilter('output')}
          >
            出力のみ
          </button>
          <button 
            className={filter === 'claude' ? 'active' : ''}
            onClick={() => setFilter('claude')}
          >
            Claude Code
          </button>
        </div>
        <div className="scroll-control">
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

      {/* Output List */}
      <div 
        className="realtime-output-list" 
        ref={scrollContainerRef}
        style={{ height: '400px', overflowY: 'auto', border: '1px solid #ccc' }}
      >
        {filteredOutputs.length === 0 ? (
          <div className="no-data">
            <p>データがありません</p>
            <p>ターミナルでコマンドを実行してください</p>
          </div>
        ) : (
          filteredOutputs.slice().reverse().map((output, index) => (
            <div key={output.id || index} className={getTypeClass(output)}>
              <div className="realtime-header">
                <span className="type-icon">
                  {getTypeIcon(output.outputType)}
                </span>
                <span className="timestamp">
                  {formatTime(output.timestamp)}
                </span>
                <span className="terminal-id">
                  {output.context?.terminal?.id || 'unknown'}
                </span>
                {output.collectedData?.inClaudeSession && (
                  <span className="claude-badge">Claude</span>
                )}
              </div>
              <div className="realtime-content">
                <pre>{cleanTerminalOutput(output.data || '')}</pre>
              </div>
            </div>
          ))
        )}
      </div>
      
      {/* Clear Button */}
      <div className="realtime-actions" style={{ marginTop: '8px' }}>
        <button onClick={() => window.location.reload()}>
          画面をリフレッシュ
        </button>
      </div>
    </div>
  );
};