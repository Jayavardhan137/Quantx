"""Strategy Robustness and Overfitting Diagnostics Engine.

Provides Monte Carlo simulations, parameter perturbation scans, and
walk-forward verification matrices to test strategy stability.
"""

from __future__ import annotations

from typing import Callable, Dict, List, Tuple
import numpy as np
import pandas as pd


class RobustnessEngine:
    """Evaluates strategy robustness against parameter overfitting and data mining bias."""

    @staticmethod
    def monte_carlo_simulation(
        returns: pd.Series,
        num_simulations: int = 1000,
        sample_length: int | None = None,
        seed: int | None = None,
    ) -> pd.DataFrame:
        """Run block/random bootstrap Monte Carlo simulations on return distribution.

        Args:
            returns: Historical strategy returns.
            num_simulations: Number of synthetic return paths to generate.
            sample_length: Length of each simulation path (default is len(returns)).
            seed: Optional random seed for reproducible runs.

        Returns:
            pd.DataFrame: Cumulative return paths of the Monte Carlo simulations.
        """
        if seed is not None:
            np.random.seed(seed)

        clean_returns = returns.dropna().values
        n = sample_length or len(clean_returns)
        if len(clean_returns) == 0:
            return pd.DataFrame()

        simulated_paths = np.empty((n, num_simulations))
        for i in range(num_simulations):
            sampled_returns = np.random.choice(clean_returns, size=n, replace=True)
            simulated_paths[:, i] = np.cumprod(1.0 + sampled_returns)

        return pd.DataFrame(simulated_paths)

    @staticmethod
    def parameter_sensitivity_scan(
        data: pd.DataFrame,
        strategy_class: type,
        param_grid: Dict[str, List[int | float]],
        backtester_fn: Callable[[pd.DataFrame, object], float],
    ) -> pd.DataFrame:
        """Scan parameter combinations and record target performance metric.

        Args:
            data: Market data DataFrame.
            strategy_class: Class of the strategy to instantiate.
            param_grid: Dictionary of parameter names and list of candidate values.
            backtester_fn: Callable taking (data, strategy_instance) returning metric (e.g. Sharpe).

        Returns:
            pd.DataFrame: Parameter scan results table.
        """
        import itertools

        keys = list(param_grid.keys())
        values = list(param_grid.values())
        results = []

        for combo in itertools.product(*values):
            param_dict = dict(zip(keys, combo))
            strat_instance = strategy_class(**param_dict)
            metric_val = backtester_fn(data, strat_instance)
            row = dict(param_dict)
            row["metric"] = metric_val
            results.append(row)

        return pd.DataFrame(results)
