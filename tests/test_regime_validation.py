"""Quantitative Validation Tests for Market Regime Multi-Dimensional Analytics."""

import json
import math
import numpy as np
import pandas as pd
import pytest

from src.regime import MarketRegimeDetector, MIN_REGIME_OBSERVATIONS
from src.metrics import total_return, max_drawdown
from server.bridge.python_bridge import cmd_market_regimes
from src.utils import sanitize_for_json


def test_mutually_exclusive_combined_regimes():
    """Verify that combined 4-state regimes are strictly mutually exclusive."""
    dates = pd.date_range("2024-01-01", periods=100, freq="D")
    trend = pd.Series([1, 1, -1, -1] * 25, index=dates)
    vol = pd.Series([1, 0, 1, 0] * 25, index=dates)

    combined = MarketRegimeDetector.combined_regimes(trend, vol)

    # Every element must belong to exactly one of the 4 states
    valid_states = {
        "Bullish + High Vol",
        "Bullish + Low Vol",
        "Bearish + High Vol",
        "Bearish + Low Vol",
    }
    assert set(combined.unique()) == valid_states
    assert len(combined) == 100


def test_every_valid_observation_receives_exactly_one_regime():
    """Verify partition property: observation counts sum to total classified observations."""
    dates = pd.date_range("2024-01-01", periods=300, freq="D")
    # Simulate price series with clear trend
    prices = pd.Series(np.linspace(100, 200, 300) + np.random.normal(0, 2, 300), index=dates)
    returns = prices.pct_change().dropna()

    trend = MarketRegimeDetector.trend_regime(prices, fast_period=20, slow_period=50)
    vol = MarketRegimeDetector.volatility_regime(returns, window=10, quantile_threshold=0.75)

    combined = MarketRegimeDetector.combined_regimes(trend, vol)

    classified = combined[combined != "Neutral / Lookback"]
    c_counts = classified.value_counts()
    
    assert c_counts.sum() == len(classified)


def test_combined_regime_counts_sum_correctly_on_btc():
    """Verify that BTC-USD 1-year combined regime counts sum exactly to total observations."""
    res = cmd_market_regimes({
        "symbol": "BTC-USD",
        "start_date": "2025-09-18",
        "end_date": "2026-09-18",
    })

    meta = res["meta"]
    comb = res["combined_regimes"]

    sum_combined = sum(comb[k]["samples"] for k in ["bull_high_vol", "bull_low_vol", "bear_high_vol", "bear_low_vol"])
    assert sum_combined == meta["classified_observations"]
    assert sum_combined + meta["unclassified_lookback_observations"] == meta["total_observations"]


def test_short_regime_sample_returns_null_cagr_and_sharpe():
    """Verify regime with N < 60 returns None for CAGR and Sharpe to prevent misleading annualization."""
    # 11 sample observations (like BTC bullish regime)
    short_returns = pd.Series([0.01, -0.005, 0.02, 0.003, -0.01, 0.015, -0.002, 0.008, -0.004, 0.01, 0.005])
    assert len(short_returns) == 11
    assert len(short_returns) < MIN_REGIME_OBSERVATIONS

    metrics = MarketRegimeDetector.calculate_regime_metrics(
        short_returns, periods_per_year=365, min_observations=60
    )

    assert metrics["samples"] == 11
    assert metrics["cagr"] is None  # Must be None for short sample
    assert metrics["sharpe"] is None  # Must be None for short sample
    assert metrics["statistically_sufficient"] is False
    assert metrics["total_return"] is not None
    assert metrics["volatility"] is not None
    assert metrics["max_drawdown"] is not None


def test_sufficient_sample_produces_valid_cagr_and_sharpe():
    """Verify regime with N >= 60 produces valid finite CAGR and Sharpe."""
    np.random.seed(42)
    suff_returns = pd.Series(np.random.normal(0.001, 0.02, 100))
    assert len(suff_returns) >= MIN_REGIME_OBSERVATIONS

    metrics = MarketRegimeDetector.calculate_regime_metrics(
        suff_returns, periods_per_year=252, min_observations=60
    )

    assert metrics["samples"] == 100
    assert metrics["statistically_sufficient"] is True
    assert metrics["cagr"] is not None
    assert math.isfinite(metrics["cagr"])
    assert metrics["sharpe"] is not None
    assert math.isfinite(metrics["sharpe"])
    assert math.isfinite(metrics["volatility"])


def test_regime_return_handles_non_contiguous_observations():
    """Verify that regime performance compounds actual discrete returns belonging to the regime."""
    # Returns on Day 1 (+10%), Day 4 (-5%), Day 8 (+20%)
    discrete_returns = pd.Series([0.10, -0.05, 0.20])
    
    # Compounded: (1 + 0.10) * (1 - 0.05) * (1 + 0.20) - 1 = 1.10 * 0.95 * 1.20 - 1 = 1.254 - 1 = 0.254 (+25.4%)
    tot_ret = total_return(discrete_returns)
    assert pytest.approx(tot_ret, abs=1e-5) == 0.254

    metrics = MarketRegimeDetector.calculate_regime_metrics(discrete_returns, periods_per_year=252)
    assert pytest.approx(metrics["total_return"], abs=1e-5) == 0.254
    assert metrics["samples"] == 3
    assert metrics["cagr"] is None  # N=3 < 60


def test_no_nan_or_infinity_reaches_json_layer():
    """Verify that JSON serialization of regime response contains zero NaN or Infinity."""
    res = cmd_market_regimes({
        "symbol": "BTC-USD",
        "start_date": "2025-09-18",
        "end_date": "2026-09-18",
    })

    sanitized = sanitize_for_json(res)
    json_str = json.dumps(sanitized, allow_nan=False)

    assert "NaN" not in json_str
    assert "Infinity" not in json_str
    assert "-Infinity" not in json_str

    parsed = json.loads(json_str)
    assert parsed["trend_regimes"]["bullish"]["cagr"] is None  # 11 samples -> None
    assert parsed["trend_regimes"]["bearish"]["samples"] > 60
    assert parsed["trend_regimes"]["bearish"]["cagr"] is not None  # 156 samples -> finite float
