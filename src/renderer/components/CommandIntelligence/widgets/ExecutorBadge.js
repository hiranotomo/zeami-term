/**
 * ExecutorBadge - 実行者バッジウィジェット
 * コマンド実行者を視覚的に表示
 */

import React from 'react';

export const ExecutorBadge = ({ executor, small = false }) => {
  const getExecutorIcon = (type) => {
    switch (type) {
      case 'human':
        return 'person';
      case 'claude-code':
        return 'hubot';
      case 'gemini-cli':
        return 'robot';
      case 'copilot':
        return 'github-action';
      case 'shell-script':
        return 'file-code';
      default:
        return 'question';
    }
  };

  const getExecutorColor = (type) => {
    switch (type) {
      case 'human':
        return 'executor-human';
      case 'claude-code':
        return 'executor-claude';
      case 'gemini-cli':
        return 'executor-gemini';
      case 'copilot':
        return 'executor-copilot';
      case 'shell-script':
        return 'executor-script';
      default:
        return 'executor-unknown';
    }
  };

  const getExecutorLabel = (executor) => {
    if (executor.name) {
      return executor.name;
    }
    
    switch (executor.type) {
      case 'human':
        return '人間';
      case 'claude-code':
        return 'Claude Code';
      case 'gemini-cli':
        return 'Gemini CLI';
      case 'copilot':
        return 'GitHub Copilot';
      case 'shell-script':
        return 'スクリプト';
      default:
        return '不明';
    }
  };

  const getTriggerIcon = (trigger) => {
    switch (trigger) {
      case 'user-request':
        return null; // デフォルトなので表示しない
      case 'auto-fix':
        return 'wrench';
      case 'scheduled':
        return 'clock';
      case 'chain-execution':
        return 'link';
      default:
        return null;
    }
  };

  const className = `executor-badge ${getExecutorColor(executor.type)} ${small ? 'small' : ''}`;
  const triggerIcon = getTriggerIcon(executor.trigger);

  return (
    <div className={className} title={`${getExecutorLabel(executor)} ${executor.version || ''}`}>
      <i className={`codicon codicon-${getExecutorIcon(executor.type)}`}></i>
      {!small && (
        <>
          <span className="executor-name">{getExecutorLabel(executor)}</span>
          {executor.version && executor.version !== 'unknown' && (
            <span className="executor-version">{executor.version}</span>
          )}
          {triggerIcon && (
            <i className={`codicon codicon-${triggerIcon} trigger-icon`} 
               title={getTriggerLabel(executor.trigger)}></i>
          )}
        </>
      )}
    </div>
  );

  function getTriggerLabel(trigger) {
    const labels = {
      'user-request': 'ユーザーリクエスト',
      'auto-fix': '自動修正',
      'scheduled': 'スケジュール実行',
      'chain-execution': '連鎖実行'
    };
    return labels[trigger] || trigger;
  }
};