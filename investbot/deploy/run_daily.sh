#!/usr/bin/env bash
# Daily entry point for cron/systemd. Paper by default.
# To go live (only after 30+ days of paper trading), change MODE_FLAGS to "--live".
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p logs
MODE_FLAGS="${INVESTBOT_MODE_FLAGS:-}"
# Use the project's virtualenv if there is one.
PY="python3"; [ -x .venv/bin/python ] && PY=".venv/bin/python"
exec "$PY" -m investbot run $MODE_FLAGS >> logs/cron.out 2>&1
