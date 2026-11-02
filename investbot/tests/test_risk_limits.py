"""One test (or more) per hard limit. If any of these fail, do not run the bot."""
import dataclasses

import pytest

from investbot.config import ConfigError, load_config, validate_config, DEFAULT_CONFIG
from investbot.risk import (
    Holding, Order, PortfolioState, RiskManager, RiskViolation, cap_breaches, clip_weights,
    daily_loss_breached,
)


def state(cash=5000.0, **pos):
    """pos: symbol=(qty, price). Use BTC=... for BTC/USD."""
    m = {"BTC": "BTC/USD", "ETH": "ETH/USD"}
    return PortfolioState(cash=cash, positions={m.get(k, k): Holding(*v) for k, v in pos.items()})


def buy(sym, notional, price=100.0):
    return Order(sym, "buy", "test", notional=notional, est_price=price)


def sell(sym, qty, price=100.0):
    return Order(sym, "sell", "test", qty=qty, est_price=price)


# ---- the user's configured numbers are what's loaded ------------------------

def test_config_has_user_limits(cfg):
    assert cfg.capital == 5000
    assert cfg.risk.max_crypto_pct == 0.20
    assert cfg.risk.max_single_asset_pct == 0.60
    assert cfg.risk.daily_loss_limit_pct == 0.05
    assert cfg.alert_move_threshold_pct == 0.05


# ---- no shorting ------------------------------------------------------------

def test_sell_more_than_held_is_blocked(cfg):
    rm = RiskManager(cfg)
    d = rm.check_order(sell("VTI", 11), state(VTI=(10, 100)))
    assert not d.ok and "short" in d.reason


def test_sell_without_position_is_blocked(cfg):
    d = RiskManager(cfg).check_order(sell("VTI", 1), state())
    assert not d.ok and "short" in d.reason


def test_sell_exactly_held_is_allowed(cfg):
    assert RiskManager(cfg).check_order(sell("VTI", 10), state(VTI=(10, 100))).ok


def test_negative_weights_clipped_to_zero(cfg):
    assert clip_weights({"VTI": -0.3, "BND": 0.2}, cfg)["VTI"] == 0.0


def test_config_with_negative_weight_rejected(cfg):
    bad = dataclasses.replace(cfg, assets=tuple(
        dataclasses.replace(a, weight=-0.1) if a.symbol == "GLD" else a for a in cfg.assets))
    with pytest.raises(ConfigError, match="short"):
        validate_config(bad)


# ---- no margin / no leverage --------------------------------------------------

def test_buy_exceeding_cash_is_blocked(cfg):
    d = RiskManager(cfg).check_order(buy("VTI", 1001), state(cash=1000, BND=(40, 100)))
    assert not d.ok and "no margin" in d.reason


def test_buy_uses_cash_not_buying_power(cfg):
    # a negative cash balance (as a margin account could show) blocks all buys
    d = RiskManager(cfg).check_order(buy("BND", 10), state(cash=-50, VTI=(10, 100)))
    assert not d.ok


def test_weights_never_sum_above_one(cfg):
    w = clip_weights({"VTI": 0.6, "VXUS": 0.6, "BND": 0.6}, cfg)
    assert sum(w.values()) <= 1.0 + 1e-12


def test_config_weights_over_100pct_rejected(cfg):
    bad = dataclasses.replace(cfg, assets=tuple(dataclasses.replace(a, weight=0.5) for a in cfg.assets))
    with pytest.raises(ConfigError, match="leverage"):
        validate_config(bad)


# ---- no options / allow-list only ---------------------------------------------

def test_option_symbol_blocked(cfg):
    d = RiskManager(cfg).check_order(buy("AAPL240119C00150000", 10), state())
    assert not d.ok and "option" in d.reason


def test_option_asset_class_blocked(cfg):
    o = buy("VTI", 10)
    o.asset_class = "us_option"
    d = RiskManager(cfg).check_order(o, state())
    assert not d.ok and "forbidden" in d.reason


def test_symbol_outside_universe_blocked(cfg):
    d = RiskManager(cfg).check_order(buy("TSLA", 10), state())
    assert not d.ok and "universe" in d.reason


