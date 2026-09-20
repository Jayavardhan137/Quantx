"""QuantX Quantitative Engine Package.

Modular quantitative research, financial analytics, backtesting, and portfolio management.
Financial and quantitative logic is strictly decoupled from presentation layers.
"""

from src import (
    backtester,
    benchmark,
    data_loader,
    data_processor,
    indicators,
    metrics,
    portfolio,
    regime,
    robustness,
    strategies,
    utils,
)

__version__ = "0.1.0"
__all__ = [
    "data_loader",
    "data_processor",
    "indicators",
    "metrics",
    "strategies",
    "backtester",
    "portfolio",
    "benchmark",
    "regime",
    "robustness",
    "utils",
]
