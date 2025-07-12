/**
 * DebugPanel - Debug panel for Command Intelligence Hub
 */

import React, { useState, useEffect } from 'react';
import { ciDebugger } from '../../utils/CommandIntelligenceDebugger.js';
import { cleanTerminalOutput } from './utils/ansiHelpers.js';

export function DebugPanel() {
  const [isEnabled, setIsEnabled] = useState(ciDebugger.enabled);
  const [report, setReport] = useState(ciDebugger.getReport());
  const [refreshInterval, setRefreshInterval] = useState(null);

  useEffect(() => {
    if (isEnabled) {
      const interval = setInterval(() => {
        setReport(ciDebugger.getReport());
      }, 1000);
      setRefreshInterval(interval);
      return () => clearInterval(interval);
    } else if (refreshInterval) {
      clearInterval(refreshInterval);
      setRefreshInterval(null);
    }
  }, [isEnabled]);

  const handleToggle = () => {
    const enabled = ciDebugger.toggle();
    setIsEnabled(enabled);
    if (enabled) {
      setReport(ciDebugger.getReport());
    }
  };

  const handleClear = () => {
    ciDebugger.clear();
    setReport(ciDebugger.getReport());
  };

  const handleExport = () => {
    ciDebugger.exportLogs();
  };

  if (!isEnabled) {
    return (
      <div className="debug-panel-compact">
        <button className="debug-toggle" onClick={handleToggle}>
          <i className="codicon codicon-debug"></i>
          Enable Debug
        </button>
      </div>
    );
  }

  return (
    <div className="debug-panel">
      <div className="debug-header">
        <h3>Command Intelligence Debug</h3>
        <div className="debug-actions">
          <button onClick={handleClear}>Clear</button>
          <button onClick={handleExport}>Export</button>
          <button onClick={handleToggle}>Disable</button>
        </div>
      </div>
      
      <div className="debug-content">
        <div className="debug-summary">
          <h4>Summary</h4>
          <div className="debug-stats">
            <div className="stat-item">
              <span>Total Logs:</span>
              <span>{report.logCount}</span>
            </div>
            <div className="stat-item">
              <span>Commands:</span>
              <span>{report.summary.commandCount}</span>
            </div>
            <div className="stat-item">
              <span>Errors:</span>
              <span className="error-count">{report.summary.recentErrors.length}</span>
            </div>
          </div>
        </div>

        <div className="debug-categories">
          <h4>By Category</h4>
          <div className="category-list">
            {Object.entries(report.summary.byCategory).map(([category, count]) => (
              <div key={category} className="category-item">
                <span className={`category-badge ${category}`}>{category}</span>
                <span>{count}</span>
              </div>
            ))}
          </div>
        </div>

        {report.summary.recentErrors.length > 0 && (
          <div className="debug-errors">
            <h4>Recent Errors</h4>
            <div className="error-list">
              {report.summary.recentErrors.map((error, idx) => (
                <div key={idx} className="error-item">
                  <span className="error-time">{new Date(error.time).toLocaleTimeString()}</span>
                  <span className="error-message">{error.message}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="debug-logs">
          <h4>Recent Logs (Last 20)</h4>
          <div className="log-list">
            {report.logs.slice(-20).reverse().map((log, idx) => (
              <div key={idx} className={`log-item ${log.category}`}>
                <span className="log-time">{new Date(log.timestamp).toLocaleTimeString()}</span>
                <span className={`log-category ${log.category}`}>{log.category}</span>
                <span className="log-message">{cleanTerminalOutput(log.message)}</span>
                {Object.keys(log.data).length > 0 && (
                  <details className="log-data">
                    <summary>Data</summary>
                    <pre>{cleanTerminalOutput(JSON.stringify(log.data, null, 2))}</pre>
                  </details>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}