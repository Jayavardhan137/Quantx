# QuantX — Quantitative Research & Backtesting Terminal

> **Multi-Asset Financial Intelligence, Portfolio Backtesting & Market Regime Analysis**

QuantX is an interactive quantitative research and portfolio backtesting platform designed to analyze historical market data, evaluate trading strategies, simulate realistic portfolio performance, compare strategies against Buy-and-Hold, test strategy robustness, and analyze performance across different market regimes.

Unlike a traditional market-price dashboard that only displays charts and BUY/SELL signals, QuantX performs **actual portfolio simulation** with:

* Next-bar execution
* Position sizing
* Transaction costs
* Slippage
* Portfolio equity tracking
* Trade-level records
* Risk-adjusted performance metrics
* Benchmark comparison
* Robustness testing
* Market regime analysis

---

## 🚀 Core Idea

The platform follows this quantitative research pipeline:

```text
Historical Market Data
        ↓
Data Normalization
        ↓
Quantitative Analytics
        ↓
Strategy Signal Generation
        ↓
Next-Bar Execution
        ↓
Position Sizing
        ↓
Transaction Costs + Slippage
        ↓
Portfolio Simulation
        ↓
Performance Metrics
        ↓
Buy-and-Hold Benchmark
        ↓
Robustness Testing
        ↓
Market Regime Analysis
```

The primary objective is to evaluate **portfolio performance**, not simply display trading signals.

---

# ✨ Features

## 1. Multi-Asset Historical Data

QuantX supports multiple asset classes, including:

| Asset        | Symbol    | Category       |
| ------------ | --------- | -------------- |
| NVIDIA       | `NVDA`    | US Equity      |
| Bitcoin      | `BTC-USD` | Cryptocurrency |
| Gold Futures | `GC=F`    | Commodity      |

Historical market data is obtained through the configured **Alpaca market-data feed**.

The platform normalizes historical data into a consistent analytical structure before calculations are performed.

---

## 2. Quantitative Analytics

QuantX calculates important quantitative metrics including:

### Returns

Daily return:

```text
rₜ = Pₜ / Pₜ₋₁ − 1
```

Cumulative return:

```text
Π(1 + rₜ) − 1
```

### Volatility

Annualized volatility:

```text
Daily Standard Deviation × √Annualization Factor
```

The platform uses asset-appropriate annualization conventions.

### Sharpe Ratio

```text
Sharpe =
(Annualized Return − Risk-Free Rate)
/
Annualized Volatility
```

### Maximum Drawdown

```text
Running Maximum = cumulative maximum of equity

Drawdown =
Equity / Running Maximum − 1

Maximum Drawdown =
minimum drawdown
```

Additional analytics include:

* SMA
* EMA
* Rolling returns
* Rolling volatility
* Rolling correlation
* Cumulative returns
* Drawdown analysis

---

# 📈 Trading Strategies

QuantX provides multiple interpretable strategy models.

## SMA Crossover

Uses configurable fast and slow moving averages.

Example:

```text
Fast SMA = 20
Slow SMA = 50
```

Basic trend-following logic:

```text
Fast SMA > Slow SMA
        ↓
Long

Fast SMA < Slow SMA
        ↓
Exit / Flat
```

---

## EMA Trend

Uses configurable fast and slow exponential moving averages.

---

## Momentum

Uses configurable price momentum over a selected lookback period.

Conceptually:

```text
Momentum =
Price / Priceₙ-days-ago − 1
```

---

## Mean Reversion

Uses rolling mean, rolling standard deviation and price z-score to identify deviations from the historical mean.

```text
z = (Price − Rolling Mean) / Rolling Standard Deviation
```

---

# ⚙️ Realistic Backtesting

A major design principle of QuantX is that **signals are not treated as trades**.

Signals are generated using information available at time `t`.

Execution occurs on the next available bar:

```text
Signal at t
     ↓
Execution at t+1
```

This reduces look-ahead bias caused by executing at the same price that generated the signal.

---

## Transaction Costs

Transaction costs are configurable.

Example:

```text
Transaction Cost = 0.10%
```

Conceptually:

```text
Transaction Cost =
Traded Notional × Transaction Cost Rate
```

---

## Slippage

QuantX also models execution slippage.

Example:

```text
Slippage = 0.05%
```

A simplified execution model adjusts the theoretical execution price according to trade direction.

---

## Position Sizing

Users can configure the percentage of capital allocated to a strategy.

Examples:

```text
25%
50%
75%
100%
```

---

# 💰 Portfolio Simulation

The backtesting engine produces an actual simulated portfolio rather than simply plotting strategy signals.

The portfolio tracks:

* Initial capital
* Cash
* Positions
* Position size
* Entry price
* Exit price
* Execution price
* Transaction costs
* Slippage
* Portfolio value
* Equity curve
* Trade history

---

# 📊 Performance Metrics

Each backtest can report:

