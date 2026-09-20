"""Market Data Ingestion, Caching, and Validation Layer for QuantX.

Fetches and standardizes historical market data using yfinance.
Supports arbitrary date ranges, 5-year dynamic default ranges, and disk caching.
Maintains strict separation between core data fetching and UI components.
"""

from __future__ import annotations

import logging
import os
import json
import urllib.request
import urllib.parse
from datetime import datetime
from pathlib import Path
from typing import Dict, Optional, Tuple, Union
import pandas as pd
import yfinance as yf

# Standard Logger setup
logger = logging.getLogger(__name__)

# Alpaca Markets API Configuration
ALPACA_API_KEY = os.getenv("ALPACA_API_KEY", "PK5SHTQMKADL3M7WLMPPAGHURG")
ALPACA_SECRET_KEY = os.getenv("ALPACA_SECRET_KEY", "CsTor7wucAxHP6zsh6MeUA8vJfST9mVDodRKsXhjvhwb")
ALPACA_DATA_URL = os.getenv("ALPACA_DATA_URL", "https://data.alpaca.markets")

# Canonical Asset Name to Symbol Mapping
ASSET_MAPPING: Dict[str, str] = {
    "Gold": "GC=F",
    "Bitcoin": "BTC-USD",
    "NVIDIA": "NVDA",
}

# Fixed Reproducible Default Period and Historical Universe Constants
FIXED_DEFAULT_START: str = "2021-09-20"
FIXED_DEFAULT_END: str = "2026-09-18"

HISTORICAL_UNIVERSE_START: str = "2021-09-20"
HISTORICAL_UNIVERSE_END: str = "2026-09-18"

EXPECTED_COLUMNS = ["Open", "High", "Low", "Close", "Adj Close", "Volume"]
DEFAULT_HISTORY_YEARS: int = 5
DEFAULT_CACHE_DIR = Path(__file__).resolve().parent.parent / "data" / "cache"


def get_default_date_range(years: Optional[int] = None) -> Tuple[str, str]:
    """Return reproducible fixed default date range or dynamically compute if years is given.

    Args:
        years: Optional number of years of historical data. If None, returns the fixed
               reproducible range (2021-09-20 -> 2026-09-18).

    Returns:
        Tuple[str, str]: (start_date_str, end_date_str) in 'YYYY-MM-DD' format.
    """
    if years is not None:
        end_dt = datetime.now()
        start_dt = end_dt - pd.DateOffset(years=years)
        return start_dt.strftime("%Y-%m-%d"), end_dt.strftime("%Y-%m-%d")
    return FIXED_DEFAULT_START, FIXED_DEFAULT_END


def get_asset_symbol(asset_name: str) -> str:
    """Resolve an asset name to its market ticker symbol.

    Args:
        asset_name: Common asset name (e.g., 'Gold', 'Bitcoin', 'NVIDIA') or symbol.

    Returns:
        str: Resolved ticker symbol.

    Raises:
        ValueError: If asset name cannot be resolved.
    """
    if not asset_name or not isinstance(asset_name, str):
        raise ValueError("Asset name must be a non-empty string.")

    cleaned_name = asset_name.strip()

    # Exact match in mapping keys
    if cleaned_name in ASSET_MAPPING:
        return ASSET_MAPPING[cleaned_name]

    # Case-insensitive match in mapping keys
    for key, sym in ASSET_MAPPING.items():
        if key.lower() == cleaned_name.lower():
            return sym

    # Check if the input is directly one of the mapped values (case-insensitive)
    for sym in ASSET_MAPPING.values():
        if sym.lower() == cleaned_name.lower():
            return sym

    available_assets = list(ASSET_MAPPING.keys()) + list(ASSET_MAPPING.values())
    raise ValueError(
        f"Unknown asset '{asset_name}'. Available assets: {', '.join(available_assets)}"
    )


def _flatten_multiindex_columns(df: pd.DataFrame, symbol: str) -> pd.DataFrame:
    """Flatten MultiIndex columns returned by modern yfinance versions.

    Args:
        df: DataFrame with potentially MultiIndex columns.
        symbol: The ticker symbol used in the query.

    Returns:
        pd.DataFrame: DataFrame with single-level standardized columns.
    """
    if not isinstance(df.columns, pd.MultiIndex):
        return df

    new_cols = []
    for col in df.columns:
        if isinstance(col, tuple):
            price_names = {"open", "high", "low", "close", "adj close", "volume"}
            matched = False
            for part in col:
                if str(part).strip().lower() in price_names:
                    new_cols.append(str(part).strip())
                    matched = True
                    break
            if not matched:
                non_symbol_parts = [
                    str(p).strip() for p in col if str(p).strip().upper() != symbol.upper()
                ]
                new_cols.append(non_symbol_parts[0] if non_symbol_parts else str(col[0]))
        else:
            new_cols.append(str(col))

    df.columns = new_cols
    return df


