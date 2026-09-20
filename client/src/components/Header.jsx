import React from 'react';
import {
  Activity,
  BarChart3,
  BookOpen,
  Cpu,
  Database,
  Layers,
  Network,
  PieChart,
  Scale,
  ShieldCheck,
  TrendingUp,
  Zap
} from 'lucide-react';

export default function Header({
  activeTab,
  setActiveTab,
  onOpenMethodology,
  onOpenAlpaca,
  onOpenEngine,
  onReplayLoader,
}) {
  const tabs = [
    { id: 'overview', label: 'Overview', icon: Layers },
    { id: 'market', label: 'Market Analytics', icon: TrendingUp },
    { id: 'correlation', label: 'Correlation', icon: Network },
    { id: 'strategy_lab', label: 'Strategy Lab', icon: Zap },
    { id: 'portfolio', label: 'Portfolio Backtest', icon: PieChart },
    { id: 'benchmark', label: 'Strategy vs Benchmark', icon: Scale },
    { id: 'robustness', label: 'Robustness', icon: ShieldCheck },
    { id: 'regimes', label: 'Market Regimes', icon: Activity },
  ];

  return (
    <header className="app-header">
      <div
        className="brand-section"
        onClick={onReplayLoader}
        style={{ cursor: 'pointer' }}
        title="Click to reboot 3D Quantum Animated Terminal"
      >
        <div className="brand-logo">QX</div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <span className="brand-title">QuantX</span>
            <span className="brand-badge">INSTITUTIONAL v3.2</span>
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            Next-Bar Execution Engine • Zero Look-Ahead Bias
          </div>
        </div>
      </div>

      <nav className="nav-tabs-container">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              className={`nav-tab-btn ${isActive ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <Icon size={16} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
        <button
          className="btn-secondary"
          onClick={onOpenMethodology}
          style={{ borderColor: 'rgba(56, 189, 248, 0.4)', color: 'var(--accent-cyan)' }}
          title="View Data Source & Methodology Modal"
        >
          <BookOpen size={15} />
          <span>Methodology</span>
        </button>

        <button
          className="badge-lookahead"
          onClick={onOpenAlpaca}
          style={{
            background: 'rgba(56, 189, 248, 0.15)',
            borderColor: 'rgba(56, 189, 248, 0.4)',
            color: 'var(--accent-cyan)',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
          title="Click to inspect Alpaca Market Data Feed & live ping"
        >
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#00f2fe', display: 'inline-block', boxShadow: '0 0 6px #00f2fe' }} />
          <Database size={13} />
          <span>Alpaca Feed</span>
        </button>

        <button
          className="badge-lookahead"
          onClick={onOpenEngine}
          style={{
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
          title="Click to inspect Look-Ahead Bias Elimination & Engine Specs"
        >
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', display: 'inline-block', boxShadow: '0 0 6px #10b981' }} />
          <Cpu size={13} />
          <span>Engine t → t+1</span>
        </button>
      </div>
    </header>
  );
}
