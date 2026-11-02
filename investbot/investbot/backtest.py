"""Walk-forward, out-of-sample backtest with fees and slippage.

How it avoids fooling you:
  * Signals for a trade on day t use prices up to day t-1 only; fills happen at
    day t's close with slippage + fees applied.
  * Walk-forward: for each 1-year test window, parameters are picked using ONLY
    the preceding 3-year training window, then frozen and run on the test year.
    The reported strategy curve is the stitch of those never-seen test years.
  * Every simulated order goes through the same RiskManager as live trading,
    so the backtest cannot use leverage, shorts, or exceed caps either.
  * Overfitting diagnostics are printed with a plain-English verdict.
"""
from __future__ import annotations

import itertools
import json
import math
from dataclasses import dataclass, field
from datetime import datetime

import numpy as np
import pandas as pd

from .config import Config, StrategyParams
from .risk import Order, PortfolioState, RiskManager
from .strategy import (
    TRADING_DAYS, compute_target_weights, is_rebalance_day, params_with,
    plan_cap_trims, plan_rebalance, state_from_units,
)


# ---------------------------------------------------------------------------
# Metrics
# ---------------------------------------------------------------------------

def metrics(equity: pd.Series) -> dict:
    equity = equity.dropna()
    rets = equity.pct_change().dropna()
    n = len(rets)
    if n < 2 or equity.iloc[0] <= 0:
        return {"cagr": float("nan"), "vol": float("nan"), "sharpe": float("nan"),
                "max_drawdown": float("nan"), "calmar": float("nan"), "years": 0.0}
    years = n / TRADING_DAYS
    cagr = (equity.iloc[-1] / equity.iloc[0]) ** (1 / years) - 1
    sd = rets.std(ddof=1)
    vol = sd * math.sqrt(TRADING_DAYS)
    sharpe = (rets.mean() / sd * math.sqrt(TRADING_DAYS)) if sd > 0 else float("nan")
    dd = (equity / equity.cummax() - 1).min()
    return {
        "cagr": float(cagr),
        "vol": float(vol),
        "sharpe": float(sharpe),
        "max_drawdown": float(dd),
        "calmar": float(cagr / abs(dd)) if dd < 0 else float("nan"),
        "years": float(years),
        "total_return": float(equity.iloc[-1] / equity.iloc[0] - 1),
    }


def sharpe_se(sharpe: float, years: float) -> float:
    """Approximate standard error of an annualised Sharpe ratio (Lo, 2002)."""
    if years <= 0 or not np.isfinite(sharpe):
        return float("nan")
    return math.sqrt((1 + 0.5 * sharpe ** 2) / years)


def yearly_returns(equity: pd.Series) -> pd.Series:
    e = equity.dropna()
    yr_end = e.groupby(e.index.year).last()
    prev = yr_end.shift(1)
    prev.iloc[0] = e.iloc[0]
    return yr_end / prev - 1


# ---------------------------------------------------------------------------
# Simulation
# ---------------------------------------------------------------------------

@dataclass
class SimResult:
    equity: pd.Series
    trades: list[dict] = field(default_factory=list)
    costs_paid: float = 0.0
    turnover: float = 0.0          # sum of traded notional / average equity, annualised
    rejected: list[dict] = field(default_factory=list)
    halted_days: int = 0


def precompute_targets(prices: pd.DataFrame, cfg: Config, params: StrategyParams,
                       dates: list[pd.Timestamp]) -> dict[pd.Timestamp, tuple[dict, dict]]:
    """Targets for trading on day d, using data strictly before d."""
    out = {}
    idx = prices.index
    for d in dates:
        pos = idx.get_loc(d)
        if pos == 0:
            continue
        hist = prices.iloc[:pos]  # excludes day d -> no look-ahead
        alloc = compute_target_weights(hist, cfg, params)
        out[d] = (alloc.weights, alloc.reasons)
    return out


def month_starts(index: pd.DatetimeIndex) -> list[pd.Timestamp]:
    s = pd.Series(index, index=index)
    return list(s.groupby([index.year, index.month]).first())