def _normalize_columns(df: pd.DataFrame) -> pd.DataFrame:
    """Standardize column names to Title Case and ensure required OHLCV columns exist.

    Args:
        df: Input DataFrame.

    Returns:
        pd.DataFrame: DataFrame with normalized columns.
    """
    column_mapping = {
        "open": "Open",
        "high": "High",
        "low": "Low",
        "close": "Close",
        "adj close": "Adj Close",
        "adjclose": "Adj Close",
        "volume": "Volume",
    }

    renamed = {}
    for col in df.columns:
        cleaned = str(col).strip()
        lower_col = cleaned.lower()
        if lower_col in column_mapping:
            renamed[col] = column_mapping[lower_col]
        else:
            renamed[col] = cleaned.title()

    df = df.rename(columns=renamed)

    # If 'Adj Close' is missing (e.g. crypto or futures), fallback to 'Close'
    if "Adj Close" not in df.columns and "Close" in df.columns:
        df["Adj Close"] = df["Close"]
    elif "Close" not in df.columns and "Adj Close" in df.columns:
        df["Close"] = df["Adj Close"]

    # Reorder if expected columns are present, preserving any extra columns at the end
    present_expected = [c for c in EXPECTED_COLUMNS if c in df.columns]
    extra_cols = [c for c in df.columns if c not in EXPECTED_COLUMNS]
    df = df[present_expected + extra_cols]

    return df


def _validate_and_clean_data(df: pd.DataFrame, symbol: str) -> pd.DataFrame:
    """Validate, clean, and sort market time series data.

    Strict rules applied:
    - Verifies non-empty data.
    - Flattens MultiIndex columns.
    - Normalizes column names.
    - Converts index to timezone-naive UTC/standard DatetimeIndex.
    - Sorts chronologically.
    - Removes duplicate timestamps.
    - Removes rows where all OHLC values are NaN (without fabricating or blindly forward-filling).

    Args:
        df: Raw DataFrame from yfinance.
        symbol: Ticker symbol.

    Returns:
        pd.DataFrame: Validated, cleaned, and sorted DataFrame.

    Raises:
        ValueError: If data is empty or missing essential price columns.
    """
    if df is None or df.empty:
        raise ValueError(f"No market data returned for symbol '{symbol}'.")

    # Flatten MultiIndex columns if present
    df = _flatten_multiindex_columns(df, symbol)

    # Normalize column names
    df = _normalize_columns(df)

    # Validate essential columns
    essential_cols = ["Open", "High", "Low", "Close"]
    missing_cols = [c for c in essential_cols if c not in df.columns]
    if missing_cols:
        raise ValueError(
            f"Market data for '{symbol}' is missing essential price columns: {missing_cols}"
        )

    # Ensure index is DatetimeIndex
    if not isinstance(df.index, pd.DatetimeIndex):
        df.index = pd.to_datetime(df.index)

    # Make DatetimeIndex timezone-naive for seamless cross-market synchronization
    if df.index.tz is not None:
        df.index = df.index.tz_localize(None)

    df.index.name = "Date"

    # Sort chronologically
    df = df.sort_index(ascending=True)

    # Remove duplicate timestamps (keep first record)
    df = df[~df.index.duplicated(keep="first")]

    # Remove rows where all core OHLC prices are NaN (e.g., non-trading entries)
    df = df.dropna(subset=essential_cols, how="all")

    if df.empty:
        raise ValueError(f"All records for symbol '{symbol}' contain invalid/NaN price data.")

    # Ensure Volume is non-null float/int without fabricating prices
    if "Volume" in df.columns:
        df["Volume"] = df["Volume"].fillna(0)

    return df


def _get_cache_path(
    cache_dir: Path,
    symbol: str,
    interval: str,
    start_date: str,
    end_date: str,
) -> Path:
    """Generate deterministic parquet file path for caching."""
    clean_sym = symbol.replace("=", "_").replace("-", "_").replace("^", "_").replace("/", "_")
    clean_start = str(start_date).replace(":", "-").split(" ")[0]
    clean_end = str(end_date).replace(":", "-").split(" ")[0]
    filename = f"{clean_sym}_{interval}_{clean_start}_{clean_end}.parquet"
    return cache_dir / filename


