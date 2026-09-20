"""Benchmark Comparison, Relative Performance, and Multi-Strategy Comparison Engine.

Generates standardized comparative performance matrices across strategies vs Buy & Hold:
Return, CAGR, Volatility, Sharpe, Max Drawdown, and Trades.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional, Union
import numpy as np
import pandas as pd
from src.backtester import BacktestResult, run_backtest
from src.metrics import (
    annualized_return,
    annualized_volatility,
    daily_returns,
    max_drawdown,
    sharpe_ratio,
    total_return,
)
from src.strategies import (
    BaseStrategy,
    EMATrendStrategy,
    MeanReversionStrategy,
    MomentumStrategy,
    SMACrossoverStrategy,
)
from src.utils import format_percentage


class BenchmarkAnalysis:
    """Relative performance metrics comparing strategy returns to a market benchmark."""

    @staticmethod
    def beta(strategy_returns: pd.Series, benchmark_returns: pd.Series) -> float:
        """Calculate market Beta (covariance of strategy with benchmark / benchmark variance)."""
        aligned = pd.concat([strategy_returns, benchmark_returns], axis=1).dropna()
        if len(aligned) < 2:
            return 1.0
        cov_matrix = np.cov(aligned.iloc[:, 0], aligned.iloc[:, 1])
        cov = cov_matrix[0, 1]
        bench_var = cov_matrix[1, 1]
        if bench_var == 0 or np.isnan(bench_var):
            return 1.0
        return float(cov / bench_var)

    @staticmethod
    def alpha(
        strategy_returns: pd.Series,
        benchmark_returns: pd.Series,
        risk_free_rate: float = 0.0,
        periods_per_year: int = 252,
    ) -> float:
        """Calculate annualized Jensen's Alpha."""
        aligned = pd.concat([strategy_returns, benchmark_returns], axis=1).dropna()
        if len(aligned) < 2:
            return 0.0
        strat_series = aligned.iloc[:, 0]
        bench_series = aligned.iloc[:, 1]

        beta_val = BenchmarkAnalysis.beta(strat_series, bench_series)
        strat_mean_ann = strat_series.mean() * periods_per_year
        bench_mean_ann = bench_series.mean() * periods_per_year

        alpha_val = (strat_mean_ann - risk_free_rate) - beta_val * (bench_mean_ann - risk_free_rate)
        return float(alpha_val)

    @staticmethod
    def tracking_error(
        strategy_returns: pd.Series,
        benchmark_returns: pd.Series,
        periods_per_year: int = 252,
    ) -> float:
        """Calculate annualized Tracking Error (volatility of excess returns)."""
        aligned = pd.concat([strategy_returns, benchmark_returns], axis=1).dropna()
        diff = aligned.iloc[:, 0] - aligned.iloc[:, 1]
        if len(diff) < 2:
            return 0.0
        return float(diff.std() * np.sqrt(periods_per_year))

    @staticmethod
    def information_ratio(
        strategy_returns: pd.Series,
        benchmark_returns: pd.Series,
        periods_per_year: int = 252,
    ) -> float:
        """Calculate Information Ratio (annualized excess return / tracking error)."""
        te = BenchmarkAnalysis.tracking_error(strategy_returns, benchmark_returns, periods_per_year)
        if te == 0 or np.isnan(te):
            return 0.0
        aligned = pd.concat([strategy_returns, benchmark_returns], axis=1).dropna()
        diff = aligned.iloc[:, 0] - aligned.iloc[:, 1]
        ann_excess_ret = diff.mean() * periods_per_year
        return float(ann_excess_ret / te)

    @staticmethod
    def capture_ratios(
        strategy_returns: pd.Series,
        benchmark_returns: pd.Series,
    ) -> Dict[str, float]:
        """Compute Up-Market and Down-Market Capture Ratios."""
        aligned = pd.concat([strategy_returns, benchmark_returns], axis=1).dropna()
        s_ret = aligned.iloc[:, 0]
        b_ret = aligned.iloc[:, 1]

        up_mask = b_ret > 0
        down_mask = b_ret < 0

        up_capture = (
            (s_ret[up_mask].mean() / b_ret[up_mask].mean())
            if up_mask.sum() > 0 and b_ret[up_mask].mean() != 0
            else 0.0
        )
        down_capture = (
            (s_ret[down_mask].mean() / b_ret[down_mask].mean())
            if down_mask.sum() > 0 and b_ret[down_mask].mean() != 0
            else 0.0
        )

        return {
            "Up Capture": float(up_capture),
            "Down Capture": float(down_capture),
        }


