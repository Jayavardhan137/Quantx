import React, { useState, useEffect } from 'react';
import PlotlyChart from '../components/PlotlyChart';
import { runMonteCarlo, runParamScan } from '../services/api';
import { ShieldCheck, Flame, TrendingUp, AlertTriangle, CheckCircle2, BarChart2 } from 'lucide-react';

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
  }, [params.symbol, params.strategy, params.start_date, params.end_date]);

  // Extract Monte Carlo series
  const p95 = mcData?.percentile_95 || mcData?.p95 || [];
  const p50 = mcData?.percentile_50 || mcData?.p50 || [];
  const p5 = mcData?.percentile_5 || mcData?.p5 || [];
  const samplePaths = mcData?.sample_paths || [];
  const finalEquities = mcData?.final_equities || [];
  const steps = mcData?.steps || Array.from({ length: p50.length }, (_, i) => i);
  const initialCap = mcData?.initial_capital || params.initial_capital || 100000;

  // Sample simulation trajectories (faint background lines)
  const sampleTraces = samplePaths.map((path, idx) => ({
    x: steps,
    y: path,
    type: 'scatter',
    mode: 'lines',
    name: `Sim ${idx + 1}`,
    line: { color: 'rgba(56, 189, 248, 0.08)', width: 1 },
    hoverinfo: 'none',
    showlegend: false,
  }));

  // Initial Capital reference line
  const initCapTrace = steps.length > 0 ? {
    x: [0, steps[steps.length - 1]],
    y: [initialCap, initialCap],
    type: 'scatter',
    mode: 'lines',
    name: 'Initial Capital',
    line: { color: 'rgba(148, 163, 184, 0.4)', width: 1.5, dash: 'dot' },
  } : null;

  // 95th Percentile (Bull Band)
  const p95Trace = p95.length > 0 ? {
    x: steps,
    y: p95,
    type: 'scatter',
    mode: 'lines',
    name: '95th Percentile (Bull Case)',
    line: { color: '#10b981', width: 2 },
  } : null;

  // Median Trajectory (50th Percentile)
  const medianTrace = p50.length > 0 ? {
    x: steps,
    y: p50,
    type: 'scatter',
    mode: 'lines',
    name: 'Median Path (50th %ile)',
    line: { color: '#00f2fe', width: 2.5 },
  } : null;

  // 5th Percentile (Bear Band with fill)
  const p05Trace = p5.length > 0 ? {
    x: steps,
    y: p5,
    type: 'scatter',
    mode: 'lines',
    name: '5th Percentile (Bear Case)',
    line: { color: '#f43f5e', width: 2 },
    fill: 'tonexty',
    fillcolor: 'rgba(56, 189, 248, 0.08)',
  } : null;

  // Final Equity Distribution Histogram Trace
  const histTrace = finalEquities.length > 0 ? {
    x: finalEquities,
    type: 'histogram',
    name: 'Terminal Equity',
    marker: {
      color: 'rgba(99, 102, 241, 0.75)',
      line: { color: '#818cf8', width: 1 },
    },
    nbinsx: 35,
  } : null;

  // 2D Parameter Heatmap Trace
  const fastRange = paramData?.fast_range || [5, 10, 15, 20, 25, 30, 40, 50];
  const slowRange = paramData?.slow_range || [30, 40, 50, 60, 75, 100, 150, 200];
  const sharpeGrid = paramData?.sharpe_grid || [];

  const heatmapTrace = sharpeGrid.length > 0 ? {
    z: sharpeGrid,
    x: slowRange.map((s) => `Slow ${s}`),
    y: fastRange.map((f) => `Fast ${f}`),
    type: 'heatmap',
    colorscale: [
      [0.0, '#0f172a'],
      [0.25, '#1e293b'],
      [0.5, '#3b82f6'],
      [0.75, '#8b5cf6'],
      [1.0, '#00f2fe'],
    ],
    text: sharpeGrid.map((row) =>
      Array.isArray(row) ? row.map((v) => (typeof v === 'number' ? `Sharpe: ${v.toFixed(2)}` : '')) : []
    ),
    hoverinfo: 'x+y+text',
    colorbar: {
      title: 'Sharpe Ratio',
      tickfont: { color: '#94a3b8', family: 'JetBrains Mono' },
    },
  } : null;

  const probProfit = mcData?.probability_of_profit ?? 0.5;
  const medianVal = mcData?.median_ending_value ?? initialCap;
  const worst5Val = mcData?.worst_5pct_outcome ?? initialCap;
  const best95Val = mcData?.best_95pct_outcome ?? (p95[p95.length - 1] || initialCap);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Overview Stat Cards */}
      {mcData && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
          <div className="glass-card" style={{ padding: '1rem 1.25rem' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Probability of Profit</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: probProfit >= 0.5 ? 'var(--accent-emerald)' : 'var(--accent-rose)', fontFamily: 'var(--font-mono)' }}>
              {(probProfit * 100).toFixed(1)}%
            </div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '2px' }}>P(Terminal Equity &gt; Initial)</div>
          </div>

          <div className="glass-card" style={{ padding: '1rem 1.25rem' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Median Terminal Equity</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)' }}>
              ₹{Math.round(medianVal).toLocaleString('en-IN')}
            </div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '2px' }}>50th Percentile Simulation</div>
          </div>

          <div className="glass-card" style={{ padding: '1rem 1.25rem' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Worst 5% Outcome</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--accent-rose)', fontFamily: 'var(--font-mono)' }}>
              ₹{Math.round(worst5Val).toLocaleString('en-IN')}
            </div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '2px' }}>5th Percentile Stress Floor</div>
          </div>

          <div className="glass-card" style={{ padding: '1rem 1.25rem' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Best 95% Outcome</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--accent-emerald)', fontFamily: 'var(--font-mono)' }}>
              ₹{Math.round(best95Val).toLocaleString('en-IN')}
            </div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '2px' }}>95th Percentile Bull Ceiling</div>
          </div>
        </div>
      )}

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
          <div className="loading-container" style={{ minHeight: '320px' }}>
            <div className="quant-spinner" />
            <span>Simulating 500 Bootstrap Trajectories for {params.symbol}...</span>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem', marginTop: '1rem' }}>
            <PlotlyChart
              data={[...sampleTraces, initCapTrace, p95Trace, medianTrace, p05Trace].filter(Boolean)}
              layout={{
                yaxis: { title: 'Simulated Equity (₹)', side: 'right' },
                xaxis: { title: 'Trading Days Forward' },
                height: 380,
                legend: { orientation: 'h', y: 1.12, x: 0 },
              }}
            />
            <PlotlyChart
              data={[histTrace].filter(Boolean)}
              layout={{
                xaxis: { title: 'Terminal Equity (₹)' },
                yaxis: { title: 'Frequency' },
                height: 380,
                margin: { l: 40, r: 20, t: 30, b: 40 },
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
            Detects Overfitting Cliffs & Fragility Zones across 64 Combinations
          </span>
        </div>

        {loadingParam ? (
          <div className="loading-container" style={{ minHeight: '280px' }}>
            <div className="quant-spinner" />
            <span>Scanning 64-point Parameter Grid...</span>
          </div>
        ) : (
          <div style={{ marginTop: '1rem' }}>
            <PlotlyChart
              data={[heatmapTrace].filter(Boolean)}
              layout={{
                xaxis: { title: 'Slow MA Period' },
                yaxis: { title: 'Fast MA Period' },
                height: 420,
                margin: { l: 80, r: 40, t: 20, b: 60 },
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
