"""
Notification delivery: Telegram, email, WhatsApp.

Channel notes, because "free" means very different things here:

  TELEGRAM  — genuinely free, no approval, no domain, no business account. A bot
              token from @BotFather and a chat id, and you are sending. This is
              the default and the one to demo.

  EMAIL     — free via SMTP with any provider. Gmail works with an App Password
              (needs 2FA on the account); ~500 messages/day is far beyond what
              this app sends.

  WHATSAPP  — the awkward one. Meta's official Cloud API needs a Business
              account, a dedicated number, and *pre-approved templates* for any
              business-initiated message, which a deadline reminder is. That is
              days of setup, not hackathon work. CallMeBot is a free relay that
              sends WhatsApp messages to your OWN number after you authorise it
              once; unofficial and rate-limited, but it costs nothing and works
              for personal reminders. Both are supported; neither is the default.

Every channel is optional. Configure none and messages print to the console,
which keeps the pipeline testable without any credentials.
"""

from __future__ import annotations

import os
import smtplib
import ssl
import urllib.parse
import urllib.request
from dataclasses import dataclass
from email.message import EmailMessage

TIMEOUT = 15


@dataclass
class Result:
    channel: str
    ok: bool
    detail: str = ""


# ─────────────────────────────────────────────────────────────────────────────
# Telegram
# ─────────────────────────────────────────────────────────────────────────────

def telegram_enabled() -> bool:
    return bool(os.getenv("TELEGRAM_BOT_TOKEN") and os.getenv("TELEGRAM_CHAT_ID"))


def send_telegram(text: str) -> Result:
    token = os.getenv("TELEGRAM_BOT_TOKEN", "")
    chat_id = os.getenv("TELEGRAM_CHAT_ID", "")
    if not (token and chat_id):
        return Result("telegram", False, "not configured")

    payload = urllib.parse.urlencode({
        "chat_id": chat_id,
        "text": text,
        "parse_mode": "HTML",
        # Reminders carry registration links; letting Telegram unfurl them turns a
        # tidy list into a wall of link previews.
        "disable_web_page_preview": "true",
    }).encode()

    url = f"https://api.telegram.org/bot{token}/sendMessage"
    try:
        with urllib.request.urlopen(url, data=payload, timeout=TIMEOUT) as r:
            return Result("telegram", r.status == 200, f"HTTP {r.status}")
    except Exception as e:
        return Result("telegram", False, f"{type(e).__name__}: {str(e)[:120]}")


# ─────────────────────────────────────────────────────────────────────────────
# Email (SMTP)
# ─────────────────────────────────────────────────────────────────────────────

def email_enabled() -> bool:
    return bool(os.getenv("SMTP_HOST") and os.getenv("SMTP_USER")
                and os.getenv("SMTP_PASSWORD") and os.getenv("EMAIL_TO"))


def send_email(subject: str, text: str, html: str | None = None) -> Result:
    host = os.getenv("SMTP_HOST", "")
    port = int(os.getenv("SMTP_PORT", "587"))
    user = os.getenv("SMTP_USER", "")
    password = os.getenv("SMTP_PASSWORD", "")
    to = os.getenv("EMAIL_TO", "")
    sender = os.getenv("EMAIL_FROM") or user

    if not (host and user and password and to):
        return Result("email", False, "not configured")

    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = sender
    msg["To"] = to
    msg.set_content(text)
    if html:
        msg.add_alternative(html, subtype="html")

    try:
        if port == 465:
            with smtplib.SMTP_SSL(host, port, timeout=TIMEOUT,
                                  context=ssl.create_default_context()) as s:
                s.login(user, password)
                s.send_message(msg)
        else:
            with smtplib.SMTP(host, port, timeout=TIMEOUT) as s:
                s.starttls(context=ssl.create_default_context())
                s.login(user, password)
                s.send_message(msg)
        return Result("email", True, f"sent to {to}")
    except Exception as e:
        return Result("email", False, f"{type(e).__name__}: {str(e)[:120]}")


# ─────────────────────────────────────────────────────────────────────────────
# WhatsApp
# ─────────────────────────────────────────────────────────────────────────────

def whatsapp_enabled() -> bool:
    return bool(
        (os.getenv("CALLMEBOT_PHONE") and os.getenv("CALLMEBOT_APIKEY"))
        or (os.getenv("WHATSAPP_TOKEN") and os.getenv("WHATSAPP_PHONE_ID")
            and os.getenv("WHATSAPP_TO"))
    )


