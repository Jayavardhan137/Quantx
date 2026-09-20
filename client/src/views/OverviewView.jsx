import React, { useState } from 'react';
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
  Scale,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Bot,
  Sparkles,
  BookOpen
} from 'lucide-react';

const FAQS = [
  {
    id: 'next-bar-bias',
    category: 'Execution Engine',
    question: 'What is Next-Bar Execution (t → t+1) and how does it prevent Look-Ahead Bias?',
    answer: `Look-ahead bias is the #1 reason backtested strategies fail in live trading. It occurs when a backtester executes a trade at the closing price of bar *t* using signals that required bar *t*'s close to compute—an impossible feat in real-time.

QuantX strictly enforces **Next-Bar Execution**:
1. Signals are generated using information up to the close of bar *t*.
2. Orders are placed and executed strictly at bar *t+1* (Open or Next Close).
3. Realistic slippage (e.g., 5 bps) and transaction fees (e.g., 10 bps) are deducted on every trade notional.

This mathematical isolation guarantees 100% reproducible and realistic performance with zero lookahead bias.`,
  },
  {
    id: 'sharpe-metrics',
    category: 'Risk & Metrics',
    question: 'How do I interpret Sharpe Ratio, Sortino Ratio, and Max Drawdown?',
    answer: `These three metrics form the foundation of institutional risk analysis:

• **Sharpe Ratio**: Measures excess return earned per unit of total volatility: $\\text{Sharpe} = (R_p - R_f) / \\sigma_p$. Values $< 0.5$ are weak, $1.0 - 1.5$ are solid, and $> 2.0$ are institutional-grade.
• **Sortino Ratio**: Similar to Sharpe, but penalizes only *downside* (harmful) volatility rather than upside gains.
• **Max Drawdown**: The largest peak-to-trough percentage loss experienced by the portfolio equity curve. It reveals your worst historical underwater loss period.`,
  },
  {
    id: 'market-regimes',
    category: 'Market Analytics',
    question: 'How does the 4-State Market Regime Matrix work?',
    answer: `Markets do not behave uniformly across cycles. QuantX segments market history into a **4-State Mutually Exclusive Regime Matrix** by combining two orthogonal dimensions:

1. **Trend Dimension**: Classified using SMA50 vs SMA200 (Bullish if SMA50 > SMA200, Bearish otherwise).
2. **Volatility Dimension**: 20-day rolling return standard deviation vs its historical 75th percentile threshold (High Volatility vs Normal/Low Volatility).

**The 4 Regimes**:
• **Bull + Low Vol**: Classic steady bull market; momentum and trend-following thrive.
• **Bull + High Vol**: Explosive bull run with rapid swings; trailing stops are key.
• **Bear + High Vol**: Panic selloffs and liquidity crashes; mean reversion and short strategies shine.
• **Bear + Low Vol**: Grind-down bear market; capital preservation is paramount.`,
  },
  {
    id: 'portfolio-parity',
    category: 'Portfolio Management',
    question: 'What is the difference between Equal Weight and Inverse Volatility (Risk Parity)?',
    answer: `In a multi-asset portfolio (e.g., NVDA + Bitcoin + Gold):

• **Equal Weight (1/N)**: Splits dollar capital evenly (33.3% each). However, because Bitcoin is ~4x more volatile than Gold, Bitcoin contributes over 70% of total portfolio risk!
• **Inverse Volatility (Risk Parity)**: Weights each asset inversely proportional to its annualized volatility ($w_i \\propto 1/\\sigma_i$). Assets with lower volatility (Gold) receive higher weight, while high-volatility assets (Bitcoin) receive lower weight. This equalizes the risk contribution of every asset and dramatically improves the portfolio's Sharpe ratio.`,
  },
  {
    id: 'robustness-monte-carlo',
    category: 'Overfitting & Robustness',
    question: 'What do the 500-Path Monte Carlo bootstrap simulation and 2D Heatmap prove?',
    answer: `Backtesting over a single historical price path risks data-mining bias (overfitting to past luck). QuantX provides two quantitative diagnostic tools:

1. **500-Path Monte Carlo Bootstrap**: Resamples historical daily trade returns 500 times with replacement to construct empirical confidence intervals. It reveals your **Median Expectation (50th percentile)**, **Worst 5% Stress Floor**, and **Probability of Profit**.
2. **2D Parameter Heatmap**: Evaluates your strategy across an $8 \\times 8$ grid of Fast MA vs. Slow MA parameters. Stable strategies exhibit smooth "plateaus" of positive Sharpe ratios; overfitted strategies have isolated "cliffs" that collapse if parameters shift slightly.`,
  },
  {
    id: 'ai-assistant',
    category: 'QuantX AI Assistant',
    question: 'How do I use the QuantX AI Assistant powered by Featherless AI?',
    answer: `You can access the **QuantX AI Assistant** anytime by clicking the **AI Assistant** button in the top navigation bar or the floating **Ask QuantX AI** badge in the bottom-right corner.

Powered by **Featherless AI** (\`Mistral-7B-Instruct\`), the assistant can:
• Explain complex formulas and quantitative jargon in plain English.
• Break down why your active strategy is performing well or poorly under current market conditions.
• Answer questions with one-click quick prompts on Sharpe, Drawdown, Lookahead Bias, and Risk Parity.`,
  },
];

