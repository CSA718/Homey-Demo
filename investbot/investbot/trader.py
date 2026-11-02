"""The once-a-day run: check limits, alert, rebalance if due, log everything."""
from __future__ import annotations

import json
import logging
from dataclasses import dataclass, field
from datetime import date, datetime, timezone
from typing import Callable
from zoneinfo import ZoneInfo

import pandas as pd

from .alerts import Alerter
from .broker import Broker
from .config import Config
from .risk import Holding, Order, PortfolioState, RiskManager, cap_breaches
from .strategy import compute_target_weights, is_rebalance_day, plan_cap_trims, plan_rebalance

log = logging.getLogger(__name__)
NY = ZoneInfo("America/New_York")


class RolloutError(RuntimeError):
    pass


@dataclass
class RunResult:
    status: str                              # "traded" | "no_trades" | "halted" | "market_closed" | "blocked"
    detail: str = ""
    submitted: list[dict] = field(default_factory=list)
    blocked: list[dict] = field(default_factory=list)


# ---------------------------------------------------------------------------
# Rollout gates
# ---------------------------------------------------------------------------

def _paper_file(cfg: Config):
    return cfg.state_dir / "paper_runs.json"


def paper_history(cfg: Config) -> dict:
    f = _paper_file(cfg)
    if f.exists():
        return json.loads(f.read_text())
    return {"first": None, "runs": []}


def record_paper_run(cfg: Config, today: date) -> None:
    h = paper_history(cfg)
    d = today.isoformat()
    h["first"] = h["first"] or d
    if d not in h["runs"]:
        h["runs"].append(d)
    cfg.state_dir.mkdir(parents=True, exist_ok=True)
    _paper_file(cfg).write_text(json.dumps(h, indent=2))


def latest_backtest(cfg: Config) -> tuple[dict, datetime] | None:
    files = sorted(cfg.reports_dir.glob("backtest_*.json")) if cfg.reports_dir.exists() else []
    if not files:
        return None
    f = files[-1]
    return json.loads(f.read_text()), datetime.fromtimestamp(f.stat().st_mtime)


def check_rollout(cfg: Config, live: bool, today: date) -> None:
    bt = latest_backtest(cfg)
    if bt is None:
        raise RolloutError("No backtest report found. Run `python -m investbot backtest` first.")
    summary, when = bt
    age = (datetime.now() - when).days
    if age > cfg.backtest_max_age_days:
        raise RolloutError(f"Latest backtest is {age} days old (max {cfg.backtest_max_age_days}). Re-run it.")
    if not live:
        return
    if summary.get("verdict", "").startswith("LOOKS OVERFIT"):
        raise RolloutError("Latest backtest verdict is LOOKS OVERFIT. Live trading refused.")
    h = paper_history(cfg)
    if not h["first"]:
        raise RolloutError(f"No paper-trading history. Paper trade for {cfg.min_paper_days}+ days first.")
    days = (today - date.fromisoformat(h["first"])).days
    if days < cfg.min_paper_days or len(h["runs"]) < cfg.min_paper_runs:
        raise RolloutError(
            f"Paper trading so far: {days} days / {len(h['runs'])} runs. Need {cfg.min_paper_days} days "
            f"and {cfg.min_paper_runs} runs before --live is allowed."
        )


# ---------------------------------------------------------------------------
# Trade log + rebalance bookkeeping
# ---------------------------------------------------------------------------

def log_trade(cfg: Config, entry: dict) -> None:
    cfg.logs_dir.mkdir(parents=True, exist_ok=True)
    entry = {"ts": datetime.now(timezone.utc).isoformat(), **entry}
    with open(cfg.logs_dir / "trades.jsonl", "a") as f:
        f.write(json.dumps(entry, default=str) + "\n")


def _last_rebalance(cfg: Config, mode: str) -> pd.Timestamp | None:
    f = cfg.state_dir / f"last_rebalance_{mode}.txt"
    return pd.Timestamp(f.read_text().strip()) if f.exists() else None


