"""Unit Tests for Quantitative Metrics using exact hand-calculated fixtures."""

import numpy as np
import pandas as pd
import pytest
from src.metrics import (
    Metrics,
    annualized_return,
    annualized_volatility,
    cumulative_returns,
    daily_returns,
    drawdown_series,
    max_drawdown,
    rolling_correlation,
    sharpe_ratio,
    total_return,
)


def test_daily_returns_formula():
    """Verify daily return formula: r_t = P_t / P_{t-1} - 1.

    Prices: [100.0, 105.0, 94.5, 103.95]
    Expected: [NaN, 0.05, -0.10, 0.10]
    """
    prices = pd.Series([100.0, 105.0, 94.5, 103.95])
    rets = daily_returns(prices)

    assert pd.isna(rets.iloc[0])
    assert np.isclose(rets.iloc[1], 0.05)
    assert np.isclose(rets.iloc[2], -0.10)
    assert np.isclose(rets.iloc[3], 0.10)


def test_cumulative_and_total_return():
    """Verify cumulative return: product(1 + r_t) - 1.

    Returns: [0.10, -0.05, 0.20]
    Cum 0: 1.10 - 1 = 0.10
    Cum 1: (1.10 * 0.95) - 1 = 1.045 - 1 = 0.045
    Cum 2: (1.045 * 1.20) - 1 = 1.254 - 1 = 0.254 (25.4%)
    """
    rets = pd.Series([0.10, -0.05, 0.20])
    cum_rets = cumulative_returns(rets)
    tot_ret = total_return(rets)

    assert np.isclose(cum_rets.iloc[0], 0.10)
    assert np.isclose(cum_rets.iloc[1], 0.045)
    assert np.isclose(cum_rets.iloc[2], 0.254)
    assert np.isclose(tot_ret, 0.254)


def test_annualized_volatility_equity_and_crypto():
    """Verify annualized volatility for Equities (sqrt(252)) and Bitcoin (sqrt(365)).

    Returns: [0.02, -0.02, 0.02, -0.02]
    Mean = 0.0
    Sum squared diffs = 4 * (0.02^2) = 4 * 0.0004 = 0.0016
    Sample variance (ddof=1) = 0.0016 / 3
    Sample std = sqrt(0.0016 / 3) ≈ 0.02309401076758503
    Equities (252): std * sqrt(252) ≈ 0.36660605559646726
    Crypto (365):   std * sqrt(365) ≈ 0.44120978939987704
    """
    rets = pd.Series([0.02, -0.02, 0.02, -0.02])

    sample_std = np.sqrt(0.0016 / 3.0)
    expected_vol_252 = sample_std * np.sqrt(252)
    expected_vol_365 = sample_std * np.sqrt(365)

    vol_equity = annualized_volatility(rets, periods_per_year=252)
    vol_crypto = annualized_volatility(rets, periods_per_year=365)

    assert np.isclose(vol_equity, expected_vol_252)
    assert np.isclose(vol_crypto, expected_vol_365)


def test_annualized_return_cagr():
    """Verify CAGR formula: (1 + total_return) ** (periods_per_year / N) - 1.

    Returns: 252 days of 0.1% daily return (0.001)
    Total return = (1.001)^252 - 1 ≈ 0.286337
    CAGR for 252 periods with N=252: (1 + 0.286337)^(252/252) - 1 = 0.286337
    """
    rets = pd.Series([0.001] * 252)
    expected_cagr = (1.001 ** 252) - 1.0

    cagr = annualized_return(rets, periods_per_year=252)
    assert np.isclose(cagr, expected_cagr)


def test_sharpe_ratio_formula_and_zero_vol_handling():
    """Verify Sharpe Ratio formula and verify that zero vol returns NaN (not silent zero).

    Returns: [0.01, 0.02, 0.01, 0.02] repeated over 252 days (63 blocks)
    Risk-free rate = 0.02 (2%)
    """
    block = [0.01, 0.02, 0.01, 0.02]
    rets = pd.Series(block * 63)

    ann_ret = annualized_return(rets, periods_per_year=252)
    ann_vol = annualized_volatility(rets, periods_per_year=252)
    expected_sharpe = (ann_ret - 0.02) / ann_vol

    calculated_sharpe = sharpe_ratio(rets, risk_free_rate=0.02, periods_per_year=252)
    assert np.isclose(calculated_sharpe, expected_sharpe)

    # Constant series has zero volatility -> Sharpe must be NaN, NOT 0.0
    flat_rets = pd.Series([0.01, 0.01, 0.01, 0.01])
    assert np.isnan(sharpe_ratio(flat_rets))


def test_drawdown_series_and_max_drawdown():
    """Verify drawdown: equity / running_max - 1 and max_drawdown = min(drawdown).

    Prices: 100 -> 120 -> 90 -> 108
    Returns: [0.20, -0.25, 0.20]
    Equity: [1.20, 0.90, 1.08]
    Running Max: [1.20, 1.20, 1.20]
    Drawdown:
      t=0: 1.20 / 1.20 - 1 = 0.0
      t=1: 0.90 / 1.20 - 1 = -0.25 (-25%)
      t=2: 1.08 / 1.20 - 1 = -0.10 (-10%)
    Max Drawdown: -0.25
    """
    rets = pd.Series([0.20, -0.25, 0.20])
    dd = drawdown_series(rets)
    mdd = max_drawdown(rets)

    assert np.isclose(dd.iloc[0], 0.0)
    assert np.isclose(dd.iloc[1], -0.25)
    assert np.isclose(dd.iloc[2], -0.10)
    assert np.isclose(mdd, -0.25)


def test_rolling_correlation_uses_returns():
    """Verify rolling correlation is computed on return series."""
    ret_a = pd.Series([0.01, 0.02, 0.03, 0.04])
    ret_b = pd.Series([0.02, 0.04, 0.06, 0.08])
    corr = rolling_correlation(ret_a, ret_b, window=3)

    assert pd.isna(corr.iloc[0])
    assert pd.isna(corr.iloc[1])
    assert np.isclose(corr.iloc[2], 1.0)
    assert np.isclose(corr.iloc[3], 1.0)


def test_nan_handling_on_empty_series():
    """Verify empty/insufficient inputs return NaN rather than silent zeroes."""
    empty_s = pd.Series(dtype=float)
    assert np.isnan(total_return(empty_s))
    assert np.isnan(annualized_return(empty_s))
    assert np.isnan(annualized_volatility(empty_s))
    assert np.isnan(sharpe_ratio(empty_s))
    assert np.isnan(max_drawdown(empty_s))

    single_elem = pd.Series([0.05])
    assert np.isnan(annualized_volatility(single_elem))
    assert np.isnan(sharpe_ratio(single_elem))


def test_metrics_class_summary():
    """Verify Metrics.summary dictionary outputs complete valid metrics."""
    rets = pd.Series([0.01, -0.005, 0.008, -0.002, 0.015])
    summary = Metrics.summary(rets, risk_free_rate=0.01, periods_per_year=252)

    assert "Total Return" in summary
    assert "Annualized Return (CAGR)" in summary
    assert "Annualized Volatility" in summary
    assert "Sharpe Ratio" in summary
    assert "Max Drawdown" in summary
    for k, v in summary.items():
        assert not np.isnan(v), f"Metric '{k}' returned unexpected NaN."
