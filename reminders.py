"""
Decide what is due and send it.

    python reminders.py --dry-run     # show what would go out
    python reminders.py               # actually send
    python reminders.py --digest      # everything upcoming, ignoring dedupe

Designed to be run once a day from cron:

    0 9 * * *  cd /home/rix/projects/reelbrain && .venv/bin/python reminders.py

Two behaviours worth knowing about:

  · Each (reel, milestone) fires exactly once. Without that, a daily cron would
    re-send the same "7 days left" every morning for a week and the user would
    mute the bot — which costs you every future reminder too.
  · A run sends ONE message containing everything due, not one per item. Three
    separate buzzes for three deadlines is how a useful tool becomes an annoying
    one.
"""

from __future__ import annotations

import argparse
import json
import tempfile
from datetime import date, datetime
from pathlib import Path

import config
import notify
import store

SENT_LOG = config.OUT / "sent.json"

# Milestones, in days before the deadline. Chosen to be actionable rather than
# noisy: a week out you can still prepare, two days out you can still apply, and
# the morning of is the last useful moment.
#
# ASCENDING ORDER IS LOAD-BEARING. due_items() takes the first milestone the item
# qualifies for, so this must run tightest-first. Ordered 7,2,0 an item closing
# today satisfies `days <= 7` and lands in the 7-day bucket — which, because the
# dedupe key is built from the threshold, means the user gets one warning a week
# out and then silence through the day it closes.
MILESTONES = [(0, "closes today"), (2, "2 days left"), (7, "7 days left")]


def _load_sent() -> dict:
    if not SENT_LOG.exists():
        return {}
    try:
        return json.loads(SENT_LOG.read_text())
    except (json.JSONDecodeError, OSError):
        return {}


def _save_sent(data: dict) -> None:
    config.OUT.mkdir(parents=True, exist_ok=True)
    fd, tmp = tempfile.mkstemp(dir=str(config.OUT), suffix=".tmp")
    try:
        with open(fd, "w") as f:
            json.dump(data, f, indent=2)
        Path(tmp).replace(SENT_LOG)
    except Exception:
        Path(tmp).unlink(missing_ok=True)
        raise


def days_until(iso: str | None) -> int | None:
    if not iso:
        return None
    try:
        return (datetime.strptime(iso, "%Y-%m-%d").date() - date.today()).days
    except (ValueError, TypeError):
        return None


def due_items(items: list[dict], sent: dict, ignore_sent: bool = False,
              all_upcoming: bool = False) -> list[dict]:
    """
    Deadline items that have crossed a milestone we have not notified for.

    `all_upcoming` drops the milestone filter entirely and returns everything
    still open — that is the digest view ("what's coming up"), which is a
    different question from "what should buzz the user's phone right now".
    """
    out = []
    for item in items:
        if item.get("category") != "deadline":
            continue
        days = days_until(item.get("deadline_date"))
        if days is None or days < 0:
            continue  # undated, or already closed

        if all_upcoming:
            label = ("closes today" if days == 0
                     else "closes tomorrow" if days == 1
                     else f"{days} days left")
            out.append({**item, "_days": days, "_label": label,
                        "_key": f"{item['shortcode']}:digest"})
            continue

        for threshold, label in MILESTONES:
            if days > threshold:
                continue
            key = f"{item['shortcode']}:d{threshold}"
            if not ignore_sent and key in sent:
                continue
            out.append({**item, "_days": days, "_label": label, "_key": key})
            break  # only the nearest milestone, never two for one item

    out.sort(key=lambda i: i["_days"])
    return out


def format_message(items: list[dict]) -> tuple[str, str, str]:
    """Returns (subject, text, html). Text doubles as the Telegram body."""
    n = len(items)
    soonest = items[0]["_days"]

    if n == 1:
        subject = f"⏰ {items[0]['_label'].capitalize()}: {items[0].get('title')}"
    elif soonest <= 0:
        subject = f"⏰ {n} deadlines — one closes today"
    else:
        subject = f"⏰ {n} deadlines coming up"

    lines, html = [], ["<ul>"]
    for i in items:
        when = ("closes TODAY" if i["_days"] == 0
                else "closes tomorrow" if i["_days"] == 1
                else f"{i['_days']} days left")
        title = i.get("title") or "Untitled"
        org = i.get("organisation")

        head = f"• {title}" + (f" — {org}" if org else "")
        lines.append(head)
        lines.append(f"  {when}  ({i.get('deadline_date')})")

        links = i.get("registration_links") or []
        if links:
            lines.append(f"  Apply: {links[0]}")
        elif i.get("link_in_bio"):
            lines.append(f"  Link in @{i.get('owner')}'s Instagram bio")
        lines.append(f"  Reel: {i.get('url')}")
        lines.append("")

        html.append(
            f"<li><b>{title}</b>{f' — {org}' if org else ''}<br>"
            f"<span style='color:#c00'>{when}</span> ({i.get('deadline_date')})<br>"
            + (f"<a href='{links[0]}'>Apply</a> · " if links else "")
            + f"<a href='{i.get('url')}'>Reel</a></li>"
        )
    html.append("</ul>")

    return subject, "\n".join(lines).rstrip(), "".join(html)


