"""Data Processing, Validation, and Transformation Module.

Responsible for data cleaning, alignment of multi-asset series, forward-fill handling,
returns computation, and integrity checks to prevent data leaks.
"""

from __future__ import annotations

from typing import List, Optional
import numpy as np
import pandas as pd


class DataProcessor:
    """Processor for cleaning, normalizing, and transforming market time series."""

    @staticmethod
    def clean_ohlcv(df: pd.DataFrame) -> pd.DataFrame:
        """Validate and clean OHLCV data structure.

        Args:
            df: Raw OHLCV DataFrame.

        Returns:
            pd.DataFrame: Cleaned DataFrame with sorted index and validated columns.
        """
        required_cols = {"Open", "High", "Low", "Close", "Volume"}
        available = {c.capitalize(): c for c in df.columns}
        missing = required_cols - set(available.keys())
        if missing:
            raise ValueError(f"Missing required OHLCV columns: {missing}")

        cleaned = df.copy()
        cleaned.index = pd.to_datetime(cleaned.index)
        cleaned = cleaned.sort_index()
        cleaned = cleaned[~cleaned.index.duplicated(keep="first")]
        return cleaned

    @staticmethod
    def compute_returns(
        series: pd.Series,
        method: str = "simple",
    ) -> pd.Series:
        """Compute simple or logarithmic returns from a price series.

        Args:
            series: Price series.
            method: 'simple' for arithmetic returns, 'log' for logarithmic returns.

        Returns:
            pd.Series: Returns series.
        """
        if method == "simple":
            return series.pct_change().fillna(0.0)
        elif method == "log":
            return np.log(series / series.shift(1)).fillna(0.0)
        else:
            raise ValueError(f"Unknown return method: {method}. Choose 'simple' or 'log'.")

    @staticmethod
    def align_series(
        data_dict: dict[str, pd.DataFrame],
        price_col: str = "Close",
    ) -> pd.DataFrame:
        """Align multiple asset price series to a shared, common timestamp index.

        Args:
            data_dict: Dictionary mapping asset ticker to OHLCV DataFrame.
            price_col: Column name to extract for alignment.

        Returns:
            pd.DataFrame: Merged DataFrame of prices indexed by DateTime.
        """
        aligned_cols = {}
        for ticker, df in data_dict.items():
            if price_col in df.columns:
                aligned_cols[ticker] = df[price_col]
            elif price_col.lower() in df.columns:
                aligned_cols[ticker] = df[price_col.lower()]
            else:
                raise KeyError(f"Column '{price_col}' not found in data for {ticker}")

        merged = pd.DataFrame(aligned_cols)
        merged = merged.sort_index().ffill().dropna()
        return merged