def _fill(order: Order, px: float, cfg: Config, units: dict, cash: float) -> tuple[float, float, float]:
    """Apply one order at price px with costs. Returns (cash, traded_notional, cost)."""
    a = cfg.asset(order.symbol)
    c = cfg.costs
    slip = (c.crypto_slippage_bps if a.is_crypto else c.equity_slippage_bps) / 1e4
    fee = (c.crypto_fee_bps if a.is_crypto else c.equity_fee_bps) / 1e4
    if order.side == "buy":
        n = order.notional
        fill_px = px * (1 + slip)
        q = n * (1 - fee) / fill_px
        units[order.symbol] = units.get(order.symbol, 0.0) + q
        cost = n - q * px
        return cash - n, n, cost
    q = min(order.qty, units.get(order.symbol, 0.0))
    fill_px = px * (1 - slip)
    gross = q * fill_px
    proceeds = gross * (1 - fee)
    units[order.symbol] = units.get(order.symbol, 0.0) - q
    if units[order.symbol] <= 1e-12:
        units.pop(order.symbol)
    return cash + proceeds, q * px, q * px - proceeds


def simulate(prices: pd.DataFrame, cfg: Config, targets: dict, start, end,
             initial_cash: float, buy_and_hold: dict[str, float] | None = None) -> SimResult:
    """Day-by-day simulation. `targets` maps rebalance date -> (weights, reasons).

    If `buy_and_hold` (symbol->weight) is given, it ignores targets: buys each asset once
    (when it first has a price) and never trades again.
    """
    risk = RiskManager(cfg, enforce_files=False)
    px_df = prices.loc[start:end]
    last_px = prices.loc[:start].ffill().iloc[-1].to_dict() if len(prices.loc[:start]) else {}
    units: dict[str, float] = {}
    cash = float(initial_cash)
    eq_hist = []
    res = SimResult(equity=pd.Series(dtype=float))
    last_reb = None
    prev_eq = None
    prev_prev_eq = None
    bh_pending = dict(buy_and_hold) if buy_and_hold else {}
    traded = 0.0

    for d, row in px_df.iterrows():
        for s, v in row.items():
            if np.isfinite(v):
                last_px[s] = float(v)
        today_px = {s: float(v) for s, v in row.items() if np.isfinite(v)}
        state = state_from_units(units, cash, last_px)

        # Daily-loss halt: if yesterday's close was down >= limit, no trading today.
        halted = (prev_eq is not None and prev_prev_eq is not None
                  and prev_eq / prev_prev_eq - 1 <= -cfg.risk.daily_loss_limit_pct)
        orders: list[Order] = []
        if halted:
            res.halted_days += 1
        elif buy_and_hold is not None:
            eq0 = initial_cash
            for s, w in list(bh_pending.items()):
                if s in today_px and cash > 0:
                    orders.append(Order(s, "buy", "buy-and-hold initial purchase",
                                        notional=min(w * eq0, cash), est_price=today_px[s],
                                        asset_class=cfg.asset(s).asset_class))
                    bh_pending.pop(s)
        elif is_rebalance_day(d, last_reb, cfg.strategy.rebalance) and d in targets:
            w, reasons = targets[d]
            tradable = {s: p for s, p in today_px.items()}
            orders = plan_rebalance(state, w, tradable, cfg, reasons)
            last_reb = d
        else:
            orders = plan_cap_trims(state, today_px, cfg)

        for o in orders:
            if o.symbol not in today_px:
                continue
            state = state_from_units(units, cash, last_px)
            if o.side == "buy":
                o.notional = min(o.notional, state.cash)
                if o.notional < 1:
                    continue
            # Benchmarks are plain buy-and-hold and are not bound by the bot's caps.
            dec = risk.check_order(o, state) if buy_and_hold is None else None
            if dec is not None and not dec.ok:
                res.rejected.append({"date": d, "symbol": o.symbol, "side": o.side, "why": dec.reason})
                continue
            cash, notional, cost = _fill(o, today_px[o.symbol], cfg, units, cash)
            traded += notional
            res.costs_paid += cost
            res.trades.append({"date": d, "symbol": o.symbol, "side": o.side,
                               "notional": round(notional, 2), "reason": o.reason})
        assert cash >= -1e-6, "simulation went into negative cash (leverage) - this must never happen"

        eq = cash + sum(q * last_px[s] for s, q in units.items())
        eq_hist.append((d, eq))
        prev_prev_eq, prev_eq = prev_eq, eq

    res.equity = pd.Series(dict(eq_hist), dtype=float)
    if len(res.equity) > 1:
        yrs = len(res.equity) / TRADING_DAYS
        res.turnover = traded / res.equity.mean() / max(yrs, 1e-9)
    return res


# ---------------------------------------------------------------------------
# Walk-forward
# ---------------------------------------------------------------------------

