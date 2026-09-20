"""Unit Tests for Quantitative Indicators using exact hand-calculated fixtures."""

import numpy as np
import pandas as pd
import pytest
from src.indicators import (
    Indicators,
    ema,
    rolling_correlation,
    rolling_returns,
    rolling_volatility,
    sma,
)


def test_sma_hand_calculated():
    """Verify SMA calculation against hand-computed values.

    Input: [10.0, 20.0, 30.0, 40.0, 50.0], window = 3
    Expected: [NaN, NaN, 20.0, 30.0, 40.0]
    """
    prices = pd.Series([10.0, 20.0, 30.0, 40.0, 50.0])
    result = sma(prices, window=3)

    assert pd.isna(result.iloc[0])
    assert pd.isna(result.iloc[1])
    assert np.isclose(result.iloc[2], 20.0)
    assert np.isclose(result.iloc[3], 30.0)
    assert np.isclose(result.iloc[4], 40.0)


def test_sma_invalid_window():
    """Verify window < 1 raises ValueError."""
    prices = pd.Series([10.0, 20.0])
    with pytest.raises(ValueError, match="positive integer"):
        sma(prices, window=0)


def test_ema_hand_calculated():
    """Verify EMA calculation against hand-computed values.

    Input: [10.0, 20.0, 30.0], span = 2, adjust = False
    alpha = 2 / (2 + 1) = 2/3
    EMA_0 = 10.0
    EMA_1 = (2/3)*20 + (1/3)*10 = 50/3 = 16.666667
    EMA_2 = (2/3)*30 + (1/3)*(50/3) = 20 + 50/9 = 230/9 = 25.555556
    """
    prices = pd.Series([10.0, 20.0, 30.0])
    result = ema(prices, span=2, adjust=False)

    assert np.isclose(result.iloc[0], 10.0)
    assert np.isclose(result.iloc[1], 50.0 / 3.0)
    assert np.isclose(result.iloc[2], 230.0 / 9.0)


def test_rolling_volatility_hand_calculated():
    """Verify rolling volatility with 252 (equities) and 365 (crypto) annualization.

    Returns: [0.01, -0.01, 0.02, -0.02], window = 4
    Mean = 0.0
    Sum of squared diffs = 0.0001 + 0.0001 + 0.0004 + 0.0004 = 0.0010
    Sample variance (ddof=1) = 0.0010 / 3 = 0.00033333333333333335
    Sample std = sqrt(0.0010 / 3) = 0.018257418583505537
    Annualized (252): std * sqrt(252) ≈ 0.2898275349272338
    Annualized (365): std * sqrt(365) ≈ 0.34880749227427244
    """
    returns = pd.Series([0.01, -0.01, 0.02, -0.02])

    vol_252 = rolling_volatility(returns, window=4, periods_per_year=252)
    vol_365 = rolling_volatility(returns, window=4, periods_per_year=365)

    expected_std = np.sqrt(0.0010 / 3.0)
    expected_vol_252 = expected_std * np.sqrt(252)
    expected_vol_365 = expected_std * np.sqrt(365)

    assert pd.isna(vol_252.iloc[0])
    assert pd.isna(vol_252.iloc[1])
    assert pd.isna(vol_252.iloc[2])
    assert np.isclose(vol_252.iloc[3], expected_vol_252)
    assert np.isclose(vol_365.iloc[3], expected_vol_365)


def test_rolling_returns_hand_calculated():
    """Verify rolling returns formula: P_t / P_{t-k} - 1.

    Prices: [100.0, 105.0, 110.0, 120.0], window = 2
    t=0: NaN
    t=1: NaN
    t=2: 110 / 100 - 1 = 0.10 (10%)
    t=3: 120 / 105 - 1 = 15 / 105 ≈ 0.14285714
    """
    prices = pd.Series([100.0, 105.0, 110.0, 120.0])
    result = rolling_returns(prices, window=2)

    assert pd.isna(result.iloc[0])
    assert pd.isna(result.iloc[1])
    assert np.isclose(result.iloc[2], 0.10)
    assert np.isclose(result.iloc[3], 15.0 / 105.0)


def test_rolling_correlation_on_returns():
    """Verify rolling correlation is calculated on returns series.

    Returns A: [0.01, 0.02, -0.01, 0.03]
    Returns B: [0.02, 0.04, -0.02, 0.06] (B = 2A, perfect correlation +1.0)
    Returns C: [-0.01, -0.02, 0.01, -0.03] (C = -A, perfect negative correlation -1.0)
    window = 3
    """
    ret_a = pd.Series([0.01, 0.02, -0.01, 0.03])
    ret_b = pd.Series([0.02, 0.04, -0.02, 0.06])
    ret_c = pd.Series([-0.01, -0.02, 0.01, -0.03])

    corr_ab = rolling_correlation(ret_a, ret_b, window=3)
    corr_ac = rolling_correlation(ret_a, ret_c, window=3)

    assert pd.isna(corr_ab.iloc[0])
    assert pd.isna(corr_ab.iloc[1])
    assert np.isclose(corr_ab.iloc[2], 1.0)
    assert np.isclose(corr_ab.iloc[3], 1.0)

    assert np.isclose(corr_ac.iloc[2], -1.0)
    assert np.isclose(corr_ac.iloc[3], -1.0)


def test_indicators_class_compatibility():
    """Verify Indicators wrapper methods match standalone functions."""
    series = pd.Series([10.0, 20.0, 30.0, 40.0])
    assert Indicators.sma(series, 2).equals(sma(series, 2))
    assert Indicators.ema(series, 2).equals(ema(series, 2))
