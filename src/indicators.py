"""Quantitative Indicators and Signal Transformers Engine.

Pure, causal, and testable mathematical functions for time series analysis.
Eliminates lookahead bias and correctly handles NaN edge cases.
"""

from __future__ import annotations

from typing import Optional, Tuple, Union
import numpy as np
import pandas as pd


def sma(
    series: pd.Series,
    window: Optional[int] = None,
    period: Optional[int] = None,
) -> pd.Series:
    """Calculate Simple Moving Average (SMA).

    Args:
        series: Input price/numerical series.
        window: Lookback window size (alias for period).
        period: Lookback period size (alias for window).

    Returns:
        pd.Series: Simple moving average series.

    Raises:
        ValueError: If window/period is less than 1 or not specified.
    """
    w = window if window is not None else period
    if w is None or w < 1:
        raise ValueError(f"Window/period must be a positive integer >= 1, got {w}.")
    return series.rolling(window=w, min_periods=w).mean()


def ema(
    series: pd.Series,
    span: Optional[int] = None,
    window: Optional[int] = None,
    period: Optional[int] = None,
    adjust: bool = False,
) -> pd.Series:
    """Calculate Exponential Moving Average (EMA).

    Args:
        series: Input price/numerical series.
        span: Lookback span parameter (alias for period/window).
        window: Lookback window parameter.
        period: Lookback period parameter.
        adjust: Whether to calculate exponentially weighted average using weights (default: False).

    Returns:
        pd.Series: Exponential moving average series.

    Raises:
        ValueError: If span/period/window is less than 1 or not specified.
    """
    s = span if span is not None else (period if period is not None else window)
    if s is None or s < 1:
        raise ValueError(f"Span/period must be a positive integer >= 1, got {s}.")
    return series.ewm(span=s, adjust=adjust).mean()


def rolling_volatility(
    returns: pd.Series,
    window: int = 20,
    periods_per_year: int = 252,
    ddof: int = 1,
) -> pd.Series:
    """Calculate annualized rolling volatility from returns series.

    Args:
        returns: Period returns series (e.g. daily percentage changes).
        window: Rolling observation window size.
        periods_per_year: Annualization factor (252 for equities/futures, 365 for crypto).
        ddof: Degrees of freedom for sample standard deviation (default: 1).

    Returns:
        pd.Series: Annualized rolling standard deviation series.

    Raises:
        ValueError: If window < 2 or periods_per_year <= 0.
    """
    if window < 2:
        raise ValueError(f"Window must be at least 2 for volatility estimation, got {window}.")
    if periods_per_year <= 0:
        raise ValueError(f"periods_per_year must be positive, got {periods_per_year}.")

    rolling_std = returns.rolling(window=window, min_periods=window).std(ddof=ddof)
    return rolling_std * np.sqrt(periods_per_year)


def rolling_returns(series: pd.Series, window: int = 20) -> pd.Series:
    """Calculate rolling total returns over a specified window.

    R_t = (P_t / P_{t - window}) - 1

    Args:
        series: Price series.
        window: Lookback window length (must be >= 1).

    Returns:
        pd.Series: Rolling percentage return series.

    Raises:
        ValueError: If window is less than 1.
    """
    if window < 1:
        raise ValueError(f"Window must be a positive integer >= 1, got {window}.")
    return (series / series.shift(window)) - 1.0


def rolling_correlation(
    returns_a: pd.Series,
    returns_b: pd.Series,
    window: int = 20,
    min_periods: Optional[int] = None,
) -> pd.Series:
    """Calculate rolling Pearson correlation between two return series.

    Strict requirement: Computes correlation on returns, never raw prices.

    Args:
        returns_a: First asset return series.
        returns_b: Second asset return series.
        window: Rolling window length (must be >= 2).
        min_periods: Minimum required observations in window (defaults to window).

    Returns:
        pd.Series: Rolling correlation series with values bounded between -1.0 and 1.0.

    Raises:
        ValueError: If window is less than 2.
    """
    if window < 2:
        raise ValueError(f"Window must be at least 2 for rolling correlation, got {window}.")
    req_periods = min_periods if min_periods is not None else window
    return returns_a.rolling(window=window, min_periods=req_periods).corr(returns_b)


def rsi(series: pd.Series, period: int = 14) -> pd.Series:
    """Relative Strength Index (RSI) using Wilder's smoothing."""
    if period < 1:
        raise ValueError(f"Period must be >= 1, got {period}.")
    delta = series.diff()
    gain = delta.where(delta > 0, 0.0)
    loss = -delta.where(delta < 0, 0.0)

    avg_gain = gain.ewm(alpha=1.0 / period, min_periods=period, adjust=False).mean()
    avg_loss = loss.ewm(alpha=1.0 / period, min_periods=period, adjust=False).mean()

    rs = avg_gain / avg_loss.replace(0, np.nan)
    rsi_series = 100.0 - (100.0 / (1.0 + rs))
    return rsi_series


def macd(
    series: pd.Series,
    fast_period: int = 12,
    slow_period: int = 26,
    signal_period: int = 9,
) -> Tuple[pd.Series, pd.Series, pd.Series]:
    """Moving Average Convergence Divergence (MACD)."""
    fast_ema = ema(series, span=fast_period)
    slow_ema = ema(series, span=slow_period)
    macd_line = fast_ema - slow_ema
    signal_line = ema(macd_line, span=signal_period)
    hist = macd_line - signal_line
    return macd_line, signal_line, hist


def bollinger_bands(
    series: pd.Series,
    period: int = 20,
    num_std: float = 2.0,
) -> Tuple[pd.Series, pd.Series, pd.Series]:
    """Bollinger Bands."""
    middle_band = sma(series, window=period)
    std = series.rolling(window=period, min_periods=period).std()
    upper_band = middle_band + (num_std * std)
    lower_band = middle_band - (num_std * std)
    return middle_band, upper_band, lower_band


def atr(
    high: pd.Series,
    low: pd.Series,
    close: pd.Series,
    period: int = 14,
) -> pd.Series:
    """Average True Range (ATR)."""
    prev_close = close.shift(1)
    tr1 = high - low
    tr2 = (high - prev_close).abs()
    tr3 = (low - prev_close).abs()
    true_range = pd.concat([tr1, tr2, tr3], axis=1).max(axis=1)
    return true_range.ewm(alpha=1.0 / period, min_periods=period, adjust=False).mean()


class Indicators:
    """Class wrapper providing static access to pure indicator functions."""

    sma = staticmethod(sma)
    ema = staticmethod(ema)
    rolling_volatility = staticmethod(rolling_volatility)
    rolling_returns = staticmethod(rolling_returns)
    rolling_correlation = staticmethod(rolling_correlation)
    rsi = staticmethod(rsi)
    macd = staticmethod(macd)
    bollinger_bands = staticmethod(bollinger_bands)
    atr = staticmethod(atr)
