# QuantX — Quantitative Financial Research and Backtesting Platform

QuantX is a modular quantitative financial research, backtesting, and portfolio analytics platform built with Python 3.11+.

## Architecture Overview

The system strictly enforces separation of concerns: **Financial and quantitative logic are completely separated from presentation/UI layers.**

```
QuantX/
├── app.py                      # Streamlit UI dashboard application (entry point)
├── requirements.txt            # Project dependencies
├── README.md                   # Platform documentation & architecture guide
├── .gitignore                  # VCS ignore rules for Python, cache, and data
├── data/
│   ├── raw/                    # Raw ingested market data
│   ├── processed/              # Normalized, cleaned, and feature-engineered datasets
│   └── cache/                  # Local cached series and intermediate computations
├── src/                        # Core quantitative engine (pure Python / vectorized logic)
│   ├── __init__.py             # Package root and public API exposure
│   ├── data_loader.py          # Data ingestion (yfinance, local files, caching)
│   ├── data_processor.py       # Data cleaning, alignment, returns calculation, validation
│   ├── indicators.py           # Technical indicators and signal transformers
│   ├── metrics.py              # Performance, risk, drawdown, and statistical metrics
│   ├── strategies.py           # Strategy base class and strategy definitions
│   ├── backtester.py           # Vectorized & event-driven backtesting engines
│   ├── portfolio.py            # Portfolio construction, rebalancing, and asset allocation
│   ├── benchmark.py            # Benchmark loading, beta calculation, alpha estimation
│   ├── regime.py               # Market regime detection (volatility, trend, clustering)
│   ├── robustness.py           # Robustness analysis (Monte Carlo, parameter sensitivity, walk-forward)
│   └── utils.py                # Logging, date utilities, validation helpers
└── tests/                      # Automated test suite (pytest)
    ├── __init__.py
    ├── test_data.py            # Data loading, processing, and caching tests
    ├── test_indicators.py      # Indicator correctness and boundary tests
    ├── test_metrics.py         # Financial metric accuracy (Sharpe, Drawdown, etc.)
    ├── test_strategies.py      # Strategy signal generation and rule tests
    ├── test_backtester.py      # Backtest execution, PnL, and transaction accounting tests
    └── test_bias.py            # Lookahead bias, survivor bias, and data leakage tests
```

## Core Modules (`src/`)

- **`data_loader.py`**: Handles downloading and caching price series (OHLCV) without lookahead or data corruption.
- **`data_processor.py`**: Cleans data, handles splits/dividends adjustments, synchronizes timestamps, and computes simple/log returns.
- **`indicators.py`**: Computes standard and custom technical indicators (SMA, EMA, RSI, MACD, Bollinger Bands, ATR, etc.) strictly with causal indexing.
- **`metrics.py`**: Calculates quantitative risk & performance metrics (CAGR, Sharpe, Sortino, Max Drawdown, Calmar, VaR, CVaR, Win Rate, Profit Factor).
- **`strategies.py`**: Extensible abstract base strategy interface and concrete strategy implementations (trend-following, mean-reversion, momentum, breakout).
- **`backtester.py`**: Executes historical simulations with realistic assumptions (slippage, commissions, bid-ask spread, execution delay).
- **`portfolio.py`**: Manages multi-asset weights, rebalancing rules, and allocation models (Equal Weight, Risk Parity, Mean-Variance, Inverse Volatility).
- **`benchmark.py`**: Compares strategy returns against market benchmarks (e.g., SPY, QQQ) calculating Alpha, Beta, Information Ratio, and Tracking Error.
- **`regime.py`**: Analyzes market environments (high/low volatility, trending/ranging regimes) to contextualize performance.
- **`robustness.py`**: Tests strategies against overfitting using Monte Carlo permutations, parameter stability scans, and walk-forward verification.
- **`utils.py`**: Helper utilities for datetime normalization, mathematical functions, formatting, and logging.

## Data Source & Methodology

### Where did your data come from?
> **"Historical OHLCV data is sourced from Yahoo Finance using yfinance. We normalize the assets to a consistent analytical format and calculate returns from historical closing prices. The backtesting engine uses next-bar execution, configurable transaction costs and slippage."**

### Key Quantitative Integrity Principles
* **Real-World Market Data:** Zero fabricated or synthetic series. Raw data is downloaded directly via `yfinance` across canonical assets (`Gold: GC=F`, `Bitcoin: BTC-USD`, `NVIDIA: NVDA`).
* **Strict Lookahead Elimination ($t \rightarrow t+1$):** Strategy signals generated at bar $t$ using closing prices are executed strictly on bar $t+1$ at bar $t+1$'s execution price. Closing prices at bar $t$ are never used for execution.
* **Realistic Market Friction:** Configurable broker commission rates and bid-ask execution slippage are deducted from cash on every buy and sell order.
* **Decoupled Architecture:** Financial calculations and portfolio state machines reside in pure Python modules (`src/`), completely independent of the Streamlit presentation layer.

## Setup & Installation

1. Create and activate a Python 3.11+ virtual environment:
   ```bash
   python -m venv .venv
   # On Windows:
   .venv\Scripts\activate
   # On Linux/macOS:
   source .venv/bin/activate
   ```

2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Run automated tests:
   ```bash
   pytest
   ```