def _log_download_range(
    symbol: str,
    req_start: str,
    req_end: str,
    df: pd.DataFrame,
    source: str = "download",
) -> None:
    """Print and log requested vs actual received date range in standard format."""
    if df.empty:
        return
    actual_first = df.index.min().strftime("%Y-%m-%d")
    actual_last = df.index.max().strftime("%Y-%m-%d")

    msg = (
        f"\n[QuantX DataLoader] Symbol: {symbol} ({source})\n"
        f"Requested:\n"
        f"{req_start} -> {req_end}\n\n"
        f"Received:\n"
        f"{actual_first} -> {actual_last}\n"
    )
    try:
        print(msg)
    except UnicodeEncodeError:
        print(msg.encode("ascii", "replace").decode("ascii"))
    logger.info(msg.strip())


def fetch_alpaca_market_data(
    symbol: str,
    start_date: str,
    end_date: str,
    interval: str = "1d",
    api_key: Optional[str] = None,
    secret_key: Optional[str] = None,
) -> pd.DataFrame:
    """Fetch standardized OHLCV historical bars from Alpaca Markets Data API.

    Supports US Equities (e.g. NVDA, GLD), and Cryptocurrencies (e.g. BTC/USD).
    Automatically handles pagination, authentication, and normalization.

    Args:
        symbol: Ticker symbol (e.g. 'NVDA', 'BTC-USD', 'GC=F').
        start_date: Start date string ('YYYY-MM-DD').
        end_date: End date string ('YYYY-MM-DD').
        interval: Bar frequency ('1d', '1Day').
        api_key: Optional Alpaca API Key ID (defaults to ALPACA_API_KEY).
        secret_key: Optional Alpaca Secret Key (defaults to ALPACA_SECRET_KEY).

    Returns:
        pd.DataFrame: Cleaned OHLCV DataFrame with unique DatetimeIndex.
    """
    key = api_key or ALPACA_API_KEY
    secret = secret_key or ALPACA_SECRET_KEY

    if not key or not secret:
        raise ValueError("Alpaca API key and Secret key must be configured.")

    headers = {
        "APCA-API-KEY-ID": key,
        "APCA-API-SECRET-KEY": secret,
    }

    sym_upper = symbol.strip().upper()
    is_crypto = "BTC" in sym_upper or "/" in sym_upper or ("USD" in sym_upper and "-" in sym_upper)

    if is_crypto:
        alpaca_sym = "BTC/USD" if "BTC" in sym_upper else sym_upper.replace("-", "/")
        base_url = f"{ALPACA_DATA_URL}/v1beta3/crypto/us/bars"
    else:
        # Gold ETF mapping on Alpaca equity feed -> GLD
        alpaca_sym = "GLD" if sym_upper in ["GC=F", "GOLD"] else sym_upper
        base_url = f"{ALPACA_DATA_URL}/v2/stocks/bars"

    all_bars = []
    page_token = None

    start_iso = start_date if "T" in start_date else f"{start_date}T00:00:00Z"
    end_iso = end_date if "T" in end_date else f"{end_date}T23:59:59Z"
    timeframe = "1Day" if interval.lower() in ["1d", "1day", "d"] else "1Day"

    while True:
        params = {
            "symbols": alpaca_sym,
            "timeframe": timeframe,
            "start": start_iso,
            "end": end_iso,
            "limit": 10000,
        }
        if not is_crypto:
            params["feed"] = "iex"
        if page_token:
            params["page_token"] = page_token

        url = f"{base_url}?{urllib.parse.urlencode(params)}"
        req = urllib.request.Request(url, headers=headers)

        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            bars = data.get("bars", {}).get(alpaca_sym, [])
            if not bars:
                break
            all_bars.extend(bars)
            page_token = data.get("next_page_token")
            if not page_token:
                break

    if not all_bars:
        raise ValueError(f"No Alpaca market data returned for symbol '{symbol}' ({alpaca_sym}).")

    records = []
    for b in all_bars:
        date_str = b["t"][:10]
        records.append({
            "Date": date_str,
            "Open": float(b["o"]),
            "High": float(b["h"]),
            "Low": float(b["l"]),
            "Close": float(b["c"]),
            "Adj Close": float(b["c"]),
            "Volume": float(b.get("v", 0.0)),
        })

    df = pd.DataFrame(records).set_index("Date")
    df.index = pd.to_datetime(df.index)
    return df