@dataclass
class Fold:
    train_start: pd.Timestamp
    train_end: pd.Timestamp
    test_start: pd.Timestamp
    test_end: pd.Timestamp
    chosen: dict | None = None
    is_sharpe: float = float("nan")
    grid_sharpes: dict = field(default_factory=dict)


def make_folds(index: pd.DatetimeIndex, first: pd.Timestamp, train_years: int, test_years: int) -> list[Fold]:
    folds = []
    t0 = first
    end = index[-1]
    while True:
        tr_end = t0 + pd.DateOffset(years=train_years)
        te_end = tr_end + pd.DateOffset(years=test_years)
        if tr_end >= end - pd.DateOffset(months=3):
            break
        folds.append(Fold(t0, tr_end - pd.Timedelta(days=1), tr_end, min(te_end - pd.Timedelta(days=1), end)))
        t0 = t0 + pd.DateOffset(years=test_years)
    return folds


def grid(cfg: Config) -> list[dict]:
    b = cfg.backtest
    tv = b.get("grid_target_vol", [cfg.strategy.target_vol])
    tm = b.get("grid_trend_off_multiplier", [cfg.strategy.trend_off_multiplier])
    return [{"target_vol": v, "trend_off_multiplier": m} for v, m in itertools.product(tv, tm)]


def _key(p: dict) -> str:
    return f"vol={p['target_vol']:.2f},trend_x={p['trend_off_multiplier']:.1f}"


def walk_forward(prices: pd.DataFrame, cfg: Config, progress=print) -> dict:
    b = cfg.backtest
    init = float(b.get("initial_cash", cfg.capital))
    p = cfg.strategy
    warmup = max(p.trend_ma_days, p.vol_lookback_days) + 5
    core = [a.symbol for a in cfg.assets if not a.is_crypto]
    first_valid = max(prices[c].first_valid_index() for c in core)
    ready = prices.index[prices.index.get_loc(first_valid) + warmup]
    first = next(d for d in month_starts(prices.index) if d >= ready)
    folds = make_folds(prices.index, first, int(b.get("train_years", 3)), int(b.get("test_years", 1)))
    if not folds:
        raise ValueError("not enough data for even one walk-forward fold")

    combos = grid(cfg)
    rdates = [d for d in month_starts(prices.index) if d >= first]
    progress(f"Precomputing targets for {len(combos)} parameter sets x {len(rdates)} month-starts ...")
    tgt = {_key(c): precompute_targets(prices, cfg, params_with(cfg, **c), rdates) for c in combos}

    for i, f in enumerate(folds, 1):
        for c in combos:
            r = simulate(prices, cfg, tgt[_key(c)], f.train_start, f.train_end, init)
            f.grid_sharpes[_key(c)] = metrics(r.equity)["sharpe"]
        best = max(combos, key=lambda c: np.nan_to_num(f.grid_sharpes[_key(c)], nan=-9))
        f.chosen, f.is_sharpe = best, f.grid_sharpes[_key(best)]
        progress(f"  fold {i}/{len(folds)}: train {f.train_start:%Y-%m}..{f.train_end:%Y-%m} -> "
                 f"chose {_key(best)} (IS Sharpe {f.is_sharpe:.2f}); test {f.test_start:%Y-%m}..{f.test_end:%Y-%m}")

    oos_start, oos_end = folds[0].test_start, folds[-1].test_end
    merged = {}
    for f in folds:
        for d, v in tgt[_key(f.chosen)].items():
            if f.test_start <= d <= f.test_end:
                merged[d] = v
    progress("Running stitched out-of-sample simulation and benchmarks ...")
    wf = simulate(prices, cfg, merged, oos_start, oos_end, init)

    default_key = _key({"target_vol": p.target_vol, "trend_off_multiplier": p.trend_off_multiplier})
    default_t = tgt.get(default_key) or precompute_targets(prices, cfg, p, rdates)
    fixed = simulate(prices, cfg, default_t, oos_start, oos_end, init)

    bench_sym = b.get("benchmark", core[0])
    bench = simulate(prices, cfg, {}, oos_start, oos_end, init, buy_and_hold={bench_sym: 1.0})
    policy = simulate(prices, cfg, {}, oos_start, oos_end, init, buy_and_hold=cfg.base_weights)

    return {
        "folds": folds, "oos_start": oos_start, "oos_end": oos_end,
        "walk_forward": wf, "fixed_default": fixed,
        "benchmark": bench, "benchmark_symbol": bench_sym, "policy_buy_hold": policy,
        "grid_size": len(combos),
    }


