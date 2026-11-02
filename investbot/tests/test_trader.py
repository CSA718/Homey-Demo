"""End-to-end daily runs against a fake broker: limits hold through the whole loop."""
import json
from datetime import date, datetime, timedelta

import pytest

from investbot import trader
from investbot.trader import RolloutError, check_rollout, record_paper_run, run_daily

from .conftest import FakeBroker, synthetic_prices

NOW = datetime(2026, 11, 2, 10, 30, tzinfo=trader.NY)


def prices_loader(cfg):
    df = synthetic_prices(cfg, years=2, start="2024-10-01")
    return lambda: df


def test_first_run_buys_within_all_caps(cfg, alerter):
    b = FakeBroker(cfg)
    res = run_daily(cfg, b, alerter, prices_loader(cfg), now=NOW)
    assert res.status == "traded"
    assert all(o.side == "buy" for o in b.submitted)
    acct = b.get_account()
    assert acct.cash >= 0  # no leverage
    w = {s: q * b.prices[s] / acct.equity for s, q in b.positions.items()}
    assert max(w.values()) <= cfg.risk.max_single_asset_pct + 1e-3
    assert w.get("BTC/USD", 0) + w.get("ETH/USD", 0) <= cfg.risk.max_crypto_pct + 1e-3
    # every trade logged with a reason, every trade alerted
    lines = (cfg.logs_dir / "trades.jsonl").read_text().splitlines()
    assert len(lines) == len(b.submitted)
    assert all(json.loads(l)["reason"] for l in lines)
    assert sum("BUY" in a for a in alerter.sent) == len(b.submitted)


def test_kill_switch_stops_run_before_any_order(cfg, alerter):
    cfg.kill_switch_path.write_text("x")
    b = FakeBroker(cfg)
    res = run_daily(cfg, b, alerter, prices_loader(cfg), now=NOW)
    assert res.status == "halted" and not b.submitted and b.cancelled == 1


def test_kill_switch_mid_run_stops_remaining_orders(cfg, alerter):
    b = FakeBroker(cfg)
    b.on_submit = lambda o: cfg.kill_switch_path.write_text("x")
    res = run_daily(cfg, b, alerter, prices_loader(cfg), now=NOW)
    assert len(b.submitted) == 1
    assert res.status == "halted"


def test_daily_loss_limit_halts_and_no_orders(cfg, alerter):
    b = FakeBroker(cfg, equity=4700, last_equity=5000)  # -6%
    res = run_daily(cfg, b, alerter, prices_loader(cfg), now=NOW)
    assert res.status == "halted" and not b.submitted and b.cancelled == 1
    assert any("DAILY LOSS" in a for a in alerter.sent)
    # next day, even with no loss, still halted until `resume`
    b2 = FakeBroker(cfg)
    assert run_daily(cfg, b2, alerter, prices_loader(cfg), now=NOW + timedelta(days=1)).status == "halted"
    assert not b2.submitted


def test_loss_just_under_limit_does_not_halt(cfg, alerter):
    b = FakeBroker(cfg, equity=4760, last_equity=5000)  # -4.8%
    assert run_daily(cfg, b, alerter, prices_loader(cfg), now=NOW).status != "halted"


def test_big_move_alerts(cfg, alerter):
    b = FakeBroker(cfg, equity=5000, last_equity=4700)  # +6.4% portfolio
    b.change_today = {"BTC/USD": -0.08}
    b.positions = {"BTC/USD": 1.0}
    b._cash = 4900
    run_daily(cfg, b, alerter, prices_loader(cfg), now=NOW)
    assert any("portfolio moved" in a for a in alerter.sent)
    assert any("BTC/USD moved -8.00%" in a for a in alerter.sent)


def test_crypto_rally_over_cap_gets_trimmed_between_rebalances(cfg, alerter):
    trader._set_last_rebalance(cfg, "paper", NOW.date())  # not a rebalance day
    b = FakeBroker(cfg, cash=3000, positions={"VTI": 10, "BTC/USD": 10})  # BTC 1000/5000 = ... make it 25%
    b.positions["BTC/USD"] = 12.5  # 1250 / 5250 = 23.8%
    run_daily(cfg, b, alerter, prices_loader(cfg), now=NOW)
    sold = [o for o in b.submitted if o.symbol == "BTC/USD" and o.side == "sell"]
    assert sold and "cap trim" in sold[0].reason
    eq = b.get_account().equity
    assert b.positions["BTC/USD"] * 100 / eq <= cfg.risk.max_crypto_pct


