"""Configuration loading.

Strategy/risk parameters live in config.toml. Secrets (API keys, alert
credentials) come ONLY from environment variables and are never written to
disk or logs by this package.
"""
from __future__ import annotations

import os
import tomllib
from dataclasses import dataclass, field
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DEFAULT_CONFIG = ROOT / "config.toml"

ALLOWED_ASSET_CLASSES = {"us_equity", "crypto"}


class ConfigError(ValueError):
    pass


@dataclass(frozen=True)
class Asset:
    symbol: str
    weight: float
    asset_class: str
    yf_symbol: str
    note: str = ""

    @property
    def is_crypto(self) -> bool:
        return self.asset_class == "crypto"


@dataclass(frozen=True)
class StrategyParams:
    target_vol: float = 0.12
    vol_lookback_days: int = 60
    trend_filter: bool = True
    trend_ma_days: int = 200
    trend_off_multiplier: float = 0.5
    rebalance: str = "monthly"
    rebalance_band: float = 0.01
    min_trade_usd: float = 10.0
    cash_buffer: float = 0.01


@dataclass(frozen=True)
class RiskLimits:
    max_crypto_pct: float = 0.20
    max_single_asset_pct: float = 0.60
    daily_loss_limit_pct: float = 0.05
    kill_switch_file: str = "KILL_SWITCH"


@dataclass(frozen=True)
class Costs:
    equity_fee_bps: float = 1.0
    equity_slippage_bps: float = 5.0
    crypto_fee_bps: float = 25.0
    crypto_slippage_bps: float = 10.0

    def cost_rate(self, is_crypto: bool) -> float:
        """Total one-way cost as a fraction of traded notional."""
        if is_crypto:
            return (self.crypto_fee_bps + self.crypto_slippage_bps) / 1e4
        return (self.equity_fee_bps + self.equity_slippage_bps) / 1e4


@dataclass(frozen=True)
class Config:
    capital: float
    equity_guard_multiple: float
    assets: tuple[Asset, ...]
    strategy: StrategyParams
    risk: RiskLimits
    costs: Costs
    alert_move_threshold_pct: float = 0.05
    alert_telegram: bool = True
    alert_email: bool = True
    min_paper_days: int = 30
    min_paper_runs: int = 15
    backtest_max_age_days: int = 90
    backtest: dict = field(default_factory=dict)
    root: Path = ROOT
    # Where state/, logs/, reports/ and the kill switch live. Defaults to `root`;
    # set INVESTBOT_DATA_DIR to keep them elsewhere (GitHub Actions keeps them on a
    # separate git branch so they survive between runs).
    data_root: Path | None = None

    # ---- convenience -------------------------------------------------
    @property
    def symbols(self) -> list[str]:
        return [a.symbol for a in self.assets]

    def asset(self, symbol: str) -> Asset:
        sym = normalize_symbol(symbol)
        for a in self.assets:
            if normalize_symbol(a.symbol) == sym:
                return a
        raise KeyError(symbol)

    def has_asset(self, symbol: str) -> bool:
        try:
            self.asset(symbol)
            return True
        except KeyError:
            return False

    @property
    def base_weights(self) -> dict[str, float]:
        return {a.symbol: a.weight for a in self.assets}

    @property
    def crypto_symbols(self) -> set[str]:
        return {a.symbol for a in self.assets if a.is_crypto}

    def path(self, rel: str) -> Path:
        p = Path(rel)
        return p if p.is_absolute() else self.root / p

    def data_path(self, rel: str) -> Path:
        p = Path(rel)
        return p if p.is_absolute() else (self.data_root or self.root) / p

    @property
    def kill_switch_path(self) -> Path:
        return self.data_path(self.risk.kill_switch_file)

    @property
    def state_dir(self) -> Path:
        return self.data_path("state")

    @property
    def logs_dir(self) -> Path:
        return self.data_path("logs")

    @property
    def reports_dir(self) -> Path:
        return self.data_path("reports")


