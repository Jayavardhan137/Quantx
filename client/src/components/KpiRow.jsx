import React from 'react';
import { TrendingUp, Award, AlertTriangle, Wallet, ArrowUpRight, ArrowDownRight, ShieldCheck } from 'lucide-react';

export default function KpiRow({ metrics, initialCapital = 100000 }) {
  if (!metrics) return null;

  const totalReturn = metrics['Total Return'] ?? metrics['Total Return %'] ?? 0;
  const sharpe = metrics['Sharpe Ratio'] ?? 0;
  const maxDd = metrics['Max Drawdown'] ?? metrics['Max Drawdown %'] ?? 0;
  const finalEquity = metrics['Final Equity'] ?? (initialCapital * (1 + (typeof totalReturn === 'number' ? totalReturn : 0) / 100));
  const cagr = metrics['CAGR'] ?? metrics['Annualized Return'] ?? 0;
  const winRate = metrics['Win Rate'] ?? metrics['Win Rate %'] ?? null;
  const trades = metrics['Total Trades'] ?? metrics['Trades'] ?? 0;

  const formatCurrency = (val) => {
    if (val === null || val === undefined || isNaN(val)) return 'N/A';
    return '₹' + Number(val).toLocaleString('en-IN', { maximumFractionDigits: 0 });
  };

  const formatPercent = (val) => {
    if (val === null || val === undefined || isNaN(val)) return 'N/A';
    const num = Number(val);
    const sign = num > 0 ? '+' : '';
    return `${sign}${num.toFixed(1)}%`;
  };

  const formatNumber = (val, decimals = 2) => {
    if (val === null || val === undefined || isNaN(val)) return 'N/A';
    return Number(val).toFixed(decimals);
  };

  const isProfit = Number(totalReturn) >= 0;

  return (
    <div className="kpi-grid">
      {/* 1. Portfolio Final Value */}
      <div className="kpi-card">
        <div className="kpi-title">
          <span>Portfolio Value</span>
          <div style={{ width: 26, height: 26, borderRadius: 6, background: 'rgba(0, 242, 254, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Wallet size={14} color="var(--accent-cyan)" />
          </div>
        </div>
        <div className="kpi-value">
          {formatCurrency(finalEquity)}
        </div>
        <div className="kpi-subtitle">
          <span style={{ color: 'var(--text-muted)' }}>Initial:</span>
          <span>₹{Number(initialCapital).toLocaleString('en-IN')}</span>
          <span style={{ marginLeft: 'auto', color: isProfit ? 'var(--accent-emerald-bright)' : 'var(--accent-rose)', fontWeight: 700 }}>
            {isProfit ? '▲' : '▼'} {formatCurrency(Math.abs(finalEquity - initialCapital))}
          </span>
        </div>
      </div>

      {/* 2. Cumulative Return */}
      <div className="kpi-card">
        <div className="kpi-title">
          <span>Total Return</span>
          <div style={{ width: 26, height: 26, borderRadius: 6, background: isProfit ? 'rgba(16, 185, 129, 0.12)' : 'rgba(244, 63, 94, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <TrendingUp size={14} color={isProfit ? 'var(--accent-emerald-bright)' : 'var(--accent-rose)'} />
          </div>
        </div>
        <div className={`kpi-value ${isProfit ? 'positive' : 'negative'}`}>
          {formatPercent(totalReturn)}
        </div>
        <div className="kpi-subtitle">
          <span style={{ color: 'var(--text-muted)' }}>CAGR:</span>
          <span style={{ color: isProfit ? 'var(--accent-emerald-bright)' : 'var(--accent-rose)', fontWeight: 600 }}>{formatPercent(cagr)}</span>
          <span style={{ marginLeft: 'auto', fontSize: '0.68rem', padding: '1px 6px', borderRadius: 4, background: isProfit ? 'rgba(16,185,129,0.15)' : 'rgba(244,63,94,0.15)', color: isProfit ? 'var(--accent-emerald-bright)' : 'var(--accent-rose)' }}>
            {isProfit ? 'PROFITABLE' : 'DRAWDOWN'}
          </span>
        </div>
      </div>

      {/* 3. Sharpe Ratio */}
      <div className="kpi-card">
        <div className="kpi-title">
          <span>Sharpe Ratio</span>
          <div style={{ width: 26, height: 26, borderRadius: 6, background: 'rgba(99, 102, 241, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Award size={14} color="var(--accent-indigo)" />
          </div>
        </div>
        <div className="kpi-value" style={{ color: sharpe >= 1.0 ? 'var(--accent-cyan)' : 'var(--text-primary)' }}>
          {formatNumber(sharpe, 2)}
        </div>
        <div className="kpi-subtitle">
          <span>{trades} Trades</span>
          {winRate !== null && (
            <span style={{ color: 'var(--accent-emerald-bright)', marginLeft: 'auto' }}>
              Win: {formatPercent(winRate)}
            </span>
          )}
        </div>
      </div>

      {/* 4. Maximum Drawdown */}
      <div className="kpi-card">
        <div className="kpi-title">
          <span>Max Drawdown</span>
          <div style={{ width: 26, height: 26, borderRadius: 6, background: 'rgba(244, 63, 94, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <AlertTriangle size={14} color="var(--accent-rose)" />
          </div>
        </div>
        <div className="kpi-value negative">
          {formatPercent(maxDd)}
        </div>
        <div className="kpi-subtitle">
          <span style={{ color: 'var(--text-muted)' }}>Risk:</span>
          <span>Peak-to-Trough Loss</span>
        </div>
      </div>
    </div>
  );
}
