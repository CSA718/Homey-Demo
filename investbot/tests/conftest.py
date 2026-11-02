from __future__ import annotations

import dataclasses
import itertools

import numpy as np
import pandas as pd
import pytest

from investbot.alerts import Alerter
from investbot.broker import Account, BrokerPosition, Fill
from investbot.config import DEFAULT_CONFIG, load_config


@pytest.fixture
def cfg(tmp_path):
    """The real config.toml, but with all state/log/kill-switch files under a temp dir."""
    return dataclasses.replace(load_config(DEFAULT_CONFIG), root=tmp_path)


def synthetic_prices(cfg, years=8, seed=0, drift=None, start="2015-01-01") -> pd.DataFrame:
    """Random-walk prices for TESTS ONLY. Never used for reported results."""
    rng = np.random.default_rng(seed)
    idx = pd.bdate_range(start, periods=int(252 * years))
    vols = {"VTI": 0.17, "VXUS": 0.17, "BND": 0.05, "GLD": 0.15, "BTC/USD": 0.70, "ETH/USD": 0.85}
    mus = drift or {"VTI": 0.08, "VXUS": 0.05, "BND": 0.03, "GLD": 0.04, "BTC/USD": 0.30, "ETH/USD": 0.30}
    out = {}
    for a in cfg.assets:
        v = vols.get(a.symbol, 0.2)
        r = rng.normal(mus.get(a.symbol, 0.05) / 252 - 0.5 * v * v / 252, v / np.sqrt(252), len(idx))
        out[a.symbol] = 100 * np.exp(np.cumsum(r))
    return pd.DataFrame(out, index=idx)


class FakeBroker:
    """In-memory broker for exercising the full daily loop."""

    def __init__(self, cfg, equity=5000.0, last_equity=None, cash=None, positions=None,
                 market_open=True, prices=None):
        self.cfg = cfg
        self.prices = prices or {s: 100.0 for s in cfg.symbols}
        self.positions = positions or {}   # symbol -> qty
        self._cash = equity if cash is None else cash
        self.last_equity = last_equity if last_equity is not None else equity
        self.market_open = market_open
        self.submitted = []
        self.cancelled = 0
        self.change_today = {}
        self.on_submit = None              # hook for tests (e.g. create kill switch mid-run)
        self._ids = itertools.count(1)

    def _equity(self):
        return self._cash + sum(q * self.prices[s] for s, q in self.positions.items())

    def get_account(self):
        return Account(equity=self._equity(), last_equity=self.last_equity, cash=self._cash)

    def get_positions(self):
        return {s: BrokerPosition(s, q, self.prices[s], q * self.prices[s], self.change_today.get(s, 0.0))
                for s, q in self.positions.items() if q > 0}

    def is_market_open(self):
        return self.market_open

    def submit(self, order):
        self.submitted.append(order)
        px = self.prices[order.symbol]
        if order.side == "buy":
            q = order.notional / px
            self._cash -= order.notional
            self.positions[order.symbol] = self.positions.get(order.symbol, 0) + q
        else:
            q = order.qty
            self._cash += q * px
            self.positions[order.symbol] -= q
        if self.on_submit:
            self.on_submit(order)
        oid = str(next(self._ids))
        self._fills = getattr(self, "_fills", {})
        self._fills[oid] = Fill(oid, "filled", q, px)
        return oid

    def wait_for_fill(self, order_id, timeout_s=60):
        return self._fills[order_id]

    def cancel_all(self):
        self.cancelled += 1

    def enforce_cash_only_settings(self):
        return []


@pytest.fixture
def alerter():
    return Alerter(telegram=False, email=False)
