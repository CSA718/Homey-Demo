"""Rules-based allocation. No price prediction anywhere.

target weight_i = clip( base_i * trend_i * scale )

  base_i   : fixed policy weight from config.toml
  trend_i  : 1 if price >= its N-day moving average, else trend_off_multiplier
  scale    : min(1, target_vol / estimated portfolio vol)   <- never > 1, so never leverage
  clip     : hard caps from risk.clip_weights (crypto cap, single-asset cap, sum <= 1)

The *same* function is used by the backtest and the live bot, so what was
tested is what trades.
"""
from __future__ import annotations

from dataclasses import dataclass, replace

import numpy as np
import pandas as pd

from .config import Config, StrategyParams
from .risk import Holding, Order, PortfolioState, clip_weights, cap_breaches, normalize_symbol

TRADING_DAYS = 252


@dataclass
class Allocation:
    weights: dict[str, float]
    reasons: dict[str, str]
    port_vol: float
    scale: float


def compute_target_weights(prices: pd.DataFrame, cfg: Config, params: StrategyParams | None = None) -> Allocation:
    """`prices`: daily closes, columns = config symbols, last row = most recent *completed* day.

    Callers must not include data the bot would not have had at decision time.
    """
    p = params or cfg.strategy
    need = max(p.vol_lookback_days + 1, p.trend_ma_days if p.trend_filter else 0)
    w: dict[str, float] = {}
    reasons: dict[str, str] = {}

    for a in cfg.assets:
        col = prices[a.symbol].dropna() if a.symbol in prices else pd.Series(dtype=float)
        if len(col) < need:
            w[a.symbol] = 0.0
            reasons[a.symbol] = f"insufficient history ({len(col)}/{need} days) -> 0%"
            continue
        wi = a.weight
        r = [f"base {a.weight:.0%}"]
        if p.trend_filter:
            ma = col.iloc[-p.trend_ma_days:].mean()
            last = col.iloc[-1]
            if last < ma:
                wi *= p.trend_off_multiplier
                r.append(f"below {p.trend_ma_days}d MA ({last:.2f}<{ma:.2f}) x{p.trend_off_multiplier}")
            else:
                r.append(f"above {p.trend_ma_days}d MA")
        w[a.symbol] = wi
        reasons[a.symbol] = ", ".join(r)

    active = [s for s, v in w.items() if v > 0]
    port_vol = 0.0
    scale = 1.0
    if active:
        rets = np.log(prices[active]).diff().iloc[-p.vol_lookback_days:]
        rets = rets.dropna(how="all").fillna(0.0)
        cov = rets.cov().values * TRADING_DAYS
        vec = np.array([w[s] for s in active])
        port_vol = float(np.sqrt(max(vec @ cov @ vec, 0.0)))
        if port_vol > 0:
            scale = min(1.0, p.target_vol / port_vol)
    w = {s: v * scale for s, v in w.items()}

    w = clip_weights(w, cfg)
    total = sum(w.values())
    if total > 1 - p.cash_buffer:
        k = (1 - p.cash_buffer) / total
        w = {s: v * k for s, v in w.items()}

    for s in w:
        reasons[s] += f"; vol scale x{scale:.2f} (est. port vol {port_vol:.1%} vs target {p.target_vol:.0%}) -> {w[s]:.1%}"
    return Allocation(weights=w, reasons=reasons, port_vol=port_vol, scale=scale)


def params_with(cfg: Config, **kw) -> StrategyParams:
    return replace(cfg.strategy, **kw)


# ---------------------------------------------------------------------------
# Turning target weights into orders
# ---------------------------------------------------------------------------