def _esc(s: str) -> str:
    return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def format_one(item: dict) -> str:
    """
    Everything needed to act, in one caption.

    A reminder that only says "closes in 2 days" sends the user back into the app
    to remember what it was, what it costs and where to apply. All of that is
    already extracted, so all of it goes in the message.
    """
    p = item.get("payload") or {}
    days = item["_days"]
    when = ("closes TODAY" if days == 0
            else "closes tomorrow" if days == 1
            else f"{days} days left")

    lines = [f"<b>{_esc(item.get('title') or 'Saved opportunity')}</b>"]

    sub = " · ".join(
        x for x in (item.get("organisation"), p.get("opportunity_type")) if x
    )
    if sub:
        lines.append(_esc(sub))

    lines.append("")
    lines.append(f"⏰ <b>{when}</b> — apply by {item.get('deadline_date')}")
    if p.get("event_date"):
        lines.append(f"📅 Event: {p['event_date']}")

    for label, key in (
        ("Eligibility", "eligibility"),
        ("Fee", "fee"),
        ("Prize", "prize"),
        ("Stipend", "stipend"),
        ("Location", "location"),
    ):
        if p.get(key):
            lines.append(f"{label}: {_esc(str(p[key]))}")

    links = item.get("registration_links") or []
    if links:
        lines.append("")
        lines.append(f"👉 Apply: {links[0]}")
    elif item.get("link_in_bio"):
        lines.append("")
        lines.append(f"👉 Link is in @{item.get('owner')}'s Instagram bio")

    if item.get("url"):
        lines.append(f"Reel: {item['url']}")

    return "\n".join(lines)


def send_rich(due: list[dict], dry_run: bool) -> list:
    """
    One message per deadline, each carrying its own thumbnail.

    Deadlines are rare and individually actionable, so a message each reads
    better than a digest — you see the poster and recognise it instantly. Past a
    handful that becomes spam, so a big batch falls back to one summary.
    """
    if dry_run or not notify.enabled_channels():
        subject, text, _ = format_message(due)
        return notify.send(subject, text, dry_run=dry_run)

    if len(due) > 4:
        subject, text, html = format_message(due)
        return notify.send(subject, text, html)

    results = []
    for item in due:
        caption = format_one(item)
        if notify.telegram_enabled():
            results.append(notify.send_telegram_photo(item.get("thumbnail"), caption))
        if notify.email_enabled():
            results.append(
                notify.send_email(
                    f"⏰ {item['_label'].capitalize()}: {item.get('title')}",
                    notify._strip_html(caption),
                )
            )
    return results


def run(dry_run: bool = False, digest: bool = False) -> int:
    items = store.all_items()
    sent = _load_sent()
    due = due_items(items, sent, ignore_sent=digest, all_upcoming=digest)

    if not due:
        total = sum(1 for i in items if i.get("category") == "deadline")
        print(f"Nothing due. ({total} deadline item(s) tracked)")
        return 0

    results = send_rich(due, dry_run)

    for r in results:
        print(f"  {r.channel:<10} {'OK' if r.ok else 'FAIL'}  {r.detail}")

    # Only record as sent if something actually got through. A failed send that
    # marks itself done means the user silently never hears about that deadline.
    delivered = any(r.ok and r.channel != "console" for r in results)
    # A digest is an on-demand summary, not a milestone — marking those as sent
    # would suppress the real reminder when the deadline actually gets close.
    if delivered and not dry_run and not digest:
        for i in due:
            sent[i["_key"]] = datetime.now().isoformat(timespec="seconds")
        _save_sent(sent)
        print(f"  recorded {len(due)} milestone(s) as sent")
    elif not delivered and not dry_run and not digest:
        print("  nothing delivered — milestones left unmarked so the next run "
              "retries")

    return 0 if delivered or dry_run else 1


def main() -> int:
    ap = argparse.ArgumentParser(description="Send due deadline reminders")
    ap.add_argument("--dry-run", action="store_true",
                    help="print instead of sending")
    ap.add_argument("--digest", action="store_true",
                    help="summary of everything still open, ignoring milestones "
                         "and dedupe (never marks anything as sent)")
    ap.add_argument("--test", action="store_true",
                    help="send a test message through every configured channel")
    args = ap.parse_args()

    if args.test:
        print("configured channels:", notify.enabled_channels() or "(none)")
        for r in notify.send("ReelBrain test",
                             "If you can read this, the channel works.",
                             dry_run=args.dry_run):
            print(f"  {r.channel:<10} {'OK' if r.ok else 'FAIL'}  {r.detail}")
        return 0

    return run(dry_run=args.dry_run, digest=args.digest)


if __name__ == "__main__":
    raise SystemExit(main())
