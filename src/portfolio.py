"""Portfolio Management and Asset Allocation Engine.

Tracks cash balances, asset positions, portfolio valuations, and multi-asset weights.
Decoupled from strategy logic and user interface.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, List, Optional
import numpy as np
import pandas as pd


@dataclass
class PortfolioState:
    """Represents portfolio holdings and cash balance at a specific point in time."""

    cash: float
    positions: Dict[str, float]  # Ticker/Asset -> Quantity
    portfolio_value: float
    timestamp: Optional[pd.Timestamp] = None


class Portfolio:
    """Manages cash, position quantities, and portfolio valuation for backtesting and live simulation."""

    def __init__(self, initial_capital: float = 100_000.0) -> None:
        """Initialize portfolio with starting cash balance.

        Args:
            initial_capital: Starting cash balance.

        Raises:
            ValueError: If initial_capital <= 0.
        """
        if initial_capital <= 0:
            raise ValueError(f"Initial capital must be positive, got {initial_capital}.")
        self.initial_capital = float(initial_capital)
        self.cash = float(initial_capital)
        self.positions: Dict[str, float] = {}

    def get_position(self, asset: str) -> float:
        """Get the current held quantity of an asset."""
        return self.positions.get(asset, 0.0)

    def update_position(self, asset: str, quantity: float) -> None:
        """Update position quantity for an asset."""
        if quantity == 0.0:
            self.positions.pop(asset, None)
        else:
            self.positions[asset] = float(quantity)

    def compute_value(self, current_prices: Dict[str, float]) -> float:
        """Compute total current portfolio value: Cash + sum(Quantity * Market Price).

        Args:
            current_prices: Dictionary of asset -> current market price.

        Returns:
            float: Total portfolio valuation.
        """
        holdings_value = 0.0
        for asset, qty in self.positions.items():
            price = current_prices.get(asset, 0.0)
            holdings_value += qty * price
        return float(self.cash + holdings_value)

    def reset(self) -> None:
        """Reset portfolio back to initial cash state."""
        self.cash = float(self.initial_capital)
        self.positions.clear()


class PortfolioOptimizer:
    """Multi-asset portfolio allocation and weighting engine."""

    @staticmethod
    def equal_weight(assets: List[str]) -> Dict[str, float]:
        """Compute 1/N equal weighting for a list of assets."""
        n = len(assets)
        if n == 0:
            return {}
        weight = 1.0 / n
        return {asset: weight for asset in assets}

    @staticmethod
    def inverse_volatility_weight(returns_df: pd.DataFrame) -> Dict[str, float]:
        """Compute inverse-volatility weighting across assets."""
        volatilities = returns_df.std()
        inv_vol = 1.0 / volatilities.replace(0, np.nan)
        inv_vol = inv_vol.fillna(0.0)
        total_inv_vol = inv_vol.sum()
        if total_inv_vol == 0:
            return PortfolioOptimizer.equal_weight(list(returns_df.columns))
        weights = inv_vol / total_inv_vol
        return weights.to_dict()

    @staticmethod
    def calculate_portfolio_returns(
        returns_df: pd.DataFrame,
        weights: Dict[str, float],
    ) -> pd.Series:
        """Calculate weighted portfolio return series."""
        weight_series = pd.Series(weights)
        aligned_weights = weight_series.reindex(returns_df.columns).fillna(0.0)
        total_w = aligned_weights.sum()
        normalized_weights = aligned_weights / total_w if total_w > 0 else aligned_weights
        return returns_df.dot(normalized_weights)
