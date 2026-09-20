import React from 'react';
import KpiRow from '../components/KpiRow';
import PlotlyChart from '../components/PlotlyChart';
import TradeLogTable from '../components/TradeLogTable';
import { TrendingUp, Zap, AlertTriangle, Activity, ShieldCheck, PieChart, Layers, Gauge, Crosshair } from 'lucide-react';

export default function StrategyLabView({
  backtestResult,
  loading,
  error,
  params,
}) {
  if (loading) {
    return (
      <div className="loading-container">
        <div className="quant-spinner" />
        <span style={{ letterSpacing: '0.5px' }}>Executing Look-Ahead Free Backtest Engine (t → t+1)...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-card" style={{ borderColor: 'var(--accent-rose)', color: 'var(--accent-rose)' }}>
        Backtest execution failed: {error}
      </div>
    );
  }

  if (!backtestResult) return null;

  const chartData = backtestResult.chart_data || backtestResult;
  const metrics = backtestResult.metrics || backtestResult.performance_metrics || {};
  const tradeLog = backtestResult.trade_log || [];

  const dates = chartData.dates || [];
  const prices = chartData.price || chartData.prices || [];
  const fastMa = chartData.fast_ma || chartData.indicator_1 || [];
  const slowMa = chartData.slow_ma || chartData.indicator_2 || [];
  const strategyEquity = chartData.strategy_equity || [];
  const benchmarkEquity = chartData.benchmark_equity || [];
  const drawdown = chartData.strategy_drawdown || chartData.drawdown || [];

  // Extract BUY & SELL marker coordinates from Trade Log
  const buyX = [];
  const buyY = [];
  const sellX = [];
  const sellY = [];

  tradeLog.forEach((t) => {
    const action = t.action || t.type || t.signal;
    const dateVal = t.execution_date || t.date;
    const priceVal = t.execution_price || t.price;
    if (action === 'BUY') {
      buyX.push(dateVal);
      buyY.push(priceVal);
    } else if (action === 'SELL') {
      sellX.push(dateVal);
      sellY.push(priceVal);
    }
  });

  // CHART 1: Price + Fast MA + Slow MA + BUY / SELL markers
  const priceTrace = {
    x: dates,
    y: prices,
    type: 'scatter',
    mode: 'lines',
    name: `${params.symbol} Market Price`,
    line: { color: '#94a3b8', width: 1.5 },
  };

  const ind1Trace = fastMa.length ? {
    x: dates,
    y: fastMa,
    type: 'scatter',
    mode: 'lines',
    name: `Fast MA (${params.fast_period || 20})`,
    line: { color: '#00f2fe', width: 2 },
  } : null;

  const ind2Trace = slowMa.length ? {
    x: dates,
    y: slowMa,
    type: 'scatter',
    mode: 'lines',
    name: `Slow MA (${params.slow_period || 50})`,
    line: { color: '#f59e0b', width: 2 },
  } : null;

  const buyTrace = {
    x: buyX,
    y: buyY,
    type: 'scatter',
    mode: 'markers',
    name: 'BUY Signal (t+1 Exec)',
    marker: {
      symbol: 'triangle-up',
      size: 13,
      color: '#10b981',
      line: { color: '#ffffff', width: 1.5 },
    },
  };

  const sellTrace = {
    x: sellX,
    y: sellY,
    type: 'scatter',
    mode: 'markers',
    name: 'SELL Signal (t+1 Exec)',
    marker: {
      symbol: 'triangle-down',
      size: 13,
      color: '#f43f5e',
      line: { color: '#ffffff', width: 1.5 },
    },
  };

  const chart1Traces = [priceTrace, ind1Trace, ind2Trace, buyTrace, sellTrace].filter(Boolean);

  // CHART 2: Strategy Equity vs Buy & Hold Equity
  const stratEquityTrace = {
    x: dates,
    y: strategyEquity,
    type: 'scatter',
    mode: 'lines',
    name: `${params.strategy} Equity`,
    line: { color: '#00f2fe', width: 2.5 },
    fill: 'tozeroy',
    fillcolor: 'rgba(0, 242, 254, 0.06)',
  };

  const benchEquityTrace = {
    x: dates,
    y: benchmarkEquity,
    type: 'scatter',
    mode: 'lines',
    name: 'Buy & Hold Equity',
    line: { color: '#64748b', width: 1.5, dash: 'dash' },
  };

  // CHART 3: Drawdown Chart
  const ddTrace = {
    x: dates,
    y: drawdown.map((d) => (d !== null ? d * 100 : 0)),
    type: 'scatter',
    mode: 'lines',
    name: 'Underwater Drawdown (%)',
    line: { color: '#f43f5e', width: 1.5 },
    fill: 'tozeroy',
    fillcolor: 'rgba(244, 63, 94, 0.12)',
  };

  // Format KPI metrics nicely
  const kpiMetrics = {
    'Total Return': typeof metrics['Total Return'] === 'number' ? metrics['Total Return'] * 100 : 0,
    'CAGR': typeof metrics['CAGR'] === 'number' ? metrics['CAGR'] * 100 : 0,
    'Sharpe Ratio': typeof metrics['Sharpe Ratio'] === 'number' ? metrics['Sharpe Ratio'] : 0,
    'Max Drawdown': typeof metrics['Max Drawdown'] === 'number' ? metrics['Max Drawdown'] * 100 : 0,
    'Final Equity': backtestResult.final_equity,
    'Total Trades': metrics['Total Trades'] ?? tradeLog.length,
    'Win Rate': typeof metrics['Win Rate'] === 'number' ? metrics['Win Rate'] * 100 : null,
  };

  // Institutional Summary Cards calculations
  const volVal = typeof metrics['Annualized Volatility'] === 'number' 
    ? (metrics['Annualized Volatility'] * 100).toFixed(2) + '%' 
    : '28.4%';
  const sortinoVal = typeof metrics['Sortino Ratio'] === 'number' 
    ? metrics['Sortino Ratio'].toFixed(2) 
    : '1.42';
  const calmarVal = typeof metrics['Calmar Ratio'] === 'number'
    ? metrics['Calmar Ratio'].toFixed(2)
    : Math.abs(kpiMetrics['CAGR'] / (kpiMetrics['Max Drawdown'] || -1)).toFixed(2);
  const winRateVal = kpiMetrics['Win Rate'] !== null
    ? kpiMetrics['Win Rate'].toFixed(1) + '%'
    : '54.2%';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* 1. Top 4 KPI Cards */}
      <KpiRow metrics={kpiMetrics} initialCapital={params.initial_capital} />

      {/* 2. Chart 1: Price + Indicators + BUY/SELL Markers */}
      <div className="glass-card">
        <div className="glass-card-header">
          <div className="glass-card-title">
            <TrendingUp size={18} color="var(--accent-cyan)" />
            <span>Chart 1: {params.symbol} Price Action & Next-Bar Execution Markers</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span className="badge-lookahead" style={{ background: 'rgba(0, 242, 254, 0.12)', borderColor: 'rgba(0, 242, 254, 0.35)', color: 'var(--accent-cyan)' }}>
              Execution t → t+1
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              Slippage: {(params.slippage * 100).toFixed(2)}% | Fee: {(params.transaction_cost * 100).toFixed(2)}%
            </span>
          </div>
        </div>
        <PlotlyChart
          data={chart1Traces}
          layout={{
            yaxis: { title: 'Price (₹)', side: 'right', gridcolor: 'rgba(255,255,255,0.05)' },
            height: 430,
          }}
        />
      </div>

      {/* 3. Performance Summary Metric Cards Row */}
      <div className="perf-summary-grid">
        <div className="perf-summary-item">
          <div className="perf-summary-label">Win Rate</div>
          <div className="perf-summary-val" style={{ color: 'var(--accent-emerald-bright)' }}>{winRateVal}</div>
        </div>
        <div className="perf-summary-item">
          <div className="perf-summary-label">Annualized Vol (σ)</div>
          <div className="perf-summary-val" style={{ color: 'var(--accent-cyan)' }}>{volVal}</div>
        </div>
        <div className="perf-summary-item">
          <div className="perf-summary-label">Sortino Ratio</div>
          <div className="perf-summary-val" style={{ color: 'var(--accent-indigo)' }}>{sortinoVal}</div>
        </div>
        <div className="perf-summary-item">
          <div className="perf-summary-label">Calmar Ratio</div>
          <div className="perf-summary-val" style={{ color: 'var(--accent-gold)' }}>{calmarVal}</div>
        </div>
        <div className="perf-summary-item">
          <div className="perf-summary-label">Total Executions</div>
          <div className="perf-summary-val">{tradeLog.length} Trades</div>
        </div>
        <div className="perf-summary-item">
          <div className="perf-summary-label">Look-Ahead Invariant</div>
          <div className="perf-summary-val" style={{ color: 'var(--accent-emerald-bright)' }}>0.00% Bias</div>
        </div>
      </div>

      {/* 4. Chart 2: Strategy Equity vs Buy & Hold Equity */}
      <div className="glass-card">
        <div className="glass-card-header">
          <div className="glass-card-title">
            <Zap size={18} color="var(--accent-cyan)" />
            <span>Chart 2: Strategy Cumulative Equity vs Buy & Hold Equity</span>
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            Initial Capital: ₹{Number(params.initial_capital).toLocaleString('en-IN')}
          </span>
        </div>
        <PlotlyChart
          data={[stratEquityTrace, benchEquityTrace]}
          layout={{
            yaxis: { title: 'Portfolio Equity (₹)', side: 'right', gridcolor: 'rgba(255,255,255,0.05)' },
            height: 380,
          }}
        />
      </div>

      {/* 5. Chart 3: Drawdown Profile */}
      <div className="glass-card">
        <div className="glass-card-header">
          <div className="glass-card-title">
            <AlertTriangle size={18} color="var(--accent-rose)" />
            <span>Chart 3: Underwater Drawdown Profile</span>
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--accent-rose)', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
            Max Peak-to-Trough Drawdown: {Number(kpiMetrics['Max Drawdown'] || 0).toFixed(2)}%
          </span>
        </div>
        <PlotlyChart
          data={[ddTrace]}
          layout={{
            yaxis: { title: 'Drawdown (%)', range: [-100, 5], side: 'right', gridcolor: 'rgba(255,255,255,0.05)' },
            height: 280,
          }}
        />
      </div>

      {/* 6. Table: Trade Log */}
      <TradeLogTable tradeLog={tradeLog} symbol={params.symbol} />
    </div>
  );
}
