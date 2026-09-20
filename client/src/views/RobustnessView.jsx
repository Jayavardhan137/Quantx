import React, { useState, useEffect } from 'react';
import PlotlyChart from '../components/PlotlyChart';
import { runMonteCarlo, runParamScan } from '../services/api';
import { ShieldCheck, Flame, RefreshCw, BarChart2 } from 'lucide-react';

export default function RobustnessView({ params }) {
  const [mcData, setMcData] = useState(null);
  const [paramData, setParamData] = useState(null);
  const [loadingMc, setLoadingMc] = useState(true);
  const [loadingParam, setLoadingParam] = useState(true);
  const [error, setError] = useState(null);

  const fetchRobustness = () => {
    setLoadingMc(true);
    setLoadingParam(true);
    setError(null);

    runMonteCarlo({
      symbol: params.symbol,
      strategy: params.strategy,
      fast_period: params.fast_period,
      slow_period: params.slow_period,
      n_simulations: 500,
      start_date: params.start_date,
      end_date: params.end_date,
    })
      .then((res) => {
        setMcData(res);
        setLoadingMc(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoadingMc(false);
      });

    runParamScan({
      symbol: params.symbol,
      fast_range: [5, 10, 15, 20, 25, 30, 40, 50],
      slow_range: [30, 40, 50, 60, 75, 100, 150, 200],
      start_date: params.start_date,
      end_date: params.end_date,
    })
      .then((res) => {
        setParamData(res);
        setLoadingParam(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoadingParam(false);
      });
  };

  useEffect(() => {
    fetchRobustness();
  }, [params.symbol, params.strategy]);

  // Monte Carlo Confidence Band Traces
  const p95Trace = mcData ? {
    x: mcData.steps,
    y: mcData.percentile_95,
    type: 'scatter',
    mode: 'lines',
    name: '95th Percentile (Bull Outcome)',
    line: { color: 'rgba(16, 185, 129, 0.8)', width: 1.5 },
  } : null;

  const medianTrace = mcData ? {
    x: mcData.steps,
    y: mcData.percentile_50,
    type: 'scatter',
    mode: 'lines',
    name: 'Median Path (50th Percentile)',
    line: { color: '#00f2fe', width: 2.5 },
  } : null;

  const p05Trace = mcData ? {
    x: mcData.steps,
    y: mcData.percentile_5,
    type: 'scatter',
    mode: 'lines',
    name: '5th Percentile (Bear Outcome)',
    line: { color: 'rgba(244, 63, 94, 0.8)', width: 1.5 },
    fill: 'tonexty',
    fillcolor: 'rgba(56, 189, 248, 0.08)',
  } : null;

  // Final Equity Distribution Histogram Trace
  const histTrace = mcData ? {
    x: mcData.final_equities,
    type: 'histogram',
    name: 'Final Equity Distribution',
    marker: {
      color: 'rgba(99, 102, 241, 0.7)',
      line: { color: '#818cf8', width: 1 },
    },
    nbinsx: 35,
  } : null;

  // 2D Parameter Heatmap Trace
  const heatmapTrace = paramData ? {
    z: paramData.sharpe_grid,
    x: paramData.slow_range,
    y: paramData.fast_range,
    type: 'heatmap',
    colorscale: 'Viridis',
    colorbar: {
      title: 'Sharpe Ratio',
      tickfont: { color: '#94a3b8', family: 'JetBrains Mono' },
    },
  } : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Monte Carlo Section */}
      <div className="glass-card">
        <div className="glass-card-header">
          <div className="glass-card-title">
            <ShieldCheck size={20} color="var(--accent-cyan)" />
            <span>500-Path Monte Carlo Bootstrap Simulation ({params.symbol})</span>
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            Empirical Block Bootstrap • Zero Parametric Assumptions
          </span>
        </div>

        {loadingMc ? (
          <div className="loading-container">
            <div className="quant-spinner" />
            <span>Simulating 500 Bootstrap Trajectories...</span>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
            <PlotlyChart
              data={[p95Trace, medianTrace, p05Trace].filter(Boolean)}
              layout={{
                yaxis: { title: 'Simulated Equity (₹)', side: 'right' },
                xaxis: { title: 'Trading Days Forward' },
                height: 380,
              }}
            />
            <PlotlyChart
              data={[histTrace].filter(Boolean)}
              layout={{
                xaxis: { title: 'Terminal Equity (₹)' },
                yaxis: { title: 'Frequency' },
                height: 380,
              }}
            />
          </div>
        )}
      </div>

      {/* 2D Parameter Heatmap Scan */}
      <div className="glass-card">
        <div className="glass-card-header">
          <div className="glass-card-title">
            <Flame size={20} color="var(--accent-amber)" />
            <span>2D Parameter Robustness Heatmap (Fast MA vs Slow MA)</span>
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            Detects Overfitting Cliffs & Fragility Zones
          </span>
        </div>

        {loadingParam ? (
          <div className="loading-container">
            <div className="quant-spinner" />
            <span>Scanning 64-point Parameter Grid...</span>
          </div>
        ) : (
          <PlotlyChart
            data={[heatmapTrace].filter(Boolean)}
            layout={{
              xaxis: { title: 'Slow MA Period' },
              yaxis: { title: 'Fast MA Period' },
              height: 420,
            }}
          />
        )}
      </div>
    </div>
  );
}
