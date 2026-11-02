"""Hard risk limits.

Everything in here is deliberately independent of the strategy: the strategy
*proposes* target weights and orders, and this module has the final say.
Every order the live bot or the backtest executes goes through
`RiskManager.check_order`. Nothing bypasses it.

Limits enforced:
  * no shorting        - a sell can never exceed the quantity currently held
  * no margin/leverage - a buy can never exceed settled *cash* (buying power is ignored)
  * no options         - only us_equity / crypto asset classes from the allow-list
  * max crypto %       - post-trade crypto weight must stay under the cap
  * max single asset % - post-trade weight of any asset must stay under the cap
  * daily loss limit   - equity down >= limit vs. last close halts all trading (latched)
  * kill switch        - if the kill-switch file exists, nothing trades
"""
from __future__ import annotations

import json
import re
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path

from .config import ALLOWED_ASSET_CLASSES, Config, normalize_symbol

# Small tolerance so floating-point rounding can't produce false rejections.
TOL = 1e-3
# OCC option symbols look like AAPL240119C00150000.
_OPTION_RE = re.compile(r"^[A-Z]{1,6}\d{6}[CP]\d{8}$")


class RiskViolation(Exception):
    pass


@dataclass
class Order:
    symbol: str
    side: str                      # "buy" | "sell"  (nothing else is ever accepted)
    reason: str
    notional: float | None = None  # dollars (used for buys)
    qty: float | None = None       # units   (used for sells)
    est_price: float | None = None
    asset_class: str | None = None

    def est_notional(self) -> float:
        if self.notional is not None:
            return float(self.notional)
        if self.qty is not None and self.est_price:
            return float(self.qty) * float(self.est_price)
        return 0.0


@dataclass
class Holding:
    qty: float
    price: float

    @property
    def value(self) -> float:
        return self.qty * self.price


@dataclass
class PortfolioState:
    cash: float
    positions: dict[str, Holding] = field(default_factory=dict)

    @property
    def equity(self) -> float:
        return self.cash + sum(h.value for h in self.positions.values())

    def holding(self, symbol: str) -> Holding | None:
        key = normalize_symbol(symbol)
        for s, h in self.positions.items():
            if normalize_symbol(s) == key:
                return h
        return None

    def weights(self) -> dict[str, float]:
        eq = self.equity
        if eq <= 0:
            return {s: 0.0 for s in self.positions}
        return {s: h.value / eq for s, h in self.positions.items()}


@dataclass
class Decision:
    ok: bool
    reason: str = ""


# ---------------------------------------------------------------------------
# Weight-level caps (used by the strategy before orders exist)
# ---------------------------------------------------------------------------

def clip_weights(weights: dict[str, float], cfg: Config) -> dict[str, float]:
    """Project target weights onto the allowed set.

    - negative weights -> 0 (no shorts)
    - each asset <= max_single_asset_pct
    - crypto total <= max_crypto_pct (scaled down proportionally)
    - total <= 1 (no leverage). Anything removed goes to cash, never to other assets.
    """
    r = cfg.risk
    out = {s: min(max(0.0, float(w)), r.max_single_asset_pct) for s, w in weights.items()}
    crypto = {normalize_symbol(s) for s in cfg.crypto_symbols}
    c_total = sum(w for s, w in out.items() if normalize_symbol(s) in crypto)
    if c_total > r.max_crypto_pct:
        k = r.max_crypto_pct / c_total
        out = {s: (w * k if normalize_symbol(s) in crypto else w) for s, w in out.items()}
    total = sum(out.values())
    if total > 1.0:
        out = {s: w / total for s, w in out.items()}
    return out


def cap_breaches(state: PortfolioState, cfg: Config) -> list[str]:
    """Human-readable list of caps the *current* portfolio breaches (e.g. after a rally)."""
    eq = state.equity
    if eq <= 0:
        return []
    msgs = []
    crypto = {normalize_symbol(s) for s in cfg.crypto_symbols}
    c_val = 0.0
    for s, h in state.positions.items():
        w = h.value / eq
        if w > cfg.risk.max_single_asset_pct + TOL:
            msgs.append(f"{s} is {w:.1%} > single-asset cap {cfg.risk.max_single_asset_pct:.0%}")
        if normalize_symbol(s) in crypto:
            c_val += h.value
    if c_val / eq > cfg.risk.max_crypto_pct + TOL:
        msgs.append(f"crypto is {c_val / eq:.1%} > crypto cap {cfg.risk.max_crypto_pct:.0%}")
    return msgs


# ---------------------------------------------------------------------------
# Halt state: kill switch + daily-loss latch
# ---------------------------------------------------------------------------

def daily_loss_breached(equity: float, last_equity: float, limit: float) -> bool:
    if last_equity <= 0:
        return False
    return (equity / last_equity - 1.0) <= -limit


