import React from 'react';
import {
  TrendingUp,
  ShieldCheck,
  Zap,
  Activity,
  Layers,
  ArrowRight,
  Database,
  Cpu,
  CheckCircle2,
  DollarSign,
  PieChart,
  Scale
} from 'lucide-react';

export default function OverviewView({ setActiveTab, onRunStrategyLab }) {
  const assetCards = [
    {
      name: 'NVIDIA Corporation',
      symbol: 'NVDA',
      category: 'US Equity (Tech / AI)',
      periods: '252 trading days/yr',
      color: '#00f2fe',
      desc: 'High beta semiconductor & compute sovereign equity benchmark.',
    },
    {
      name: 'Bitcoin (USD)',
      symbol: 'BTC-USD',
      category: 'Cryptocurrency (Digital Asset)',
      periods: '365 trading days/yr (24/7 continuous)',
      color: '#f59e0b',
      desc: 'Continuous non-stop digital store-of-value with high volatility profile.',
    },
    {
      name: 'Gold Continuous Futures',
      symbol: 'GC=F',
      category: 'Commodity / Precious Metals',
      periods: '252 trading days/yr',
      color: '#fbbf24',
      desc: 'Macro hedge and classic safe-haven commodity standard.',
    },
  ];

  const engineFeatures = [
    {
      icon: Cpu,
      title: 'Zero Look-Ahead Bias Engine',
      desc: 'Strict next-bar execution ($t \rightarrow t+1$). Signal calculated at bar close $t$ executes strictly on bar $t+1$ with realistic slippage and transaction costs.',
    },
    {
      icon: Layers,
      title: 'Mathematical Rigor & Purity',
      desc: 'Pure testable mathematical formulations for returns, annualized volatilities, Sharpe, underwater drawdowns, and rolling correlation on daily returns.',
    },
    {
      icon: ShieldCheck,
      title: 'Robustness & Monte Carlo',
      desc: '500-path bootstrap simulation confidence intervals (5th-95th percentile) and 2D parameter heatmaps to combat overfitting.',
    },
    {
      icon: Activity,
      title: 'Market Regime Classification',
      desc: 'Trend (Fast/Slow MA) & Volatility (Rolling Std) classification to dissect alpha across bull, bear, and high-volatility regimes.',
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Hero Banner */}
      <div
        className="glass-card"
        style={{
          background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.9) 0%, rgba(30, 41, 59, 0.8) 100%)',
          border: '1px solid rgba(56, 189, 248, 0.3)',
          position: 'relative',
          overflow: 'hidden',
          padding: '2.5rem',
        }}
      >
        <div style={{ position: 'relative', zIndex: 2, maxWidth: '850px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '4px 12px', background: 'rgba(0, 242, 254, 0.1)', border: '1px solid rgba(0, 242, 254, 0.3)', borderRadius: '20px', color: 'var(--accent-cyan)', fontSize: '0.75rem', fontWeight: 700, marginBottom: '1rem' }}>
            <Zap size={14} />
            <span>QUANTITATIVE RESEARCH & BACKTESTING TERMINAL</span>
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2.6rem', fontWeight: 800, letterSpacing: '-1px', lineHeight: 1.15, marginBottom: '1rem' }}>
            Institutional Strategy Engine with Next-Bar Execution & Zero Bias
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.05rem', lineHeight: 1.6, marginBottom: '1.75rem' }}>
            QuantX provides institutional-grade portfolio backtesting, strategy matrix benchmarking, Monte Carlo confidence intervals, return-based correlation networks, and market regime segmentation.
          </p>

          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <button
              className="btn-primary-action"
              style={{ width: 'auto', padding: '0.85rem 1.85rem' }}
              onClick={() => setActiveTab('strategy_lab')}
            >
              <Zap size={18} />
              <span>Launch Strategy Lab</span>
            </button>
            <button
              className="btn-secondary"
              style={{ padding: '0.85rem 1.5rem', fontSize: '0.95rem' }}
              onClick={() => setActiveTab('benchmark')}
            >
              <Scale size={18} />
              <span>Strategy vs Benchmark Matrix</span>
            </button>
            <button
              className="btn-secondary"
              style={{ padding: '0.85rem 1.5rem', fontSize: '0.95rem' }}
              onClick={() => setActiveTab('portfolio')}
            >
              <PieChart size={18} />
              <span>Portfolio Allocation</span>
            </button>
          </div>
        </div>
      </div>

      {/* Asset Universe */}
      <div>
        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', marginBottom: '1rem', color: 'var(--text-primary)' }}>
          Multi-Asset Research Universe (5-Year Dynamic Window)
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.25rem' }}>
          {assetCards.map((a) => (
            <div key={a.symbol} className="glass-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '1rem' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', fontWeight: 800, color: a.color }}>
                    {a.symbol}
                  </span>
                  <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '6px', background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)' }}>
                    {a.category}
                  </span>
                </div>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>{a.name}</div>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{a.desc}</p>
              </div>

              <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                <span>Convention: {a.periods}</span>
                <span style={{ color: 'var(--accent-cyan)' }}>Parquet Cached</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Core Architectural Pillars */}
      <div>
        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', marginBottom: '1rem', color: 'var(--text-primary)' }}>
          Institutional Quantitative Engine Architecture
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.25rem' }}>
          {engineFeatures.map((f, i) => {
            const Icon = f.icon;
            return (
              <div key={i} className="glass-card" style={{ display: 'flex', gap: '1.25rem', alignItems: 'flex-start' }}>
                <div style={{ padding: '0.85rem', borderRadius: '12px', background: 'rgba(56, 189, 248, 0.1)', border: '1px solid rgba(56, 189, 248, 0.3)', color: 'var(--accent-cyan)' }}>
                  <Icon size={24} />
                </div>
                <div>
                  <h4 style={{ fontFamily: 'var(--font-display)', fontSize: '1.05rem', fontWeight: 700, marginBottom: '0.4rem', color: 'var(--text-primary)' }}>
                    {f.title}
                  </h4>
                  <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.55 }}>
                    {f.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
