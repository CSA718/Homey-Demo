import numpy as np
import pandas as pd
import pytest

from investbot import backtest
from investbot.backtest import make_folds, metrics, precompute_targets, simulate, walk_forward
from investbot.strategy import compute_target_weights, params_with

from .conftest import synthetic_prices


def test_trend_filter_reduces_exposure(cfg):
    df = synthetic_prices(cfg, years=2)
    df["VTI"] = np.linspace(200, 100, len(df))  # steady downtrend
    on = compute_target_weights(df, cfg, params_with(cfg, trend_off_multiplier=0.5, target_vol=0.99))
    off = compute_target_weights(df, cfg, params_with(cfg, trend_filter=False, target_vol=0.99))
    assert on.weights["VTI"] < off.weights["VTI"]
    assert "below 200d MA" in on.reasons["VTI"]


def test_vol_targeting_never_levers_up(cfg):
    df = synthetic_prices(cfg, years=2)
    a = compute_target_weights(df, cfg, params_with(cfg, target_vol=0.95))
    assert a.scale == 1.0 and sum(a.weights.values()) <= 1.0
    lo = compute_target_weights(df, cfg, params_with(cfg, target_vol=0.03))
    assert lo.scale < 1 and sum(lo.weights.values()) < sum(a.weights.values())


def test_targets_respect_caps(cfg):
    df = synthetic_prices(cfg, years=2)
    w = compute_target_weights(df, cfg).weights
    assert w["BTC/USD"] + w["ETH/USD"] <= cfg.risk.max_crypto_pct + 1e-9
    assert max(w.values()) <= cfg.risk.max_single_asset_pct + 1e-9
    assert sum(w.values()) <= 1 - cfg.strategy.cash_buffer + 1e-9


def test_missing_history_means_zero_weight(cfg):
    df = synthetic_prices(cfg, years=2)
    df.loc[: df.index[-50], "ETH/USD"] = np.nan
    a = compute_target_weights(df, cfg)
    assert a.weights["ETH/USD"] == 0 and "insufficient" in a.reasons["ETH/USD"]


def test_no_lookahead(cfg):
    """Changing prices ON the rebalance day must not change that day's targets."""
    df = synthetic_prices(cfg, years=3)
    d = backtest.month_starts(df.index)[-3]
    t1 = precompute_targets(df, cfg, cfg.strategy, [d])[d][0]
    df2 = df.copy()
    df2.loc[d:, :] *= 0.5
    t2 = precompute_targets(df2, cfg, cfg.strategy, [d])[d][0]
    assert t1 == t2


def test_costs_reduce_returns(cfg):
    import dataclasses
    df = synthetic_prices(cfg, years=4)
    rd = backtest.month_starts(df.index)[10:]
    tg = precompute_targets(df, cfg, cfg.strategy, rd)
    with_costs = simulate(df, cfg, tg, rd[0], df.index[-1], 5000)
    free = dataclasses.replace(cfg, costs=dataclasses.replace(cfg.costs, equity_fee_bps=0, equity_slippage_bps=0,
                                                              crypto_fee_bps=0, crypto_slippage_bps=0))
    no_costs = simulate(df, free, tg, rd[0], df.index[-1], 5000)
    assert with_costs.costs_paid > 0
    assert with_costs.equity.iloc[-1] < no_costs.equity.iloc[-1]


def test_simulation_never_levers_or_shorts(cfg):
    df = synthetic_prices(cfg, years=4, seed=3)
    rd = backtest.month_starts(df.index)[10:]
    tg = precompute_targets(df, cfg, cfg.strategy, rd)
    r = simulate(df, cfg, tg, rd[0], df.index[-1], 5000)
    assert len(r.trades) > 0 and (r.equity > 0).all()
    assert not r.rejected  # the strategy never even proposed an order the risk gate had to block
    # replay the trade list: unit holdings never go negative (no shorts)
    units = {}
    for t in r.trades:
        px = df.loc[t["date"], t["symbol"]]
        units[t["symbol"]] = units.get(t["symbol"], 0) + (1 if t["side"] == "buy" else -1) * t["notional"] / px
        assert units[t["symbol"]] > -1e-6


