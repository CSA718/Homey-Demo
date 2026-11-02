"""Alerts via Telegram and/or email. Credentials come from environment variables only.

A channel whose env vars are missing is skipped (and logged once), so alerts
never crash the bot.
"""
from __future__ import annotations

import logging
import os
import smtplib
from email.message import EmailMessage

import requests

log = logging.getLogger(__name__)


class Alerter:
    def __init__(self, telegram: bool = True, email: bool = True, prefix: str = "[investbot]"):
        self.use_telegram = telegram
        self.use_email = email
        self.prefix = prefix
        self.sent: list[str] = []   # kept for tests / end-of-run summary

    # ---- channels --------------------------------------------------------
    def _telegram(self, text: str) -> bool:
        token = os.environ.get("TELEGRAM_BOT_TOKEN")
        chat = os.environ.get("TELEGRAM_CHAT_ID")
        if not (token and chat):
            return False
        r = requests.post(f"https://api.telegram.org/bot{token}/sendMessage",
                          json={"chat_id": chat, "text": text}, timeout=15)
        r.raise_for_status()
        return True

    def _email(self, subject: str, text: str) -> bool:
        host = os.environ.get("SMTP_HOST")
        user = os.environ.get("SMTP_USER")
        pw = os.environ.get("SMTP_PASSWORD")
        to = os.environ.get("ALERT_EMAIL_TO")
        if not (host and user and pw and to):
            return False
        msg = EmailMessage()
        msg["Subject"] = subject
        msg["From"] = user
        msg["To"] = to
        msg.set_content(text)
        with smtplib.SMTP(host, int(os.environ.get("SMTP_PORT", "587")), timeout=20) as s:
            s.starttls()
            s.login(user, pw)
            s.send_message(msg)
        return True

    # ---- public ----------------------------------------------------------
    def send(self, subject: str, body: str = "") -> None:
        text = f"{self.prefix} {subject}" + (f"\n\n{body}" if body else "")
        self.sent.append(text)
        log.info("ALERT: %s", text.replace("\n", " | "))
        delivered = False
        if self.use_telegram:
            try:
                delivered |= self._telegram(text)
            except Exception as e:  # noqa: BLE001
                log.error("telegram alert failed: %s", e)
        if self.use_email:
            try:
                delivered |= self._email(f"{self.prefix} {subject}", text)
            except Exception as e:  # noqa: BLE001
                log.error("email alert failed: %s", e)
        if not delivered:
            log.warning("alert not delivered to any channel (configure TELEGRAM_* or SMTP_* env vars)")
