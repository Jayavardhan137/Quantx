"""Unit Tests for Strategy-Independent Backtesting Engine.

Mandatory test cases:
1. No signals.
2. One buy.
3. Buy followed by sell.
4. Transaction costs reduce performance.
5. Slippage affects execution.
6. Initial capital is preserved correctly.
7. Signal at t executes at t+1.
8. Changing transaction cost changes final equity.
9. Changing position size changes final equity.
"""

import numpy as np
import pandas as pd
import pytest
from src.backtester import Backtester, BacktestResult, run_backtest


@pytest.fixture
def sample_market_data() -> pd.DataFrame:
    """Fixture providing 5 days of predictable prices."""
    dates = pd.date_range("2024-01-01", periods=5, freq="D")
    prices = pd.Series([100.0, 110.0, 120.0, 105.0, 115.0], index=dates, name="Close")
    return prices


# 1. No signals test
def test_no_signals(sample_market_data: pd.Series):
    """Test 1: No signals results in 0 trades, 100% cash, and unchanged capital."""
    signals = pd.Series([0, 0, 0, 0, 0], index=sample_market_data.index)
    initial_cap = 100_000.0

    result = run_backtest(
        prices=sample_market_data,
        signals=signals,
        initial_capital=initial_cap,
    )

    assert len(result.trade_log) == 0
    assert result.final_equity == initial_cap
    assert (result.positions == 0.0).all()
    assert (result.cash_curve == initial_cap).all()
    assert (result.equity_curve == initial_cap).all()


# 2. One buy test
def test_one_buy(sample_market_data: pd.Series):
    """Test 2: Single buy signal at t=0 executes at t=1 and is held until the end."""
    signals = pd.Series([1, 1, 1, 1, 1], index=sample_market_data.index)
    initial_cap = 100_000.0

    result = run_backtest(
        prices=sample_market_data,
        signals=signals,
        initial_capital=initial_cap,
        transaction_cost=0.0,
        slippage=0.0,
    )

    assert len(result.trade_log) == 1
    trade = result.trade_log.iloc[0]

    # Signal at day 0 (2024-01-01), executed at day 1 (2024-01-02) at price 110.0
    assert trade["action"] == "BUY"
    assert trade["signal_date"] == sample_market_data.index[0]
    assert trade["execution_date"] == sample_market_data.index[1]
    assert np.isclose(trade["execution_price"], 110.0)

    # Qty = 100,000 / 110.0 = 909.090909
    expected_qty = 100_000.0 / 110.0
    assert np.isclose(trade["quantity"], expected_qty)

    # Final equity at t=4 (price 115.0): qty * 115.0
    expected_final_equity = expected_qty * 115.0
    assert np.isclose(result.final_equity, expected_final_equity)


# 3. Buy followed by sell test
def test_buy_followed_by_sell(sample_market_data: pd.Series):
    """Test 3: Buy signal at t=0 executes at t=1; sell signal at t=2 executes at t=3."""
    signals = pd.Series([1, 1, 0, 0, 0], index=sample_market_data.index)
    initial_cap = 100_000.0

    result = run_backtest(
        prices=sample_market_data,
        signals=signals,
        initial_capital=initial_cap,
        transaction_cost=0.0,
        slippage=0.0,
    )

    assert len(result.trade_log) == 2
    buy_trade = result.trade_log.iloc[0]
    sell_trade = result.trade_log.iloc[1]

    # Buy at t=1 (price 110.0)
    assert buy_trade["action"] == "BUY"
    assert buy_trade["execution_date"] == sample_market_data.index[1]
    assert np.isclose(buy_trade["execution_price"], 110.0)

    # Sell at t=3 (price 105.0)
    assert sell_trade["action"] == "SELL"
    assert sell_trade["execution_date"] == sample_market_data.index[3]
    assert np.isclose(sell_trade["execution_price"], 105.0)

    # Cash returned after sell: (100,000 / 110) * 105 = 95,454.545
    expected_cash = (100_000.0 / 110.0) * 105.0
    assert np.isclose(result.final_equity, expected_cash)
    assert result.positions.iloc[-1] == 0.0


# 4. Transaction costs reduce performance test
def test_transaction_costs_reduce_performance(sample_market_data: pd.Series):
    """Test 4: Higher transaction costs strictly reduce final equity."""
    signals = pd.Series([1, 1, 0, 0, 0], index=sample_market_data.index)

    res_no_cost = run_backtest(
        prices=sample_market_data,
        signals=signals,
        transaction_cost=0.0,
    )
    res_with_cost = run_backtest(
        prices=sample_market_data,
        signals=signals,
        transaction_cost=0.005,  # 0.5% per trade
    )

    assert res_with_cost.final_equity < res_no_cost.final_equity
    assert res_with_cost.trade_log["transaction_cost"].sum() > 0.0


