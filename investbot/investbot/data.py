"""Price data: yfinance (backtest, long history), Alpaca (live), or your own CSV."""
from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from pathlib import Path

import pandas as pd

from .config import Config

log = logging.getLogger(__name__)


def align_prices(df: pd.DataFrame, cfg: Config) -> pd.DataFrame:
    """Put every asset on the US-equity trading calendar.

    Crypto trades 24/7; we sample it on stock-market days (forward-filling at most
    3 days so a weekend's move rolls into Monday's return). Using one calendar for
    both the backtest and the live bot keeps volatility estimates consistent.
    """
    df = df.sort_index()
    idx = pd.to_datetime(df.index)
    if idx.tz is not None:
        idx = idx.tz_convert("UTC").tz_localize(None)
    df.index = idx.normalize()
    # Stock and crypto bars for the same date arrive at different hours; merge them
    # into one row per date (last non-null value per column) instead of dropping rows.
    df = df.groupby(level=0).last()
    equity_cols = [a.symbol for a in cfg.assets if not a.is_crypto and a.symbol in df]
    if equity_cols:
        cal = df[equity_cols].dropna(how="all").index
    else:
        cal = df.index
    crypto_cols = [c for c in df.columns if c not in equity_cols]
    out = df[equity_cols].reindex(cal)
    for c in crypto_cols:
        out[c] = df[c].dropna().reindex(df.index).ffill(limit=3).reindex(cal)
    return out[[a.symbol for a in cfg.assets if a.symbol in out]]


def load_csv(path: str | Path, cfg: Config) -> pd.DataFrame:
    """CSV with a date column first and one column per config symbol (e.g. VTI, BTC/USD)."""
    df = pd.read_csv(path, index_col=0, parse_dates=True)
    return align_prices(df, cfg)


def load_yfinance(cfg: Config, start: str, end: str | None = None, cache_dir: Path | None = None) -> pd.DataFrame:
    import yfinance as yf

    cache_dir = cache_dir or cfg.path("data_cache")
    cache_dir.mkdir(parents=True, exist_ok=True)
    cache = cache_dir / f"yf_{start}_{end or 'latest'}_{datetime.now():%Y%m%d}.csv"
    if cache.exists():
        log.info("using cached prices %s", cache)
        return load_csv(cache, cfg)

    mapping = {a.yf_symbol: a.symbol for a in cfg.assets}
    raw = yf.download(list(mapping), start=start, end=end, auto_adjust=True, progress=False, threads=False)
    if raw is None or raw.empty:
        raise RuntimeError("yfinance returned no data (network blocked or symbols wrong?)")
    close = raw["Close"] if isinstance(raw.columns, pd.MultiIndex) else raw[["Close"]]
    close = close.rename(columns=mapping)
    missing = [s for s in mapping.values() if s not in close]
    if missing:
        raise RuntimeError(f"yfinance returned no data for {missing}")
    close.to_csv(cache)
    return align_prices(close, cfg)


def load_alpaca(cfg: Config, api_key: str, secret_key: str, days: int = 420) -> pd.DataFrame:
    """Daily closes from Alpaca market data (IEX feed works on free accounts)."""
    from alpaca.data.enums import Adjustment, DataFeed
    from alpaca.data.historical import CryptoHistoricalDataClient, StockHistoricalDataClient
    from alpaca.data.requests import CryptoBarsRequest, StockBarsRequest
    from alpaca.data.timeframe import TimeFrame

    start = datetime.now(timezone.utc) - timedelta(days=days)
    frames = []
    stocks = [a.symbol for a in cfg.assets if not a.is_crypto]
    cryptos = [a.symbol for a in cfg.assets if a.is_crypto]
    if stocks:
        client = StockHistoricalDataClient(api_key, secret_key)
        bars = client.get_stock_bars(
            StockBarsRequest(
                symbol_or_symbols=stocks, timeframe=TimeFrame.Day, start=start,
                adjustment=Adjustment.ALL, feed=DataFeed.IEX,
            )
        ).df
        frames.append(bars["close"].unstack(level=0))
    if cryptos:
        client = CryptoHistoricalDataClient(api_key, secret_key)
        bars = client.get_crypto_bars(
            CryptoBarsRequest(symbol_or_symbols=cryptos, timeframe=TimeFrame.Day, start=start)
        ).df
        frames.append(bars["close"].unstack(level=0))
    df = pd.concat(frames, axis=1, sort=True)
    return align_prices(df, cfg)