def test_market_closed_means_no_orders(cfg, alerter):
    b = FakeBroker(cfg, market_open=False)
    assert run_daily(cfg, b, alerter, prices_loader(cfg), now=NOW).status == "market_closed"
    assert not b.submitted


def test_wrong_account_guard(cfg, alerter):
    b = FakeBroker(cfg, equity=100_000)  # e.g. default Alpaca paper balance
    assert run_daily(cfg, b, alerter, prices_loader(cfg), now=NOW).status == "blocked"
    assert not b.submitted


def test_positions_outside_universe_never_touched(cfg, alerter):
    b = FakeBroker(cfg, prices={**{s: 100.0 for s in cfg.symbols}, "TSLA": 100.0})
    b.positions = {"TSLA": 5}
    b._cash = 4500
    run_daily(cfg, b, alerter, prices_loader(cfg), now=NOW)
    assert all(o.symbol != "TSLA" for o in b.submitted)


# ---- rollout gates ---------------------------------------------------------------

def _fake_backtest(cfg, verdict="No strong sign of overfitting."):
    cfg.reports_dir.mkdir(parents=True, exist_ok=True)
    (cfg.reports_dir / "backtest_20261101_000000.json").write_text(json.dumps({"verdict": verdict}))


def test_no_backtest_no_trading(cfg):
    with pytest.raises(RolloutError, match="backtest"):
        check_rollout(cfg, live=False, today=date(2026, 11, 2))


def test_paper_allowed_after_backtest(cfg):
    _fake_backtest(cfg)
    check_rollout(cfg, live=False, today=date(2026, 11, 2))


def test_live_refused_without_30_days_paper(cfg):
    _fake_backtest(cfg)
    start = date(2026, 10, 10)
    for i in range(20):
        record_paper_run(cfg, start + timedelta(days=i))
    with pytest.raises(RolloutError, match="Need 30 days"):
        check_rollout(cfg, live=True, today=date(2026, 11, 2))  # 23 days


def test_live_refused_with_too_few_runs(cfg):
    _fake_backtest(cfg)
    record_paper_run(cfg, date(2026, 9, 1))
    with pytest.raises(RolloutError):
        check_rollout(cfg, live=True, today=date(2026, 11, 2))


def test_live_allowed_after_30_days_paper(cfg):
    _fake_backtest(cfg)
    start = date(2026, 9, 1)
    for i in range(0, 45, 2):
        record_paper_run(cfg, start + timedelta(days=i))
    check_rollout(cfg, live=True, today=date(2026, 11, 2))


def test_live_refused_if_backtest_looks_overfit(cfg):
    _fake_backtest(cfg, verdict="LOOKS OVERFIT - do not trade")
    for i in range(40):
        record_paper_run(cfg, date(2026, 9, 1) + timedelta(days=i))
    with pytest.raises(RolloutError, match="OVERFIT"):
        check_rollout(cfg, live=True, today=date(2026, 11, 2))


def test_paper_is_default_and_live_needs_flag(monkeypatch, cfg):
    from investbot import cli

    seen = {}

    class B:
        def __init__(self, cfg, key, secret, paper):
            seen["paper"] = paper
            seen["key"] = key

    monkeypatch.setattr("investbot.broker.AlpacaBroker", B)
    monkeypatch.setattr(trader, "check_rollout", lambda *a, **k: None)
    monkeypatch.setattr(trader, "run_daily", lambda *a, **k: trader.RunResult("no_trades"))
    monkeypatch.setenv("ALPACA_PAPER_API_KEY", "pk"); monkeypatch.setenv("ALPACA_PAPER_SECRET_KEY", "ps")
    monkeypatch.setenv("ALPACA_LIVE_API_KEY", "lk"); monkeypatch.setenv("ALPACA_LIVE_SECRET_KEY", "ls")
    monkeypatch.setattr(cli, "load_config", lambda p=None: cfg)
    assert cli.main(["run"]) == 0 and seen == {"paper": True, "key": "pk"}
    assert cli.main(["run", "--live"]) == 0 and seen == {"paper": False, "key": "lk"}


def test_live_flag_refused_by_real_gate(monkeypatch, cfg):
    from investbot import cli

    monkeypatch.setattr(cli, "load_config", lambda p=None: cfg)
    _fake_backtest(cfg)
    monkeypatch.setenv("ALPACA_LIVE_API_KEY", "lk"); monkeypatch.setenv("ALPACA_LIVE_SECRET_KEY", "ls")
    assert cli.main(["run", "--live"]) == 2  # no paper history