def _set_last_rebalance(cfg: Config, mode: str, d: date) -> None:
    cfg.state_dir.mkdir(parents=True, exist_ok=True)
    (cfg.state_dir / f"last_rebalance_{mode}.txt").write_text(d.isoformat())


# ---------------------------------------------------------------------------
# The daily run
# ---------------------------------------------------------------------------

def run_daily(
    cfg: Config,
    broker: Broker,
    alerter: Alerter,
    load_prices: Callable[[], pd.DataFrame],
    live: bool = False,
    now: datetime | None = None,
    fill_timeout_s: float = 60,
) -> RunResult:
    mode = "live" if live else "paper"
    now = now or datetime.now(NY)
    today = now.astimezone(NY).date()
    risk = RiskManager(cfg)

    # 1. Kill switch / latched halt: stop before touching anything else.
    halted = risk.halted_reason()
    if halted:
        if risk.kill_switch_active():
            try:
                broker.cancel_all()
            except Exception as e:  # noqa: BLE001
                log.error("cancel_all failed: %s", e)
        alerter.send(f"{mode.upper()}: not trading - {halted}")
        return RunResult("halted", halted)

    # 2. Account sanity.
    acct = broker.get_account()
    if acct.trading_blocked:
        alerter.send(f"{mode.upper()}: Alpaca reports trading blocked on this account. Doing nothing.")
        return RunResult("blocked", "account trading blocked")
    if acct.equity > cfg.capital * cfg.equity_guard_multiple:
        msg = (f"account equity ${acct.equity:,.0f} is more than {cfg.equity_guard_multiple}x the configured "
               f"capital ${cfg.capital:,.0f}. Wrong account? (Reset the paper account balance, or raise "
               f"portfolio.capital.) Doing nothing.")
        alerter.send(f"{mode.upper()}: {msg}")
        return RunResult("blocked", msg)
    for p in broker.enforce_cash_only_settings():
        log.warning(p)
        alerter.send(f"{mode.upper()}: warning - {p} (code-level limits still enforced)")

    # 3. Daily loss limit.
    if risk.check_daily_loss(acct.equity, acct.last_equity):
        try:
            broker.cancel_all()
        except Exception as e:  # noqa: BLE001
            log.error("cancel_all failed: %s", e)
        why = risk.halted_reason()
        alerter.send(f"{mode.upper()}: DAILY LOSS LIMIT HIT - all trading halted",
                     f"{why}\nInspect, then run `python -m investbot resume` to re-enable.")
        return RunResult("halted", why or "daily loss limit")

    # 4. Big-move alerts.
    positions = broker.get_positions()
    th = cfg.alert_move_threshold_pct
    if acct.last_equity > 0:
        chg = acct.equity / acct.last_equity - 1
        if abs(chg) >= th:
            alerter.send(f"{mode.upper()}: portfolio moved {chg:+.2%} today",
                         f"equity ${acct.equity:,.2f} vs ${acct.last_equity:,.2f} at last close")
    for p in positions.values():
        if abs(p.change_today) >= th:
            alerter.send(f"{mode.upper()}: {p.symbol} moved {p.change_today:+.2%} today",
                         f"position ${p.market_value:,.2f}")

    state = PortfolioState(
        cash=acct.cash,
        positions={s: Holding(p.qty, p.price) for s, p in positions.items() if cfg.has_asset(s)},
    )
    others = [s for s in positions if not cfg.has_asset(s)]
    if others:
        log.info("ignoring positions outside the universe (never touched): %s", others)

    # 5. Only trade when the stock market is open (crypto waits too, to keep one schedule).
    if not broker.is_market_open():
        log.info("market closed - monitoring only")
        return RunResult("market_closed", "market closed")

    # 6. Decide.
    prices = load_prices()
    prices = prices[prices.index < pd.Timestamp(today)]  # completed days only
    last_close = {s: float(prices[s].dropna().iloc[-1]) for s in prices if prices[s].notna().any()}
    px = {s: (state.positions[s].price if s in state.positions and state.positions[s].price > 0
              else last_close.get(s)) for s in cfg.symbols}
    px = {s: v for s, v in px.items() if v}

    last_reb = _last_rebalance(cfg, mode)
    rebalance = is_rebalance_day(pd.Timestamp(today), last_reb, cfg.strategy.rebalance)
    if rebalance:
        alloc = compute_target_weights(prices, cfg)
        log.info("targets: %s", {s: round(w, 4) for s, w in alloc.weights.items()})
        orders = plan_rebalance(state, alloc.weights, px, cfg, alloc.reasons)
    else:
        breaches = cap_breaches(state, cfg)
        orders = plan_cap_trims(state, px, cfg)
        if breaches:
            log.info("cap breaches: %s", breaches)

    # 7. Execute: sells, then refresh, then buys. Every order passes the risk gate.
    result = RunResult("no_trades")
    sells = [o for o in orders if o.side == "sell"]
    buys = [o for o in orders if o.side == "buy"]
    _execute(cfg, broker, alerter, risk, sells, state, mode, result, fill_timeout_s)
    if buys and result.status != "halted":
        acct = broker.get_account()
        positions = broker.get_positions()
        state = PortfolioState(
            cash=acct.cash,
            positions={s: Holding(p.qty, p.price) for s, p in positions.items() if cfg.has_asset(s)},
        )
        need = sum(o.notional for o in buys)
        if need > state.cash > 0:
            k = state.cash / need * 0.995
            for o in buys:
                o.notional = round(o.notional * k, 2)
        buys = [o for o in buys if o.notional >= cfg.strategy.min_trade_usd]
        _execute(cfg, broker, alerter, risk, buys, state, mode, result, fill_timeout_s)

    if rebalance and result.status != "halted":
        _set_last_rebalance(cfg, mode, today)
    if not live:
        record_paper_run(cfg, today)
    if result.submitted and result.status != "halted":
        result.status = "traded"
    log.info("run finished: %s (%d submitted, %d blocked)", result.status, len(result.submitted), len(result.blocked))
    return result


