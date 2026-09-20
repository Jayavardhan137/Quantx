import React, { useState, useEffect } from 'react';
import PlotlyChart from '../components/PlotlyChart';
import { fetchMarketData } from '../services/api';
import { TrendingUp, Activity, BarChart3, RefreshCw } from 'lucide-react';

export default function MarketAnalyticsView({ symbol = 'NVDA', startDate, endDate }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    fetchMarketData(symbol, startDate, endDate)
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
        <span>Loading Market Analytics for {symbol}...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-card" style={{ borderColor: 'var(--accent-rose)', color: 'var(--accent-rose)' }}>
        Error loading market analytics: {error}
      </div>
    );
  }

  if (!data || !data.dates || data.dates.length === 0) {
    return (
      <div className="glass-card" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
        No market data available for {symbol}.
      </div>
    );
  }

  const dates = data.dates || [];
  const open = data.open || [];
  const high = data.high || [];
  const low = data.low || [];
  const close = data.close || [];
  const sma20 = data.sma_20 || [];
  const sma50 = data.sma_50 || [];
  const ema20 = data.ema_20 || [];
  const rollingVol = data.rolling_vol_20 || [];
  const rollingRet = data.rolling_returns_20 || [];

  // Candlestick + SMA Traces
  const candleTrace = {
    x: dates,
    open: open,
    high: high,
    low: low,
    close: close,
    type: 'candlestick',
    name: symbol,
    increasing: { line: { color: '#10b981' } },
    decreasing: { line: { color: '#f43f5e' } },
  };

  const sma20Trace = {
    x: dates,
    y: sma20,
    type: 'scatter',
    mode: 'lines',
    name: 'SMA 20',
    line: { color: '#00f2fe', width: 1.5 },
  };

  const sma50Trace = {
    x: dates,
    y: sma50,
    type: 'scatter',
    mode: 'lines',
    name: 'SMA 50',
    line: { color: '#f59e0b', width: 1.5 },
  };

  const ema20Trace = {
    x: dates,
    y: ema20,
    type: 'scatter',
    mode: 'lines',
    name: 'EMA 20',
    line: { color: '#a855f7', width: 1.5, dash: 'dot' },
  };

  // Rolling Volatility Trace
  const volTrace = {
    x: dates,
    y: rollingVol.map((v) => (v !== null && v !== undefined ? v * 100 : null)),
    type: 'scatter',
    mode: 'lines',
    name: '20-Day Annualized Volatility (%)',
    line: { color: '#ec4899', width: 2 },
    fill: 'tozeroy',
    fillcolor: 'rgba(236, 72, 153, 0.08)',
  };

  // Rolling Returns Trace
  const returnsTrace = {
    x: dates,
    y: rollingRet.map((r) => (r !== null && r !== undefined ? r * 100 : null)),
    type: 'scatter',
    mode: 'lines',
    name: '20-Day Rolling Return (%)',
    line: { color: '#38bdf8', width: 2 },
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Candlestick & Moving Averages */}
      <div className="glass-card">
        <div className="glass-card-header">
          <div className="glass-card-title">
            <TrendingUp size={20} color="var(--accent-cyan)" />
            <span>{symbol} Price Action & Moving Averages</span>
          </div>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            {dates[0]} → {dates[dates.length - 1]} ({dates.length} bars)
          </span>
        </div>
        <PlotlyChart
          data={[candleTrace, sma20Trace, sma50Trace, ema20Trace]}
          layout={{
            xaxis: { rangeslider: { visible: false } },
            yaxis: { title: 'Price (₹ / $)', side: 'right' },
            height: 480,
          }}
        />
      </div>

      {/* 2-Column Grid: Rolling Volatility & Rolling Returns */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        <div className="glass-card">
          <div className="glass-card-header">
            <div className="glass-card-title">
              <Activity size={18} color="#ec4899" />
              <span>Rolling Annualized Volatility</span>
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              {'σ_20 * sqrt(N)'}
            </span>
          </div>
          <PlotlyChart
            data={[volTrace]}
            layout={{
              yaxis: { title: 'Volatility (%)', side: 'right' },
              height: 320,
            }}
          />
        </div>

        <div className="glass-card">
          <div className="glass-card-header">
            <div className="glass-card-title">
              <BarChart3 size={18} color="#38bdf8" />
              <span>Rolling Returns (20-Day Window)</span>
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              {'r_20 = (P_t / P_{t-20}) - 1'}
            </span>
          </div>
          <PlotlyChart
            data={[returnsTrace]}
            layout={{
              yaxis: { title: 'Return (%)', side: 'right' },
              height: 320,
            }}
          />
        </div>
      </div>
    </div>
  );
}
