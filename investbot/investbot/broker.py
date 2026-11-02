"""Broker interface + Alpaca implementation.

The trader only talks to the small `Broker` interface below, which lets the
tests run the full daily loop against a fake broker.
"""
from __future__ import annotations

import logging
import time
from dataclasses import dataclass
from typing import Protocol

from .config import Config, normalize_symbol
from .risk import Order

log = logging.getLogger(__name__)


@dataclass
class Account:
    equity: float
    last_equity: float      # equity at the previous trading day's close
    cash: float
    multiplier: float = 1.0
    shorting_enabled: bool = False
    trading_blocked: bool = False
    options_level: int = 0


@dataclass
class BrokerPosition:
    symbol: str             # config symbol, e.g. "BTC/USD"
    qty: float
    price: float
    market_value: float
    change_today: float     # fraction, e.g. -0.031


@dataclass
class Fill:
    order_id: str
    status: str
    filled_qty: float
    filled_avg_price: float | None


class Broker(Protocol):
    def get_account(self) -> Account: ...
    def get_positions(self) -> dict[str, BrokerPosition]: ...
    def is_market_open(self) -> bool: ...
    def submit(self, order: Order) -> str: ...
    def wait_for_fill(self, order_id: str, timeout_s: float = 60) -> Fill: ...
    def cancel_all(self) -> None: ...
    def enforce_cash_only_settings(self) -> list[str]: ...


class AlpacaBroker:
    def __init__(self, cfg: Config, api_key: str, secret_key: str, paper: bool = True):
        from alpaca.trading.client import TradingClient

        self.cfg = cfg
        self.paper = paper
        self.client = TradingClient(api_key, secret_key, paper=paper)

    # ---- account ---------------------------------------------------------
    def get_account(self) -> Account:
        a = self.client.get_account()
        return Account(
            equity=float(a.equity),
            last_equity=float(a.last_equity),
            cash=float(a.cash),
            multiplier=float(a.multiplier or 1),
            shorting_enabled=bool(a.shorting_enabled),
            trading_blocked=bool(a.trading_blocked or a.account_blocked),
            options_level=int(getattr(a, "options_trading_level", 0) or 0),
        )

    def enforce_cash_only_settings(self) -> list[str]:
        """Defence in depth: ask Alpaca itself to forbid margin, shorting and options.

        The bot's own RiskManager already blocks these; this makes the broker block
        them too, in case of a bug. Returns a list of problems that could not be fixed.
        """
        problems = []
        try:
            conf = self.client.get_account_configurations()
            conf.no_shorting = True
            conf.max_margin_multiplier = "1"
            if hasattr(conf, "max_options_trading_level"):
                conf.max_options_trading_level = 0
            self.client.set_account_configurations(conf)
        except Exception as e:  # noqa: BLE001 - report, the code-level limits still apply
            problems.append(f"could not update Alpaca account configuration: {e}")
        return problems

    def get_positions(self) -> dict[str, BrokerPosition]:
        out = {}
        for p in self.client.get_all_positions():
            sym = self._config_symbol(p.symbol)
            out[sym] = BrokerPosition(
                symbol=sym,
                qty=float(p.qty),
                price=float(p.current_price or 0),
                market_value=float(p.market_value or 0),
                change_today=float(p.change_today or 0),
            )
        return out

    def _config_symbol(self, alpaca_symbol: str) -> str:
        n = normalize_symbol(alpaca_symbol)
        for a in self.cfg.assets:
            if normalize_symbol(a.symbol) == n:
                return a.symbol
        return alpaca_symbol  # not ours; the trader will leave it alone

    def is_market_open(self) -> bool:
        return bool(self.client.get_clock().is_open)

    # ---- orders ----------------------------------------------------------
    def submit(self, order: Order) -> str:
        from alpaca.trading.enums import OrderSide, TimeInForce
        from alpaca.trading.requests import MarketOrderRequest

        asset = self.cfg.asset(order.symbol)
        tif = TimeInForce.GTC if asset.is_crypto else TimeInForce.DAY
        kw = dict(symbol=asset.symbol, side=OrderSide.BUY if order.side == "buy" else OrderSide.SELL,
                  time_in_force=tif)
        if order.notional is not None:
            kw["notional"] = round(order.notional, 2)
        else:
            kw["qty"] = _floor(order.qty, 9 if asset.is_crypto else 9)
        o = self.client.submit_order(MarketOrderRequest(**kw))
        return str(o.id)

    def wait_for_fill(self, order_id: str, timeout_s: float = 60) -> Fill:
        deadline = time.time() + timeout_s
        while True:
            o = self.client.get_order_by_id(order_id)
            status = str(getattr(o.status, "value", o.status))
            if status in ("filled", "canceled", "expired", "rejected", "done_for_day") or time.time() > deadline:
                return Fill(order_id, status, float(o.filled_qty or 0),
                            float(o.filled_avg_price) if o.filled_avg_price else None)
            time.sleep(2)

    def cancel_all(self) -> None:
        self.client.cancel_orders()


def _floor(x: float, decimals: int) -> float:
    f = 10 ** decimals
    return int(x * f) / f