def _execute(cfg, broker, alerter, risk: RiskManager, orders: list[Order], state: PortfolioState,
             mode: str, result: RunResult, fill_timeout_s: float) -> None:
    for o in orders:
        # Kill switch is re-checked inside check_order before EVERY order.
        d = risk.check_order(o, state)
        entry = {"mode": mode, "symbol": o.symbol, "side": o.side, "qty": o.qty, "notional": o.notional,
                 "est_price": o.est_price, "reason": o.reason}
        if not d.ok:
            entry.update(status="blocked_by_risk", block_reason=d.reason)
            log_trade(cfg, entry)
            result.blocked.append(entry)
            alerter.send(f"{mode.upper()}: order BLOCKED {o.side} {o.symbol}", f"{d.reason}\nreason for order: {o.reason}")
            if risk.halted_reason():
                result.status = "halted"
                return
            continue
        try:
            oid = broker.submit(o)
            fill = broker.wait_for_fill(oid, fill_timeout_s)
        except Exception as e:  # noqa: BLE001
            entry.update(status="error", error=str(e))
            log_trade(cfg, entry)
            alerter.send(f"{mode.upper()}: order FAILED {o.side} {o.symbol}", str(e))
            continue
        entry.update(status=fill.status, order_id=oid, filled_qty=fill.filled_qty,
                     filled_avg_price=fill.filled_avg_price)
        log_trade(cfg, entry)
        result.submitted.append(entry)
        amt = f"${o.notional:,.2f}" if o.notional is not None else f"{o.qty:.6f} units"
        alerter.send(f"{mode.upper()}: {o.side.upper()} {o.symbol} {amt} -> {fill.status}"
                     + (f" @ {fill.filled_avg_price:,.4f}" if fill.filled_avg_price else ""),
                     f"Why: {o.reason}")
        # keep the local state current so later orders are checked against post-trade weights
        h = state.holding(o.symbol)
        px = fill.filled_avg_price or o.est_price or (h.price if h else 0)
        q = fill.filled_qty or 0.0
        if o.side == "buy":
            state.cash -= q * px
            if h:
                h.qty += q
            elif q > 0:
                state.positions[o.symbol] = Holding(q, px)
        else:
            state.cash += q * px
            if h:
                h.qty -= q
