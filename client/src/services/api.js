/**
 * QuantX Frontend API Client
 * Interfaces with Express Backend and Python Engine IPC
 */

const BASE_URL = '/api';

export async function fetchAssets() {
  const res = await fetch(`${BASE_URL}/assets`);
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Failed to fetch assets');
  return data.data;
}

export async function fetchMarketData(symbol, startDate, endDate) {
  const params = new URLSearchParams();
  if (symbol) params.append('symbol', symbol);
  if (startDate) params.append('start_date', startDate);
  if (endDate) params.append('end_date', endDate);

  const res = await fetch(`${BASE_URL}/market-data?${params.toString()}`);
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Failed to fetch market data');
  return data.data;
}

export async function fetchCorrelation(startDate, endDate) {
  const params = new URLSearchParams();
  if (startDate) params.append('start_date', startDate);
  if (endDate) params.append('end_date', endDate);

  const res = await fetch(`${BASE_URL}/correlation?${params.toString()}`);
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Failed to fetch correlation');
  return data.data;
}

export async function runBacktest(params) {
  const res = await fetch(`${BASE_URL}/backtest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Failed to run backtest');
  return data.data;
}

export async function compareStrategies(params) {
  const res = await fetch(`${BASE_URL}/compare-strategies`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Failed to compare strategies');
  return data.data;
}

export async function runPortfolioSimulation(params) {
  const res = await fetch(`${BASE_URL}/portfolio-simulation`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Failed to simulate portfolio');
  return data.data;
}

export async function runMonteCarlo(params) {
  const res = await fetch(`${BASE_URL}/robustness/monte-carlo`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Failed to run Monte Carlo');
  return data.data;
}

export async function runParamScan(params) {
  const res = await fetch(`${BASE_URL}/robustness/param-scan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Failed to run parameter scan');
  return data.data;
}

export async function fetchRegimes(symbol, startDate, endDate) {
  const params = new URLSearchParams();
  if (symbol) params.append('symbol', symbol);
  if (startDate) params.append('start_date', startDate);
  if (endDate) params.append('end_date', endDate);

  const res = await fetch(`${BASE_URL}/regimes?${params.toString()}`);
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Failed to fetch regimes');
  return data.data;
}

export async function fetchAlpacaStatus() {
  const res = await fetch(`${BASE_URL}/alpaca-status`);
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Failed to check Alpaca status');
  return data.data;
}

export async function fetchEngineStatus() {
  const res = await fetch(`${BASE_URL}/engine-status`);
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Failed to check engine status');
  return data.data;
}