# ---------------------------------------------------------------------------
# Overfitting diagnostics + report
# ---------------------------------------------------------------------------

def overfit_diagnostics(res: dict) -> tuple[list[str], str]:
    warnings: list[str] = []
    folds: list[Fold] = res["folds"]
    wf = metrics(res["walk_forward"].equity)
    fx = metrics(res["fixed_default"].equity)
    bm = metrics(res["benchmark"].equity)

    is_sh = float(np.nanmean([f.is_sharpe for f in folds]))
    oos_sh = wf["sharpe"]
    severe = False
    if np.isfinite(is_sh) and is_sh > 0:
        ratio = oos_sh / is_sh
        if ratio < 0.5:
            severe = True
            warnings.append(f"OVERFIT WARNING: out-of-sample Sharpe ({oos_sh:.2f}) is less than half the "
                            f"in-sample Sharpe of the chosen parameters ({is_sh:.2f}). The parameter picks "
                            f"looked good on training data and did not carry over.")
        elif ratio < 0.75:
            warnings.append(f"Caution: OOS Sharpe ({oos_sh:.2f}) is noticeably below in-sample ({is_sh:.2f}); "
                            f"some of the in-sample performance was luck/fit.")

    picks = [_key(f.chosen) for f in folds]
    switches = sum(a != b for a, b in zip(picks, picks[1:]))
    if len(picks) > 2 and switches > (len(picks) - 1) / 2:
        warnings.append(f"Unstable parameters: the 'best' setting changed in {switches} of {len(picks) - 1} "
                        f"folds. That means the grid differences are mostly noise; don't trust any "
                        f"single 'optimal' value.")

    if np.isfinite(fx["sharpe"]) and fx["sharpe"] >= oos_sh:
        warnings.append(f"Optimising added nothing: the fixed default parameters (Sharpe {fx['sharpe']:.2f}) did "
                        f"at least as well as walk-forward picks ({oos_sh:.2f}). Prefer the defaults. Note the "
                        f"defaults were chosen by a human who knows market history, so they are not perfectly "
                        f"out-of-sample either.")

    yrs = wf["years"]
    if yrs < 5:
        warnings.append(f"Only {yrs:.1f} years of out-of-sample data (< 5). Results are not reliable.")

    se = sharpe_se(oos_sh, yrs)
    diff = oos_sh - bm["sharpe"]
    if np.isfinite(se) and abs(diff) < se:
        warnings.append(f"The Sharpe difference vs {res['benchmark_symbol']} ({diff:+.2f}) is within one "
                        f"standard error (~{se:.2f}). Statistically you cannot tell the strategy and "
                        f"buy-and-hold apart on risk-adjusted terms.")
    if wf["cagr"] < bm["cagr"]:
        warnings.append(f"Return trade-off: the strategy returned {wf['cagr']:.1%}/yr vs {bm['cagr']:.1%}/yr for "
                        f"{res['benchmark_symbol']}. It is built to cut drawdowns, which usually costs return "
                        f"in bull markets.")

    spreads = [np.nanmax(list(f.grid_sharpes.values())) - np.nanmedian(list(f.grid_sharpes.values()))
               for f in folds]
    if spreads and np.nanmean(spreads) > 0.5:
        warnings.append("In training windows the best grid point beat the median grid point by a wide margin "
                        f"(avg {np.nanmean(spreads):.2f} Sharpe). Results are sensitive to parameter choice.")

    if severe:
        verdict = "LOOKS OVERFIT - do not trade this with real money as configured."
    elif len(warnings) >= 3:
        verdict = "MIXED - several caution flags; paper trade and keep expectations modest."
    else:
        verdict = ("No strong sign of overfitting. That is NOT evidence it will make money; "
                   "it only means the test didn't catch it fooling itself.")
    return warnings, verdict


def _fmt(m: dict) -> str:
    return (f"{m['cagr']:>8.2%} {m['vol']:>8.2%} {m['sharpe']:>7.2f} {m['max_drawdown']:>9.2%} "
            f"{m['calmar']:>7.2f}")


