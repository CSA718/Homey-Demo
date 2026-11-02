# investbot

A small, rules-based portfolio bot for [Alpaca](https://alpaca.markets). It holds a
diversified ETF core plus a capped crypto sleeve, sizes positions to a volatility
target, cuts exposure in downtrends, and rebalances monthly. **It makes no price
predictions.** Every rule is a fixed formula you can read in `investbot/strategy.py`.

> **Read this first.** This is software, not financial advice. A backtest is a test of
> the rules on the past, not a forecast. The bot can and will lose money in some
> periods. Run the backtest, read the overfitting warnings, paper trade, and only then
> decide whether to risk real money.

## Your settings

| Setting | Value | Where |
|---|---|---|
| Total amount managed | **$5,000** | `portfolio.capital` |
| Max crypto (all coins combined) | **20%** | `risk.max_crypto_pct` |
| Max in any single asset | **60%** | `risk.max_single_asset_pct` |
| Daily loss limit (halts all trading) | **5%** | `risk.daily_loss_limit_pct` |
| Alert on a one-day move of | **5%** | `alerts.move_threshold_pct` |
| Alert channels | **Telegram + email** | env vars, see `.env.example` |

## Quick start

```bash
cd investbot
python3 -m venv .venv && . .venv/bin/activate
pip install -r requirements.txt
python -m pytest -q                      # 59 tests, including one or more per risk limit

cp .env.example .env                     # fill in keys; .env is git-ignored
python -m investbot backtest             # REQUIRED before the bot will trade at all
python -m investbot run                  # one paper-trading run
python -m investbot status
```

Then schedule the daily run (see **Operations** below) and let it paper trade for at least 30 days.

**Paper account balance:** Alpaca paper accounts start at $100,000. The bot refuses to
trade if account equity is more than 2x your $5,000 (a guard against pointing it at the
wrong account). Reset the paper account to $5,000 in the Alpaca dashboard first.

## How it decides (the whole strategy)

On the first trading day of each month:

1. **Start from fixed policy weights**: VTI 45%, VXUS 20%, BND 20%, GLD 5%, BTC 7%, ETH 3%.
2. **Trend filter.** If an asset's last close is below its 200-day moving average, multiply its weight by 0.5.
3. **Volatility targeting.** Estimate the portfolio's volatility from the last 60 days of returns (including correlations). If it's above 12% a year, scale *every* weight down so it's at 12%. Never scale up: the multiplier is capped at 1, so no leverage.
4. **Hard caps.** Crypto total is capped at 20%, any one asset at 60%, and the total at 99% (1% cash buffer). Anything trimmed goes to **cash**, never to other assets.
5. **Trade** only the differences bigger than 1% of the portfolio (and at least $10). Sells go first, then buys, sized to the cash actually available.

On every other weekday it only monitors: it checks the limits, sends alerts, and sells
down any holding that a rally has pushed over a cap.

Signals use **yesterday's close and earlier only**. Nothing uses data the bot wouldn't have had.

## Parameters and why I chose them

| Parameter | Value | Why |
|---|---|---|
| **VTI** 45% | core | One fund holding ~3,700 US stocks. It's the "broad index" core: cheap (0.03%), very liquid, nothing to pick. |
| **VXUS** 20% | | ~8,000 non-US stocks. The US has been ~60% of world market cap, so this keeps the stock part roughly global without overthinking it. |
| **BND** 20% | | US investment-grade bonds. Low volatility and usually steadier when stocks fall (not always: 2022 was the exception). It's what makes the volatility target reachable without sitting in cash. |
| **GLD** 5% | | Small gold position. It has had low correlation with both stocks and bonds. Kept small because it has long flat stretches. |
| **BTC/USD** 7%, **ETH/USD** 3% | crypto sleeve 10% | Half your 20% cap. Crypto has had 70-85% annual volatility and -75% drawdowns. At 10%, a crypto crash costs the portfolio ~7-8%. Starting at the cap would leave no room before rallies trigger forced trims. BTC gets more because it's larger and more liquid. |
| `target_vol` | 12% | Roughly a 60/40 portfolio's long-run volatility. It's the level where the core is usually fully invested in calm markets and gets cut back in turbulent ones (2008, 2020, 2022). The walk-forward tests 8/10/12/15%. |
| `vol_lookback_days` | 60 | ~3 months. It's short enough to react within weeks of a regime change and long enough that one wild day doesn't swing the sizing. 20-120 days are all common; 60 is the middle. |
| `trend_ma_days` | 200 | The best-known long-term trend rule. I'm not claiming it's optimal. Using the standard value instead of a tuned one is itself a defence against overfitting. |
| `trend_off_multiplier` | 0.5 | Below the MA you *reduce* exposure instead of exiting, as you asked. Halving cuts most of the downtrend risk while limiting the cost when the signal whipsaws, which trend filters do often. The walk-forward also tests 0 (full exit) and 1 (filter off). |
| `rebalance` | monthly | More often adds costs without a measurable benefit at this size; quarterly lets the trend filter react too slowly. |
| `rebalance_band` | 1% | Skips trades worth less than 1% of the portfolio ($50 at $5k). Saves fees on noise. |
| `min_trade_usd` | $10 | Below this, fees and rounding dominate. |
| `cash_buffer` | 1% | Room for fees, rounding and price moves between sizing and filling, so a buy can never need more cash than exists. |
| `equity_guard_multiple` | 2x | Refuses to run on an account worth more than $10k: protects against the $100k paper default or a different live account. |
| **Costs:** equities 1 bp fee + 5 bp slippage | | Alpaca charges no stock commission, but you pay the spread plus tiny SEC/FINRA fees. 5 bp is conservative for VTI/BND-sized ETFs. |
| **Costs:** crypto 25 bp fee + 10 bp slippage | | Alpaca's crypto taker fee at the lowest volume tier is about 0.25%, plus spread. |
| `daily_loss_limit_pct` | 5% (yours) | A diversified, vol-targeted portfolio should almost never fall 5% in a day, so hitting it means something abnormal (a crash, or a bug). The halt **latches**: it stays on until you run `resume`. |

## The backtest

```bash
python -m investbot backtest            # Yahoo Finance data via yfinance, from 2011
python -m investbot backtest --csv my_prices.csv   # or your own data (date + one column per symbol)
```

* **Walk-forward, out-of-sample.** The history is cut into rolling windows: 3 years
  to *choose* parameters from a small grid (4 vol targets x 3 trend settings = 12
  combinations), then the next 1 year is traded with those parameters frozen. The
  window then slides forward a year. The reported strategy curve only joins those
  unseen test years (about 11-12 years starting late 2014).
* **Fixed-default run:** the same period with the config defaults, no optimisation at all.
* **Benchmarks:** buy-and-hold VTI, and buy-and-hold of the policy mix with no rebalancing.
* **Includes fees and slippage** on every trade, a 0% return on cash (conservative), and
  the daily-loss halt. Every simulated order passes through the same `RiskManager` as live
  trading.
* **Reports:** annual return (CAGR), volatility, Sharpe, max drawdown, Calmar, calendar-year
  returns, per-fold picks, costs, turnover. Saved to `reports/` as `.md`, `.json` and CSV
  equity curves.
* **Overfitting check with a plain verdict.** It warns when:
  out-of-sample Sharpe is under half (or under 75%) of in-sample; the "best" parameters keep
  changing between folds; optimising did no better than the fixed defaults; there are fewer
  than 5 out-of-sample years; the difference vs buy-and-hold is within one standard error of
  the Sharpe ratio (i.e. statistically indistinguishable); the strategy returned less than
  buy-and-hold; or results swing a lot across the grid. If the verdict is **LOOKS OVERFIT**,
  `--live` refuses to start.

What to expect, honestly: rules like these are mainly designed to **cut drawdowns**, not to
beat the S&P 500. In long bull markets the strategy will usually return *less* than 100% VTI,
because it holds bonds, gold and some cash. Judge it on max drawdown and Sharpe, not raw return.

Data caveats: VXUS starts in 2011, BTC in Yahoo's data in late 2014 and ETH in late 2017.
Before an asset has 200 days of history its target weight is 0 and that money sits in cash.
Yahoo's crypto closes are at UTC midnight, a few hours after the US stock close.

## Hard risk limits (enforced in code, tested)

All of these live in `investbot/risk.py`. **Every** order, live or simulated, goes through
`RiskManager.check_order`, and the kill switch and halt are re-checked before *each* order.

| Limit | How it's enforced | Tests |
|---|---|---|
| No shorting | A sell can't exceed the quantity held; selling something not held is rejected; negative weights are clipped to 0 and rejected in config. The bot also sets Alpaca's `no_shorting` account flag. | `test_sell_*`, `test_negative_*` |
| No margin / leverage | Buys are checked against **cash**, never buying power; negative cash blocks all buys; weights can't sum above 1; vol scaling is capped at 1x. The bot sets Alpaca's `max_margin_multiplier=1`. The backtest asserts cash never goes negative. | `test_buy_exceeding_cash_*`, `test_weights_never_sum_above_one`, `test_simulation_never_levers_or_shorts` |
| No options | Only `us_equity`/`crypto` asset classes from an allow-list of configured symbols; OCC option symbols rejected; config rejects any other class. The bot sets Alpaca's options level to 0. | `test_option_*`, `test_symbol_outside_universe_blocked` |
| Max 20% crypto | Target weights clipped; any buy that would take crypto over 20% is rejected; rallies over the cap are trimmed. | `test_crypto_*`, `test_crypto_rally_over_cap_gets_trimmed_between_rebalances` |
| Max 60% per asset | Same three layers. | `test_single_asset_*` |
| 5% daily loss halt | Equity vs Alpaca's `last_equity` (yesterday's close). Hitting it cancels open orders, writes `state/HALTED.json`, alerts you, and blocks every order until `python -m investbot resume`. | `test_daily_loss_*` |
| Kill switch | If the file `KILL_SWITCH` exists, the bot cancels open orders and does nothing else. Checked at startup and before each order, so creating it mid-run stops the remaining orders. | `test_kill_switch_*` |

