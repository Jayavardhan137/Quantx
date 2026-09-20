import React, { useState, useEffect } from 'react';
import KpiRow from '../components/KpiRow';
import PlotlyChart from '../components/PlotlyChart';
import { runPortfolioSimulation } from '../services/api';
import { PieChart, Sliders, RefreshCw, Layers } from 'lucide-react';

export default function PortfolioView({ startDate, endDate }) {
  const [method, setMethod] = useState('equal');
  const [weights, setWeights] = useState({ 'Gold': 0.333, 'Bitcoin': 0.333, 'NVIDIA': 0.334 });
  const [initialCapital, setInitialCapital] = useState(100000);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const executeSimulation = () => {
    setLoading(true);
    setError(null);
    runPortfolioSimulation({
      weights,
      weighting_method: method,
      initial_capital: initialCapital,
      start_date: startDate,
      end_date: endDate,
    })
      .then((res) => {
        setData(res);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  };

  useEffect(() => {
    executeSimulation();
  }, [method, startDate, endDate]);

  const handleCustomWeight = (sym, val) => {
    const num = parseFloat(val) / 100;
    setWeights((prev) => ({
      ...prev,
      [sym]: num,
    }));
  };

  if (loading && !data) {
    return (
      <div className="loading-container">
        <div className="quant-spinner" />
        <span>Optimizing Multi-Asset Portfolio Simulation...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-card" style={{ borderColor: 'var(--accent-rose)', color: 'var(--accent-rose)' }}>
        Error running portfolio simulation: {error}
      </div>
    );
  }

  // Portfolio Equity Curve
  const equityTrace = data && data.dates ? {
    x: data.dates,
    y: data.portfolio_equity || [],
    type: 'scatter',
    mode: 'lines',
    name: 'Multi-Asset Portfolio Equity',
    line: { color: '#00f2fe', width: 2.5 },
    fill: 'tozeroy',
    fillcolor: 'rgba(0, 242, 254, 0.08)',
  } : null;

  // Individual asset equity traces
  const assetMap = data?.asset_equities || data?.asset_curves || {};
  const assetTraces = Object.entries(assetMap).map(([sym, eq], idx) => {
    const colors = ['#f59e0b', '#ec4899', '#8b5cf6'];
    return {
      x: data.dates,
      y: eq,
      type: 'scatter',
      mode: 'lines',
      name: `${sym} Standalone`,
      line: { color: colors[idx % colors.length], width: 1.5, dash: 'dot' },
    };
  });

  // Pie chart trace
  const activeWeights = (data && (data.applied_weights || data.weights)) || weights || {};
  const pieTrace = {
    labels: Object.keys(activeWeights),
    values: Object.values(activeWeights),
    type: 'pie',
    hole: 0.5,
    marker: {
      colors: ['#fbbf24', '#f59e0b', '#00f2fe'],
    },
    textinfo: 'label+percent',
    textfont: { family: 'JetBrains Mono', color: '#ffffff' },
  };

  const rawMetrics = data?.metrics || {};
  const totalReturnNum = typeof rawMetrics.total_return === 'number' ? rawMetrics.total_return : (typeof rawMetrics['Total Return'] === 'number' ? rawMetrics['Total Return'] : 0);
  const cagrNum = typeof rawMetrics.cagr === 'number' ? rawMetrics.cagr : (typeof rawMetrics.CAGR === 'number' ? rawMetrics.CAGR : 0);
  const sharpeNum = typeof rawMetrics.sharpe === 'number' ? rawMetrics.sharpe : (typeof rawMetrics['Sharpe Ratio'] === 'number' ? rawMetrics['Sharpe Ratio'] : 0);
  const maxDdNum = typeof rawMetrics.max_drawdown === 'number' ? rawMetrics.max_drawdown : (typeof rawMetrics['Max Drawdown'] === 'number' ? rawMetrics['Max Drawdown'] : 0);
  const finalEqNum = rawMetrics['Final Equity'] ?? (initialCapital * (1 + totalReturnNum));

  const formattedKpis = {
    'Total Return': totalReturnNum * 100,
    'CAGR': cagrNum * 100,
    'Sharpe Ratio': sharpeNum,
    'Max Drawdown': maxDdNum * 100,
    'Final Equity': finalEqNum,
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Allocation Controls */}
      <div className="glass-card">
        <div className="glass-card-header">
          <div className="glass-card-title">
            <Sliders size={20} color="var(--accent-cyan)" />
            <span>Multi-Asset Allocation Model</span>
          </div>
          <div style={{ display: 'flex', gap: '0.6rem' }}>
            <button
              className={`btn-secondary ${method === 'equal' ? 'active' : ''}`}
              style={{
                background: method === 'equal' ? 'rgba(56, 189, 248, 0.2)' : undefined,
                borderColor: method === 'equal' ? 'var(--accent-cyan)' : undefined,
              }}
              onClick={() => setMethod('equal')}
            >
              Equal Weight (1/N)
            </button>
            <button
              className={`btn-secondary ${method === 'inverse_vol' ? 'active' : ''}`}
              style={{
                background: method === 'inverse_vol' ? 'rgba(56, 189, 248, 0.2)' : undefined,
                borderColor: method === 'inverse_vol' ? 'var(--accent-cyan)' : undefined,
              }}
              onClick={() => setMethod('inverse_vol')}
            >
              Inverse Volatility (Risk Parity)
            </button>
            <button
              className={`btn-secondary ${method === 'custom' ? 'active' : ''}`}
              style={{
                background: method === 'custom' ? 'rgba(56, 189, 248, 0.2)' : undefined,
                borderColor: method === 'custom' ? 'var(--accent-cyan)' : undefined,
              }}
              onClick={() => setMethod('custom')}
            >
              Custom Weights
            </button>
          </div>
        </div>

        {method === 'custom' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginTop: '1rem' }}>
            <div>
              <label className="form-label">Gold: {((weights['Gold'] || 0) * 100).toFixed(0)}%</label>
              <input
                type="range"
                min="0"
                max="100"
                value={(weights['Gold'] || 0) * 100}
                onChange={(e) => handleCustomWeight('Gold', e.target.value)}
                style={{ width: '100%' }}
              />
            </div>
            <div>
              <label className="form-label">Bitcoin: {((weights['Bitcoin'] || 0) * 100).toFixed(0)}%</label>
              <input
                type="range"
                min="0"
                max="100"
                value={(weights['Bitcoin'] || 0) * 100}
                onChange={(e) => handleCustomWeight('Bitcoin', e.target.value)}
                style={{ width: '100%' }}
              />
            </div>
            <div>
              <label className="form-label">NVIDIA: {((weights['NVIDIA'] || 0) * 100).toFixed(0)}%</label>
              <input
                type="range"
                min="0"
                max="100"
                value={(weights['NVIDIA'] || 0) * 100}
                onChange={(e) => handleCustomWeight('NVIDIA', e.target.value)}
                style={{ width: '100%' }}
              />
            </div>
            <div style={{ gridColumn: 'span 3', display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
              <button className="btn-primary-action" style={{ width: 'auto', padding: '0.5rem 1.5rem' }} onClick={executeSimulation}>
                Apply Custom Weights
              </button>
            </div>
          </div>
        )}
      </div>

      {/* KPI Cards */}
      {data && (
        <KpiRow
          metrics={formattedKpis}
          initialCapital={initialCapital}
        />
      )}

      {/* 2-Column Grid: Portfolio Equity & Weight Distribution */}
      {data && (
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
          <div className="glass-card">
            <div className="glass-card-header">
              <div className="glass-card-title">
                <Layers size={20} color="var(--accent-cyan)" />
                <span>Portfolio Equity Growth vs Standalone Assets</span>
              </div>
            </div>
            <PlotlyChart
              data={[equityTrace, ...assetTraces].filter(Boolean)}
              layout={{
                yaxis: { title: 'Equity (₹)', side: 'right' },
                height: 380,
              }}
            />
          </div>

          <div className="glass-card">
            <div className="glass-card-header">
              <div className="glass-card-title">
                <PieChart size={20} color="var(--accent-indigo)" />
                <span>Asset Allocation</span>
              </div>
            </div>
            <PlotlyChart
              data={[pieTrace]}
              layout={{
                height: 380,
                margin: { t: 20, r: 20, l: 20, b: 20 },
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