def plan_rebalance(
    state: PortfolioState,
    targets: dict[str, float],
    prices: dict[str, float],
    cfg: Config,
    reasons: dict[str, str] | None = None,
    label: str = "monthly rebalance",
) -> list[Order]:
    """Sells first, then buys. Buys are scaled so they fit in cash (incl. expected sell proceeds)."""
    p = cfg.strategy
    eq = state.equity
    reasons = reasons or {}
    sells: list[Order] = []
    buys: list[Order] = []
    for a in cfg.assets:
        s = a.symbol
        px = prices.get(s)
        if px is None or not np.isfinite(px) or px <= 0:
            continue
        h = state.holding(s)
        cur_val = h.qty * px if h else 0.0
        tgt_val = targets.get(s, 0.0) * eq
        diff = tgt_val - cur_val
        if abs(diff) < max(p.min_trade_usd, p.rebalance_band * eq) and not (tgt_val == 0 and cur_val > 0):
            continue
        why = f"{label}: {s} {cur_val / eq:.1%} -> {targets.get(s, 0.0):.1%} ({reasons.get(s, '')})"
        if diff < 0 and h:
            qty = h.qty if tgt_val <= 0 else min(h.qty, -diff / px)
            if qty * px >= min(p.min_trade_usd, cur_val):
                sells.append(Order(s, "sell", why, qty=qty, est_price=px, asset_class=a.asset_class))
        elif diff > 0:
            buys.append(Order(s, "buy", why, notional=diff, est_price=px, asset_class=a.asset_class))

    proceeds = sum(o.est_notional() * (1 - cfg.costs.cost_rate(cfg.asset(o.symbol).is_crypto)) for o in sells)
    available = state.cash + proceeds  # the cash buffer is already built into the targets
    need = sum(o.notional for o in buys)
    if need > available > 0:
        k = available / need * 0.999
        for o in buys:
            o.notional *= k
    elif available <= 0:
        buys = []
    buys = [o for o in buys if o.notional >= p.min_trade_usd]
    for o in buys:
        o.notional = round(o.notional, 2)
    return sells + buys


def plan_cap_trims(state: PortfolioState, prices: dict[str, float], cfg: Config) -> list[Order]:
    """Between rebalances: if a rally pushed a holding over a hard cap, sell back to 1pp under it."""
    if not cap_breaches(state, cfg):
        return []
    eq = state.equity
    targets = {}
    for a in cfg.assets:
        h = state.holding(a.symbol)
        targets[a.symbol] = (h.value / eq) if h else 0.0
    margin = 0.01
    trimmed = {s: min(w, cfg.risk.max_single_asset_pct - margin) for s, w in targets.items()}
    crypto = cfg.crypto_symbols
    c_tot = sum(w for s, w in trimmed.items() if s in crypto)
    cap = cfg.risk.max_crypto_pct - margin
    if c_tot > cap:
        trimmed = {s: (w * cap / c_tot if s in crypto else w) for s, w in trimmed.items()}
    orders = []
    for s, w in trimmed.items():
        h = state.holding(s)
        if not h:
            continue
        px = prices.get(s, h.price)
        excess = h.qty * px - w * eq
        if excess > 0.5:
            orders.append(
                Order(
                    s, "sell",
                    f"cap trim: {s} at {h.qty * px / eq:.1%}; {'; '.join(cap_breaches(state, cfg))}",
                    qty=min(h.qty, excess / px), est_price=px, asset_class=cfg.asset(s).asset_class,
                )
            )
    return orders


def is_rebalance_day(today: pd.Timestamp, last_rebalance: pd.Timestamp | None, freq: str = "monthly") -> bool:
    if last_rebalance is None:
        return True
    if freq == "monthly":
        return (today.year, today.month) != (last_rebalance.year, last_rebalance.month)
    if freq == "weekly":
        return today.isocalendar()[:2] != last_rebalance.isocalendar()[:2]
    if freq == "quarterly":
        return (today.year, (today.month - 1) // 3) != (last_rebalance.year, (last_rebalance.month - 1) // 3)
    raise ValueError(f"unknown rebalance frequency {freq!r}")


def state_from_units(units: dict[str, float], cash: float, prices: dict[str, float]) -> PortfolioState:
    return PortfolioState(
        cash=cash,
        positions={s: Holding(q, prices[s]) for s, q in units.items() if q > 0 and s in prices},
    )


__all__ = [
    "Allocation", "compute_target_weights", "plan_rebalance", "plan_cap_trims",
    "is_rebalance_day", "params_with", "state_from_units", "normalize_symbol",
]