# 5. Slippage affects execution test
def test_slippage_affects_execution(sample_market_data: pd.Series):
    """Test 5: Slippage increases buy execution price and decreases sell execution price."""
    signals = pd.Series([1, 1, 0, 0, 0], index=sample_market_data.index)
    slip_rate = 0.01  # 1% slippage

    res = run_backtest(
        prices=sample_market_data,
        signals=signals,
        transaction_cost=0.0,
        slippage=slip_rate,
    )

    buy_trade = res.trade_log.iloc[0]
    sell_trade = res.trade_log.iloc[1]

    # Market price at t=1 is 110.0 -> buy exec price = 110 * 1.01 = 111.10
    assert np.isclose(buy_trade["execution_price"], 110.0 * (1.0 + slip_rate))

    # Market price at t=3 is 105.0 -> sell exec price = 105 * 0.99 = 103.95
    assert np.isclose(sell_trade["execution_price"], 105.0 * (1.0 - slip_rate))

    assert buy_trade["slippage_cost"] > 0.0
    assert sell_trade["slippage_cost"] > 0.0


# 6. Initial capital is preserved correctly test
def test_initial_capital_preserved(sample_market_data: pd.Series):
    """Test 6: When in cash, initial capital is preserved with zero drift."""
    signals = pd.Series([0, 0, 0, 0, 0], index=sample_market_data.index)
    caps = [10_000.0, 500_000.0, 1_000_000.0]

    for cap in caps:
        res = run_backtest(prices=sample_market_data, signals=signals, initial_capital=cap)
        assert res.final_equity == cap
        assert (res.equity_curve == cap).all()


# 7. Signal at t executes at t+1 test
def test_signal_at_t_executes_at_t_plus_1(sample_market_data: pd.Series):
    """Test 7: Lookahead prevention — signal generated at day t MUST execute on day t+1."""
    # Signal triggers at index 2 (2024-01-03)
    signals = pd.Series([0, 0, 1, 1, 1], index=sample_market_data.index)

    res = run_backtest(
        prices=sample_market_data,
        signals=signals,
        transaction_cost=0.0,
        slippage=0.0,
    )

    trade = res.trade_log.iloc[0]
    assert trade["signal_date"] == sample_market_data.index[2]
    assert trade["execution_date"] == sample_market_data.index[3]

    # At t=0, 1, 2, position MUST be 0.0 (no trade before t+1)
    assert res.positions.iloc[0] == 0.0
    assert res.positions.iloc[1] == 0.0
    assert res.positions.iloc[2] == 0.0
    # Position becomes non-zero only at t=3
    assert res.positions.iloc[3] > 0.0
    # Execution price must be day 3's price (105.0), NOT day 2's price (120.0)
    assert np.isclose(trade["execution_price"], sample_market_data.iloc[3])


# 8. Changing transaction cost changes final equity test
def test_changing_transaction_cost_changes_equity(sample_market_data: pd.Series):
    """Test 8: Parametric sensitivity to transaction costs."""
    signals = pd.Series([1, 1, 0, 0, 0], index=sample_market_data.index)

    res_low_tc = run_backtest(sample_market_data, signals, transaction_cost=0.001)
    res_high_tc = run_backtest(sample_market_data, signals, transaction_cost=0.010)

    assert res_low_tc.final_equity != res_high_tc.final_equity
    assert res_low_tc.final_equity > res_high_tc.final_equity


# 9. Changing position size changes final equity test
def test_changing_position_size_changes_equity(sample_market_data: pd.Series):
    """Test 9: Parametric sensitivity to position sizing fraction."""
    # Profitable trade: buy at t=1 (110), sell at t=2 (120) -> profit
    prices = pd.Series([100.0, 110.0, 120.0, 120.0], index=pd.date_range("2024-01-01", periods=4))
    signals = pd.Series([1, 0, 0, 0], index=prices.index)

    res_full = run_backtest(prices, signals, position_size=1.0)
    res_half = run_backtest(prices, signals, position_size=0.5)

    # 100% allocation achieves higher dollar gain than 50% allocation
    assert res_full.final_equity > res_half.final_equity
    assert res_half.final_equity > res_half.initial_capital