def test_unknown_side_blocked(cfg):
    o = Order("VTI", "sell_short", "x", qty=1, est_price=100)
    assert not RiskManager(cfg).check_order(o, state(VTI=(10, 100))).ok


def test_options_asset_class_rejected_in_config(cfg):
    bad = dataclasses.replace(cfg, assets=tuple(
        dataclasses.replace(a, asset_class="us_option") if a.symbol == "GLD" else a for a in cfg.assets))
    with pytest.raises(ConfigError, match="not allowed"):
        validate_config(bad)


# ---- crypto cap (20%) -----------------------------------------------------------

def test_crypto_buy_over_cap_blocked(cfg):
    # equity 5000, already 900 in BTC (18%); +200 ETH -> 22% > 20%
    s = state(cash=4100, BTC=(9, 100))
    d = RiskManager(cfg).check_order(buy("ETH/USD", 200), s)
    assert not d.ok and "crypto cap" in d.reason


def test_crypto_buy_under_cap_allowed(cfg):
    s = state(cash=4100, BTC=(9, 100))
    assert RiskManager(cfg).check_order(buy("ETH/USD", 50), s).ok


def test_crypto_weights_clipped_to_cap(cfg):
    w = clip_weights({"VTI": 0.4, "BTC/USD": 0.3, "ETH/USD": 0.2}, cfg)
    assert w["BTC/USD"] + w["ETH/USD"] == pytest.approx(0.20)
    assert w["VTI"] == pytest.approx(0.4)  # excess goes to cash, not to other assets


def test_crypto_cap_breach_detected(cfg):
    assert any("crypto" in m for m in cap_breaches(state(cash=3900, BTC=(11, 100)), cfg))


# ---- single-asset cap (60%) -------------------------------------------------------

def test_single_asset_buy_over_cap_blocked(cfg):
    s = state(cash=2500, VTI=(25, 100))  # 50% VTI
    d = RiskManager(cfg).check_order(buy("VTI", 600), s)  # -> 62%
    assert not d.ok and "single-asset cap" in d.reason


def test_single_asset_weights_clipped(cfg):
    assert clip_weights({"VTI": 0.9}, cfg)["VTI"] == pytest.approx(0.60)


# ---- daily loss limit (5%) ---------------------------------------------------------

def test_daily_loss_threshold_math():
    assert daily_loss_breached(9500, 10000, 0.05)
    assert not daily_loss_breached(9501, 10000, 0.05)
    assert not daily_loss_breached(10500, 10000, 0.05)


def test_daily_loss_latches_and_blocks_every_order(cfg):
    rm = RiskManager(cfg)
    assert rm.check_daily_loss(equity=4700, last_equity=5000)  # -6%
    assert rm.halt_path.exists()
    d = rm.check_order(sell("VTI", 1), state(VTI=(10, 100)))
    assert not d.ok and "daily loss" in d.reason
    # still halted on a fresh RiskManager (i.e. next day's run) until manually resumed
    assert RiskManager(cfg).halted_reason()
    rm.clear_halt()
    assert RiskManager(cfg).check_order(sell("VTI", 1), state(VTI=(10, 100))).ok


# ---- kill switch -------------------------------------------------------------------

def test_kill_switch_blocks_everything(cfg):
    rm = RiskManager(cfg)
    cfg.kill_switch_path.write_text("stop")
    for o, s in [(buy("VTI", 10), state()), (sell("VTI", 1), state(VTI=(10, 100)))]:
        d = rm.check_order(o, s)
        assert not d.ok and "kill switch" in d.reason
    with pytest.raises(RiskViolation):
        rm.require(buy("VTI", 10), state())
    cfg.kill_switch_path.unlink()
    assert rm.check_order(buy("VTI", 10), state()).ok


def test_corrupt_halt_file_still_halts(cfg):
    rm = RiskManager(cfg)
    rm.state_dir.mkdir(parents=True)
    rm.halt_path.write_text("{not json")
    assert rm.halted_reason()


def test_shipped_config_is_valid():
    validate_config(load_config(DEFAULT_CONFIG))