```bash
python -m investbot kill --reason "going on holiday"    # or: touch KILL_SWITCH
python -m investbot unkill
python -m investbot resume                               # clears a daily-loss halt
```

The bot never touches positions in the account that aren't in its universe.

## Rollout: paper first, live only with `--live`

* `python -m investbot run` always uses the **paper** endpoint and `ALPACA_PAPER_*` keys.
* `python -m investbot run --live` uses the live endpoint and **separate** `ALPACA_LIVE_*`
  keys, and refuses unless:
  * a backtest report less than 90 days old exists, and its verdict isn't "LOOKS OVERFIT";
  * paper trading started **30+ days ago** with **15+ successful runs** (tracked in
    `state/paper_runs.json`).
* There is no config option that enables live trading. Only the flag does.

## Running it automatically on GitHub Actions (no computer needed)

`.github/workflows/investbot.yml` runs the bot every weekday on GitHub's servers. Each run:

1. Runs the full test suite. **If any risk-limit test fails, it doesn't trade.**
2. Re-runs the backtest if the latest one is missing or over 30 days old.
3. Runs `investbot run --once-per-day` (paper unless you opt into live, see below).
4. Commits the bot's state (paper history, daily-loss halt, last rebalance, `logs/trades.jsonl`,
   backtest reports) to a separate **`investbot-state`** branch, so nothing is lost between runs
   and you can read the trade log on GitHub.

