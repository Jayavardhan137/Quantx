import React, { useEffect, useRef } from 'react';
import Plotly from 'plotly.js-dist-min';

export default function PlotlyChart({ data = [], layout = {}, config = {}, style = {}, className = '' }) {
  const containerRef = useRef(null);

  const defaultLayout = {
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor: 'rgba(5, 9, 22, 0.65)',
    font: {
      family: 'JetBrains Mono, Outfit, sans-serif',
      color: '#94a3b8',
      size: 11,
    },
    margin: { t: 30, r: 25, l: 55, b: 40 },
    xaxis: {
      gridcolor: 'rgba(255, 255, 255, 0.04)',
      zerolinecolor: 'rgba(255, 255, 255, 0.08)',
      showgrid: true,
      tickfont: { color: '#64748b', size: 10, family: 'JetBrains Mono' },
    },
    yaxis: {
      gridcolor: 'rgba(255, 255, 255, 0.04)',
      zerolinecolor: 'rgba(255, 255, 255, 0.08)',
      showgrid: true,
      tickfont: { color: '#64748b', size: 10, family: 'JetBrains Mono' },
    },
    legend: {
      orientation: 'h',
      y: 1.14,
      x: 0,
      font: { color: '#e2e8f0', size: 11, family: 'Outfit, sans-serif' },
    },
    hovermode: 'x unified',
    hoverlabel: {
      bgcolor: 'rgba(8, 13, 29, 0.95)',
      bordercolor: 'rgba(0, 242, 254, 0.6)',
      font: { family: 'JetBrains Mono', color: '#f8fafc', size: 11 },
    },
    ...layout,
  };

  const defaultConfig = {
    responsive: true,
    displayModeBar: false,
    ...config,
  };

  useEffect(() => {
    if (!containerRef.current) return;

    Plotly.react(containerRef.current, data, defaultLayout, defaultConfig);

    const handleResize = () => {
      if (containerRef.current) {
        Plotly.Plots.resize(containerRef.current);
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (containerRef.current) {
        Plotly.purge(containerRef.current);
      }
    };
  }, [data, layout]);

  return (
    <div
      ref={containerRef}
      className={`chart-container ${className}`}
      style={{ width: '100%', minHeight: '380px', ...style }}
    />
  );
}