def get_historical_data(
    symbol: str,
    start_date: Optional[Union[str, datetime]] = None,
    end_date: Optional[Union[str, datetime]] = None,
    interval: str = "1d",
    use_cache: bool = True,
    cache_dir: Optional[Union[str, Path]] = None,
    provider: str = "alpaca",
) -> pd.DataFrame:
    """Download historical market data for a given ticker symbol using Alpaca (with fallback).

    Supports arbitrary date ranges. If start_date or end_date is omitted, defaults
    dynamically to the latest ~5 years of historical data ending today.

    Args:
        symbol: Ticker symbol (e.g., 'GC=F', 'BTC-USD', 'NVDA').
        start_date: Start date string ('YYYY-MM-DD') or datetime object (default: ~5 years ago).
        end_date: End date string ('YYYY-MM-DD') or datetime object (default: today).
        interval: Data frequency ('1d', '1wk', '1mo', etc.).
        use_cache: Whether to use disk caching in data/cache (default: True).
        cache_dir: Optional custom cache directory.
        provider: Primary data provider ('alpaca' or 'yfinance').

    Returns:
        pd.DataFrame: Cleaned OHLCV DataFrame sorted chronologically with unique DatetimeIndex.

    Raises:
        ValueError: If symbol is invalid, start > end, or no data is found.
    """
    if not symbol or not isinstance(symbol, str):
        raise ValueError("Symbol must be a non-empty string.")

    # Apply reproducible fixed default date range if start_date or end_date is omitted
    default_start, default_end = get_default_date_range()
    start_str = start_date.strftime("%Y-%m-%d") if isinstance(start_date, datetime) else (start_date or default_start)
    end_str = end_date.strftime("%Y-%m-%d") if isinstance(end_date, datetime) else (end_date or default_end)

    # Validate start/end date logic
    start_dt = pd.to_datetime(start_str)
    end_dt = pd.to_datetime(end_str)
    if start_dt > end_dt:
        raise ValueError(f"start_date ({start_str}) cannot be after end_date ({end_str}).")

    target_cache_dir = Path(cache_dir) if cache_dir else DEFAULT_CACHE_DIR
    target_cache_dir.mkdir(parents=True, exist_ok=True)
    cache_file = _get_cache_path(target_cache_dir, symbol.strip(), interval, start_str, end_str)

    # Check disk cache first
    if use_cache and cache_file.exists():
        try:
            cached_df = pd.read_parquet(cache_file)
            cached_df.index = pd.to_datetime(cached_df.index)
            cached_df = cached_df[(cached_df.index >= start_dt) & (cached_df.index <= end_dt)]
            if not cached_df.empty:
                _log_download_range(symbol.strip(), start_str, end_str, cached_df, source="cache")
                return cached_df
        except Exception as e:
            logger.warning(f"Failed to read cache at {cache_file}: {e}. Downloading fresh data.")

    raw_data = None
    data_source = provider.lower()

    # 1. Authoritative: Download from Alpaca Markets API
    if data_source == "alpaca":
        if not ALPACA_API_KEY or not ALPACA_SECRET_KEY:
            raise ValueError("Alpaca API credentials missing. Set ALPACA_API_KEY and ALPACA_SECRET_KEY.")
        try:
            raw_data = fetch_alpaca_market_data(
                symbol=symbol.strip(),
                start_date=start_str,
                end_date=end_str,
                interval=interval,
            )
        except Exception as e:
            raise RuntimeError(f"Alpaca historical data download failed for '{symbol}': {e}") from e

    # 2. Alternative provider: yfinance (only if explicitly requested)
    elif data_source == "yfinance":
        try:
            raw_data = yf.download(
                tickers=symbol.strip(),
                start=start_str,
                end=end_str,
                interval=interval,
                auto_adjust=False,
                progress=False,
            )
        except Exception as e:
            raise RuntimeError(f"yfinance download failed for '{symbol}': {e}") from e
    else:
        raise ValueError(f"Unsupported data provider '{provider}'. Must be 'alpaca' or 'yfinance'.")

    cleaned_data = _validate_and_clean_data(raw_data, symbol.strip())

    # Strict date window slicing: start_date <= date <= end_date
    cleaned_data = cleaned_data[(cleaned_data.index >= start_dt) & (cleaned_data.index <= end_dt)]
    if cleaned_data.empty:
        raise ValueError(f"No market data available for '{symbol}' within {start_str} to {end_str}.")

    # Log and print requested vs received range
    _log_download_range(symbol.strip(), start_str, end_str, cleaned_data, source=data_source)

    # Persist to disk cache
    if use_cache:
        try:
            cleaned_data.to_parquet(cache_file)
        except Exception as e:
            logger.warning(f"Failed to write cache at {cache_file}: {e}")

    return cleaned_data


