"""Command line entry point:  python -m investbot <command>

  backtest            walk-forward backtest; writes reports/backtest_*.md|json|csv
  run                 one daily run on the PAPER account
  run --live          one daily run on the LIVE account (gated: 30+ days of paper first)
  status              show halt state, paper-trading progress, latest backtest verdict
  kill                create the kill-switch file (bot stops immediately, cancels open orders)
  unkill              remove the kill-switch file
  resume              clear a daily-loss halt after you've looked at what happened
"""
from __future__ import annotations

import argparse
import logging
import sys
from datetime import datetime

from .config import ConfigError, alpaca_keys, load_config, load_dotenv


def _setup_logging(cfg) -> None:
    cfg.logs_dir.mkdir(parents=True, exist_ok=True)
    fmt = logging.Formatter("%(asctime)s %(levelname)s %(name)s: %(message)s")
    root = logging.getLogger()
    root.setLevel(logging.INFO)
    fh = logging.FileHandler(cfg.logs_dir / "investbot.log")
    fh.setFormatter(fmt)
    sh = logging.StreamHandler(sys.stderr)
    sh.setFormatter(fmt)
    root.handlers[:] = [fh, sh]
    for noisy in ("urllib3", "yfinance", "peewee"):
        logging.getLogger(noisy).setLevel(logging.WARNING)


def cmd_backtest(cfg, args) -> int:
    from . import backtest, data
    from .trader import latest_backtest

    if args.if_older_than is not None:
        bt = latest_backtest(cfg)
        if bt and (datetime.now() - bt[1]).days < args.if_older_than:
            print(f"Backtest from {bt[1]:%Y-%m-%d} is recent enough; skipping. Verdict: {bt[0].get('verdict')}")
            return 0

    start = args.start or cfg.backtest.get("start", "2011-01-01")
    if args.csv:
        prices = data.load_csv(args.csv, cfg)
        source = f"CSV {args.csv}"
    else:
        prices = data.load_yfinance(cfg, start)
        source = "Yahoo Finance via yfinance (adjusted closes)"
    prices = prices.loc[start:]
    print(f"Loaded {len(prices)} days, {prices.index[0]:%Y-%m-%d} .. {prices.index[-1]:%Y-%m-%d}")
    for c in prices:
        print(f"  {c:8} first price {prices[c].first_valid_index():%Y-%m-%d}")
    res = backtest.walk_forward(prices, cfg)
    text, path = backtest.save_report(res, cfg, source)
    print()
    print(text)
    print(f"\nSaved: {path}")
    return 0


def cmd_run(cfg, args) -> int:
    from . import data
    from .alerts import Alerter
    from .broker import AlpacaBroker
    from .trader import RolloutError, check_rollout, run_daily

    live = bool(args.live)
    mode = "LIVE" if live else "PAPER"
    from .trader import NY
    today = datetime.now(NY).date().isoformat()
    marker = cfg.state_dir / f"last_run_{mode.lower()}.txt"
    if args.once_per_day and marker.exists() and marker.read_text().strip() == today:
        print(f"{mode}: already ran today ({today}); skipping.")
        return 0
    alerter = Alerter(cfg.alert_telegram, cfg.alert_email, prefix=f"[investbot {mode}]")
    log = logging.getLogger("investbot")
    log.info("=== daily run (%s) ===", mode)
    try:
        check_rollout(cfg, live, datetime.now().date())
        key, secret = alpaca_keys(live)
    except (RolloutError, ConfigError) as e:
        log.error("refusing to run: %s", e)
        alerter.send(f"refusing to run: {e}")
        return 2

    broker = AlpacaBroker(cfg, key, secret, paper=not live)
    try:
        res = run_daily(cfg, broker, alerter, lambda: data.load_alpaca(cfg, key, secret), live=live)
    except Exception as e:  # noqa: BLE001
        log.exception("run crashed")
        alerter.send(f"ERROR: daily run crashed: {e!r}")
        return 1
    if res.status != "market_closed":
        cfg.state_dir.mkdir(parents=True, exist_ok=True)
        marker.write_text(today)
    print(f"{mode}: {res.status} - {len(res.submitted)} orders, {len(res.blocked)} blocked. {res.detail}")
    return 0


def cmd_status(cfg, args) -> int:
    from .risk import RiskManager
    from .trader import latest_backtest, paper_history

    r = RiskManager(cfg)
    print(f"halt state      : {r.halted_reason() or 'not halted'}")
    h = paper_history(cfg)
    if h["first"]:
        days = (datetime.now().date() - datetime.fromisoformat(h["first"]).date()).days
        print(f"paper trading   : since {h['first']} ({days} days, {len(h['runs'])} runs; "
              f"need {cfg.min_paper_days} days / {cfg.min_paper_runs} runs for --live)")
    else:
        print("paper trading   : not started")
    bt = latest_backtest(cfg)
    print(f"latest backtest : {bt[1]:%Y-%m-%d} - {bt[0].get('verdict')}" if bt else "latest backtest : none")
    return 0


def cmd_kill(cfg, args) -> int:
    cfg.kill_switch_path.write_text(f"killed at {datetime.now().isoformat()} {args.reason or ''}\n")
    print(f"Kill switch ON ({cfg.kill_switch_path}). The bot will not trade until you run `unkill`.")
    return 0


def cmd_unkill(cfg, args) -> int:
    if cfg.kill_switch_path.exists():
        cfg.kill_switch_path.unlink()
        print("Kill switch removed.")
    else:
        print("Kill switch was not set.")
    return 0


def cmd_resume(cfg, args) -> int:
    from .risk import RiskManager

    print("Daily-loss halt cleared." if RiskManager(cfg).clear_halt() else "No daily-loss halt was set.")
    return 0


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(prog="investbot", description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--config", default=None, help="path to config.toml")
    sub = ap.add_subparsers(dest="cmd", required=True)
    b = sub.add_parser("backtest")
    b.add_argument("--start", default=None)
    b.add_argument("--csv", default=None, help="use your own price CSV instead of yfinance")
    b.add_argument("--if-older-than", type=int, default=None, metavar="DAYS",
                   help="only run if the latest report is at least this many days old")
    r = sub.add_parser("run")
    r.add_argument("--live", action="store_true", help="trade real money (requires 30+ days of paper first)")
    r.add_argument("--once-per-day", action="store_true",
                   help="skip if a run already completed today (lets a scheduler fire more than once safely)")
    sub.add_parser("status")
    k = sub.add_parser("kill")
    k.add_argument("--reason", default="")
    sub.add_parser("unkill")
    sub.add_parser("resume")
    args = ap.parse_args(argv)

    try:
        cfg = load_config(args.config)
    except ConfigError as e:
        print(f"config error: {e}", file=sys.stderr)
        return 2
    load_dotenv(cfg.root / ".env")
    _setup_logging(cfg)
    return {
        "backtest": cmd_backtest, "run": cmd_run, "status": cmd_status,
        "kill": cmd_kill, "unkill": cmd_unkill, "resume": cmd_resume,
    }[args.cmd](cfg, args)
