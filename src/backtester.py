"""Core Strategy-Independent Backtesting Engine for QuantX.

Simulates cash, position quantities, execution friction (slippage and transaction costs),
and equity curves strictly eliminating lookahead bias.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict, List, Optional, Union
import numpy as np
import pandas as pd
from src.metrics import (
    annualized_return,
    annualized_volatility,
    daily_returns,
    max_drawdown,
    sharpe_ratio,
    total_return,
)
from src.portfolio import Portfolio


@dataclass
class BacktestResult:
    """Encapsulates the complete results of a historical backtest simulation."""

    equity_curve: pd.Series
    cash_curve: pd.Series
    positions: pd.Series
    trade_log: pd.DataFrame
    performance_metrics: Dict[str, Any]
    initial_capital: float
    final_equity: float

    @property
    def total_return(self) -> float:
        """Total return percentage of the simulation."""
        return float((self.final_equity / self.initial_capital) - 1.0)


def run_backtest(
    prices: pd.Series,
    signals: pd.Series,
    initial_capital: float = 100_000.0,
    position_size: float = 1.0,
    transaction_cost: float = 0.0,
    slippage: float = 0.0,
    periods_per_year: int = 252,
) -> BacktestResult:
    """Execute strategy-independent backtest simulation with strict lookahead prevention.

    Lookahead Prevention Rule:
        A signal generated on bar t (using information up to bar t) is executed on bar t+1
        using bar t+1's market price.

    Args:
        prices: Historical price series with DatetimeIndex.
        signals: Trading signals series (1: Long/Buy, 0: Flat/Cash/Sell) indexed identically to prices.
        initial_capital: Initial cash in portfolio (default: 100,000.0).
        position_size: Fraction of portfolio capital to allocate to long positions (default: 1.0).
        transaction_cost: Transaction fee rate as a fraction of traded notional (default: 0.0).
        slippage: Execution slippage rate (default: 0.0).
        periods_per_year: Annualization factor (252 for equities/futures, 365 for crypto).

    Returns:
        BacktestResult: Full backtest simulation result object.

    Raises:
        ValueError: On invalid parameters or empty data series.
    """
    if len(prices) == 0:
        raise ValueError("Prices series cannot be empty.")
    if len(signals) == 0:
        raise ValueError("Signals series cannot be empty.")
    if initial_capital <= 0:
        raise ValueError(f"Initial capital must be positive, got {initial_capital}.")
    if position_size <= 0.0 or position_size > 1.0:
        raise ValueError(f"Position size must be between 0.0 and 1.0, got {position_size}.")
    if transaction_cost < 0.0:
        raise ValueError(f"Transaction cost cannot be negative, got {transaction_cost}.")
    if slippage < 0.0:
        raise ValueError(f"Slippage cannot be negative, got {slippage}.")

    # Align prices and signals to common sorted index
    aligned_df = pd.DataFrame({"price": prices, "signal": signals}).dropna()
    if aligned_df.empty:
        raise ValueError("No overlapping valid price and signal observations found.")

    price_series = aligned_df["price"]
    signal_series = aligned_df["signal"]
    timestamps = aligned_df.index
    n_bars = len(aligned_df)

    portfolio = Portfolio(initial_capital=initial_capital)
    asset_name = "ASSET"

    equity_values = np.empty(n_bars, dtype=float)
    cash_values = np.empty(n_bars, dtype=float)
    position_values = np.empty(n_bars, dtype=float)

    trade_records: List[Dict[str, Any]] = []
    trade_id = 0

    # Bar-by-bar simulation with strict t -> t+1 execution
    for i in range(n_bars):
        current_time = timestamps[i]
        market_price = float(price_series.iloc[i])

        # Step 1: Execute trades based on signal from previous bar (t - 1)
        if i > 0:
            prev_signal = float(signal_series.iloc[i - 1])
            prev_time = timestamps[i - 1]
            current_qty = portfolio.get_position(asset_name)

            # Signal BUY (prev_signal == 1) and currently flat
            if prev_signal > 0 and current_qty == 0.0:
                trade_id += 1
                exec_price = market_price * (1.0 + slippage)
                total_portfolio_val = portfolio.compute_value({asset_name: market_price})
                target_capital = total_portfolio_val * position_size

                # Effective cost per unit including transaction cost
                effective_cost_per_unit = exec_price * (1.0 + transaction_cost)
                buy_qty = target_capital / effective_cost_per_unit if effective_cost_per_unit > 0 else 0.0

                traded_notional = buy_qty * exec_price
                tc_cost = traded_notional * transaction_cost
                slip_cost = buy_qty * market_price * slippage

                cash_before = portfolio.cash
                total_deducted = traded_notional + tc_cost
                portfolio.cash = cash_before - total_deducted
                portfolio.update_position(asset_name, buy_qty)
                cash_after = portfolio.cash

                current_val = portfolio.compute_value({asset_name: market_price})
                trade_records.append({
                    "trade_id": trade_id,
                    "signal_date": prev_time,
                    "execution_date": current_time,
                    "action": "BUY",
                    "execution_price": exec_price,
                    "quantity": buy_qty,
                    "position": buy_qty,
                    "transaction_cost": tc_cost,
                    "slippage_cost": slip_cost,
                    "cash_before": cash_before,
                    "cash_after": cash_after,
                    "portfolio_value": current_val,
                })

            # Signal SELL (prev_signal == 0) and currently holding a position
            elif prev_signal == 0 and current_qty > 0.0:
                trade_id += 1
                exec_price = market_price * (1.0 - slippage)
                sell_qty = current_qty

                traded_notional = sell_qty * exec_price
                tc_cost = traded_notional * transaction_cost
                slip_cost = sell_qty * market_price * slippage

                cash_before = portfolio.cash
                cash_received = traded_notional - tc_cost
                portfolio.cash = cash_before + cash_received
                portfolio.update_position(asset_name, 0.0)
                cash_after = portfolio.cash

                current_val = portfolio.compute_value({asset_name: market_price})
                trade_records.append({
                    "trade_id": trade_id,
                    "signal_date": prev_time,
                    "execution_date": current_time,
                    "action": "SELL",
                    "execution_price": exec_price,
                    "quantity": sell_qty,
                    "position": 0.0,
                    "transaction_cost": tc_cost,
                    "slippage_cost": slip_cost,
                    "cash_before": cash_before,
                    "cash_after": cash_after,
                    "portfolio_value": current_val,
                })

        # Step 2: Mark to market at bar's close
        current_equity = portfolio.compute_value({asset_name: market_price})
        equity_values[i] = current_equity
        cash_values[i] = portfolio.cash
        position_values[i] = portfolio.get_position(asset_name)

    equity_curve = pd.Series(equity_values, index=timestamps, name="Equity")
    cash_curve = pd.Series(cash_values, index=timestamps, name="Cash")
    positions = pd.Series(position_values, index=timestamps, name="Position")
    trade_log = pd.DataFrame(trade_records)

    # Compute performance metrics from the simulated equity returns
    equity_returns = daily_returns(equity_curve)
    tot_ret = float((equity_values[-1] / initial_capital) - 1.0)
    cagr_val = annualized_return(equity_returns, periods_per_year=periods_per_year)
    vol_val = annualized_volatility(equity_returns, periods_per_year=periods_per_year)
    sharpe_val = sharpe_ratio(equity_returns, periods_per_year=periods_per_year)
    mdd_val = max_drawdown(equity_returns)

    # Calculate trade-specific statistics
    n_trades = len(trade_records)
    n_roundtrips = n_trades // 2

    performance_metrics = {
        "Initial Capital": initial_capital,
        "Final Equity": float(equity_values[-1]),
        "Total Return": tot_ret,
        "CAGR": cagr_val,
        "Annualized Volatility": vol_val,
        "Sharpe Ratio": sharpe_val,
        "Max Drawdown": mdd_val,
        "Total Trades": n_trades,
        "Roundtrip Trades": n_roundtrips,
    }

    return BacktestResult(
        equity_curve=equity_curve,
        cash_curve=cash_curve,
        positions=positions,
        trade_log=trade_log,
        performance_metrics=performance_metrics,
        initial_capital=initial_capital,
        final_equity=float(equity_values[-1]),
    )


class Backtester:
    """Strategy-independent backtester runner class."""

    def __init__(
        self,
        initial_capital: float = 100_000.0,
        position_size: float = 1.0,
        transaction_cost: float = 0.001,
        slippage: float = 0.0005,
        periods_per_year: int = 252,
    ) -> None:
        """Initialize backtester settings."""
        self.initial_capital = initial_capital
        self.position_size = position_size
        self.transaction_cost = transaction_cost
        self.slippage = slippage
        self.periods_per_year = periods_per_year

    def backtest(
        self,
        prices: pd.Series,
        signals: pd.Series,
    ) -> BacktestResult:
        """Execute backtest with configured parameters."""
        return run_backtest(
            prices=prices,
            signals=signals,
            initial_capital=self.initial_capital,
            position_size=self.position_size,
            transaction_cost=self.transaction_cost,
            slippage=self.slippage,
            periods_per_year=self.periods_per_year,
        )

    def run(
        self,
        data: pd.DataFrame,
        strategy: Any,
        price_col: str = "Close",
    ) -> BacktestResult:
        """Strategy adapter allowing Strategy objects with generate_signals method."""
        price = data[price_col] if price_col in data.columns else data[price_col.lower()]
        signals = strategy.generate_signals(data)
        return self.backtest(prices=price, signals=signals)


# Compatibility alias
VectorizedBacktester = Backtester
