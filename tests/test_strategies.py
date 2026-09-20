"""Unit Tests for Quantitative Trading Strategies.

Tests signal generation and mechanics for:
1. SMA Crossover
2. EMA Trend
3. Momentum
4. Mean Reversion
"""

import numpy as np
import pandas as pd
import pytest
from src.backtester import run_backtest
from src.strategies import (
    EMATrendStrategy,
    MeanReversionStrategy,
    MomentumStrategy,
    SMACrossoverStrategy,
    get_strategy,
)


@pytest.fixture
def trending_up_series() -> pd.DataFrame:
    """Fixture providing an upward trending price series."""
    dates = pd.date_range("2024-01-01", periods=20, freq="D")
    prices = pd.Series([10.0 + i * 2.0 for i in range(20)], index=dates, name="Close")
    return pd.DataFrame({"Close": prices})


@pytest.fixture
def mean_reverting_series() -> pd.DataFrame:
    """Fixture providing an oversold plunge followed by mean recovery."""
    dates = pd.date_range("2024-01-01", periods=30, freq="D")
    # Sharp drop from 100 to 40, then steady recovery to 80
    prices = [100 - (i * 4.0) for i in range(15)] + [40.0 + (i * 3.0) for i in range(15)]
    return pd.DataFrame({"Close": pd.Series(prices, index=dates)})


# 1. SMA Crossover Strategy Test
def test_sma_crossover_strategy(trending_up_series: pd.DataFrame):
    """Verify SMA Crossover generates expected signals and runs through backtest."""
    strat = SMACrossoverStrategy(fast_period=2, slow_period=5)
    signals = strat.generate_signals(trending_up_series)

    assert len(signals) == len(trending_up_series)
    # Slow SMA needs 5 periods; after period 5 in uptrend, signal should be 1.0
    assert signals.iloc[5] == 1.0
    assert signals.iloc[-1] == 1.0

    # Backtest integration check
    bt_res = run_backtest(trending_up_series["Close"], signals)
    assert bt_res.final_equity > bt_res.initial_capital


def test_sma_crossover_invalid_params():
    """Verify fast_period >= slow_period raises ValueError."""
    with pytest.raises(ValueError, match="fast_period .* must be less than slow_period"):
        SMACrossoverStrategy(fast_period=50, slow_period=20)


# 2. EMA Trend Strategy Test
def test_ema_trend_strategy(trending_up_series: pd.DataFrame):
    """Verify EMA Trend generates long signals in an upward trend."""
    strat = EMATrendStrategy(fast_span=3, slow_span=8)
    signals = strat.generate_signals(trending_up_series)

    assert len(signals) == len(trending_up_series)
    # Fast EMA crosses above slow EMA in strong uptrend
    assert signals.iloc[-1] == 1.0

    # Test reverse (downtrend)
    down_prices = pd.Series([100.0 - i * 2.0 for i in range(20)], index=trending_up_series.index)
    down_signals = strat.generate_signals(pd.DataFrame({"Close": down_prices}))
    assert down_signals.iloc[-1] == 0.0


def test_ema_trend_invalid_params():
    """Verify fast_span >= slow_span raises ValueError."""
    with pytest.raises(ValueError, match="fast_span .* must be less than slow_span"):
        EMATrendStrategy(fast_span=50, slow_span=20)


# 3. Momentum Strategy Test
def test_momentum_strategy():
    """Verify Momentum strategy triggers Long on positive trailing returns and Flat on negative."""
    dates = pd.date_range("2024-01-01", periods=10, freq="D")
    # First 5 days up, next 5 days down
    prices = pd.Series([100, 105, 110, 115, 120, 118, 110, 100, 90, 80], index=dates, name="Close")
    df = pd.DataFrame({"Close": prices})

    strat = MomentumStrategy(lookback_period=2, threshold=0.0)
    signals = strat.generate_signals(df)

    # Days 0, 1: lookback not yet ready -> 0.0
    assert signals.iloc[0] == 0.0
    # Day 3 (115 vs 105): positive momentum -> 1.0
    assert signals.iloc[3] == 1.0
    # Day 8 (90 vs 110): negative momentum -> 0.0
    assert signals.iloc[8] == 0.0


def test_momentum_invalid_lookback():
    """Verify lookback_period < 1 raises ValueError."""
    with pytest.raises(ValueError, match="lookback_period must be >= 1"):
        MomentumStrategy(lookback_period=0)


# 4. Mean Reversion Strategy Test
def test_mean_reversion_strategy(mean_reverting_series: pd.DataFrame):
    """Verify Mean Reversion buys oversold and exits upon recovery."""
    strat = MeanReversionStrategy(rsi_period=5, oversold=30.0, exit_rsi=50.0, bb_period=10)
    signals = strat.generate_signals(mean_reverting_series)

    assert len(signals) == len(mean_reverting_series)
    assert set(signals.unique()).issubset({0.0, 1.0})
    # During severe plunge (around index 14), buy trigger should fire
    assert (signals == 1.0).any()


# 5. Strategy Factory Function Test
def test_get_strategy_factory():
    """Verify get_strategy factory instantiates correct classes."""
    sma_strat = get_strategy("SMA Crossover", fast_period=10, slow_period=30)
    assert isinstance(sma_strat, SMACrossoverStrategy)
    assert sma_strat.fast_period == 10

    ema_strat = get_strategy("EMA Trend", fast_span=10, slow_span=30)
    assert isinstance(ema_strat, EMATrendStrategy)

    mom_strat = get_strategy("Momentum", lookback_period=15)
    assert isinstance(mom_strat, MomentumStrategy)

    mr_strat = get_strategy("Mean Reversion", oversold=25.0)
    assert isinstance(mr_strat, MeanReversionStrategy)

    with pytest.raises(ValueError, match="Unknown strategy"):
        get_strategy("NonExistentStrategyXYZ")


# 6. Strategy Comparison Table Matrix Test
def test_compare_strategies_table(trending_up_series: pd.DataFrame):
    """Verify compare_strategies_table produces standardized comparison matrix."""
    from src.benchmark import compare_strategies_table

    table = compare_strategies_table(
        trending_up_series,
        strategies={
            "SMA": SMACrossoverStrategy(fast_period=2, slow_period=5),
            "EMA": EMATrendStrategy(fast_span=2, slow_span=5),
            "Momentum": MomentumStrategy(lookback_period=2),
            "Mean Rev.": MeanReversionStrategy(rsi_period=3, oversold=30, exit_rsi=50, bb_period=5),
        },
        formatted=True,
    )

    # Check column layout
    expected_cols = ["SMA", "EMA", "Momentum", "Mean Rev.", "B&H"]
    assert list(table.columns) == expected_cols

    # Check metric rows
    expected_rows = ["Return", "CAGR", "Volatility", "Sharpe", "Max Drawdown", "Trades"]
    assert list(table.index) == expected_rows

    # B&H trades must be "-"
    assert table.loc["Trades", "B&H"] == "-"
