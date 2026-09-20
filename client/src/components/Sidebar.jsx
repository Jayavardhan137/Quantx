import React from 'react';
import { Play, Sliders, RefreshCw, ShieldCheck, Database, Calendar, Activity, DollarSign, Percent } from 'lucide-react';

export default function Sidebar({
  params,
  setParams,
  onRunBacktest,
  loading,
  assets = [],
  historicalUniverse = { start: '2021-09-20', end: '2026-09-18' }
}) {
  const handleChange = (field, value) => {
    setParams((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleQuickRange = (rangeType) => {
    const universeEnd = historicalUniverse?.end || '2026-09-18';
    const universeStart = historicalUniverse?.start || '2021-09-20';
    let newStart = universeStart;
    let newEnd = universeEnd;

    const [endYear, endMonth, endDay] = universeEnd.split('-').map(Number);

    if (rangeType === '1Y') {
      const startYear = endYear - 1;
      newStart = `${startYear}-${String(endMonth).padStart(2, '0')}-${String(endDay).padStart(2, '0')}`;
    } else if (rangeType === '3Y') {
      const startYear = endYear - 3;
      newStart = `${startYear}-${String(endMonth).padStart(2, '0')}-${String(endDay).padStart(2, '0')}`;
    } else if (rangeType === '5Y') {
      const startYear = endYear - 5;
      newStart = `${startYear}-${String(endMonth).padStart(2, '0')}-${String(endDay).padStart(2, '0')}`;
    } else if (rangeType === 'MAX') {
      newStart = universeStart;
      newEnd = universeEnd;
    }

    setParams((prev) => ({
      ...prev,
      start_date: newStart,
      end_date: newEnd,
    }));
  };

  return (
    <aside className="sidebar-panel">
      <div className="sidebar-header">
        <Sliders size={16} />
        <span>Execution Engine Control</span>
      </div>

      {/* Historical Data Universe Card */}
      <div style={{
        background: 'rgba(15, 23, 42, 0.65)',
        border: '1px solid rgba(56, 189, 248, 0.2)',
        borderRadius: '10px',
        padding: '0.65rem 0.85rem',
        marginBottom: '1rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
          <span style={{ fontSize: '0.66rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94a3b8', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '5px' }}>
            <Database size={11} color="var(--accent-cyan)" />
            HISTORICAL DATA UNIVERSE
          </span>
          <span style={{ fontSize: '0.62rem', padding: '1px 6px', background: 'rgba(56, 189, 248, 0.12)', color: '#38bdf8', borderRadius: '4px', border: '1px solid rgba(56, 189, 248, 0.25)', fontWeight: 600 }}>
            Alpaca
          </span>
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.76rem', color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ color: '#f8fafc' }}>{historicalUniverse?.start || '2021-09-20'}</span>
          <span style={{ color: '#64748b' }}>&rarr;</span>
          <span style={{ color: '#f8fafc' }}>{historicalUniverse?.end || '2026-09-18'}</span>
        </div>
      </div>

      {/* 1. Asset Selection */}
      <div className="form-group">
        <label className="form-label">
          <span style={{ color: 'var(--accent-cyan)' }}>01</span> &bull; Target Instrument
        </label>
        <select
          className="form-select"
          value={params.symbol}
          onChange={(e) => handleChange('symbol', e.target.value)}
        >
          <option value="NVDA">NVIDIA (NVDA) — US Equity</option>
          <option value="BTC-USD">Bitcoin (BTC-USD) — Crypto (365d)</option>
          <option value="GC=F">Gold (GC=F) — Commodity Futures</option>
        </select>
      </div>

      {/* 2. Backtest Period */}
      <div className="form-group">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
          <label className="form-label" style={{ marginBottom: 0 }}>
            <span style={{ color: 'var(--accent-cyan)' }}>02</span> &bull; BACKTEST PERIOD
          </label>
          {/* Quick Range Options */}
          <div style={{ display: 'flex', gap: '4px' }}>
            {['1Y', '3Y', '5Y', 'MAX'].map((rng) => (
              <button
                key={rng}
                type="button"
                onClick={() => handleQuickRange(rng)}
                className="btn-quick-range"
                style={{
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  color: '#94a3b8',
                  fontSize: '0.62rem',
                  fontWeight: 600,
                  padding: '2px 6px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-mono)',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = '#38bdf8';
                  e.currentTarget.style.borderColor = '#38bdf8';
                  e.currentTarget.style.background = 'rgba(56, 189, 248, 0.12)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = '#94a3b8';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.12)';
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                }}
              >
                {rng}
              </button>
            ))}
          </div>
        </div>
        <div className="form-row">
          <div style={{ flex: 1 }}>
            <span style={{ fontSize: '0.64rem', color: '#64748b', display: 'block', marginBottom: '2px', fontFamily: 'var(--font-mono)' }}>Start Date</span>
            <input
              type="date"
              className="form-control"
              value={params.start_date || '2021-09-20'}
              onChange={(e) => handleChange('start_date', e.target.value)}
            />
          </div>
          <div style={{ flex: 1 }}>
            <span style={{ fontSize: '0.64rem', color: '#64748b', display: 'block', marginBottom: '2px', fontFamily: 'var(--font-mono)' }}>End Date</span>
            <input
              type="date"
              className="form-control"
              value={params.end_date || '2026-09-18'}
              onChange={(e) => handleChange('end_date', e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* 3. Strategy Selection */}
      <div className="form-group">
        <label className="form-label">
          <span style={{ color: 'var(--accent-cyan)' }}>03</span> &bull; Alpha Model Kernel
        </label>
        <select
          className="form-select"
          value={params.strategy}
          onChange={(e) => handleChange('strategy', e.target.value)}
        >
          <option value="SMA Crossover">SMA Crossover (Trend-Following)</option>
          <option value="EMA Trend">EMA Trend (Momentum Filter)</option>
          <option value="Momentum">Momentum (ROC Lookback)</option>
          <option value="Mean Reversion">Mean Reversion (Bollinger + RSI)</option>
        </select>
      </div>

      {/* Dynamic Strategy Hyperparameters */}
      {params.strategy === 'SMA Crossover' && (
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Fast Period (Days)</label>
            <input
              type="number"
              className="form-control"
              value={params.fast_period}
              min="2"
              max="200"
              onChange={(e) => handleChange('fast_period', Number(e.target.value))}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Slow Period (Days)</label>
            <input
              type="number"
              className="form-control"
              value={params.slow_period}
              min="5"
              max="500"
              onChange={(e) => handleChange('slow_period', Number(e.target.value))}
            />
          </div>
        </div>
      )}

      {params.strategy === 'EMA Trend' && (
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">EMA Fast</label>
            <input
              type="number"
              className="form-control"
              value={params.fast_period}
              min="2"
              max="200"
              onChange={(e) => handleChange('fast_period', Number(e.target.value))}
            />
          </div>
          <div className="form-group">
            <label className="form-label">EMA Slow</label>
            <input
              type="number"
              className="form-control"
              value={params.slow_period}
              min="5"
              max="500"
              onChange={(e) => handleChange('slow_period', Number(e.target.value))}
            />
          </div>
        </div>
      )}

      {params.strategy === 'Momentum' && (
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Lookback (Days)</label>
            <input
              type="number"
              className="form-control"
              value={params.fast_period}
              min="2"
              max="252"
              onChange={(e) => handleChange('fast_period', Number(e.target.value))}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Threshold (%)</label>
            <input
              type="number"
              className="form-control"
              value={0.0}
              step="0.1"
              disabled
            />
          </div>
        </div>
      )}

      {params.strategy === 'Mean Reversion' && (
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">RSI Oversold</label>
            <input
              type="number"
              className="form-control"
              value={params.rsi_oversold || 30}
              min="10"
              max="45"
              onChange={(e) => handleChange('rsi_oversold', Number(e.target.value))}
            />
          </div>
          <div className="form-group">
            <label className="form-label">RSI Overbought</label>
            <input
              type="number"
              className="form-control"
              value={params.rsi_overbought || 70}
              min="55"
              max="90"
              onChange={(e) => handleChange('rsi_overbought', Number(e.target.value))}
            />
          </div>
        </div>
      )}

      {/* 4. Capital & Sizing */}
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">
            <span style={{ color: 'var(--accent-cyan)' }}>04</span> &bull; Capital (₹)
          </label>
          <input
            type="number"
            className="form-control"
            value={params.initial_capital}
            step="10000"
            min="1000"
            onChange={(e) => handleChange('initial_capital', Number(e.target.value))}
          />
        </div>
        <div className="form-group">
          <label className="form-label">Position Size</label>
          <select
            className="form-select"
            value={params.position_size}
            onChange={(e) => handleChange('position_size', Number(e.target.value))}
          >
            <option value="1.0">100% Capital</option>
            <option value="0.75">75% Capital</option>
            <option value="0.50">50% Capital</option>
            <option value="0.25">25% Capital</option>
          </select>
        </div>
      </div>

      {/* 5. Friction Parameters */}
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">
            <span style={{ color: 'var(--accent-cyan)' }}>05</span> &bull; Fee (bps)
          </label>
          <select
            className="form-select"
            value={params.transaction_cost}
            onChange={(e) => handleChange('transaction_cost', Number(e.target.value))}
          >
            <option value="0.0010">0.10% (10 bps)</option>
            <option value="0.0005">0.05% (5 bps)</option>
            <option value="0.0020">0.20% (20 bps)</option>
            <option value="0.0">0.00% (Zero Friction)</option>
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Slippage</label>
          <select
            className="form-select"
            value={params.slippage}
            onChange={(e) => handleChange('slippage', Number(e.target.value))}
          >
            <option value="0.0005">0.05% (5 bps)</option>
            <option value="0.0002">0.02% (2 bps)</option>
            <option value="0.0010">0.10% (10 bps)</option>
            <option value="0.0">0.00% (Zero)</option>
          </select>
        </div>
      </div>

      {/* 6. Risk-Free Rate */}
      <div className="form-group">
        <label className="form-label">
          <span style={{ color: 'var(--accent-cyan)' }}>06</span> &bull; Risk-Free Rate (Rf)
        </label>
        <select
          className="form-select"
          value={params.risk_free_rate}
          onChange={(e) => handleChange('risk_free_rate', Number(e.target.value))}
        >
          <option value="0.0">0.0% (Zero Benchmark)</option>
          <option value="0.02">2.0% (T-Bill Low)</option>
          <option value="0.04">4.0% (Fed Funds)</option>
          <option value="0.065">6.5% (India Sovereign 10Y)</option>
        </select>
      </div>

      {/* Lookahead Bias Verification Note */}
      <div style={{
        background: 'rgba(16, 185, 129, 0.08)',
        border: '1px solid rgba(16, 185, 129, 0.25)',
        borderRadius: '10px',
        padding: '0.65rem 0.85rem',
        fontSize: '0.72rem',
        color: '#6ee7b7',
        fontFamily: 'var(--font-mono)',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '0.45rem',
        lineHeight: 1.45,
      }}>
        <ShieldCheck size={16} color="#10b981" style={{ flexShrink: 0, marginTop: 2 }} />
        <div>
          <strong style={{ color: '#a7f3d0' }}>Zero Look-Ahead Invariant</strong>: Signal at bar $t$ fills strictly on bar $t+1$ with slippage & fee deductions.
        </div>
      </div>

      {/* Primary Action Trigger */}
      <button
        className="btn-primary-action"
        onClick={onRunBacktest}
        disabled={loading}
      >
        {loading ? (
          <>
            <RefreshCw size={17} className="quant-spinner" style={{ width: 17, height: 17 }} />
            <span>Simulating...</span>
          </>
        ) : (
          <>
            <Play size={17} />
            <span>RUN BACKTEST</span>
          </>
        )}
      </button>
    </aside>
  );
}