* Total Return
* Annualized Return / CAGR
* Annualized Volatility
* Sharpe Ratio
* Maximum Drawdown
* Number of Trades
* Final Portfolio Value

---

# ⚖️ Strategy vs Buy-and-Hold

Every strategy can be compared against a Buy-and-Hold benchmark over the same selected period.

Comparison includes:

```text
                    Strategy    Buy & Hold
Return                 ✓            ✓
CAGR                   ✓            ✓
Volatility             ✓            ✓
Sharpe                 ✓            ✓
Maximum Drawdown       ✓            ✓
Portfolio Value        ✓            ✓
```

The comparison is based on simulated portfolio performance rather than simply comparing price charts.

---

# 🔗 Cross-Asset Correlation

QuantX analyzes relationships between assets using **returns rather than raw prices**.

Supported analysis includes:

* Correlation matrix
* Rolling correlation
* Multi-asset return comparison

Example universe:

```text
NVIDIA
Bitcoin
Gold
```

Rolling correlation can be evaluated over configurable windows such as:

```text
30D
60D
90D
```

---

# 🔬 Robustness Testing

Historical strategy performance can be highly sensitive to parameter choices.

QuantX therefore provides interactive robustness analysis.

Users can vary:

* Fast MA period
* Slow MA period
* Transaction cost
* Slippage
* Backtest period
* Position size

Parameter sensitivity analysis can be used to investigate whether results are highly dependent on a particular configuration.

The platform also supports in-sample and out-of-sample analysis to help reduce data leakage and over-optimization.

---

# 🌐 Market Regime Analysis

QuantX evaluates strategy behavior under different market conditions.

### Trend Regimes

```text
Bullish
Bearish
```

### Volatility Regimes

```text
High Volatility
Normal / Low Volatility
```

The platform can analyze performance using:

* Sample observations
* Return
* Annualized return
* Volatility
* Sharpe ratio
* Maximum drawdown

Metrics that are not statistically meaningful because of insufficient observations are represented as unavailable rather than fabricated values.

---

# 🛡️ Look-Ahead Bias Protection

One of the most important design principles is avoiding look-ahead bias.

QuantX follows:

```text
Information available at t
          ↓
Signal generated at t
          ↓
Trade executed at t+1
```

The platform does not intentionally execute a signal using the same bar's information that generated that signal.

The backtesting engine includes tests specifically designed to verify next-bar execution.

---

# 🔐 Data & API Architecture

QuantX uses a layered architecture:

```text
┌─────────────────────────────┐
│       React Frontend        │
│     Dashboard / Charts      │
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│      Node.js / Express      │
│        API Gateway          │
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│       Python / FastAPI      │
│      Quantitative Engine    │
└──────────────┬──────────────┘
               │
       ┌───────┴────────┐
       ▼                ▼
┌─────────────┐  ┌──────────────┐
│ Alpaca Data │  │ Backtesting  │
│    Feed     │  │    Engine    │
└─────────────┘  └──────────────┘
```

### Responsibility separation

**React**

* User interface
* Interactive controls
* Charts
* Tables
* Visualization

**Node.js**

* API gateway
* Request routing
* Frontend/backend communication
* Service orchestration

**Python**

* Market data processing
* Indicators
* Quantitative metrics
* Strategy signals
* Backtesting
* Portfolio simulation
* Benchmark calculations
* Robustness analysis
* Regime analysis

Python remains the **source of truth for financial calculations**.

---

# 🧪 Testing

QuantX uses automated testing to validate the quantitative engine.

Tests cover areas including:

* Historical data loading
* Indicators
* Returns
* Volatility
* Sharpe ratio
* Drawdown
* Strategies
* Backtesting
* Look-ahead bias
* JSON serialization
* Market regime calculations
* Edge cases

The project currently includes automated tests across the quantitative and application layers.

Run Python tests with:

```bash
pytest
```

---

# 🛠️ Technology Stack

## Frontend

* React
* Vite
* JavaScript / JSX
* Tailwind CSS
* Lucide Icons
* Interactive charting

## Backend

* Node.js
* Express

## Quantitative Engine

* Python
* pandas
* NumPy
* SciPy
* FastAPI

## Market Data

* Alpaca

## Testing

* pytest

---

# 📁 Project Structure

The project follows a layered architecture similar to:

```text
QuantX/
│
├── frontend/
│   ├── src/
│   ├── components/
│   ├── pages/
│   └── ...
│
├── backend/
│   ├── routes/
│   ├── controllers/
│   └── ...
│
├── python/
│   ├── src/
│   │   ├── data_loader.py
│   │   ├── data_processor.py
│   │   ├── indicators.py
│   │   ├── metrics.py
│   │   ├── strategies.py
│   │   ├── backtester.py
│   │   ├── portfolio.py
│   │   ├── benchmark.py
│   │   ├── regime.py
│   │   ├── robustness.py
│   │   └── utils.py
│   │
│   └── tests/
│
├── data/
│   ├── raw/
│   ├── processed/
│   └── cache/
│
├── README.md
└── ...
```