GitHub cron is UTC-only and sometimes starts late, so the workflow fires at 14:45 and 15:45 UTC and
the second firing is a no-op if the first succeeded. That's 10:45 New York time in summer and 9:45 in
winter.

**One-time setup:**

1. **Get the workflow onto the default branch.** GitHub only runs scheduled workflows from the
   repo's default branch. Merge this branch there (or change the default branch).
2. **Add secrets** (repo → Settings → Secrets and variables → Actions → *New repository secret*):
   `ALPACA_PAPER_API_KEY`, `ALPACA_PAPER_SECRET_KEY`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`,
   `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `ALERT_EMAIL_TO`. Add the
   `ALPACA_LIVE_*` keys only when you decide to go live.
3. **Reset the Alpaca paper account to $5,000** (the bot refuses to run on more than $10k).
4. **First run:** Actions tab → *investbot daily run* → *Run workflow* → `backtest`, then read the
   report in `reports/` on the `investbot-state` branch.

**Controls (all from the GitHub website or app):**

| To... | Do this |
|---|---|
| Stop all trading immediately | Settings → Secrets and variables → Actions → *Variables* → set `INVESTBOT_KILL_SWITCH` = `on`. Delete it (or set it to `off`) to re-enable. Or disable the workflow in the Actions tab. |
| Clear a daily-loss halt | Actions → *Run workflow* → `resume` |
| Force a new backtest | Actions → *Run workflow* → `backtest` |
| Go live (after 30+ days of paper) | Add the `ALPACA_LIVE_*` secrets and set variable `INVESTBOT_MODE` = `live`. The bot's own gate still refuses until paper history, run count and backtest verdict all pass. |
| See what it did | the `investbot-state` branch (`logs/trades.jsonl`), each run's summary in the Actions tab, and your Telegram/email alerts |

If a run fails (for example, missing keys or the data source down), GitHub emails you about the failed
workflow and the bot sends an alert where it can.

## Operations (on your own machine)

* **Schedule:** `deploy/crontab.example` (cron) or `deploy/investbot.{service,timer}`
  (systemd) runs `deploy/run_daily.sh` at 10:15 New York time each weekday. That's 45
  minutes after the open, once opening-auction noise has settled. On holidays the bot sees the
  market is closed and only monitors. To go live later, set `INVESTBOT_MODE_FLAGS=--live`.
* **Trade log:** every order (filled, blocked or failed) is appended to `logs/trades.jsonl`
  with its reason, e.g. `monthly rebalance: VTI 31.0% -> 45.0% (base 45%, above 200d MA;
  vol scale x1.00 ...)`. Full run logs go to `logs/investbot.log`.
* **Alerts (Telegram and email):** on every order (with the reason), every blocked order,
  any portfolio or holding move of 5%+ on the day, any halt or kill switch, and any crash.
  A channel with missing env vars is skipped with a log warning. Alerts never crash the bot.

Telegram setup: message @BotFather and send `/newbot` to get a token, send your bot a
message, then get your chat id (e.g. from @userinfobot). Email: for Gmail, create an App
Password and use `smtp.gmail.com:587`.

## Layout

```
investbot/
  config.toml          all parameters (no secrets)
  investbot/
    config.py          loading + validation (rejects leverage/short/option configs)
    strategy.py        target weights + order planning (shared by backtest and live)
    risk.py            hard limits, kill switch, daily-loss latch
    backtest.py        walk-forward engine, metrics, overfitting diagnostics
    data.py            yfinance / Alpaca / CSV prices, calendar alignment
    broker.py          Alpaca wrapper
    trader.py          the daily run + rollout gates + trade log
    alerts.py          Telegram + email
    cli.py             command line
  tests/               pytest suite
  deploy/              cron / systemd
```
