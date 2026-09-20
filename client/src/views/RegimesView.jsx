import React, { useState, useEffect } from 'react';
import PlotlyChart from '../components/PlotlyChart';
import { fetchRegimes } from '../services/api';
import { Activity, ShieldAlert, Zap, TrendingUp } from 'lucide-react';

export default function RegimesView({ symbol = 'BTC-USD', startDate, endDate }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeRegimeTab, setActiveRegimeTab] = useState('combined');

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    fetchRegimes(symbol, startDate, endDate)
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
  }, [symbol, startDate, endDate]);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="quant-spinner" />
        <span>Classifying Trend & Volatility Regimes for {symbol}...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-card" style={{ borderColor: 'var(--accent-rose)', color: 'var(--accent-rose)' }}>
        Error loading market regimes: {error}
      </div>
    );
  }

  if (!data) return null;

  // Price line chart
  const priceTrace = {
    x: data.dates,
    y: data.price,
    type: 'scatter',
    mode: 'lines',
    name: `${symbol} Price`,
    line: { color: '#00f2fe', width: 2 },
  };

  // Rolling Volatility
  const volTrace = {
    x: data.rolling_vol_dates,
    y: data.rolling_vol_values,
    type: 'scatter',
    mode: 'lines',
    name: '20-Day Annualized Volatility (%)',
    line: { color: '#ec4899', width: 1.5 },
  };

  const combinedRows = [
    { label: 'Bullish + High Volatility', key: 'bull_high_vol', color: 'var(--accent-amber)', desc: 'SMA50 > SMA200 & Vol > 75th %ile' },
    { label: 'Bullish + Normal/Low Vol', key: 'bull_low_vol', color: 'var(--accent-emerald)', desc: 'SMA50 > SMA200 & Vol ≤ 75th %ile' },
    { label: 'Bearish + High Volatility', key: 'bear_high_vol', color: 'var(--accent-rose)', desc: 'SMA50 < SMA200 & Vol > 75th %ile' },
    { label: 'Bearish + Normal/Low Vol', key: 'bear_low_vol', color: 'var(--accent-cyan)', desc: 'SMA50 < SMA200 & Vol ≤ 75th %ile' },
  ];

  const trendRows = [
    { label: 'Bullish Regime (SMA 50 > SMA 200)', key: 'bullish', color: 'var(--accent-emerald)', desc: 'Golden Cross / Upward Momentum' },
    { label: 'Bearish Regime (SMA 50 < SMA 200)', key: 'bearish', color: 'var(--accent-rose)', desc: 'Death Cross / Downward Trend' },
  ];

  const volRows = [
    { label: 'High Volatility Regime (> 75th %ile)', key: 'high_vol', color: 'var(--accent-amber)', desc: 'Top Quartile Daily Variance' },
    { label: 'Normal / Low Volatility Regime (≤ 75th %ile)', key: 'normal_vol', color: 'var(--accent-cyan)', desc: 'Lower 3 Quartiles Stable Variance' },
  ];

  const currentRows = activeRegimeTab === 'combined'
    ? combinedRows
    : activeRegimeTab === 'trend'
    ? trendRows
    : volRows;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Regime Breakdown Matrix Card */}
      <div className="glass-card">
        <div className="glass-card-header" style={{ flexWrap: 'wrap', gap: '0.75rem' }}>
          <div className="glass-card-title">
            <Activity size={20} color="var(--accent-cyan)" />
            <span>Market Regime Segmented Performance ({symbol})</span>
          </div>
          
          {/* Dimensional Switcher */}
          <div style={{ display: 'flex', gap: '6px', background: 'rgba(15, 23, 42, 0.6)', padding: '3px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
            <button
              onClick={() => setActiveRegimeTab('combined')}
              style={{
                padding: '4px 10px',
                fontSize: '0.72rem',
                fontWeight: 600,
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
                background: activeRegimeTab === 'combined' ? 'var(--accent-cyan)' : 'transparent',
                color: activeRegimeTab === 'combined' ? '#0f172a' : 'var(--text-muted)',
                transition: 'all 0.15s ease',
              }}
            >
              Combined 4-State (Mutually Exclusive)
            </button>
            <button
              onClick={() => setActiveRegimeTab('trend')}
              style={{
                padding: '4px 10px',
                fontSize: '0.72rem',
                fontWeight: 600,
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
                background: activeRegimeTab === 'trend' ? 'var(--accent-cyan)' : 'transparent',
                color: activeRegimeTab === 'trend' ? '#0f172a' : 'var(--text-muted)',
                transition: 'all 0.15s ease',
              }}
            >
              Trend Dimension
            </button>
            <button
              onClick={() => setActiveRegimeTab('volatility')}
              style={{
                padding: '4px 10px',
                fontSize: '0.72rem',
                fontWeight: 600,
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
                background: activeRegimeTab === 'volatility' ? 'var(--accent-cyan)' : 'transparent',
                color: activeRegimeTab === 'volatility' ? '#0f172a' : 'var(--text-muted)',
                transition: 'all 0.15s ease',
              }}
            >
              Volatility Dimension
            </button>
          </div>
        </div>

        {/* Methodology & Statistical Significance Note */}
        <div style={{
          background: 'rgba(30, 41, 59, 0.4)',
          borderLeft: '3px solid var(--accent-cyan)',
          padding: '0.6rem 0.9rem',
          margin: '0.75rem 0',
          borderRadius: '0 6px 6px 0',
          fontSize: '0.73rem',
          color: '#cbd5e1',
          lineHeight: 1.45,
          fontFamily: 'var(--font-mono)'
        }}>
          <strong>Methodology Note</strong>: Performance is computed strictly on discrete returns belonging to each active regime period.
          Annualized metrics (CAGR & Sharpe) require a statistical minimum of <strong>N &ge; 60 observations</strong> to prevent misleading annualization from short slices.
          {data.meta && (
            <span style={{ color: 'var(--accent-cyan)', marginLeft: '6px' }}>
              [Total Valid: {data.meta.total_observations} | Classified: {data.meta.classified_observations} | Lookback Warming: {data.meta.unclassified_lookback_observations}]
            </span>
          )}
        </div>

        <div className="table-container">
          <table className="quant-table">
            <thead>
              <tr>
                <th>Regime Classification</th>
                <th style={{ textAlign: 'center' }}>Sample Days</th>
                <th style={{ textAlign: 'center' }}>Total Return</th>
                <th style={{ textAlign: 'center' }}>CAGR (N &ge; 60)</th>
                <th style={{ textAlign: 'center' }}>Annualized Vol</th>
                <th style={{ textAlign: 'center' }}>Sharpe Ratio</th>
                <th style={{ textAlign: 'center' }}>Max Drawdown</th>
              </tr>
            </thead>
            <tbody>
              {currentRows.map((b) => {
                const stats = data.breakdown?.[b.key] || {};
                const samples = stats.samples ?? 0;
                const totRet = stats.total_return;
                const cagr = stats.cagr;
                const vol = stats.volatility;
                const sharpe = stats.sharpe;
                const mdd = stats.max_drawdown;

                const totRetDisplay = (totRet === null || totRet === undefined || isNaN(totRet))
                  ? 'N/A'
                  : `${(Number(totRet) * 100) >= 0 ? '+' : ''}${(Number(totRet) * 100).toFixed(1)}%`;

                const cagrDisplay = (cagr === null || cagr === undefined || isNaN(cagr))
                  ? 'N/A'
                  : `${(Number(cagr) * 100) >= 0 ? '+' : ''}${(Number(cagr) * 100).toFixed(1)}%`;

                const volDisplay = (vol === null || vol === undefined || isNaN(vol))
                  ? 'N/A'
                  : `${(Number(vol) * 100).toFixed(1)}%`;

                const sharpeDisplay = (sharpe === null || sharpe === undefined || isNaN(sharpe))
                  ? 'N/A'
                  : Number(sharpe).toFixed(2);

                const mddDisplay = (mdd === null || mdd === undefined || isNaN(mdd))
                  ? 'N/A'
                  : `${(Number(mdd) * 100).toFixed(1)}%`;

                const totRetColor = totRet === null || totRet === undefined || isNaN(totRet)
                  ? 'var(--text-muted)'
                  : (Number(totRet) >= 0 ? 'var(--accent-emerald)' : 'var(--accent-rose)');

                const cagrColor = cagr === null || cagr === undefined || isNaN(cagr)
                  ? 'var(--text-muted)'
                  : (Number(cagr) >= 0 ? 'var(--accent-emerald)' : 'var(--accent-rose)');

                const sharpeColor = sharpe === null || sharpe === undefined || isNaN(sharpe)
                  ? 'var(--text-muted)'
                  : (Number(sharpe) >= 1.0 ? 'var(--accent-cyan)' : 'var(--text-primary)');

                return (
                  <tr key={b.key}>
                    <td>
                      <div style={{ fontWeight: 700, color: b.color }}>{b.label}</div>
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '2px' }}>{b.desc}</div>
                    </td>
                    <td style={{ textAlign: 'center', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{samples}</td>
                    <td style={{ textAlign: 'center', color: totRetColor, fontWeight: 600, fontFamily: 'var(--font-mono)' }}>
                      {totRetDisplay}
                    </td>
                    <td style={{ textAlign: 'center', color: cagrColor, fontWeight: 600, fontFamily: 'var(--font-mono)' }}>
                      {cagrDisplay}
                    </td>
                    <td style={{ textAlign: 'center', fontFamily: 'var(--font-mono)' }}>
                      {volDisplay}
                    </td>
                    <td style={{ textAlign: 'center', color: sharpeColor, fontWeight: 600, fontFamily: 'var(--font-mono)' }}>
                      {sharpeDisplay}
                    </td>
                    <td style={{ textAlign: 'center', color: 'var(--accent-rose)', fontFamily: 'var(--font-mono)' }}>
                      {mddDisplay}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Price & Volatility Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        <div className="glass-card">
          <div className="glass-card-header">
            <div className="glass-card-title">
              <TrendingUp size={18} color="var(--accent-cyan)" />
              <span>Asset Price History</span>
            </div>
          </div>
          <PlotlyChart
            data={[priceTrace]}
            layout={{
              yaxis: { title: 'Price (₹ / $)', side: 'right' },
              height: 340,
            }}
          />
        </div>

        <div className="glass-card">
          <div className="glass-card-header">
            <div className="glass-card-title">
              <Activity size={18} color="#ec4899" />
              <span>Regime Volatility Dynamics</span>
            </div>
          </div>
          <PlotlyChart
            data={[volTrace]}
            layout={{
              yaxis: { title: 'Annualized Vol (%)', side: 'right' },
              height: 340,
            }}
          />
        </div>
      </div>
    </div>
  );
}
