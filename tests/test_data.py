"""Tests for Data Loader and Data Processor modules."""

from datetime import datetime
from pathlib import Path
import numpy as np
import pandas as pd
import pytest
from src.data_loader import (
    ASSET_MAPPING,
    DEFAULT_HISTORY_YEARS,
    EXPECTED_COLUMNS,
    DataLoader,
    _flatten_multiindex_columns,
    _normalize_columns,
    _validate_and_clean_data,
    get_asset_symbol,
    get_default_date_range,
    get_default_historical_data,
    get_historical_data,
    load_asset_data,
    load_default_asset_data,
)
from src.data_processor import DataProcessor


def test_asset_mapping_resolution():
    """Verify asset name mapping and case-insensitivity."""
    assert get_asset_symbol("Gold") == "GC=F"
    assert get_asset_symbol("gold") == "GC=F"
    assert get_asset_symbol("Bitcoin") == "BTC-USD"
    assert get_asset_symbol("bitcoin") == "BTC-USD"
    assert get_asset_symbol("NVIDIA") == "NVDA"
    assert get_asset_symbol("nvidia") == "NVDA"
    assert get_asset_symbol("NVDA") == "NVDA"
    assert get_asset_symbol("BTC-USD") == "BTC-USD"
    assert get_asset_symbol("GC=F") == "GC=F"

    with pytest.raises(ValueError, match="Unknown asset"):
        get_asset_symbol("UnknownAssetXYZ")


def test_default_date_range_dynamic_calculation():
    """Verify dynamic 5-year default date range calculation."""
    start_str, end_str = get_default_date_range(5)
    start_dt = pd.to_datetime(start_str)
    end_dt = pd.to_datetime(end_str)

    assert start_dt < end_dt
    diff_days = (end_dt - start_dt).days
    # 5 years is ~1826 days
    assert 1820 <= diff_days <= 1830


def test_fixed_reproducible_default_date_range():
    """Verify fixed reproducible default dates (2021-09-20 to 2026-09-18) when called without args."""
    start_str, end_str = get_default_date_range()
    assert start_str == "2021-09-20"
    assert end_str == "2026-09-18"


def test_strict_date_slice_filtering():
    """Verify market data respects exact start_date and end_date constraints."""
    df = get_historical_data("NVDA", start_date="2023-01-01", end_date="2023-03-31")
    assert not df.empty
    assert df.index.min() >= pd.to_datetime("2023-01-01")
    assert df.index.max() <= pd.to_datetime("2023-03-31")


def test_invalid_date_range_error():
    """Verify start_date > end_date raises ValueError."""
    with pytest.raises(ValueError, match="cannot be after end_date"):
        get_historical_data("NVDA", start_date="2026-01-10", end_date="2024-01-01")


def test_multiindex_flattening_and_normalization():
    """Verify MultiIndex column handling and normalization."""
    dates = pd.date_range("2024-01-01", periods=3, freq="D")
    multi_cols = pd.MultiIndex.from_tuples([
        ("Close", "NVDA"),
        ("High", "NVDA"),
        ("Low", "NVDA"),
        ("Open", "NVDA"),
        ("Volume", "NVDA"),
    ], names=["Price", "Ticker"])
    df = pd.DataFrame(
        [[100.0, 105.0, 99.0, 101.0, 1000],
         [102.0, 107.0, 101.0, 102.0, 1200],
         [104.0, 108.0, 103.0, 103.0, 1100]],
        index=dates,
        columns=multi_cols,
    )
    cleaned = _validate_and_clean_data(df, "NVDA")

    assert not isinstance(cleaned.columns, pd.MultiIndex)
    for col in EXPECTED_COLUMNS:
        assert col in cleaned.columns
    assert cleaned.index.is_monotonic_increasing
    assert not cleaned.index.duplicated().any()


def test_data_loader_initialization_and_caching(tmp_path: Path):
    """Verify DataLoader caching layer with local parquet files."""
    cache_dir = tmp_path / "cache"
    loader = DataLoader(cache_dir=cache_dir)
    assert loader.cache_dir.exists()

    dates = pd.date_range("2024-01-01", periods=3, freq="D")
    dummy_df = pd.DataFrame({
        "Open": [10.0, 11.0, 12.0],
        "High": [11.0, 12.0, 13.0],
        "Low": [9.0, 10.0, 11.0],
        "Close": [10.5, 11.5, 12.5],
        "Adj Close": [10.5, 11.5, 12.5],
        "Volume": [100, 200, 300],
    }, index=dates)
    dummy_df.index.name = "Date"

    cache_file = loader.cache_dir / "TEST_1d_2024-01-01_2024-01-03.parquet"
    dummy_df.to_parquet(cache_file)
    assert cache_file.exists()

    loader.clear_cache()
    assert not cache_file.exists()


@pytest.mark.parametrize("symbol", ["GC=F", "BTC-USD", "NVDA"])
def test_5_year_default_historical_data(symbol: str):
    """Verify ~5-year default download contains substantially more than 1 month (> 1000 rows for stocks/crypto/futures)."""
    df = get_default_historical_data(symbol=symbol)

    # 1. Substantially more than 1 month (minimum 750 trading days across 5 years)
    assert len(df) >= 750, f"Expected 5-year data (>750 rows), got {len(df)} rows for {symbol}."

    # 2. Chronological sorting
    assert df.index.is_monotonic_increasing, f"Dates for {symbol} are not sorted chronologically."

    # 3. Expected columns
    for col in EXPECTED_COLUMNS:
        assert col in df.columns, f"Column '{col}' missing in data for {symbol}."

    # 4. Zero duplicate dates
    assert not df.index.duplicated().any(), f"Duplicate dates found in data for {symbol}."

    # 5. Non-null prices and valid spreads
    assert (df["Close"] > 0).all(), f"Non-positive Close prices found for {symbol}."
    assert (df["High"] >= df["Low"]).all(), f"High < Low anomaly detected for {symbol}."


@pytest.mark.parametrize("asset_name,expected_sym", [
    ("Gold", "GC=F"),
    ("Bitcoin", "BTC-USD"),
    ("NVIDIA", "NVDA"),
])
def test_load_default_asset_data(asset_name: str, expected_sym: str):
    """Verify convenience default loading by human-readable asset names."""
    df = load_default_asset_data(asset_name=asset_name)
    assert len(df) >= 750
    assert df.index.is_monotonic_increasing
    assert not df.index.duplicated().any()
    assert "Close" in df.columns


def test_alpaca_market_data_direct_fetch():
    """Verify direct Alpaca Market Data API fetch for NVDA and BTC."""
    from src.data_loader import fetch_alpaca_market_data

    # Test NVDA stock bars via Alpaca API
    df_nvda = fetch_alpaca_market_data("NVDA", start_date="2023-01-01", end_date="2023-06-01")
    assert not df_nvda.empty
    assert len(df_nvda) > 50
    assert "Close" in df_nvda.columns
    assert (df_nvda["Close"] > 0).all()
    assert df_nvda.index.is_monotonic_increasing

    # Test BTC/USD crypto bars via Alpaca API
    df_btc = fetch_alpaca_market_data("BTC-USD", start_date="2023-01-01", end_date="2023-06-01")
    assert not df_btc.empty
    assert len(df_btc) > 100
    assert "Close" in df_btc.columns
    assert df_btc.index.is_monotonic_increasing