class RiskManager:
    def __init__(self, cfg: Config, state_dir: Path | None = None, enforce_files: bool = True):
        self.cfg = cfg
        self.state_dir = Path(state_dir) if state_dir else cfg.state_dir
        # The backtest has no kill-switch / latch files; live and paper always do.
        self.enforce_files = enforce_files

    # ---- kill switch -----------------------------------------------------
    @property
    def kill_switch_path(self) -> Path:
        return self.cfg.kill_switch_path

    def kill_switch_active(self) -> bool:
        return self.enforce_files and self.kill_switch_path.exists()

    # ---- daily loss latch -------------------------------------------------
    @property
    def halt_path(self) -> Path:
        return self.state_dir / "HALTED.json"

    def halted_reason(self) -> str | None:
        if not self.enforce_files:
            return None
        if self.kill_switch_active():
            return f"kill switch file present: {self.kill_switch_path}"
        if self.halt_path.exists():
            try:
                return "halted: " + json.loads(self.halt_path.read_text()).get("reason", "unknown")
            except (json.JSONDecodeError, OSError):
                return "halted: unreadable halt file (treating as halted)"
        return None

    def latch_halt(self, reason: str) -> None:
        self.state_dir.mkdir(parents=True, exist_ok=True)
        self.halt_path.write_text(
            json.dumps({"reason": reason, "at": datetime.now(timezone.utc).isoformat()}, indent=2)
        )

    def clear_halt(self) -> bool:
        if self.halt_path.exists():
            self.halt_path.unlink()
            return True
        return False

    def check_daily_loss(self, equity: float, last_equity: float) -> bool:
        """Returns True (and latches a halt) if the daily loss limit is hit."""
        if daily_loss_breached(equity, last_equity, self.cfg.risk.daily_loss_limit_pct):
            pct = equity / last_equity - 1.0
            if self.enforce_files:
                self.latch_halt(
                    f"daily loss {pct:.2%} breached limit -{self.cfg.risk.daily_loss_limit_pct:.0%} "
                    f"(equity {equity:,.2f} vs last close {last_equity:,.2f})"
                )
            return True
        return False

    # ---- the gate every order passes through ------------------------------
    def check_order(self, order: Order, state: PortfolioState) -> Decision:
        cfg = self.cfg
        halted = self.halted_reason()
        if halted:
            return Decision(False, halted)

        if order.side not in ("buy", "sell"):
            return Decision(False, f"side {order.side!r} not allowed (only plain buy/sell)")

        sym = order.symbol.upper()
        if _OPTION_RE.match(normalize_symbol(sym)):
            return Decision(False, f"{sym} looks like an option contract; options are forbidden")
        if order.asset_class is not None and order.asset_class not in ALLOWED_ASSET_CLASSES:
            return Decision(False, f"asset class {order.asset_class!r} forbidden")
        if not cfg.has_asset(sym):
            return Decision(False, f"{sym} is not in the configured universe")
        asset = cfg.asset(sym)

        if (order.qty is None) == (order.notional is None):
            return Decision(False, "order must specify exactly one of qty or notional")
        amount = order.qty if order.qty is not None else order.notional
        if not amount or amount <= 0:
            return Decision(False, "order size must be positive")

        held = state.holding(sym)
        price = order.est_price or (held.price if held else None)

        if order.side == "sell":
            held_qty = held.qty if held else 0.0
            if held_qty <= 0:
                return Decision(False, f"sell {sym}: nothing held - that would be a short sale")
            if order.qty is not None and order.qty > held_qty * (1 + 1e-9):
                return Decision(False, f"sell {sym}: qty {order.qty} > held {held_qty} - would go short")
            if order.notional is not None and order.notional > held.value * (1 + TOL):
                return Decision(False, f"sell {sym}: ${order.notional:.2f} > held ${held.value:.2f} - would go short")
            return Decision(True, "ok")

        # ---- buy ----
        if not price or price <= 0:
            return Decision(False, f"buy {sym}: no price available to size the order")
        notional = order.est_notional() if order.notional is not None else order.qty * price
        if notional > state.cash + 1e-6:
            return Decision(
                False, f"buy {sym}: ${notional:,.2f} exceeds cash ${state.cash:,.2f} (no margin/leverage)"
            )

        eq = state.equity  # a buy only swaps cash for the asset, equity is unchanged
        if eq <= 0:
            return Decision(False, "non-positive equity")
        new_val = (held.value if held else 0.0) + notional
        w = new_val / eq
        if w > cfg.risk.max_single_asset_pct + TOL:
            return Decision(
                False, f"buy {sym}: post-trade weight {w:.1%} > single-asset cap {cfg.risk.max_single_asset_pct:.0%}"
            )
        if asset.is_crypto:
            crypto = {normalize_symbol(s) for s in cfg.crypto_symbols}
            c_val = sum(h.value for s, h in state.positions.items() if normalize_symbol(s) in crypto)
            cw = (c_val + notional) / eq
            if cw > cfg.risk.max_crypto_pct + TOL:
                return Decision(
                    False, f"buy {sym}: post-trade crypto weight {cw:.1%} > crypto cap {cfg.risk.max_crypto_pct:.0%}"
                )
        return Decision(True, "ok")

    def require(self, order: Order, state: PortfolioState) -> None:
        d = self.check_order(order, state)
        if not d.ok:
            raise RiskViolation(d.reason)
