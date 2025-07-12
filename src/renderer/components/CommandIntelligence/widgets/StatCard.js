/**
 * StatCard - 統計カードウィジェット
 * 単一の統計値を表示
 */

import React from 'react';

export const StatCard = ({ title, value, icon, color = 'default', trend }) => {
  const getColorClass = (color) => {
    switch (color) {
      case 'success':
        return 'stat-card-success';
      case 'warning':
        return 'stat-card-warning';
      case 'error':
        return 'stat-card-error';
      case 'info':
        return 'stat-card-info';
      default:
        return 'stat-card-default';
    }
  };

  return (
    <div className={`stat-card ${getColorClass(color)}`}>
      <div className="stat-card-header">
        {icon && (
          <i className={`codicon codicon-${icon} stat-card-icon`}></i>
        )}
        <h4 className="stat-card-title">{title}</h4>
      </div>
      <div className="stat-card-body">
        <div className="stat-card-value">{value}</div>
        {trend !== undefined && (
          <div className="stat-card-trend">
            {trend > 0 ? (
              <>
                <i className="codicon codicon-arrow-up trend-up"></i>
                <span>+{trend}</span>
              </>
            ) : trend < 0 ? (
              <>
                <i className="codicon codicon-arrow-down trend-down"></i>
                <span>{trend}</span>
              </>
            ) : (
              <>
                <i className="codicon codicon-dash trend-neutral"></i>
                <span>0</span>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};