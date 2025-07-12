/**
 * Chart - シンプルなチャートウィジェット
 * 各種グラフを描画（外部ライブラリなし）
 */

import React, { useMemo } from 'react';

export const Chart = ({ title, type, data }) => {
  // チャートコンテンツの生成
  const chartContent = useMemo(() => {
    switch (type) {
      case 'pie':
        return <PieChart data={data} />;
      case 'bar':
        return <BarChart data={data} />;
      case 'horizontal-bar':
        return <HorizontalBarChart data={data} />;
      case 'line':
        return <LineChart data={data} />;
      case 'histogram':
        return <HistogramChart data={data} />;
      default:
        return <div>Unsupported chart type: {type}</div>;
    }
  }, [type, data]);

  return (
    <div className="chart-widget">
      {title && <h3 className="chart-title">{title}</h3>}
      <div className="chart-content">
        {chartContent}
      </div>
    </div>
  );
};

// 円グラフコンポーネント
const PieChart = ({ data }) => {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
  
  let currentAngle = -90; // 12時の位置から開始
  
  return (
    <div className="pie-chart">
      <svg viewBox="0 0 200 200" width="200" height="200">
        {data.map((item, index) => {
          const percentage = (item.value / total) * 100;
          const angle = (percentage / 100) * 360;
          const startAngle = currentAngle;
          const endAngle = currentAngle + angle;
          currentAngle = endAngle;
          
          const largeArcFlag = angle > 180 ? 1 : 0;
          
          const startX = 100 + 80 * Math.cos((startAngle * Math.PI) / 180);
          const startY = 100 + 80 * Math.sin((startAngle * Math.PI) / 180);
          const endX = 100 + 80 * Math.cos((endAngle * Math.PI) / 180);
          const endY = 100 + 80 * Math.sin((endAngle * Math.PI) / 180);
          
          const pathData = [
            'M 100 100',
            `L ${startX} ${startY}`,
            `A 80 80 0 ${largeArcFlag} 1 ${endX} ${endY}`,
            'Z'
          ].join(' ');
          
          return (
            <g key={index}>
              <path
                d={pathData}
                fill={colors[index % colors.length]}
                opacity="0.8"
                className="pie-slice"
              />
              {percentage > 5 && (
                <text
                  x={100 + 50 * Math.cos(((startAngle + endAngle) / 2 * Math.PI) / 180)}
                  y={100 + 50 * Math.sin(((startAngle + endAngle) / 2 * Math.PI) / 180)}
                  textAnchor="middle"
                  className="pie-label"
                  fill="white"
                  fontSize="12"
                >
                  {percentage.toFixed(0)}%
                </text>
              )}
            </g>
          );
        })}
      </svg>
      <div className="chart-legend">
        {data.map((item, index) => (
          <div key={index} className="legend-item">
            <span 
              className="legend-color" 
              style={{ backgroundColor: colors[index % colors.length] }}
            ></span>
            <span className="legend-label">{item.label}</span>
            <span className="legend-value">({item.value})</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// 棒グラフコンポーネント
const BarChart = ({ data }) => {
  const maxValue = Math.max(...data.map(item => item.value));
  
  return (
    <div className="bar-chart">
      <div className="bars">
        {data.map((item, index) => (
          <div key={index} className="bar-container">
            <div 
              className="bar"
              style={{ height: `${(item.value / maxValue) * 100}%` }}
              title={`${item.label}: ${item.value}`}
            >
              <span className="bar-value">{item.value}</span>
            </div>
            <span className="bar-label">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// 横棒グラフコンポーネント
const HorizontalBarChart = ({ data }) => {
  const maxValue = Math.max(...data.map(item => item.value));
  
  return (
    <div className="horizontal-bar-chart">
      {data.map((item, index) => (
        <div key={index} className="hbar-row">
          <span className="hbar-label">{item.label}</span>
          <div className="hbar-container">
            <div 
              className="hbar"
              style={{ width: `${(item.value / maxValue) * 100}%` }}
              title={`${item.label}: ${item.value}`}
            >
              <span className="hbar-value">{item.value}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

// 折れ線グラフコンポーネント
const LineChart = ({ data }) => {
  const maxValue = Math.max(...data.map(item => item.value));
  const minValue = Math.min(...data.map(item => item.value));
  const range = maxValue - minValue || 1;
  
  const points = data.map((item, index) => {
    const x = (index / (data.length - 1)) * 100;
    const y = 100 - ((item.value - minValue) / range) * 100;
    return `${x},${y}`;
  }).join(' ');
  
  return (
    <div className="line-chart">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none">
        <polyline
          points={points}
          fill="none"
          stroke="#3b82f6"
          strokeWidth="2"
          className="line-path"
        />
        {data.map((item, index) => {
          const x = (index / (data.length - 1)) * 100;
          const y = 100 - ((item.value - minValue) / range) * 100;
          return (
            <circle
              key={index}
              cx={x}
              cy={y}
              r="2"
              fill="#3b82f6"
              className="line-point"
              title={`${item.label}: ${item.value}`}
            />
          );
        })}
      </svg>
      <div className="line-labels">
        {data.filter((_, i) => i === 0 || i === data.length - 1 || i % Math.floor(data.length / 4) === 0)
          .map((item, index) => (
            <span key={index} className="line-label">{item.label}</span>
          ))}
      </div>
    </div>
  );
};

// ヒストグラムコンポーネント
const HistogramChart = ({ data }) => {
  const maxCount = Math.max(...data.map(item => item.count));
  
  return (
    <div className="histogram-chart">
      <div className="histogram-bars">
        {data.map((item, index) => (
          <div key={index} className="histogram-bar-container">
            <div 
              className="histogram-bar"
              style={{ height: `${(item.count / maxCount) * 100}%` }}
              title={`${item.range}: ${item.count}`}
            >
              {item.count > 0 && (
                <span className="histogram-count">{item.count}</span>
              )}
            </div>
            <span className="histogram-label">{item.range}</span>
          </div>
        ))}
      </div>
    </div>
  );
};