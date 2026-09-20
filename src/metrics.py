"""Quantitative Performance, Risk, and Drawdown Analytics Engine.

Pure, mathematically rigorous, and testable financial functions.
Preserves NaNs on invalid/insufficient inputs and never silently masks invalid calculations with zero.
"""

from __future__ import annotations

from typing import Dict, Optional, Union
import numpy as np
import pandas as pd


def daily_returns(prices: pd.Series) -> pd.Series:
    """Calculate simple discrete daily percentage returns: r_t = P_t / P_{t-1} - 1.

    Args:
        prices: Historical price series.

    Returns:
        pd.Series: Returns series where first element is NaN.
    """
    if len(prices) == 0:
        return pd.Series(dtype=float)
    return (prices / prices.shift(1)) - 1.0


def cumulative_returns(returns: pd.Series) -> pd.Series:
    """Calculate cumulative wealth growth series from returns: (1 + r).cumprod() - 1.

    Args:
        returns: Periodic return series.

    Returns:
        pd.Series: Continuous cumulative returns series.
    """
    clean_rets = returns.dropna()
    if len(clean_rets) == 0:
        return pd.Series(dtype=float)
    return (1.0 + clean_rets).cumprod() - 1.0


def total_return(returns: pd.Series) -> float:
    """Calculate total compounded return: product(1 + r_t) - 1.

    Args:
        returns: Periodic return series.

    Returns:
        float: Total cumulative compounded return. Returns NaN if series is empty.
    """
    clean_rets = returns.dropna()
    if len(clean_rets) == 0:
        return np.nan
    return float((1.0 + clean_rets).prod() - 1.0)


def annualized_return(
    returns: pd.Series,
    periods_per_year: int = 252,
) -> float:
    """Calculate Compound Annual Growth Rate (CAGR).

    Formula: (1 + total_return) ** (periods_per_year / N) - 1

    Annualization Conventions:
    - Equities / Futures: periods_per_year = 252 (trading days)
    - Cryptocurrencies (Bitcoin): periods_per_year = 365 (continuous calendar days)

    Args:
        returns: Periodic return series.
        periods_per_year: Annualization factor (252 for stocks/futures, 365 for crypto).

    Returns:
        float: Compound annualized return. Returns NaN if data is insufficient or portfolio value <= -1.
    """
    clean_rets = returns.dropna()
    n = len(clean_rets)
    if n == 0 or periods_per_year <= 0:
        return np.nan

    tot_ret = total_return(clean_rets)
    if np.isnan(tot_ret) or tot_ret <= -1.0:
        return np.nan

    years = n / periods_per_year
    if years <= 0:
        return np.nan

    return float((1.0 + tot_ret) ** (1.0 / years) - 1.0)


def annualized_volatility(
    returns: pd.Series,
    periods_per_year: int = 252,
    ddof: int = 1,
) -> float:
    """Calculate annualized volatility from daily returns.

    Formula: standard deviation of daily returns * sqrt(periods_per_year)

    Annualization Conventions:
    - Equities / Futures: periods_per_year = 252 -> std * sqrt(252)
    - Cryptocurrencies (Bitcoin): periods_per_year = 365 -> std * sqrt(365)

    Args:
        returns: Daily returns series.
        periods_per_year: Annualization factor (252 or 365).
        ddof: Degrees of freedom (default: 1 for sample standard deviation).

    Returns:
        float: Annualized standard deviation. Returns NaN if fewer than 2 valid observations.
    """
    clean_rets = returns.dropna()
    if len(clean_rets) < 2 or periods_per_year <= 0:
        return np.nan

    sample_std = float(clean_rets.std(ddof=ddof))
    if np.isnan(sample_std):
        return np.nan

    return float(sample_std * np.sqrt(periods_per_year))


