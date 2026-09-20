"""QuantX General Utilities and Helper Functions.

Formatting, datetime handling, logging setup, and validation helpers.
"""

from __future__ import annotations

import datetime
import logging
import math
from typing import Any, Dict, List, Optional, Union
import numpy as np
import pandas as pd


def setup_logger(name: str = "QuantX", level: int = logging.INFO) -> logging.Logger:
    """Configure and return a standard formatted logger."""
    logger = logging.getLogger(name)
    if not logger.handlers:
        handler = logging.StreamHandler()
        formatter = logging.Formatter(
            "[%(asctime)s] [%(levelname)s] [%(name)s] %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S",
        )
        handler.setFormatter(formatter)
        logger.addHandler(handler)
    logger.setLevel(level)
    return logger


def sanitize_for_json(value: Any) -> Any:
    """Recursively sanitize Python/pandas/numpy data structures for strict RFC 8259 JSON compliance.

    Guarantees:
    - NaN, Infinity, -Infinity are converted to None (JSON null).
    - Finite floats, integers, booleans, strings are preserved.
    - Zero (0 or 0.0) is strictly preserved as numeric zero (distinct from null).
    - Dicts, lists, tuples, sets, Series, DataFrames, and NumPy arrays are recursively sanitized.
    - Datetime, date, and Timestamp objects are serialized to standard string representations.

    Args:
        value: Any Python object, collection, or numerical scalar.

    Returns:
        JSON-compliant object containing only dicts, lists, strings, numbers (finite), booleans, and None.
    """
    if value is None:
        return None

    # Check for pandas NA / NaT
    if value is pd.NA or value is pd.NaT:
        return None

    # Booleans (check before int because bool is subclass of int)
    if isinstance(value, (bool, np.bool_)):
        return bool(value)

    # Integer types (Python int and numpy integer)
    if isinstance(value, (int, np.integer)):
        return int(value)

    # Float types (Python float and numpy floating)
    if isinstance(value, (float, np.floating)):
        val_float = float(value)
        return val_float if math.isfinite(val_float) else None

    # Strings
    if isinstance(value, str):
        return value

    # Timestamps, dates, datetimes
    if isinstance(value, (pd.Timestamp, datetime.datetime, datetime.date)):
        if isinstance(value, pd.Timestamp) and pd.isna(value):
            return None
        if hasattr(value, "strftime"):
            return value.strftime("%Y-%m-%d")
        return str(value)

    if isinstance(value, pd.Period):
        return str(value)

    # Dict
    if isinstance(value, dict):
        return {str(k): sanitize_for_json(v) for k, v in value.items()}

    # List, tuple, set
    if isinstance(value, (list, tuple, set)):
        return [sanitize_for_json(item) for item in value]

    # Pandas Series
    if isinstance(value, pd.Series):
        return [sanitize_for_json(item) for item in value]

    # Pandas DataFrame
    if isinstance(value, pd.DataFrame):
        reset_df = value.reset_index() if not isinstance(value.index, pd.RangeIndex) else value
        return [
            {str(k): sanitize_for_json(v) for k, v in r.items()}
            for r in reset_df.to_dict(orient="records")
        ]

    # NumPy ndarray
    if isinstance(value, np.ndarray):
        return [sanitize_for_json(item) for item in value.tolist()]

    # Objects with to_dict method
    try:
        if hasattr(value, "to_dict") and callable(getattr(value, "to_dict")):
            return sanitize_for_json(value.to_dict())
    except Exception:
        pass

    return str(value)


def format_percentage(value: float, decimals: int = 2) -> str:
    """Format float as percentage string."""
    if np.isnan(value):
        return "N/A"
    return f"{value * 100:.{decimals}f}%"


def format_currency(value: float, decimals: int = 2, currency_symbol: str = "$") -> str:
    """Format float as currency string."""
    if np.isnan(value):
        return "N/A"
    return f"{currency_symbol}{value:,.{decimals}f}"


def ensure_datetime_index(df: pd.DataFrame) -> pd.DataFrame:
    """Ensure DataFrame index is sorted DatetimeIndex."""
    if not isinstance(df.index, pd.DatetimeIndex):
        df.index = pd.to_datetime(df.index)
    df = df.sort_index()
    return df
