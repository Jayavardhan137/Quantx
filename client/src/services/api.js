/**
 * QuantX Frontend API Client
 * Interfaces with Express Backend and Python Engine IPC
 */

// Dynamically determine the backend base API URL
function getBaseUrl() {
  if (typeof window !== 'undefined') {
    // If running in development on port 3000, connect directly to port 5000 API
    if (window.location.port === '3000') {
      return `http://${window.location.hostname}:5000/api`;
    }
  }
  return '/api';
}

async function request(endpoint, options = {}) {
  const base = getBaseUrl();
  const url = `${base}${endpoint}`;
  
  let res;
  try {
    res = await fetch(url, options);
  } catch (netErr) {
    // If direct connection failed, try fallback to proxy route
    if (base !== '/api') {
      try {
        res = await fetch(`/api${endpoint}`, options);
      } catch (proxyErr) {
        throw new Error(`Connection error: ${netErr.message}`);
      }
    } else {
      throw new Error(`Connection error: ${netErr.message}`);
    }
  }

  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch (parseErr) {
    throw new Error(`Invalid JSON response (Status ${res.status}): ${text.substring(0, 100)}`);
  }

  if (!res.ok || !data.success) {
    throw new Error(data.error || `HTTP ${res.status} Error`);
  }

  return data.data;
}

export async function fetchAssets() {
  return request('/assets');
}

export async function fetchMarketData(symbol, startDate, endDate) {
  const params = new URLSearchParams();
  if (symbol) params.append('symbol', symbol);
  if (startDate) params.append('start_date', startDate);
  if (endDate) params.append('end_date', endDate);

  return request(`/market-data?${params.toString()}`);
}

export async function fetchCorrelation(startDate, endDate) {
  const params = new URLSearchParams();
  if (startDate) params.append('start_date', startDate);
  if (endDate) params.append('end_date', endDate);

  return request(`/correlation?${params.toString()}`);
}

export async function runBacktest(params) {
  return request('/backtest', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
}

export async function compareStrategies(params) {
  return request('/compare-strategies', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
}

export async function runPortfolioSimulation(params) {
  return request('/portfolio-simulation', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
}

export async function runMonteCarlo(params) {
  return request('/robustness/monte-carlo', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
}

export async function runParamScan(params) {
  return request('/robustness/param-scan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
}

export async function fetchRegimes(symbol, startDate, endDate) {
  const params = new URLSearchParams();
  if (symbol) params.append('symbol', symbol);
  if (startDate) params.append('start_date', startDate);
  if (endDate) params.append('end_date', endDate);

  return request(`/regimes?${params.toString()}`);
}

export async function fetchAlpacaStatus() {
  return request('/alpaca-status');
}

export async function fetchEngineStatus() {
  return request('/engine-status');
}
