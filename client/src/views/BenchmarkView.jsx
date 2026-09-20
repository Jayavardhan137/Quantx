import React, { useState, useEffect } from 'react';
import PlotlyChart from '../components/PlotlyChart';
import { compareStrategies } from '../services/api';
import { Scale, Award, ShieldCheck, CheckCircle2 } from 'lucide-react';

export default function BenchmarkView({ params }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    compareStrategies(params)
      .then((res) => {
        if (isMounted) {
          setData(res);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.message);
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [params.symbol, params.start_date, params.end_date, params.transaction_cost, params.slippage]);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="quant-spinner" />
        <span>Generating Institutional Strategy vs Benchmark Matrix for {params.symbol}...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-card" style={{ borderColor: 'var(--accent-rose)', color: 'var(--accent-rose)' }}>
        Error generating comparison matrix: {error}
      </div>
    );
  }

  if (!data) return null;

  const strategies = ['SMA', 'EMA', 'Momentum', 'Mean Rev.', 'B&H'];
  const metricsList = [
    { key: 'Return', label: 'Total Return', format: (v) => `${Number(v).toFixed(1)}%` },
    { key: 'CAGR', label: 'CAGR', format: (v) => `${Number(v).toFixed(1)}%` },
    { key: 'Volatility', label: 'Volatility', format: (v) => `${Number(v).toFixed(1)}%` },
    { key: 'Sharpe', label: 'Sharpe Ratio', format: (v) => Number(v).toFixed(2) },
    { key: 'Max Drawdown', label: 'Max Drawdown', format: (v) => `${Number(v).toFixed(1)}%` },
    { key: 'Trades', label: 'Total Trades', format: (v) => (v === '-' || v === undefined || v === null ? '—' : Number(v).toString()) },
  ];

  // Bar chart comparing Sharpe Ratio & CAGR
  const sharpeBarTrace = {
    x: strategies,
    y: strategies.map((s) => data.matrix['Sharpe']?.[s] || 0),
    type: 'bar',
    name: 'Sharpe Ratio',
    marker: {
      color: ['#00f2fe', '#38bdf8', '#818cf8', '#a855f7', '#64748b'],
    },
  };

  // Comparative Equity Curves
  const equityTraces = data.equity_curves ? Object.entries(data.equity_curves).map(([stratName, eqSeries]) => {
    const isBH = stratName === 'Buy & Hold' || stratName === 'B&H';
    return {
      x: data.dates,
      y: eqSeries,
      type: 'scatter',
      mode: 'lines',
      name: stratName,
      line: {
        width: isBH ? 1.5 : 2.2,
        dash: isBH ? 'dash' : 'solid',
      },
    };
  }) : [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Institutional Matrix Table Card */}
      <div className="glass-card">
        <div className="glass-card-header">
          <div className="glass-card-title">
            <Scale size={20} color="var(--accent-cyan)" />
            <span>Quantitative Multi-Strategy Benchmark Matrix ({params.symbol})</span>
          </div>
          <div className="badge-lookahead">
            <ShieldCheck size={14} />
            <span>Strict Next-Bar Execution</span>
          </div>
        </div>

        <div className="table-container">
          <table className="quant-table" style={{ fontSize: '0.95rem' }}>
            <thead>
              <tr>
                <th style={{ minWidth: '160px' }}>Metric</th>
                {strategies.map((strat) => (
                  <th key={strat} style={{ textAlign: 'center', color: strat === 'B&H' ? '#94a3b8' : 'var(--accent-cyan)' }}>
                    {strat}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {metricsList.map((m) => (
                <tr key={m.key}>
                  <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{m.label}</td>
                  {strategies.map((strat) => {
                    const rawVal = data.matrix[m.key]?.[strat];
                    const isSharpe = m.key === 'Sharpe';
                    const isReturn = m.key === 'Return' || m.key === 'CAGR';
                    const isDD = m.key === 'Max Drawdown';
                    
                    let color = 'var(--text-primary)';
                    if (isSharpe && typeof rawVal === 'number') {
                      color = rawVal >= 1.0 ? 'var(--accent-cyan)' : 'var(--text-primary)';
                    } else if (isReturn && typeof rawVal === 'number') {
                      color = rawVal >= 0 ? 'var(--accent-emerald)' : 'var(--accent-rose)';
                    } else if (isDD && typeof rawVal === 'number') {
                      color = 'var(--accent-rose)';
                    }

                    return (
                      <td key={strat} style={{ textAlign: 'center', color, fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                        {m.format(rawVal)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 2-Column Grid: Sharpe Comparison & Multi-Strategy Equity Growth */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1.5rem' }}>
        <div className="glass-card">
          <div className="glass-card-header">
            <div className="glass-card-title">
              <Award size={18} color="var(--accent-indigo)" />
              <span>Risk-Adjusted Efficiency (Sharpe)</span>
            </div>
          </div>
          <PlotlyChart
            data={[sharpeBarTrace]}
            layout={{
              yaxis: { title: 'Sharpe Ratio', side: 'right' },
              height: 340,
            }}
          />
        </div>

        <div className="glass-card">
          <div className="glass-card-header">
            <div className="glass-card-title">
              <Scale size={18} color="var(--accent-cyan)" />
              <span>Cumulative Equity Trajectories</span>
            </div>
          </div>
          <PlotlyChart
            data={equityTraces}
            layout={{
              yaxis: { title: 'Equity (₹)', side: 'right' },
              height: 340,
            }}
          />
        </div>
      </div>
    </div>
  );
}
