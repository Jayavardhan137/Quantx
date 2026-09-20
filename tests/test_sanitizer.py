"""Unit Tests for QuantX Central JSON Sanitization Layer."""

import json
import math
import numpy as np
import pandas as pd
import pytest

from src.utils import sanitize_for_json
from server.bridge.python_bridge import cmd_market_regimes


def test_sanitize_nan_to_null():
    """Verify NaN floats are converted to None."""
    assert sanitize_for_json(float("nan")) is None
    assert sanitize_for_json(np.nan) is None


def test_sanitize_infinity_to_null():
    """Verify Infinity and -Infinity are converted to None."""
    assert sanitize_for_json(float("inf")) is None
    assert sanitize_for_json(float("-inf")) is None
    assert sanitize_for_json(np.inf) is None
    assert sanitize_for_json(-np.inf) is None


def test_sanitize_none_and_booleans_and_zeros():
    """Verify None, False/True, and zero are strictly preserved."""
    assert sanitize_for_json(None) is None
    assert sanitize_for_json(False) is False
    assert sanitize_for_json(True) is True
    assert sanitize_for_json(0) == 0
    assert sanitize_for_json(0.0) == 0.0
    assert isinstance(sanitize_for_json(0.0), float)
    assert isinstance(sanitize_for_json(0), int)


def test_sanitize_normal_floats_and_ints():
    """Verify valid numeric scalars are unchanged."""
    assert sanitize_for_json(123.456) == 123.456
    assert sanitize_for_json(-987.65) == -987.65
    assert sanitize_for_json(np.float64(42.5)) == 42.5
    assert sanitize_for_json(np.int64(100)) == 100


def test_sanitize_nested_dictionary():
    """Verify nested dictionary with mixed NaN, Inf, and normal values."""
    input_data = {
        "cagr": float("nan"),
        "vol": float("inf"),
        "sharpe": float("-inf"),
        "return": 0.25,
        "nested": {
            "val_nan": np.nan,
            "val_normal": 10.0,
            "inner_list": [1.0, float("nan"), 3.0, np.inf],
        },
    }

    sanitized = sanitize_for_json(input_data)
    expected = {
        "cagr": None,
        "vol": None,
        "sharpe": None,
        "return": 0.25,
        "nested": {
            "val_nan": None,
            "val_normal": 10.0,
            "inner_list": [1.0, None, 3.0, None],
        },
    }
    assert sanitized == expected

    # Strict JSON compliance test: json.dumps with allow_nan=False must succeed
    json_str = json.dumps(sanitized, allow_nan=False)
    assert "NaN" not in json_str
    assert "Infinity" not in json_str
    parsed = json.loads(json_str)
    assert parsed["cagr"] is None
    assert parsed["vol"] is None
    assert parsed["return"] == 0.25


def test_sanitize_pandas_structures():
    """Verify Series and DataFrames with NaN/NaT values."""
    s = pd.Series([1.0, np.nan, 3.5, np.inf])
    sanitized_s = sanitize_for_json(s)
    assert sanitized_s == [1.0, None, 3.5, None]

    dates = pd.date_range("2024-01-01", periods=2, freq="D")
    df = pd.DataFrame({
        "Price": [100.5, np.nan],
        "Vol": [np.nan, 20.0],
    }, index=dates)
    sanitized_df = sanitize_for_json(df)
    assert len(sanitized_df) == 2
    assert sanitized_df[0]["Price"] == 100.5
    assert sanitized_df[0]["Vol"] is None
    assert sanitized_df[1]["Price"] is None
    assert sanitized_df[1]["Vol"] == 20.0


def test_market_regimes_sanitization_with_short_window():
    """Verify Market Regimes endpoint returns 100% valid strict JSON without NaN or Inf."""
    # Run with 1-year window (2025-09-18 to 2026-09-18) where 200-day trend may have empty bear regime
    res = cmd_market_regimes({
        "symbol": "NVDA",
        "start_date": "2025-09-18",
        "end_date": "2026-09-18",
    })

    # Sanitize and serialize with strict allow_nan=False
    sanitized = sanitize_for_json(res)
    json_str = json.dumps(sanitized, allow_nan=False)

    assert "NaN" not in json_str
    assert "Infinity" not in json_str

    parsed = json.loads(json_str)
    assert "breakdown" in parsed
    assert "bullish" in parsed["breakdown"]
    assert "bearish" in parsed["breakdown"]

    # Verify no non-finite values in parsed payload
    for reg_key, reg_stats in parsed["breakdown"].items():
        assert isinstance(reg_stats["samples"], int)
        # CAGR, Volatility, Sharpe should be float or None, never NaN
        assert reg_stats["cagr"] is None or isinstance(reg_stats["cagr"], (float, int))
        assert reg_stats["volatility"] is None or isinstance(reg_stats["volatility"], (float, int))
        assert reg_stats["sharpe"] is None or isinstance(reg_stats["sharpe"], (float, int))