> The exact directory structure may vary depending on the current implementation.

---

# 🚀 Getting Started

## Prerequisites

Install:

* Python 3.11+
* Node.js 18+
* npm
* Git

An Alpaca market-data account/API credentials may be required depending on the configured Alpaca data endpoints.

---

# 🔑 Environment Variables

Create the required environment configuration according to the backend/data-provider setup.

Example:

```env
ALPACA_API_KEY=your_api_key
ALPACA_SECRET_KEY=your_secret_key
```

Never commit real API credentials to GitHub.

Add your environment files to `.gitignore`:

```text
.env
.env.local
.env.*.local
```

---

# ▶️ Running the Project

## 1. Clone the repository

```bash
git clone YOUR_GITHUB_REPOSITORY_URL
cd QuantX
```

---

## 2. Python Environment

Create a virtual environment:

### Windows

```bash
python -m venv .venv
```

Activate:

```bash
.venv\Scripts\activate
```

### macOS / Linux

```bash
python3 -m venv .venv
source .venv/bin/activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

---

## 3. Start the Python Quant Engine

Start the FastAPI service using the project's configured command.

For example:

```bash
uvicorn api:app --reload
```

> Use the actual Python API entry point configured in the project if it differs.

---

## 4. Start the Node.js Backend

```bash
cd backend
npm install
npm run dev
```

---

## 5. Start the React Frontend

```bash
cd frontend
npm install
npm run dev
```

Open the local development URL shown by Vite.

---

# 📌 Example Backtest Configuration

Example configuration:

```text
Asset:
NVIDIA (NVDA)

Strategy:
SMA Crossover

Fast MA:
20

Slow MA:
50

Initial Capital:
₹100,000

Position Size:
100%

Transaction Cost:
0.10%

Slippage:
0.05%

Risk-Free Rate:
0%
```

The resulting simulation should produce:

```text
Historical Data
      ↓
SMA 20 / SMA 50
      ↓
Trading Signals
      ↓
Next-Bar Execution
      ↓
Transaction Costs
      ↓
Slippage
      ↓
Portfolio Simulation
      ↓
Performance Metrics
```

---

# ⚠️ Important Methodological Considerations

Backtesting has inherent limitations.

Historical simulations may differ from live trading because of:

* Market liquidity
* Bid/ask spreads
* Slippage
* Data quality
* Corporate actions
* Execution latency
* Trading costs
* Market structure changes
* Survivorship bias
* Parameter selection
* Regime changes

Backtest results should therefore be treated as **historical research results**, not guarantees of future performance.

---

# ⚠️ Financial Disclaimer

> **QuantX is an educational and quantitative research platform. It is not financial advice. Historical backtest results do not guarantee future performance. Simulated results may differ materially from live trading because of market conditions, liquidity, execution quality, data limitations, transaction costs, and other factors.**

---

# 🎯 Project Objective

QuantX was designed around a simple question:

> **What would have happened to an actual portfolio if a strategy had been executed historically under realistic trading assumptions?**

Instead of stopping at:

```text
BUY
SELL
BUY
SELL
```

QuantX attempts to answer:

```text
How much capital was invested?
        ↓
When was the trade actually executed?
        ↓
What was the execution price?
        ↓
How much did transaction cost?
        ↓
How did slippage affect the trade?
        ↓
What was the portfolio worth?
        ↓
What was the drawdown?
        ↓
How did it compare with Buy & Hold?
```

---

# 🧠 Key Design Principles

### 1. Portfolio-first analysis

Signals are inputs to a portfolio simulation, not the final result.

### 2. Next-bar execution

Signals generated at `t` are executed at `t+1`.

### 3. Realistic trading friction

Transaction costs and slippage are configurable.

### 4. Transparent methodology

Financial assumptions are exposed through the Methodology section.

### 5. Reproducibility

Backtests use explicit asset and date-range configurations.

### 6. Modular quantitative engine

Financial calculations are separated from the frontend.

### 7. Testable financial logic

Core calculations are covered by automated tests.

---

# 🔮 Future Improvements

Potential future extensions include:

* Additional assets
* More sophisticated transaction-cost models
* Limit-order simulation
* Portfolio optimization
* Multi-asset portfolio strategies
* Risk-parity allocation
* Value-at-Risk
* Conditional Value-at-Risk
* Monte Carlo simulation
* Walk-forward optimization
* More detailed execution models
* Additional data providers
* Live paper-trading integration

---

# 👨💻 Project

**QuantX — Quantitative Research & Backtesting Terminal**

Built as a quantitative financial intelligence and portfolio research platform.

---

## ⚠️ Educational Use Only

This project is intended for **education, experimentation, quantitative research, and hackathon demonstration purposes**.

It should not be interpreted as investment advice or a recommendation to buy or sell any financial instrument.
