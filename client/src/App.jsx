import React, { useState, useEffect } from 'react';
import ThreeBackground from './components/ThreeBackground';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import MethodologyModal from './components/MethodologyModal';
import AlpacaFeedModal from './components/AlpacaFeedModal';
import EngineModal from './components/EngineModal';
import Premium3DLoader from './components/Premium3DLoader';

// Views
import OverviewView from './views/OverviewView';
import MarketAnalyticsView from './views/MarketAnalyticsView';
import CorrelationView from './views/CorrelationView';
import StrategyLabView from './views/StrategyLabView';
import PortfolioView from './views/PortfolioView';
import BenchmarkView from './views/BenchmarkView';
import RobustnessView from './views/RobustnessView';
import RegimesView from './views/RegimesView';

import { fetchAssets, runBacktest } from './services/api';

export default function App() {
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('strategy_lab');
  const [isMethodologyOpen, setIsMethodologyOpen] = useState(false);
  const [isAlpacaOpen, setIsAlpacaOpen] = useState(false);
  const [isEngineOpen, setIsEngineOpen] = useState(false);
  const [assets, setAssets] = useState([]);
  const [historicalUniverse, setHistoricalUniverse] = useState({
    start: '2021-09-20',
    end: '2026-09-18',
  });
  
  // Strategy & Backtest Parameters (Reproducible Fixed Default: 2021-09-20 to 2026-09-18)
  const [params, setParams] = useState({
    symbol: 'NVDA',
    strategy: 'SMA Crossover',
    fast_period: 20,
    slow_period: 50,
    rsi_period: 14,
    rsi_oversold: 30,
    rsi_overbought: 70,
    bb_period: 20,
    bb_std: 2.0,
    initial_capital: 100000,
    position_size: 1.0,
    transaction_cost: 0.001,
    slippage: 0.0005,
    risk_free_rate: 0.0,
    start_date: '2021-09-20',
    end_date: '2026-09-18',
  });

  const [backtestResult, setBacktestResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch initial assets, date range, and historical data universe
  useEffect(() => {
    fetchAssets()
      .then((res) => {
        if (res.assets) setAssets(res.assets);
        if (res.historical_data_universe) {
          setHistoricalUniverse(res.historical_data_universe);
        }
        if (res.default_date_range) {
          setParams((prev) => ({
            ...prev,
            start_date: prev.start_date || res.default_date_range.start,
            end_date: prev.end_date || res.default_date_range.end,
          }));
        }
      })
      .catch((err) => {
        console.error('Failed to load asset metadata:', err);
      });
  }, []);

  // Trigger backtest run
  const executeBacktest = () => {
    setLoading(true);
    setError(null);
    runBacktest(params)
      .then((res) => {
        setBacktestResult(res);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  };

  // Initial Backtest on mount
  useEffect(() => {
    executeBacktest();
  }, [params.symbol, params.strategy]);

  return (
    <div className="app-layout">
      {/* Premium 3D Quantum Animated Loading Page */}
      {isInitialLoading && (
        <Premium3DLoader onLoadingComplete={() => setIsInitialLoading(false)} />
      )}

      {/* 3D WebGL Background Canvas */}
      <ThreeBackground />

      {/* Institutional Top Navbar */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenMethodology={() => setIsMethodologyOpen(true)}
        onOpenAlpaca={() => setIsAlpacaOpen(true)}
        onOpenEngine={() => setIsEngineOpen(true)}
        onReplayLoader={() => setIsInitialLoading(true)}
      />

      {/* Main Workspace Layout */}
      <div className="main-content-layout">
        {/* Interactive Quantitative Sidebar Controls */}
        <Sidebar
          params={params}
          setParams={setParams}
          onRunBacktest={executeBacktest}
          loading={loading}
          assets={assets}
          historicalUniverse={historicalUniverse}
        />

        {/* Dynamic Viewport Area */}
        <main className="viewport-area">
          {activeTab === 'overview' && (
            <OverviewView
              setActiveTab={setActiveTab}
              onRunStrategyLab={() => {
                setActiveTab('strategy_lab');
                executeBacktest();
              }}
            />
          )}

          {activeTab === 'market' && (
            <MarketAnalyticsView
              symbol={params.symbol}
              startDate={params.start_date}
              endDate={params.end_date}
            />
          )}

          {activeTab === 'correlation' && (
            <CorrelationView
              startDate={params.start_date}
              endDate={params.end_date}
            />
          )}

          {activeTab === 'strategy_lab' && (
            <StrategyLabView
              backtestResult={backtestResult}
              loading={loading}
              error={error}
              params={params}
            />
          )}

          {activeTab === 'portfolio' && (
            <PortfolioView
              startDate={params.start_date}
              endDate={params.end_date}
            />
          )}

          {activeTab === 'benchmark' && (
            <BenchmarkView
              params={params}
            />
          )}

          {activeTab === 'robustness' && (
            <RobustnessView
              params={params}
            />
          )}

          {activeTab === 'regimes' && (
            <RegimesView
              symbol={params.symbol}
              startDate={params.start_date}
              endDate={params.end_date}
            />
          )}
        </main>
      </div>

      {/* Data Source & Methodology Modal */}
      <MethodologyModal
        isOpen={isMethodologyOpen}
        onClose={() => setIsMethodologyOpen(false)}
      />

      {/* Alpaca Live Feed Status Modal */}
      <AlpacaFeedModal
        isOpen={isAlpacaOpen}
        onClose={() => setIsAlpacaOpen(false)}
      />

      {/* Next-Bar Execution Engine Verification Modal */}
      <EngineModal
        isOpen={isEngineOpen}
        onClose={() => setIsEngineOpen(false)}
      />
    </div>
  );
}