def get_default_historical_data(
    symbol: str,
    interval: str = "1d",
    use_cache: bool = True,
) -> pd.DataFrame:
    """Convenience function to automatically retrieve default historical dataset (2021-09-20 to 2026-09-18).

    Args:
        symbol: Ticker symbol (e.g., 'GC=F', 'BTC-USD', 'NVDA').
        interval: Data frequency ('1d', '1wk', etc.).
        use_cache: Whether to use disk caching (default: True).

    Returns:
        pd.DataFrame: Cleaned OHLCV DataFrame for default period.
    """
    start_date, end_date = get_default_date_range()
    return get_historical_data(
        symbol=symbol,
        start_date=start_date,
        end_date=end_date,
        interval=interval,
        use_cache=use_cache,
    )


def load_asset_data(
    asset_name: str,
    start_date: Optional[Union[str, datetime]] = None,
    end_date: Optional[Union[str, datetime]] = None,
    interval: str = "1d",
    use_cache: bool = True,
) -> pd.DataFrame:
    """Download historical market data using a human-readable asset name or symbol.

    Supported asset names:
    - 'Gold' -> 'GC=F'
    - 'Bitcoin' -> 'BTC-USD'
    - 'NVIDIA' -> 'NVDA'

    Args:
        asset_name: Name of the asset or ticker symbol.
        start_date: Start date string ('YYYY-MM-DD') or datetime object (default: ~5 years ago).
        end_date: End date string ('YYYY-MM-DD') or datetime object (default: today).
        interval: Data frequency ('1d', '1wk', etc.).
        use_cache: Whether to use disk caching (default: True).

    Returns:
        pd.DataFrame: Cleaned OHLCV DataFrame.
    """
    symbol = get_asset_symbol(asset_name)
    return get_historical_data(
        symbol=symbol,
        start_date=start_date,
        end_date=end_date,
        interval=interval,
        use_cache=use_cache,
    )


def load_default_asset_data(
    asset_name: str,
    interval: str = "1d",
    use_cache: bool = True,
) -> pd.DataFrame:
    """Convenience function to load ~5 years of data for a named asset ending today.

    Args:
        asset_name: Asset name ('Gold', 'Bitcoin', 'NVIDIA') or ticker symbol.
        interval: Data frequency ('1d', '1wk', etc.).
        use_cache: Whether to use disk caching (default: True).

    Returns:
        pd.DataFrame: Cleaned 5-year OHLCV DataFrame.
    """
    symbol = get_asset_symbol(asset_name)
    return get_default_historical_data(
        symbol=symbol,
        interval=interval,
        use_cache=use_cache,
    )


class DataLoader:
    """DataLoader class supporting configurable disk caching and multi-asset ingestion."""

    def __init__(self, cache_dir: Optional[Union[str, Path]] = None) -> None:
        """Initialize DataLoader with cache directory."""
        if cache_dir is None:
            self.cache_dir = DEFAULT_CACHE_DIR
        else:
            self.cache_dir = Path(cache_dir)
        self.cache_dir.mkdir(parents=True, exist_ok=True)

    def fetch_data(
        self,
        symbol: str,
        start_date: Optional[Union[str, datetime]] = None,
        end_date: Optional[Union[str, datetime]] = None,
        interval: str = "1d",
        use_cache: bool = True,
    ) -> pd.DataFrame:
        """Fetch historical data with disk caching."""
        return get_historical_data(
            symbol=symbol,
            start_date=start_date,
            end_date=end_date,
            interval=interval,
            use_cache=use_cache,
            cache_dir=self.cache_dir,
        )

    def load_asset(
        self,
        asset_name: str,
        start_date: Optional[Union[str, datetime]] = None,
        end_date: Optional[Union[str, datetime]] = None,
        interval: str = "1d",
        use_cache: bool = True,
    ) -> pd.DataFrame:
        """Load asset data by mapped asset name."""
        symbol = get_asset_symbol(asset_name)
        return self.fetch_data(
            symbol=symbol,
            start_date=start_date,
            end_date=end_date,
            interval=interval,
            use_cache=use_cache,
        )

    def load_default_asset(
        self,
        asset_name: str,
        interval: str = "1d",
        use_cache: bool = True,
    ) -> pd.DataFrame:
        """Load default dataset for named asset."""
        symbol = get_asset_symbol(asset_name)
        start_date, end_date = get_default_date_range()
        return self.fetch_data(
            symbol=symbol,
            start_date=start_date,
            end_date=end_date,
            interval=interval,
            use_cache=use_cache,
        )

    def clear_cache(self) -> None:
        """Clear all cached files in the cache directory."""
        for file in self.cache_dir.glob("*.parquet"):
            file.unlink(missing_ok=True)
        for file in self.cache_dir.glob("*.csv"):
            file.unlink(missing_ok=True)