export default function OverviewView({ setActiveTab, onRunStrategyLab }) {
  const [expandedFaq, setExpandedFaq] = useState('next-bar-bias');
  const [activeCategory, setActiveCategory] = useState('All');

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
      desc: 'Strict next-bar execution ($t \\rightarrow t+1$). Signal calculated at bar close $t$ executes strictly on bar $t+1$ with realistic slippage and transaction costs.',
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

  const categories = ['All', 'Execution Engine', 'Risk & Metrics', 'Market Analytics', 'Portfolio Management', 'Overfitting & Robustness', 'QuantX AI Assistant'];

  const filteredFaqs = activeCategory === 'All'
    ? FAQS
    : FAQS.filter((f) => f.category === activeCategory);

  const toggleFaq = (id) => {
    setExpandedFaq(expandedFaq === id ? null : id);
  };

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

      {/* Frequently Asked Questions (FAQ) Section */}
      <div className="glass-card" style={{ padding: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '4px' }}>
              <HelpCircle size={22} color="var(--accent-cyan)" />
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                Frequently Asked Questions & Concept Guide
              </h3>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Everything you need to know about QuantX execution, risk metrics, market regimes, and AI assistance.
            </p>
          </div>

          {/* Category Filter Pills */}
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                style={{
                  padding: '4px 12px',
                  borderRadius: '20px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: activeCategory === cat ? '1px solid var(--accent-cyan)' : '1px solid rgba(255, 255, 255, 0.08)',
                  background: activeCategory === cat ? 'rgba(0, 242, 254, 0.15)' : 'rgba(30, 41, 59, 0.5)',
                  color: activeCategory === cat ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                  transition: 'all 0.15s ease',
                }}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* FAQ Accordion List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1.25rem' }}>
          {filteredFaqs.map((faq) => {
            const isExpanded = expandedFaq === faq.id;
            return (
              <div
                key={faq.id}
                style={{
                  background: isExpanded ? 'rgba(30, 41, 59, 0.7)' : 'rgba(15, 23, 42, 0.5)',
                  border: isExpanded ? '1px solid rgba(56, 189, 248, 0.4)' : '1px solid rgba(255, 255, 255, 0.06)',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  transition: 'all 0.2s ease',
                }}
              >
                <button
                  onClick={() => toggleFaq(faq.id)}
                  style={{
                    width: '100%',
                    padding: '1.1rem 1.25rem',
                    background: 'transparent',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    textAlign: 'left',
                    cursor: 'pointer',
                    color: '#ffffff',
                    gap: '1rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span
                      style={{
                        fontSize: '0.68rem',
                        fontFamily: 'var(--font-mono)',
                        padding: '2px 8px',
                        borderRadius: '6px',
                        background: 'rgba(56, 189, 248, 0.12)',
                        color: 'var(--accent-cyan)',
                        border: '1px solid rgba(56, 189, 248, 0.25)',
                        fontWeight: 600,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {faq.category}
                    </span>
                    <span style={{ fontSize: '0.98rem', fontWeight: 700, color: isExpanded ? 'var(--accent-cyan)' : 'var(--text-primary)' }}>
                      {faq.question}
                    </span>
                  </div>

                  <div style={{ color: 'var(--accent-cyan)', flexShrink: 0 }}>
                    {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </div>
                </button>

                {isExpanded && (
                  <div
                    style={{
                      padding: '0 1.25rem 1.25rem 1.25rem',
                      color: 'var(--text-secondary)',
                      fontSize: '0.9rem',
                      lineHeight: 1.65,
                      borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                      paddingTop: '1rem',
                      whiteSpace: 'pre-line',
                    }}
                  >
                    {faq.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
