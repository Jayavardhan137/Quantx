"""Tests for Lookahead Bias, Data Leakage, and Temporal Causality."""

import numpy as np
import pandas as pd
from src.backtester import VectorizedBacktester
from src.strategies import BaseStrategy


class FutureLeakingStrategy(BaseStrategy):
    """Synthetic test strategy to test lookahead prevention."""

    def __init__(self) -> None:
        super().__init__(name="Future Leaker")

    def generate_signals(self, data: pd.DataFrame) -> pd.Series:
        # Intentionally peek at current bar
        return pd.Series(1.0, index=data.index)


def test_position_lag_prevents_instant_execution():
    """Verify backtester shifts raw signals by 1 period so trade cannot execute on same bar signal was formed."""
    dates = pd.date_range("2023-01-01", periods=5, freq="D")
    df = pd.DataFrame({"Close": [100, 102, 104, 106, 108]}, index=dates)

    strat = FutureLeakingStrategy()
    bt = VectorizedBacktester()
    result = bt.run(df, strat)

    # Position at t=0 must be 0.0 (no trade executed until t=1)
    assert result.positions.iloc[0] == 0.0
    assert result.positions.iloc[1] > 0.0

    # Trade log must record signal at t=0 and execution at t=1
    assert len(result.trade_log) == 1
    trade = result.trade_log.iloc[0]
    assert trade["signal_date"] == dates[0]
    assert trade["execution_date"] == dates[1]
    assert np.isclose(trade["execution_price"], 102.0 * (1.0 + bt.slippage))