def send_whatsapp(text: str) -> Result:
    # Official Cloud API first when configured — it is the supported path.
    token = os.getenv("WHATSAPP_TOKEN")
    phone_id = os.getenv("WHATSAPP_PHONE_ID")
    to = os.getenv("WHATSAPP_TO")
    if token and phone_id and to:
        import json
        body = json.dumps({
            "messaging_product": "whatsapp",
            "to": to,
            "type": "text",
            "text": {"body": text[:4000]},
        }).encode()
        req = urllib.request.Request(
            f"https://graph.facebook.com/v21.0/{phone_id}/messages",
            data=body,
            headers={"Authorization": f"Bearer {token}",
                     "Content-Type": "application/json"},
        )
        try:
            with urllib.request.urlopen(req, timeout=TIMEOUT) as r:
                return Result("whatsapp", r.status == 200, f"HTTP {r.status}")
        except Exception as e:
            # A 24h-window / template error is the usual cause here, not a bug.
            return Result("whatsapp", False,
                          f"{type(e).__name__}: {str(e)[:160]}")

    # CallMeBot: free, unofficial, self-notifications only.
    phone = os.getenv("CALLMEBOT_PHONE")
    apikey = os.getenv("CALLMEBOT_APIKEY")
    if phone and apikey:
        qs = urllib.parse.urlencode({
            "phone": phone, "text": text[:900], "apikey": apikey,
        })
        try:
            with urllib.request.urlopen(
                f"https://api.callmebot.com/whatsapp.php?{qs}", timeout=TIMEOUT
            ) as r:
                return Result("whatsapp", r.status == 200, f"HTTP {r.status}")
        except Exception as e:
            return Result("whatsapp", False, f"{type(e).__name__}: {str(e)[:120]}")

    return Result("whatsapp", False, "not configured")


# ─────────────────────────────────────────────────────────────────────────────

def enabled_channels() -> list[str]:
    out = []
    if telegram_enabled():
        out.append("telegram")
    if email_enabled():
        out.append("email")
    if whatsapp_enabled():
        out.append("whatsapp")
    return out


def send(subject: str, text: str, html: str | None = None,
         channels: list[str] | None = None, dry_run: bool = False) -> list[Result]:
    """
    Fan out to every configured channel.

    One failing channel never stops the others: a broken SMTP password should not
    swallow the Telegram reminder that would actually have reached the user.
    """
    targets = channels or enabled_channels()

    if dry_run or not targets:
        reason = "dry run" if dry_run else "no channels configured"
        print(f"\n─── notification ({reason}) ───\n{subject}\n\n{text}\n───")
        return [Result("console", True, reason)]

    results = []
    for ch in targets:
        if ch == "telegram":
            results.append(send_telegram(f"<b>{_esc(subject)}</b>\n\n{text}"))
        elif ch == "email":
            results.append(send_email(subject, text, html))
        elif ch == "whatsapp":
            results.append(send_whatsapp(f"*{subject}*\n\n{_strip_html(text)}"))
    return results


def format_saved(record: dict) -> tuple[str, str]:
    """
    Confirmation for a reel that was just processed, whatever vertical it hit.

    Sent immediately rather than batched: the user pasted a link seconds ago and
    is waiting to see it landed. That is the opposite of a deadline reminder,
    which should be batched and rare.
    """
    cat = record.get("category")
    title = record.get("title") or "Untitled"
    p = record.get("payload") or {}

    if cat == "deadline":
        lines = [f"⏰ Saved: {title}"]
        if record.get("organisation"):
            lines.append(record["organisation"])
        if record.get("deadline_date"):
            lines.append(f"Deadline: {record['deadline_date']}")
        else:
            lines.append("No deadline stated in the reel")
        for link in (record.get("registration_links") or [])[:2]:
            lines.append(f"Apply: {link}")
        if not record.get("registration_links") and record.get("link_in_bio"):
            lines.append(f"Link in @{record.get('owner')}'s bio")
        subject = f"Saved: {title}"

    elif cat == "food_spot":
        where = ", ".join(x for x in (record.get("area"), record.get("city")) if x)
        lines = [f"🍽 Saved: {title}"]
        if where:
            lines.append(where)
        if p.get("dishes"):
            lines.append("Dishes: " + ", ".join(p["dishes"][:5]))
        for offer in (p.get("offers") or [])[:2]:
            lines.append(f"Offer: {offer}")
        if p.get("contact"):
            lines.append(f"Phone: {p['contact']}")
        if where:
            q = urllib.parse.quote(f"{title}, {where}")
            lines.append(
                f"Map: https://www.google.com/maps/search/?api=1&query={q}")
        subject = f"Saved: {title}"

    else:
        lines = [f"📌 Saved: {title}"]
        subject = f"Saved: {title}"

    lines.append(f"Reel: {record.get('url')}")
    return subject, "\n".join(lines)


def notify_saved(record: dict, dry_run: bool = False) -> list[Result]:
    subject, text = format_saved(record)
    return send(subject, text, dry_run=dry_run)


def _esc(s: str) -> str:
    return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def _strip_html(s: str) -> str:
    import re
    return re.sub(r"<[^>]+>", "", s)


if __name__ == "__main__":
    import sys
    dry = "--dry-run" in sys.argv
    print("configured channels:", enabled_channels() or "(none)")
    for r in send("ReelBrain test",
                  "If you can read this, the channel works.", dry_run=dry):
        print(f"  {r.channel:<10} {'OK' if r.ok else 'FAIL'}  {r.detail}")
