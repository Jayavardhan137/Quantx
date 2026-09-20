"""Quantitative Trading Strategy Definitions and Factory.

Implements standard rule-based strategies:
1. SMA Crossover
2. EMA Trend
3. Momentum
4. Mean Reversion
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any, Dict, Optional, Type, Union
import numpy as np
import pandas as pd
from src.indicators import Indicators, bollinger_bands, ema, rolling_returns, rsi, sma


def _extract_close_series(data: Union[pd.DataFrame, pd.Series]) -> pd.Series:
    """Extract 1D Close price series from DataFrame or Series."""
    if isinstance(data, pd.Series):
        return data
    if "Close" in data.columns:
        return data["Close"]
    if "close" in data.columns:
        return data["close"]
    if "Adj Close" in data.columns:
        return data["Adj Close"]
    if "adj close" in data.columns:
        return data["adj close"]
    # Fallback to the first column
    return data.iloc[:, 0]


class BaseStrategy(ABC):
    """Abstract Base Class for quantitative trading strategies."""

    def __init__(self, name: str, params: Optional[Dict[str, Any]] = None) -> None:
        """Initialize the strategy with custom parameters.

        Args:
            name: Strategy name.
            params: Dictionary of strategy parameters.
        """
        self.name = name
        self.params = params or {}

    @abstractmethod
    def generate_signals(self, data: Union[pd.DataFrame, pd.Series]) -> pd.Series:
        """Generate trading signals from market data.

        Signal convention:
            1.0: Long position
            0.0: Cash / Flat

        Args:
            data: OHLCV DataFrame or price Series.

        Returns:
            pd.Series: Position signals aligned to the data index.
        """
        pass


class SMACrossoverStrategy(BaseStrategy):
    """Simple Moving Average (SMA) dual-crossover trend-following strategy.

    Long when Fast SMA > Slow SMA; Flat when Fast SMA <= Slow SMA.
    """

    def __init__(self, fast_period: int = 50, slow_period: int = 200) -> None:
        """Initialize SMA Crossover Strategy.

        Args:
            fast_period: Lookback window for fast moving average.
            slow_period: Lookback window for slow moving average.
        """
        if fast_period >= slow_period:
            raise ValueError(f"fast_period ({fast_period}) must be less than slow_period ({slow_period}).")
        super().__init__(
            name="SMA Crossover",
            params={"fast_period": fast_period, "slow_period": slow_period},
        )
        self.fast_period = fast_period
        self.slow_period = slow_period

    def generate_signals(self, data: Union[pd.DataFrame, pd.Series]) -> pd.Series:
        """Generate long/flat signals based on fast vs slow SMA crossing."""
        close = _extract_close_series(data)
        fast_ma = sma(close, window=self.fast_period)
        slow_ma = sma(close, window=self.slow_period)

        signals = pd.Series(0.0, index=close.index, name="Signal")
        valid_mask = fast_ma.notna() & slow_ma.notna()
        signals[valid_mask & (fast_ma > slow_ma)] = 1.0
        return signals


class EMATrendStrategy(BaseStrategy):
    """Exponential Moving Average (EMA) dual-trend following strategy.

    Long when Fast EMA > Slow EMA; Flat when Fast EMA <= Slow EMA.
    """

    def __init__(self, fast_span: int = 20, slow_span: int = 50) -> None:
        """Initialize EMA Trend Strategy.

        Args:
            fast_span: Lookback span for fast EMA.
            slow_span: Lookback span for slow EMA.
        """
        if fast_span >= slow_span:
            raise ValueError(f"fast_span ({fast_span}) must be less than slow_span ({slow_span}).")
        super().__init__(
            name="EMA Trend",
            params={"fast_span": fast_span, "slow_span": slow_span},
        )
        self.fast_span = fast_span
        self.slow_span = slow_span

    def generate_signals(self, data: Union[pd.DataFrame, pd.Series]) -> pd.Series:
        """Generate long/flat signals based on fast vs slow EMA crossing."""
        close = _extract_close_series(data)
        fast_ema = ema(close, span=self.fast_span)
        slow_ema = ema(close, span=self.slow_span)

        signals = pd.Series(0.0, index=close.index, name="Signal")
        valid_mask = fast_ema.notna() & slow_ema.notna()
        signals[valid_mask & (fast_ema > slow_ema)] = 1.0
        return signals


class MomentumStrategy(BaseStrategy):
    """Time-Series Momentum / Trend-Following Strategy.

    Long when asset's trailing return over `lookback_period` > `threshold` (default 0.0);
    Flat otherwise.
    """

    def __init__(self, lookback_period: int = 20, threshold: float = 0.0) -> None:
        """Initialize Momentum Strategy.

        Args:
            lookback_period: Trailing lookback window to calculate multi-period return.
            threshold: Minimum trailing return required to trigger a long signal.
        """
        if lookback_period < 1:
            raise ValueError(f"lookback_period must be >= 1, got {lookback_period}.")
        super().__init__(
            name="Momentum",
            params={"lookback_period": lookback_period, "threshold": threshold},
        )
        self.lookback_period = lookback_period
        self.threshold = threshold

    def generate_signals(self, data: Union[pd.DataFrame, pd.Series]) -> pd.Series:
        """Generate long/flat signals based on positive trailing momentum."""
        close = _extract_close_series(data)
        trailing_ret = rolling_returns(close, window=self.lookback_period)

        signals = pd.Series(0.0, index=close.index, name="Signal")
        valid_mask = trailing_ret.notna()
        signals[valid_mask & (trailing_ret > self.threshold)] = 1.0
        return signals


class MeanReversionStrategy(BaseStrategy):
    """Mean Reversion Strategy using RSI and Bollinger Band extremes.

    Enters Long when price is oversold (RSI < oversold or price < lower Bollinger Band).
    Exits back to Flat/Cash when price recovers above exit threshold (e.g. RSI > exit_rsi or upper band).
    """

    def __init__(
        self,
        rsi_period: int = 14,
        oversold: float = 30.0,
        exit_rsi: float = 50.0,
        bb_period: int = 20,
        bb_std: float = 2.0,
    ) -> None:
        """Initialize Mean Reversion Strategy.

        Args:
            rsi_period: RSI lookback period.
            oversold: RSI threshold to trigger long entry.
            exit_rsi: RSI threshold to exit back to cash.
            bb_period: Bollinger Bands moving average lookback.
            bb_std: Bollinger Bands standard deviation width.
        """
        super().__init__(
            name="Mean Reversion",
            params={
                "rsi_period": rsi_period,
                "oversold": oversold,
                "exit_rsi": exit_rsi,
                "bb_period": bb_period,
                "bb_std": bb_std,
            },
        )
        self.rsi_period = rsi_period
        self.oversold = oversold
        self.exit_rsi = exit_rsi
        self.bb_period = bb_period
        self.bb_std = bb_std

    def generate_signals(self, data: Union[pd.DataFrame, pd.Series]) -> pd.Series:
        """Generate stateful mean-reversion signals."""
        close = _extract_close_series(data)
        rsi_series = rsi(close, period=self.rsi_period)
        _, _, lower_band = bollinger_bands(close, period=self.bb_period, num_std=self.bb_std)

        signals = pd.Series(np.nan, index=close.index, name="Signal")

        # Entry condition: RSI oversold OR price piercing lower band
        buy_condition = (rsi_series < self.oversold) | (close < lower_band)
        # Exit condition: RSI recovering above mean
        exit_condition = rsi_series > self.exit_rsi

        signals[buy_condition] = 1.0
        signals[exit_condition] = 0.0

        # Stateful holding: forward fill position between entry and exit
        signals = signals.ffill().fillna(0.0)
        return signals


# Alias for backwards compatibility
RSIMeanReversionStrategy = MeanReversionStrategy

# Strategy Registry
STRATEGY_REGISTRY: Dict[str, Type[BaseStrategy]] = {
    "SMA Crossover": SMACrossoverStrategy,
    "EMA Trend": EMATrendStrategy,
    "Momentum": MomentumStrategy,
    "Mean Reversion": MeanReversionStrategy,
}


def get_strategy(name: str, **kwargs: Any) -> BaseStrategy:
    """Factory function to instantiate a strategy by name.

    Args:
        name: Strategy name ('SMA Crossover', 'EMA Trend', 'Momentum', 'Mean Reversion').
        **kwargs: Strategy-specific parameters.

    Returns:
        BaseStrategy: Instantiated strategy object.

    Raises:
        ValueError: If strategy name is unknown.
    """
    cleaned_name = name.strip()
    # Direct match
    if cleaned_name in STRATEGY_REGISTRY:
        return STRATEGY_REGISTRY[cleaned_name](**kwargs)

    # Case-insensitive match
    for reg_name, cls in STRATEGY_REGISTRY.items():
        if reg_name.lower() == cleaned_name.lower():
            return cls(**kwargs)

    available = list(STRATEGY_REGISTRY.keys())
    raise ValueError(f"Unknown strategy '{name}'. Available strategies: {available}")