def test_align_prices_puts_crypto_on_stock_calendar(cfg):
    from investbot.data import align_prices
    days = pd.date_range("2024-01-01", "2024-01-14", freq="D", tz="UTC")
    stock_days = pd.bdate_range("2024-01-01", "2024-01-12").tz_localize("UTC") + pd.Timedelta(hours=5)
    raw = pd.concat([
        pd.DataFrame({s: 100.0 for s in ["VTI", "VXUS", "BND", "GLD"]}, index=stock_days),
        pd.DataFrame({"BTC/USD": range(len(days)), "ETH/USD": 1.0}, index=days),
    ], axis=1, sort=True)
    out = align_prices(raw, cfg)
    assert list(out.columns) == cfg.symbols
    assert out.index.dayofweek.max() < 5          # only trading days
    assert out.loc["2024-01-08", "BTC/USD"] == 7  # Monday uses Monday's crypto close, weekend rolled in


def test_folds_are_out_of_sample(cfg):
    idx = pd.bdate_range("2012-01-02", "2024-12-31")
    folds = make_folds(idx, idx[0], 3, 1)
    assert len(folds) >= 9
    for f in folds:
        assert f.train_end < f.test_start
    for a, b in zip(folds, folds[1:]):
        assert a.test_end < b.test_start  # test windows don't overlap


def test_metrics_known_series():
    idx = pd.bdate_range("2020-01-01", periods=253)
    eq = pd.Series(np.linspace(100, 110, 253), index=idx)
    m = metrics(eq)
    assert m["cagr"] == pytest.approx(0.10, abs=1e-3)
    assert m["max_drawdown"] == 0
    dd = pd.Series([100, 120, 60, 90], index=idx[:4], dtype=float)
    assert metrics(dd)["max_drawdown"] == pytest.approx(-0.5)


def test_walk_forward_end_to_end_runs(cfg):
    """Smoke test of the full pipeline on SYNTHETIC data (checks plumbing, not performance)."""
    import dataclasses
    small = dataclasses.replace(cfg, backtest={**cfg.backtest, "grid_target_vol": [0.08, 0.12],
                                               "grid_trend_off_multiplier": [0.5, 1.0]})
    df = synthetic_prices(small, years=7, seed=1)
    res = walk_forward(df, small, progress=lambda *_: None)
    text, summary = backtest.build_report(res, small, "synthetic test data")
    assert "Verdict" in text and summary["verdict"]
    assert res["walk_forward"].equity.index[0] == res["oos_start"]
    assert len(res["folds"]) >= 2


def test_overfit_warning_fires_when_oos_collapses(cfg):
    """Fabricate a case where IS Sharpe is great and OOS is poor; the verdict must say so."""
    idx = pd.bdate_range("2018-01-01", periods=252 * 6)
    rng = np.random.default_rng(0)
    bad = pd.Series(5000 * np.exp(np.cumsum(rng.normal(0, 0.01, len(idx)))), index=idx)
    bm = pd.Series(5000 * np.exp(np.cumsum(rng.normal(0.0004, 0.01, len(idx)))), index=idx)
    R = backtest.SimResult
    folds = [backtest.Fold(idx[0], idx[1], idx[2], idx[3], {"target_vol": v, "trend_off_multiplier": 0.5}, 2.5,
                           {"a": 2.5, "b": 0.5}) for v in (0.08, 0.15, 0.08, 0.15)]
    res = {"folds": folds, "walk_forward": R(bad), "fixed_default": R(bad), "benchmark": R(bm),
           "benchmark_symbol": "VTI", "policy_buy_hold": R(bm), "oos_start": idx[0], "oos_end": idx[-1],
           "grid_size": 12}
    warnings, verdict = backtest.overfit_diagnostics(res)
    assert verdict.startswith("LOOKS OVERFIT")
    assert any("Unstable parameters" in w for w in warnings)