def compare_strategies_table(
    data: pd.DataFrame,
    price_col: str = "Close",
    initial_capital: float = 100_000.0,
    position_size: float = 1.0,
    transaction_cost: float = 0.001,
    slippage: float = 0.0005,
    periods_per_year: int = 252,
    strategies: Optional[Dict[str, BaseStrategy]] = None,
    formatted: bool = True,
) -> pd.DataFrame:
    """Generate standardized strategy comparison matrix across strategies vs Buy & Hold.

    Output format:
                       SMA       EMA       Momentum    Mean Rev.    B&H
    Return              X         X          X            X          X
    CAGR                X         X          X            X          X
    Volatility          X         X          X            X          X
    Sharpe              X         X          X            X          X
    Max Drawdown        X         X          X            X          X
    Trades              X         X          X            X          -

    Args:
        data: Historical market data DataFrame (with Close price).
        price_col: Name of price column.
        initial_capital: Initial portfolio capital.
        position_size: Fraction of capital to allocate.
        transaction_cost: Commission rate per trade.
        slippage: Slippage rate per trade.
        periods_per_year: Annualization factor (252 for equities/futures, 365 for crypto).
        strategies: Optional custom dictionary of strategy instances.
        formatted: Whether to format numbers as human-readable strings (e.g., percentages).

    Returns:
        pd.DataFrame: Strategy comparison matrix.
    """
    prices = data[price_col] if price_col in data.columns else data[price_col.lower()]

    if strategies is None:
        strategies = {
            "SMA": SMACrossoverStrategy(fast_period=20, slow_period=50),
            "EMA": EMATrendStrategy(fast_span=20, slow_span=50),
            "Momentum": MomentumStrategy(lookback_period=20, threshold=0.0),
            "Mean Rev.": MeanReversionStrategy(rsi_period=14, oversold=30.0, exit_rsi=50.0),
        }

    results: Dict[str, Dict[str, Any]] = {}

    # Run backtest for each strategy
    for col_name, strat in strategies.items():
        signals = strat.generate_signals(data)
        bt_res = run_backtest(
            prices=prices,
            signals=signals,
            initial_capital=initial_capital,
            position_size=position_size,
            transaction_cost=transaction_cost,
            slippage=slippage,
            periods_per_year=periods_per_year,
        )

        eq_returns = daily_returns(bt_res.equity_curve)
        results[col_name] = {
            "Return": bt_res.total_return,
            "CAGR": annualized_return(eq_returns, periods_per_year=periods_per_year),
            "Volatility": annualized_volatility(eq_returns, periods_per_year=periods_per_year),
            "Sharpe": sharpe_ratio(eq_returns, periods_per_year=periods_per_year),
            "Max Drawdown": max_drawdown(eq_returns),
            "Trades": len(bt_res.trade_log),
        }

    # Compute Buy & Hold (B&H) benchmark
    bh_signals = pd.Series(1.0, index=prices.index)
    bh_res = run_backtest(
        prices=prices,
        signals=bh_signals,
        initial_capital=initial_capital,
        position_size=position_size,
        transaction_cost=transaction_cost,
        slippage=slippage,
        periods_per_year=periods_per_year,
    )
    bh_returns = daily_returns(bh_res.equity_curve)

    results["B&H"] = {
        "Return": bh_res.total_return,
        "CAGR": annualized_return(bh_returns, periods_per_year=periods_per_year),
        "Volatility": annualized_volatility(bh_returns, periods_per_year=periods_per_year),
        "Sharpe": sharpe_ratio(bh_returns, periods_per_year=periods_per_year),
        "Max Drawdown": max_drawdown(bh_returns),
        "Trades": "-",
    }

    # Assemble into raw numeric DataFrame
    metric_order = ["Return", "CAGR", "Volatility", "Sharpe", "Max Drawdown", "Trades"]
    raw_df = pd.DataFrame(results).reindex(metric_order)

    if not formatted:
        return raw_df

    formatted_dict: Dict[str, Dict[str, str]] = {}
    for col, metrics in results.items():
        formatted_dict[col] = {}
        for m in ["Return", "CAGR", "Volatility", "Max Drawdown"]:
            val = metrics.get(m)
            if isinstance(val, (int, float)) and not np.isnan(val):
                formatted_dict[col][m] = f"{val * 100:.2f}%"
            else:
                formatted_dict[col][m] = "N/A"

        sharpe_val = metrics.get("Sharpe")
        if isinstance(sharpe_val, (int, float)) and not np.isnan(sharpe_val):
            formatted_dict[col]["Sharpe"] = f"{sharpe_val:.2f}"
        else:
            formatted_dict[col]["Sharpe"] = "N/A"

        trades_val = metrics.get("Trades")
        if trades_val == "-":
            formatted_dict[col]["Trades"] = "-"
        elif isinstance(trades_val, (int, float)) and not np.isnan(trades_val):
            formatted_dict[col]["Trades"] = str(int(trades_val))
        else:
            formatted_dict[col]["Trades"] = str(trades_val)

    return pd.DataFrame(formatted_dict).reindex(metric_order)