def build_report(res: dict, cfg: Config, data_source: str) -> tuple[str, dict]:
    rows = [
        ("Strategy (walk-forward OOS)", res["walk_forward"]),
        ("Strategy (fixed defaults)", res["fixed_default"]),
        (f"Buy & hold {res['benchmark_symbol']}", res["benchmark"]),
        ("Buy & hold policy mix (no rebalance)", res["policy_buy_hold"]),
    ]
    warnings, verdict = overfit_diagnostics(res)
    lines = [
        "# investbot backtest report",
        "",
        f"Generated {datetime.now():%Y-%m-%d %H:%M}. Data source: {data_source}.",
        f"Out-of-sample period: {res['oos_start']:%Y-%m-%d} to {res['oos_end']:%Y-%m-%d}. "
        f"Costs: equities {cfg.costs.equity_fee_bps + cfg.costs.equity_slippage_bps:.0f} bps, "
        f"crypto {cfg.costs.crypto_fee_bps + cfg.costs.crypto_slippage_bps:.0f} bps per trade. "
        f"Sharpe uses a 0% risk-free rate; cash earns 0% (conservative).",
        "",
        "## Results",
        "",
        "```",
        f"{'':38} {'Ann.ret':>8} {'Vol':>8} {'Sharpe':>7} {'MaxDD':>9} {'Calmar':>7}",
    ]
    out = {"verdict": verdict, "warnings": warnings, "data_source": data_source,
           "oos_start": str(res["oos_start"].date()), "oos_end": str(res["oos_end"].date()),
           "generated": datetime.now().isoformat(), "results": {}}
    for name, r in rows:
        m = metrics(r.equity)
        lines.append(f"{name:38} {_fmt(m)}")
        out["results"][name] = {**m, "costs_paid": r.costs_paid, "turnover": r.turnover,
                                "trades": len(r.trades), "rejected_orders": len(r.rejected)}
    lines += ["```", ""]
    wf = res["walk_forward"]
    lines += [f"Strategy: {len(wf.trades)} trades, costs paid ${wf.costs_paid:,.2f}, "
              f"turnover {wf.turnover:.2f}x/yr, {len(wf.rejected)} orders blocked by risk limits, "
              f"{wf.halted_days} days halted by the daily loss limit.", ""]

    lines += ["## Calendar-year returns", "", "```",
              f"{'Year':6} {'Strategy':>9} {res['benchmark_symbol']:>9} {'Policy B&H':>11}"]
    ys = yearly_returns(wf.equity)
    yb = yearly_returns(res["benchmark"].equity)
    yp = yearly_returns(res["policy_buy_hold"].equity)
    for y in ys.index:
        lines.append(f"{y:<6} {ys[y]:>9.1%} {yb.get(y, float('nan')):>9.1%} {yp.get(y, float('nan')):>11.1%}")
    lines += ["```", ""]

    lines += ["## Walk-forward folds", "", "```"]
    for f in res["folds"]:
        oos = metrics(wf.equity.loc[f.test_start:f.test_end])
        lines.append(f"train {f.train_start:%Y-%m}..{f.train_end:%Y-%m}  chose {_key(f.chosen):28} "
                     f"IS Sharpe {f.is_sharpe:5.2f} | test {f.test_start:%Y-%m}..{f.test_end:%Y-%m} "
                     f"OOS Sharpe {oos['sharpe']:5.2f}")
    lines += ["```", "", f"Grid size per fold: {res['grid_size']} parameter sets.", ""]
    out["folds"] = [{"train": [str(f.train_start.date()), str(f.train_end.date())],
                     "test": [str(f.test_start.date()), str(f.test_end.date())],
                     "chosen": f.chosen, "is_sharpe": f.is_sharpe} for f in res["folds"]]

    lines += ["## Overfitting check", "", f"**Verdict: {verdict}**", ""]
    lines += [f"- {w}" for w in warnings] or ["- No warnings triggered."]
    lines += ["", "Past performance does not predict future results. A backtest is a test of the rules, "
              "not a forecast."]
    return "\n".join(lines), out


def save_report(res: dict, cfg: Config, data_source: str) -> tuple[str, str]:
    text, summary = build_report(res, cfg, data_source)
    d = cfg.reports_dir
    d.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    md = d / f"backtest_{stamp}.md"
    js = d / f"backtest_{stamp}.json"
    md.write_text(text)
    js.write_text(json.dumps(summary, indent=2, default=str))
    curves = pd.DataFrame({
        "strategy_oos": res["walk_forward"].equity,
        "strategy_fixed": res["fixed_default"].equity,
        f"buyhold_{res['benchmark_symbol']}": res["benchmark"].equity,
        "buyhold_policy": res["policy_buy_hold"].equity,
    })
    curves.to_csv(d / f"backtest_{stamp}_equity.csv")
    pd.DataFrame(res["walk_forward"].trades).to_csv(d / f"backtest_{stamp}_trades.csv", index=False)
    return text, str(md)
