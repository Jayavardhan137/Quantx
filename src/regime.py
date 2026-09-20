"""Market Regime Detection and Classification Module.

Identifies volatility regimes (high vs low volatility) and trend states
(bullish, bearish, sideways) using statistical and quantitative models.
Enforces statistical significance thresholds (min 60 observations) for annualized metrics.
"""

from __future__ import annotations

from typing import Any, Dict, Optional
import numpy as np
import pandas as pd
from src.metrics import (
    annualized_return,
    annualized_volatility,
    daily_returns,
    max_drawdown,
    sharpe_ratio,
    total_return,
)

MIN_REGIME_OBSERVATIONS: int = 60


class MarketRegimeDetector:
    """Detects market regimes based on volatility, trend, and moving averages."""

    @staticmethod
    def volatility_regime(
        returns: pd.Series,
        window: int = 20,
        quantile_threshold: float = 0.75,
    ) -> pd.Series:
        """Classify periods into High Volatility (1) and Low Volatility (0).

        Args:
            returns: Asset returns series.
            window: Rolling window for standard deviation calculation.
            quantile_threshold: Threshold quantile separating high/low vol.

        Returns:
            pd.Series: Binary regime series (1 for High Vol, 0 for Low Vol).
        """
        rolling_vol = returns.rolling(window=window).std()
        threshold = rolling_vol.quantile(quantile_threshold)
        regime = (rolling_vol >= threshold).astype(int)
        return regime

    @staticmethod
    def trend_regime(
        prices: pd.Series,
        fast_period: int = 50,
        slow_period: int = 200,
    ) -> pd.Series:
        """Classify market trend regimes: Bullish (1), Bearish (-1), Neutral (0).

        Args:
            prices: Price series.
            fast_period: Short lookback window (default: 50).
            slow_period: Long lookback window (default: 200).

        Returns:
            pd.Series: Trend regime series (+1, 0, -1).
        """
        fast_ma = prices.rolling(window=fast_period).mean()
        slow_ma = prices.rolling(window=slow_period).mean()

        regime = pd.Series(0, index=prices.index)
        valid_mask = fast_ma.notna() & slow_ma.notna()
        regime[valid_mask & (fast_ma > slow_ma)] = 1
        regime[valid_mask & (fast_ma < slow_ma)] = -1
        return regime

    @staticmethod
    def combined_regimes(
        trend_regime: pd.Series,
        vol_regime: pd.Series,
    ) -> pd.Series:
        """Combine Trend (+1, -1, 0) and Volatility (1, 0) into 4 mutually exclusive states.

        Returns:
            pd.Series: Series containing combined regime state strings.
        """
        combined = pd.Series("Neutral / Lookback", index=trend_regime.index)
        combined[(trend_regime == 1) & (vol_regime == 1)] = "Bullish + High Vol"
        combined[(trend_regime == 1) & (vol_regime == 0)] = "Bullish + Low Vol"
        combined[(trend_regime == -1) & (vol_regime == 1)] = "Bearish + High Vol"
        combined[(trend_regime == -1) & (vol_regime == 0)] = "Bearish + Low Vol"
        return combined

    @staticmethod
    def calculate_regime_metrics(
        returns: pd.Series,
        periods_per_year: int = 252,
        min_observations: int = MIN_REGIME_OBSERVATIONS,
    ) -> Dict[str, Any]:
        """Calculate quantitative metrics for a regime's discrete return observations.

        Enforces minimum observation threshold (default: 60) for annualized metrics (CAGR, Sharpe)
        to prevent misleading annualization from very small samples.

        Args:
            returns: Returns belonging specifically to the regime.
            periods_per_year: Annualization factor (252 for equities/futures, 365 for crypto).
            min_observations: Minimum sample size required to report annualized metrics (default: 60).

        Returns:
            Dict[str, Any]: Dictionary containing samples, total_return, cagr, volatility, sharpe, max_drawdown.
        """
        clean_rets = returns.dropna()
        n = len(clean_rets)

        tot_ret = total_return(clean_rets) if n > 0 else None
        vol = annualized_volatility(clean_rets, periods_per_year=periods_per_year) if n >= 2 else None
        mdd = max_drawdown(clean_rets) if n > 0 else None

        # Only compute CAGR and Sharpe if sample meets statistical threshold (N >= min_observations)
        if n >= min_observations:
            cagr = annualized_return(clean_rets, periods_per_year=periods_per_year)
            sharpe = sharpe_ratio(clean_rets, periods_per_year=periods_per_year)
        else:
            cagr = None
            sharpe = None

        return {
            "samples": n,
            "total_return": tot_ret,
            "cagr": cagr,
            "volatility": vol,
            "sharpe": sharpe,
            "max_drawdown": mdd,
            "statistically_sufficient": bool(n >= min_observations),
            "min_observations_threshold": min_observations,
        }