def sharpe_ratio(
    returns: pd.Series,
    risk_free_rate: float = 0.0,
    periods_per_year: int = 252,
) -> float:
    """Calculate the annualized Sharpe Ratio.

    Formula: (annualized_return - risk_free_rate) / annualized_volatility

    Args:
        returns: Daily returns series.
        risk_free_rate: Annualized risk-free benchmark rate (e.g. 0.02 for 2%).
        periods_per_year: Annualization factor (252 for equities/futures, 365 for crypto).

    Returns:
        float: Sharpe ratio. Returns NaN if volatility is zero, negative, or undefined.
    """
    ann_ret = annualized_return(returns, periods_per_year=periods_per_year)
    ann_vol = annualized_volatility(returns, periods_per_year=periods_per_year)

    if np.isnan(ann_ret) or np.isnan(ann_vol) or ann_vol <= 0.0:
        return np.nan

    return float((ann_ret - risk_free_rate) / ann_vol)


def drawdown_series(returns: pd.Series) -> pd.Series:
    """Compute the continuous underwater drawdown series from returns.

    Equity curve: E_t = cumprod(1 + r_t)
    Running max:  M_t = cummax(E_t)
    Drawdown:     D_t = (E_t / M_t) - 1

    Args:
        returns: Periodic return series.

    Returns:
        pd.Series: Continuous percentage drawdown series (values in range [-1.0, 0.0]).
    """
    clean_rets = returns.dropna()
    if len(clean_rets) == 0:
        return pd.Series(dtype=float)

    equity = (1.0 + clean_rets).cumprod()
    running_max = equity.cummax()
    drawdown = (equity / running_max) - 1.0
    return drawdown


def max_drawdown(returns: pd.Series) -> float:
    """Calculate Maximum Drawdown (the lowest trough in the drawdown series).

    Formula: min(equity / running_max - 1)

    Args:
        returns: Periodic return series.

    Returns:
        float: Maximum peak-to-trough drawdown as a non-positive float (e.g., -0.25 for -25%).
               Returns NaN if series has no valid records.
    """
    dd = drawdown_series(returns)
    if len(dd) == 0:
        return np.nan
    return float(dd.min())


def rolling_correlation(
    returns_a: pd.Series,
    returns_b: pd.Series,
    window: int = 20,
    min_periods: Optional[int] = None,
) -> pd.Series:
    """Calculate rolling Pearson correlation between two return series.

    Strict rule: Uses returns, never raw prices.

    Args:
        returns_a: First return series.
        returns_b: Second return series.
        window: Rolling observation window length (>= 2).
        min_periods: Minimum valid observations required (defaults to window).

    Returns:
        pd.Series: Rolling correlation series.
    """
    if window < 2:
        raise ValueError(f"Window must be at least 2, got {window}.")
    req_periods = min_periods if min_periods is not None else window
    return returns_a.rolling(window=window, min_periods=req_periods).corr(returns_b)


class Metrics:
    """Class wrapper providing static access to pure metrics functions."""

    daily_returns = staticmethod(daily_returns)
    cumulative_returns = staticmethod(cumulative_returns)
    total_return = staticmethod(total_return)
    annualized_return = staticmethod(annualized_return)
    annualized_volatility = staticmethod(annualized_volatility)
    sharpe_ratio = staticmethod(sharpe_ratio)
    drawdown_series = staticmethod(drawdown_series)
    max_drawdown = staticmethod(max_drawdown)
    rolling_correlation = staticmethod(rolling_correlation)

    @staticmethod
    def summary(
        returns: pd.Series,
        risk_free_rate: float = 0.0,
        periods_per_year: int = 252,
    ) -> Dict[str, float]:
        """Compute full statistical and risk summary metrics dictionary."""
        return {
            "Total Return": total_return(returns),
            "Annualized Return (CAGR)": annualized_return(returns, periods_per_year=periods_per_year),
            "Annualized Volatility": annualized_volatility(returns, periods_per_year=periods_per_year),
            "Sharpe Ratio": sharpe_ratio(returns, risk_free_rate=risk_free_rate, periods_per_year=periods_per_year),
            "Max Drawdown": max_drawdown(returns),
        }
