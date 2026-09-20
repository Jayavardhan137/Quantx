import React from 'react';
import { X, BookOpen, ShieldCheck, Database, Cpu, CheckCircle2 } from 'lucide-react';

export default function MethodologyModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <BookOpen size={24} color="var(--accent-cyan)" />
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem' }}>
              Data Source & Quantitative Methodology
            </h2>
          </div>
          <button className="modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          {/* Institutional Q&A Highlight */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(0, 242, 254, 0.1) 0%, rgba(99, 102, 241, 0.1) 100%)',
            border: '1px solid rgba(56, 189, 248, 0.3)',
            borderRadius: '12px',
            padding: '1.25rem 1.5rem'
          }}>
            <div style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: '1.05rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ShieldCheck size={20} color="var(--accent-cyan)" />
                <span>Core Institutional Standard</span>
              </div>
              <span style={{ fontSize: '0.75rem', padding: '3px 8px', background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', borderRadius: '6px', border: '1px solid rgba(56, 189, 248, 0.35)', fontWeight: 700 }}>
                Data Provider: Alpaca
              </span>
            </div>
            <p style={{ color: '#e2e8f0', fontSize: '0.95rem' }}>
              <strong>"Where did your data come from?"</strong>
            </p>
            <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginTop: '0.35rem', fontStyle: 'italic' }}>
              "Historical market data is sourced authoritatively from the Alpaca Markets Data API (IEX Equities & Crypto feeds). Historical universe is cleanly separated from the reproducible Backtest Period ($start\_date \le date \le end\_date$). The quantitative backtesting engine uses strictly lookahead-free next-bar execution ($t \rightarrow t+1$), explicit transaction costs, and slippage."
            </p>
          </div>

          {/* Detailed Pillars */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div style={{ background: 'rgba(15, 23, 42, 0.8)', padding: '1.25rem', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-cyan)', fontWeight: 700, marginBottom: '0.5rem' }}>
                <Database size={18} />
                <span>1. Alpaca Historical Data Ingestion</span>
              </div>
              <ul style={{ paddingLeft: '1.2rem', fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <li>Authoritative single-source market feed via Alpaca REST API.</li>
                <li>Fixed reproducible default backtest period (2021-09-20 &rarr; 2026-09-18).</li>
                <li>High-throughput local parquet caching with zero cross-provider contamination.</li>
                <li>Asset conventions: 252 periods/year for Equities/Futures, 365 periods/year for Bitcoin.</li>
              </ul>
            </div>

            <div style={{ background: 'rgba(15, 23, 42, 0.8)', padding: '1.25rem', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-emerald)', fontWeight: 700, marginBottom: '0.5rem' }}>
                <Cpu size={18} />
                <span>2. Execution & Bias Elimination</span>
              </div>
              <ul style={{ paddingLeft: '1.2rem', fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <li>Strict next-bar execution: Signal computed at close of bar t executes at bar t+1.</li>
                <li>Realistic slippage: BUY @ Price * (1 + slip), SELL @ Price * (1 - slip).</li>
                <li>Explicit commission deduction: Traded Notional * Fee.</li>
              </ul>
            </div>
          </div>

          {/* Mathematical Formulas Breakdown */}
          <div style={{ background: 'rgba(15, 23, 42, 0.8)', padding: '1.25rem', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
            <div style={{ color: 'var(--text-primary)', fontWeight: 700, marginBottom: '0.75rem' }}>
              Pure Mathematical Specifications
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}>
              <div>
                <strong style={{ color: 'var(--accent-blue)' }}>Daily Return:</strong><br />
                {'r_t = (P_t / P_{t-1}) - 1'}
              </div>
              <div>
                <strong style={{ color: 'var(--accent-blue)' }}>Cumulative Return:</strong><br />
                {'Product(1 + r_t) - 1'}
              </div>
              <div>
                <strong style={{ color: 'var(--accent-blue)' }}>Annualized Volatility:</strong><br />
                {'Std(r_t) * sqrt(252 or 365)'}
              </div>
              <div>
                <strong style={{ color: 'var(--accent-blue)' }}>Sharpe Ratio:</strong><br />
                {'(CAGR - Rf) / Ann_Vol'}
              </div>
              <div>
                <strong style={{ color: 'var(--accent-blue)' }}>Maximum Drawdown:</strong><br />
                {'min(Equity_t / Peak_t - 1)'}
              </div>
              <div>
                <strong style={{ color: 'var(--accent-blue)' }}>Rolling Correlation:</strong><br />
                {'Calculated on returns: rho(r_A, r_B)'}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
            <button className="btn-primary-action" style={{ width: 'auto', padding: '0.65rem 1.75rem' }} onClick={onClose}>
              Got It
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
