"""QuantX Python JSON Subprocess Bridge.

Provides a CLI and JSON IPC interface to execute pure quantitative calculations
from the Node.js Express server using the validated src/ engine.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any, Dict, List

# Add workspace root to sys.path
WORKSPACE_ROOT = Path(__file__).resolve().parent.parent.parent
if str(WORKSPACE_ROOT) not in sys.path:
    sys.path.insert(0, str(WORKSPACE_ROOT))

import numpy as np
import pandas as pd

from src.backtester import BacktestResult, run_backtest
from src.benchmark import BenchmarkAnalysis, compare_strategies_table
from src.data_loader import (
    ASSET_MAPPING,
    DEFAULT_HISTORY_YEARS,
    FIXED_DEFAULT_START,
    FIXED_DEFAULT_END,
    HISTORICAL_UNIVERSE_START,
    HISTORICAL_UNIVERSE_END,
    get_asset_symbol,
    get_default_date_range,
    get_historical_data,
    load_asset_data,
)
from src.indicators import (
    bollinger_bands,
    ema,
    macd,
    rolling_correlation,
    rolling_returns,
    rolling_volatility,
    rsi,
    sma,
)
from src.metrics import (
    Metrics,
    annualized_return,
    annualized_volatility,
    cumulative_returns,
    daily_returns,
    drawdown_series,
    max_drawdown,
    sharpe_ratio,
    total_return,
)
from src.portfolio import PortfolioOptimizer
from src.regime import MarketRegimeDetector
from src.robustness import RobustnessEngine
from src.strategies import (
    EMATrendStrategy,
    MeanReversionStrategy,
    MomentumStrategy,
    SMACrossoverStrategy,
    get_strategy,
)
from src.utils import sanitize_for_json


def serialize_dataframe_to_records(df: pd.DataFrame) -> List[Dict[str, Any]]:
    """Convert DataFrame with DatetimeIndex to JSON-serializable list of dicts."""
    reset_df = df.reset_index()
    records = []
    for r in reset_df.to_dict(orient="records"):
        clean_row = {}
        for k, v in r.items():
            if isinstance(v, (pd.Timestamp, pd.DatetimeIndex, pd.Period)):
                clean_row[k] = v.strftime("%Y-%m-%d")
            elif isinstance(v, float):
                clean_row[k] = None if np.isnan(v) or np.isinf(v) else v
            elif isinstance(v, (np.int64, np.int32)):
                clean_row[k] = int(v)
            else:
                clean_row[k] = v
            records.append(clean_row)
    return records


def serialize_series_to_points(series: pd.Series) -> List[Dict[str, Any]]:
    """Convert Series with DatetimeIndex to [{date: str, value: float}]."""
    points = []
    for dt, val in series.items():
        date_str = dt.strftime("%Y-%m-%d") if isinstance(dt, pd.Timestamp) else str(dt)
        val_float = None if pd.isna(val) or np.isinf(val) else float(val)
        points.append({"date": date_str, "value": val_float})
    return points


def cmd_get_assets() -> Dict[str, Any]:
    """Return available asset metadata with historical universe and fixed default date range."""
    assets = []
    for name, sym in ASSET_MAPPING.items():
        assets.append({
            "name": name,
            "symbol": sym,
            "category": "Crypto" if "BTC" in sym else ("Futures" if "GC" in sym else "Equity"),
            "periods_per_year": 365 if "BTC" in sym else 252,
        })
    default_start, default_end = get_default_date_range()
    return {
        "assets": assets,
        "default_date_range": {"start": default_start, "end": default_end},
        "historical_data_universe": {"start": HISTORICAL_UNIVERSE_START, "end": HISTORICAL_UNIVERSE_END},
        "data_provider": "Alpaca",
    }


def cmd_get_market_data(params: Dict[str, Any]) -> Dict[str, Any]:
    """Fetch OHLCV data, technical indicators, and statistical risk profile."""
    symbol = params.get("symbol", "NVDA")
    start_date = params.get("start_date")
    end_date = params.get("end_date")
    periods = 365 if "BTC" in symbol else 252

    df = get_historical_data(symbol, start_date=start_date, end_date=end_date, use_cache=True)
    close = df["Close"]

    # Compute key indicators
    fast_sma = sma(close, window=20)
    slow_sma = sma(close, window=50)
    fast_ema = ema(close, span=20)
    slow_ema = ema(close, span=50)
    mid_bb, upper_bb, lower_bb = bollinger_bands(close, period=20, num_std=2.0)
    rsi_vals = rsi(close, period=14)
    macd_line, sig_line, macd_hist = macd(close, fast_period=12, slow_period=26, signal_period=9)
    rets = daily_returns(close).dropna()

    var_95 = float(np.percentile(rets, 5.0)) if len(rets) > 0 else 0.0
    cvar_95 = float(rets[rets <= var_95].mean()) if len(rets) > 0 else 0.0

    indicators_df = pd.DataFrame({
        "Close": close,
        "Open": df["Open"],
        "High": df["High"],
        "Low": df["Low"],
        "Volume": df["Volume"],
        "SMA_20": fast_sma,
        "SMA_50": slow_sma,
        "EMA_20": fast_ema,
        "EMA_50": slow_ema,
        "BB_Upper": upper_bb,
        "BB_Lower": lower_bb,
        "BB_Mid": mid_bb,
        "RSI_14": rsi_vals,
        "MACD": macd_line,
        "MACD_Signal": sig_line,
        "MACD_Hist": macd_hist,
    }, index=df.index)

    rolling_vol = (rets.rolling(window=20).std() * np.sqrt(periods)).reindex(df.index)
    rolling_ret = close.pct_change(periods=20).reindex(df.index)

    return {
        "symbol": symbol,
        "dates": [d.strftime("%Y-%m-%d") for d in df.index],
        "open": [float(p) for p in df["Open"].values],
        "high": [float(p) for p in df["High"].values],
        "low": [float(p) for p in df["Low"].values],
        "close": [float(p) for p in df["Close"].values],
        "volume": [float(v) for v in df["Volume"].values],
        "sma_20": [None if pd.isna(v) else float(v) for v in fast_sma.values],
        "sma_50": [None if pd.isna(v) else float(v) for v in slow_sma.values],
        "ema_20": [None if pd.isna(v) else float(v) for v in fast_ema.values],
        "rolling_vol_20": [None if pd.isna(v) else float(v) for v in rolling_vol.values],
        "rolling_returns_20": [None if pd.isna(v) else float(v) for v in rolling_ret.values],
        "records": serialize_dataframe_to_records(indicators_df),
        "statistics": {
            "Total Bars": len(close),
            "Latest Price": float(close.iloc[-1]),
            "Total Return": total_return(rets),
            "CAGR": annualized_return(rets, periods_per_year=periods),
            "Annualized Volatility": annualized_volatility(rets, periods_per_year=periods),
            "Sharpe Ratio": sharpe_ratio(rets, periods_per_year=periods),
            "Max Drawdown": max_drawdown(rets),
            "VaR_95": var_95,
            "CVaR_95": cvar_95,
            "Skewness": float(rets.skew()),
            "Kurtosis": float(rets.kurtosis()),
        },
        "return_distribution": [float(x) for x in rets.values if not np.isnan(x)],
    }


def cmd_get_correlation(params: Dict[str, Any]) -> Dict[str, Any]:
    """Calculate multi-asset return correlation matrix, rolling series, and scatter data."""
    start_date = params.get("start_date")
    end_date = params.get("end_date")
    roll_window = int(params.get("rolling_window", 60))

    rets_dict = {}
    for name, sym in ASSET_MAPPING.items():
        df = get_historical_data(sym, start_date=start_date, end_date=end_date, use_cache=True)
        rets_dict[name] = daily_returns(df["Close"]).dropna()

    aligned = pd.DataFrame(rets_dict).dropna()
    corr_matrix = aligned.corr().to_dict()

    # Rolling correlations
    rolling_pairs = {}
    pairs = [("Bitcoin", "Gold"), ("NVIDIA", "Gold"), ("Bitcoin", "NVIDIA")]
    for a1, a2 in pairs:
        roll_c = rolling_correlation(aligned[a1], aligned[a2], window=roll_window)
        rolling_pairs[f"{a1} vs {a2}"] = serialize_series_to_points(roll_c)

    # Scatter records for regression
    scatter_records = serialize_dataframe_to_records(aligned)

    symbols = list(ASSET_MAPPING.keys())
    corr_df = aligned.corr()
    matrix_2d = [[float(corr_df.loc[r, c]) for c in symbols] for r in symbols]

    nvda_btc_pts = rolling_pairs.get("Bitcoin vs NVIDIA", [])
    rolling_dates = [pt["date"] for pt in nvda_btc_pts]
    rolling_vals = [pt["value"] for pt in nvda_btc_pts]

    return {
        "correlation_matrix": matrix_2d,
        "correlation_matrix_dict": corr_matrix,
        "symbols": symbols,
        "assets": symbols,
        "rolling_correlations": rolling_pairs,
        "rolling_correlation_dates": rolling_dates,
        "rolling_correlation_values": rolling_vals,
        "scatter_records": scatter_records,
    }


def cmd_run_backtest(params: Dict[str, Any]) -> Dict[str, Any]:
    """Execute strategy backtest simulation with lookahead-free t+1 execution."""
    symbol = params.get("symbol", "NVDA")
    start_date = params.get("start_date")
    end_date = params.get("end_date")
    strat_name = params.get("strategy_name", "SMA Crossover")
    strat_params = params.get("strategy_params", {})
    init_cap = float(params.get("initial_capital", 100_000.0))
    pos_size = float(params.get("position_size", 1.0))
    tc = float(params.get("transaction_cost", 0.001))
    slippage = float(params.get("slippage", 0.0005))
    periods = 365 if "BTC" in symbol else 252

    df = get_historical_data(symbol, start_date=start_date, end_date=end_date, use_cache=True)
    strategy = get_strategy(strat_name, **strat_params)
    signals = strategy.generate_signals(df)

    res: BacktestResult = run_backtest(
        prices=df["Close"],
        signals=signals,
        initial_capital=init_cap,
        position_size=pos_size,
        transaction_cost=tc,
        slippage=slippage,
        periods_per_year=periods,
    )

    # Buy & Hold benchmark
    bh_signals = pd.Series(1.0, index=df.index)
    bh_res: BacktestResult = run_backtest(
        prices=df["Close"],
        signals=bh_signals,
        initial_capital=init_cap,
        position_size=pos_size,
        transaction_cost=tc,
        slippage=slippage,
        periods_per_year=periods,
    )

    strat_rets = daily_returns(res.equity_curve)
    bh_rets = daily_returns(bh_res.equity_curve)
    strat_dd = drawdown_series(strat_rets)
    bh_dd = drawdown_series(bh_rets)

    # Fast / slow indicators for Chart 1
    fast_indicator = None
    slow_indicator = None
    if strat_name == "SMA Crossover":
        fast_indicator = sma(df["Close"], window=strat_params.get("fast_period", 20))
        slow_indicator = sma(df["Close"], window=strat_params.get("slow_period", 50))
    elif strat_name == "EMA Trend":
        fast_indicator = ema(df["Close"], span=strat_params.get("fast_span", 20))
        slow_indicator = ema(df["Close"], span=strat_params.get("slow_span", 50))

    trade_log_records = serialize_dataframe_to_records(res.trade_log)

    return {
        "strategy_name": strat_name,
        "symbol": symbol,
        "initial_capital": init_cap,
        "final_equity": res.final_equity,
        "total_return": res.total_return,
        "metrics": res.performance_metrics,
        "benchmark_metrics": bh_res.performance_metrics,
        "chart_data": {
            "dates": [d.strftime("%Y-%m-%d") for d in df.index],
            "price": [float(p) for p in df["Close"].values],
            "fast_ma": [None if pd.isna(v) else float(v) for v in (fast_indicator.values if fast_indicator is not None else [])],
            "slow_ma": [None if pd.isna(v) else float(v) for v in (slow_indicator.values if slow_indicator is not None else [])],
            "strategy_equity": [float(v) for v in res.equity_curve.values],
            "benchmark_equity": [float(v) for v in bh_res.equity_curve.values],
            "strategy_drawdown": [float(v) for v in strat_dd.values],
            "benchmark_drawdown": [float(v) for v in bh_dd.values],
            "positions": [float(v) for v in res.positions.values],
            "cash": [float(v) for v in res.cash_curve.values],
        },
        "trade_log": trade_log_records,
    }


def cmd_compare_strategies(params: Dict[str, Any]) -> Dict[str, Any]:
    """Generate standardized strategy comparison matrix vs Buy & Hold."""
    symbol = params.get("symbol", "NVDA")
    start_date = params.get("start_date")
    end_date = params.get("end_date")
    init_cap = float(params.get("initial_capital", 100_000.0))
    pos_size = float(params.get("position_size", 1.0))
    tc = float(params.get("transaction_cost", 0.001))
    slippage = float(params.get("slippage", 0.0005))
    periods = 365 if "BTC" in symbol else 252

    df = get_historical_data(symbol, start_date=start_date, end_date=end_date, use_cache=True)
    table_formatted = compare_strategies_table(
        df,
        initial_capital=init_cap,
        position_size=pos_size,
        transaction_cost=tc,
        slippage=slippage,
        periods_per_year=periods,
        formatted=True,
    )
    table_raw = compare_strategies_table(
        df,
        initial_capital=init_cap,
        position_size=pos_size,
        transaction_cost=tc,
        slippage=slippage,
        periods_per_year=periods,
        formatted=False,
    )

    # Multi-strategy equity curves
    strats = {
        "SMA": SMACrossoverStrategy(fast_period=20, slow_period=50),
        "EMA": EMATrendStrategy(fast_span=20, slow_span=50),
        "Momentum": MomentumStrategy(lookback_period=20),
        "Mean Rev.": MeanReversionStrategy(rsi_period=14, oversold=30, exit_rsi=50),
    }
    curves = {}
    for s_name, s_inst in strats.items():
        s_res = run_backtest(df["Close"], s_inst.generate_signals(df), initial_capital=init_cap, periods_per_year=periods)
        curves[s_name] = [float(v) for v in s_res.equity_curve.values]

    bh_res = run_backtest(df["Close"], pd.Series(1.0, index=df.index), initial_capital=init_cap, periods_per_year=periods)
    curves["B&H"] = [float(v) for v in bh_res.equity_curve.values]

    # Alpha & Beta relative metrics
    sma_series = pd.Series(curves["SMA"], index=df.index)
    bh_series = bh_res.equity_curve
    sma_rets = daily_returns(sma_series).dropna()
    bh_rets = daily_returns(bh_series).dropna()

    beta_v = BenchmarkAnalysis.beta(sma_rets, bh_rets)
    alpha_v = BenchmarkAnalysis.alpha(sma_rets, bh_rets, periods_per_year=periods)
    te_v = BenchmarkAnalysis.tracking_error(sma_rets, bh_rets, periods_per_year=periods)
    ir_v = BenchmarkAnalysis.information_ratio(sma_rets, bh_rets, periods_per_year=periods)

    return {
        "matrix": table_raw.to_dict(orient="index"),
        "matrix_formatted": table_formatted.to_dict(orient="index"),
        "matrix_raw": table_raw.to_dict(orient="index"),
        "dates": [d.strftime("%Y-%m-%d") for d in df.index],
        "equity_curves": curves,
        "relative_metrics": {
            "Beta": 0.0 if np.isnan(beta_v) else float(beta_v),
            "Alpha": 0.0 if np.isnan(alpha_v) else float(alpha_v),
            "Tracking Error": 0.0 if np.isnan(te_v) else float(te_v),
            "Information Ratio": 0.0 if np.isnan(ir_v) else float(ir_v),
        },
    }


def cmd_portfolio_simulation(params: Dict[str, Any]) -> Dict[str, Any]:
    """Execute multi-asset portfolio simulation and allocation models."""
    start_date = params.get("start_date")
    end_date = params.get("end_date")
    method = str(params.get("weighting_method") or params.get("allocation_scheme") or "equal").lower()
    raw_weights = params.get("weights") or params.get("custom_weights") or {}
    init_cap = float(params.get("initial_capital", 100_000.0))

    all_data = {}
    for name, sym in ASSET_MAPPING.items():
        all_data[name] = get_historical_data(sym, start_date=start_date, end_date=end_date, use_cache=True)

    rets_dict = {name: daily_returns(d["Close"]).dropna() for name, d in all_data.items() if not d.empty}
    returns_df = pd.DataFrame(rets_dict).dropna()
    asset_names = list(returns_df.columns)

    if "inv" in method:
        weights = PortfolioOptimizer.inverse_volatility_weight(returns_df)
    elif "custom" in method and raw_weights:
        # Map symbol keys to asset names if symbols were passed
        sym_to_name = {sym: name for name, sym in ASSET_MAPPING.items()}
        mapped_weights = {}
        for k, v in raw_weights.items():
            resolved_key = sym_to_name.get(k, k)
            mapped_weights[resolved_key] = float(v)
        
        tot_w = sum(mapped_weights.values())
        if tot_w > 0:
            weights = {k: float(v / tot_w) for k, v in mapped_weights.items()}
        else:
            weights = PortfolioOptimizer.equal_weight(asset_names)
    else:
        weights = PortfolioOptimizer.equal_weight(asset_names)

    port_rets = PortfolioOptimizer.calculate_portfolio_returns(returns_df, weights)
    port_equity = (1.0 + cumulative_returns(port_rets)) * init_cap

    asset_curves = {}
    for name in returns_df.columns:
        asset_curves[name] = [float(v) for v in ((1.0 + cumulative_returns(returns_df[name])) * init_cap).values]

    tot_ret = total_return(port_rets)
    cagr_v = annualized_return(port_rets, periods_per_year=252)
    vol_v = annualized_volatility(port_rets, periods_per_year=252)
    sharpe_v = sharpe_ratio(port_rets, periods_per_year=252)
    max_dd_v = max_drawdown(port_rets)

    return {
        "weights": weights,
        "applied_weights": weights,
        "dates": [d.strftime("%Y-%m-%d") for d in returns_df.index],
        "portfolio_equity": [float(v) for v in port_equity.values],
        "asset_curves": asset_curves,
        "asset_equities": asset_curves,
        "metrics": {
            "CAGR": cagr_v,
            "cagr": cagr_v,
            "Volatility": vol_v,
            "volatility": vol_v,
            "Sharpe Ratio": sharpe_v,
            "sharpe": sharpe_v,
            "Max Drawdown": max_dd_v,
            "max_drawdown": max_dd_v,
            "Total Return": tot_ret,
            "total_return": tot_ret,
            "Final Equity": float(port_equity.iloc[-1]) if len(port_equity) > 0 else init_cap,
        },
    }


def cmd_robustness_monte_carlo(params: Dict[str, Any]) -> Dict[str, Any]:
    """Execute bootstrap Monte Carlo resampling on strategy returns."""
    symbol = params.get("symbol", "NVDA")
    start_date = params.get("start_date")
    end_date = params.get("end_date")
    strat_name = params.get("strategy") or params.get("strategy_name", "SMA Crossover")
    fast_period = int(params.get("fast_period", 20))
    slow_period = int(params.get("slow_period", 50))
    strat_params = {"fast_period": fast_period, "slow_period": slow_period}
    init_cap = float(params.get("initial_capital", 100_000.0))
    num_sims = int(params.get("n_simulations") or params.get("num_simulations", 500))
    periods = 365 if "BTC" in symbol else 252

    df = get_historical_data(symbol, start_date=start_date, end_date=end_date, use_cache=True)
    strat = get_strategy(strat_name, **strat_params)
    res = run_backtest(df["Close"], strat.generate_signals(df), initial_capital=init_cap, periods_per_year=periods)
    strat_rets = daily_returns(res.equity_curve).dropna()

    mc_df = RobustnessEngine.monte_carlo_simulation(strat_rets, num_simulations=num_sims, seed=42)

    p5 = [float(v) for v in (mc_df.quantile(0.05, axis=1) * init_cap).values]
    p50 = [float(v) for v in (mc_df.quantile(0.50, axis=1) * init_cap).values]
    p95 = [float(v) for v in (mc_df.quantile(0.95, axis=1) * init_cap).values]

    sample_paths = []
    for col in range(min(25, mc_df.shape[1])):
        sample_paths.append([float(v) for v in (mc_df[col] * init_cap).values])

    final_vals = mc_df.iloc[-1] * init_cap
    final_equities = [float(x) for x in final_vals.values if not np.isnan(x)]
    prob_profit = float((final_vals > init_cap).mean())

    steps = list(range(len(p50)))

    return {
        "steps": steps,
        "percentile_5": p5,
        "percentile_50": p50,
        "percentile_95": p95,
        "p5": p5,
        "p50": p50,
        "p95": p95,
        "final_equities": final_equities,
        "sample_paths": sample_paths,
        "probability_of_profit": prob_profit,
        "median_ending_value": float(p50[-1]) if p50 else init_cap,
        "best_95pct_outcome": float(p95[-1]) if p95 else init_cap,
        "worst_5pct_outcome": float(p5[-1]) if p5 else init_cap,
        "initial_capital": init_cap,
    }


def cmd_robustness_param_scan(params: Dict[str, Any]) -> Dict[str, Any]:
    """Execute 2D parameter stability grid scan."""
    symbol = params.get("symbol", "NVDA")
    start_date = params.get("start_date")
    end_date = params.get("end_date")
    periods = 365 if "BTC" in symbol else 252

    fast_range = params.get("fast_range") or [5, 10, 15, 20, 25, 30, 40, 50]
    slow_range = params.get("slow_range") or [30, 40, 50, 60, 75, 100, 150, 200]

    df = get_historical_data(symbol, start_date=start_date, end_date=end_date, use_cache=True)

    grid = []
    for f_p in fast_range:
        row = []
        for s_p in slow_range:
            strat = SMACrossoverStrategy(fast_period=f_p, slow_period=s_p)
            bt = run_backtest(df["Close"], strat.generate_signals(df), periods_per_year=periods)
            sharpe_v = bt.performance_metrics.get("Sharpe Ratio", 0.0)
            row.append(0.0 if np.isnan(sharpe_v) else float(sharpe_v))
        grid.append(row)

    return {
        "fast_range": fast_range,
        "slow_range": slow_range,
        "sharpe_grid": grid,
    }


def cmd_market_regimes(params: Dict[str, Any]) -> Dict[str, Any]:
    """Classify Trend, Volatility, and Combined 4-State regimes with statistical thresholds."""
    symbol = params.get("symbol", "BTC-USD")
    start_date = params.get("start_date")
    end_date = params.get("end_date")
    periods = 365 if "BTC" in symbol else 252

    df = get_historical_data(symbol, start_date=start_date, end_date=end_date, use_cache=True)
    rets = daily_returns(df["Close"]).dropna()
    trend_reg = MarketRegimeDetector.trend_regime(df["Close"], fast_period=50, slow_period=200)
    vol_reg = MarketRegimeDetector.volatility_regime(rets, window=20, quantile_threshold=0.75)
    combined_reg = MarketRegimeDetector.combined_regimes(trend_reg, vol_reg)

    rolling_vol = (rets.rolling(window=20).std() * np.sqrt(periods) * 100.0).dropna()

    reg_df = pd.DataFrame({
        "Return": rets,
        "Trend": trend_reg,
        "Vol_Regime": vol_reg,
        "Combined": combined_reg,
    }).dropna()

    # Dimension 1: Trend
    bull_rets = reg_df[reg_df["Trend"] == 1]["Return"]
    bear_rets = reg_df[reg_df["Trend"] == -1]["Return"]

    # Dimension 2: Volatility
    high_vol_rets = reg_df[reg_df["Vol_Regime"] == 1]["Return"]
    low_vol_rets = reg_df[reg_df["Vol_Regime"] == 0]["Return"]

    # Combined 4-State Mutually Exclusive Matrix
    bull_high_rets = reg_df[reg_df["Combined"] == "Bullish + High Vol"]["Return"]
    bull_low_rets = reg_df[reg_df["Combined"] == "Bullish + Low Vol"]["Return"]
    bear_high_rets = reg_df[reg_df["Combined"] == "Bearish + High Vol"]["Return"]
    bear_low_rets = reg_df[reg_df["Combined"] == "Bearish + Low Vol"]["Return"]

    def calc_stats(r: pd.Series) -> Dict[str, Any]:
        return MarketRegimeDetector.calculate_regime_metrics(
            r, periods_per_year=periods, min_observations=60
        )

    total_valid = len(reg_df)
    classified_count = (
        len(bull_high_rets) + len(bull_low_rets) + len(bear_high_rets) + len(bear_low_rets)
    )
    unclassified_count = len(reg_df[reg_df["Trend"] == 0])

    trend_stats = {
        "bullish": calc_stats(bull_rets),
        "bearish": calc_stats(bear_rets),
    }

    vol_stats = {
        "high_vol": calc_stats(high_vol_rets),
        "normal_vol": calc_stats(low_vol_rets),
    }

    combined_stats = {
        "bull_high_vol": calc_stats(bull_high_rets),
        "bull_low_vol": calc_stats(bull_low_rets),
        "bear_high_vol": calc_stats(bear_high_rets),
        "bear_low_vol": calc_stats(bear_low_rets),
    }

    return {
        "dates": [d.strftime("%Y-%m-%d") for d in df.index],
        "price": [float(p) for p in df["Close"].values],
        "trend_regime": [int(v) if not pd.isna(v) else 0 for v in trend_reg.values],
        "volatility_regime": [int(v) if not pd.isna(v) else 0 for v in vol_reg.values],
        "rolling_vol_dates": [d.strftime("%Y-%m-%d") for d in rolling_vol.index],
        "rolling_vol_values": [float(v) for v in rolling_vol.values],
        "meta": {
            "total_observations": total_valid,
            "classified_observations": classified_count,
            "unclassified_lookback_observations": unclassified_count,
            "min_observations_threshold": 60,
        },
        "trend_regimes": trend_stats,
        "volatility_regimes": vol_stats,
        "combined_regimes": combined_stats,
        "breakdown": {
            **trend_stats,
            **vol_stats,
            **combined_stats,
        },
    }


COMMAND_DISPATCH = {
    "get_assets": lambda p: cmd_get_assets(),
    "get_market_data": cmd_get_market_data,
    "get_correlation": cmd_get_correlation,
    "run_backtest": cmd_run_backtest,
    "compare_strategies": cmd_compare_strategies,
    "portfolio_simulation": cmd_portfolio_simulation,
    "robustness_monte_carlo": cmd_robustness_monte_carlo,
    "robustness_param_scan": cmd_robustness_param_scan,
    "market_regimes": cmd_market_regimes,
}


import contextlib
import io


def main() -> None:
    """CLI dispatcher parsing JSON input from stdin or CLI arguments."""
    try:
        if len(sys.argv) > 1:
            raw_input = sys.argv[1]
            payload = json.loads(raw_input)
        else:
            raw_input = sys.stdin.read()
            payload = json.loads(raw_input) if raw_input.strip() else {}

        cmd = payload.get("command", "")
        params = payload.get("params", {})

        if cmd not in COMMAND_DISPATCH:
            raise ValueError(f"Unknown command: '{cmd}'. Available: {list(COMMAND_DISPATCH.keys())}")

        # Redirect any accidental data loader stdout to stderr
        with contextlib.redirect_stdout(sys.stderr):
            result = COMMAND_DISPATCH[cmd](params)

        # Central sanitization guaranteeing RFC 8259 compliance (no NaN or Infinity)
        sanitized_data = sanitize_for_json(result)
        output = {"status": "success", "data": sanitized_data}

        # Print JSON strictly to stdout with allow_nan=False
        sys.stdout.write(json.dumps(output, allow_nan=False) + "\n")
        sys.stdout.flush()

    except Exception as e:
        error_output = {"status": "error", "error": str(e)}
        sys.stdout.write(json.dumps(error_output, allow_nan=False) + "\n")
        sys.stdout.flush()
        sys.exit(1)


if __name__ == "__main__":
    main()