def normalize_symbol(symbol: str) -> str:
    """Alpaca returns crypto positions as 'BTCUSD' but orders use 'BTC/USD'."""
    return symbol.replace("/", "").replace("-", "").upper()


def load_config(path: str | Path | None = None) -> Config:
    path = Path(path) if path else DEFAULT_CONFIG
    with open(path, "rb") as f:
        raw = tomllib.load(f)

    assets = tuple(
        Asset(
            symbol=sym,
            weight=float(spec["weight"]),
            asset_class=spec["asset_class"],
            yf_symbol=spec.get("yf_symbol", sym),
            note=spec.get("note", ""),
        )
        for sym, spec in raw["assets"].items()
    )
    cfg = Config(
        capital=float(raw["portfolio"]["capital"]),
        equity_guard_multiple=float(raw["portfolio"].get("equity_guard_multiple", 2.0)),
        assets=assets,
        strategy=StrategyParams(**raw.get("strategy", {})),
        risk=RiskLimits(**raw.get("risk", {})),
        costs=Costs(**raw.get("costs", {})),
        alert_move_threshold_pct=float(raw.get("alerts", {}).get("move_threshold_pct", 0.05)),
        alert_telegram=bool(raw.get("alerts", {}).get("telegram", True)),
        alert_email=bool(raw.get("alerts", {}).get("email", True)),
        min_paper_days=int(raw.get("rollout", {}).get("min_paper_days", 30)),
        min_paper_runs=int(raw.get("rollout", {}).get("min_paper_runs", 15)),
        backtest_max_age_days=int(raw.get("rollout", {}).get("backtest_max_age_days", 90)),
        backtest=raw.get("backtest", {}),
        root=path.resolve().parent,
        data_root=Path(os.environ["INVESTBOT_DATA_DIR"]).resolve() if os.environ.get("INVESTBOT_DATA_DIR") else None,
    )
    validate_config(cfg)
    return cfg


def validate_config(cfg: Config) -> None:
    """Reject configurations that would violate the hard rules before anything runs."""
    r = cfg.risk
    for name, v in [
        ("max_crypto_pct", r.max_crypto_pct),
        ("max_single_asset_pct", r.max_single_asset_pct),
        ("daily_loss_limit_pct", r.daily_loss_limit_pct),
    ]:
        if not 0 < v <= 1:
            raise ConfigError(f"risk.{name} must be in (0, 1], got {v}")
    if cfg.capital <= 0:
        raise ConfigError("portfolio.capital must be positive")
    total = sum(a.weight for a in cfg.assets)
    if total > 1.0 + 1e-9:
        raise ConfigError(f"asset weights sum to {total:.3f} > 1.0 (that would be leverage)")
    for a in cfg.assets:
        if a.weight < 0:
            raise ConfigError(f"{a.symbol}: negative weight means shorting, which is forbidden")
        if a.asset_class not in ALLOWED_ASSET_CLASSES:
            raise ConfigError(f"{a.symbol}: asset class {a.asset_class!r} not allowed (options etc. are forbidden)")
    s = cfg.strategy
    if not 0 < s.target_vol < 1:
        raise ConfigError("strategy.target_vol must be in (0, 1)")
    if not 0 <= s.trend_off_multiplier <= 1:
        raise ConfigError("strategy.trend_off_multiplier must be in [0, 1]")


# ---------------------------------------------------------------------------
# Secrets: environment only
# ---------------------------------------------------------------------------

def load_dotenv(path: Path) -> None:
    """Minimal .env loader (no dependency). Existing env vars win."""
    if not path.exists():
        return
    for line in path.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))


def alpaca_keys(live: bool) -> tuple[str, str]:
    prefix = "ALPACA_LIVE" if live else "ALPACA_PAPER"
    key = os.environ.get(f"{prefix}_API_KEY", "")
    secret = os.environ.get(f"{prefix}_SECRET_KEY", "")
    if not key or not secret:
        raise ConfigError(
            f"Missing {prefix}_API_KEY / {prefix}_SECRET_KEY environment variables."
        )
    return key, secret
