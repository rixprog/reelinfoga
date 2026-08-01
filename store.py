"""
Flat-file store for processed reels.

A JSON file, not Postgres, on purpose: the whole point of purging the media is
that a reel reduces to a couple of KB of extracted fields, so the entire saved
library fits comfortably in one file and needs no service to run. Swapping this
for Postgres later is a change to four functions.
"""

from __future__ import annotations

import json
import tempfile
from datetime import date, datetime
from pathlib import Path
from typing import Any

import config

INDEX = config.OUT / "index.json"


def _load() -> list[dict]:
    if not INDEX.exists():
        return []
    try:
        return json.loads(INDEX.read_text())
    except (json.JSONDecodeError, OSError):
        return []


def _save(items: list[dict]) -> None:
    config.OUT.mkdir(parents=True, exist_ok=True)
    # Write via a temp file in the same directory, then replace. A half-written
    # index would take the whole saved library with it.
    fd, tmp = tempfile.mkstemp(dir=str(config.OUT), suffix=".tmp")
    try:
        with open(fd, "w") as f:
            json.dump(items, f, indent=2, ensure_ascii=False, default=str)
        Path(tmp).replace(INDEX)
    except Exception:
        Path(tmp).unlink(missing_ok=True)
        raise


def upsert(record: dict) -> dict:
    """Keyed on shortcode, so re-analysing a reel updates rather than duplicates."""
    items = _load()
    key = record.get("shortcode")
    for i, existing in enumerate(items):
        if existing.get("shortcode") == key:
            record["saved_at"] = existing.get("saved_at", record.get("saved_at"))
            items[i] = record
            break
    else:
        items.append(record)
    _save(items)
    return record


def all_items() -> list[dict]:
    return _load()


def get(shortcode: str) -> dict | None:
    return next((i for i in _load() if i.get("shortcode") == shortcode), None)


def remove(shortcode: str) -> bool:
    items = _load()
    kept = [i for i in items if i.get("shortcode") != shortcode]
    if len(kept) == len(items):
        return False
    _save(kept)
    return True


def upcoming(limit: int | None = None) -> list[dict]:
    """
    Deadline items sorted by urgency, soonest first.

    Undated opportunities sort last rather than being dropped: "applications open,
    link in bio" with no stated date is still something the user saved on purpose.
    """
    items = [i for i in _load() if i.get("category") == "deadline"]

    def key(item: dict):
        d = item.get("deadline_date")
        if not d:
            return (2, "9999-12-31")
        return (1 if item.get("deadline_passed") else 0, d)

    items.sort(key=key)
    return items[:limit] if limit else items


def build_record(*, shortcode: str, url: str, category: str, reel: dict,
                 transcript: dict, payload: dict, model: str) -> dict:
    """Flatten one extraction into the row the UI and reminders read."""
    record: dict[str, Any] = {
        "shortcode": shortcode,
        "url": url,
        "category": category,
        "owner": reel.get("owner"),
        "caption": reel.get("caption"),
        "hashtags": reel.get("hashtags") or [],
        "likes": reel.get("likes"),
        "thumbnail": reel.get("thumbnail_path"),
        "language": transcript.get("language"),
        "transcript_english": transcript.get("english"),
        "model": model,
        "saved_at": datetime.now().isoformat(timespec="seconds"),
        "payload": payload,
    }

    if category == "deadline":
        record.update({
            "title": payload.get("title"),
            "organisation": payload.get("organisation"),
            "opportunity_type": payload.get("opportunity_type"),
            "deadline_date": payload.get("deadline_date"),
            "deadline_text": payload.get("deadline_text"),
            "event_date": payload.get("event_date"),
            "deadline_passed": payload.get("deadline_passed"),
            "registration_links": payload.get("registration_links") or [],
            "link_in_bio": payload.get("link_in_bio"),
            "confidence": payload.get("confidence"),
        })
    elif category == "travel":
        record.update({
            "title": payload.get("destination"),
            "destination": payload.get("destination"),
            "state": payload.get("state"),
            "best_season": payload.get("best_season"),
            "place_count": len(payload.get("places") or []),
            "confidence": payload.get("confidence"),
        })
    elif category == "food_spot":
        record.update({
            "title": payload.get("place_name"),
            "city": payload.get("city"),
            "area": payload.get("area"),
            "confidence": payload.get("confidence"),
        })
    else:
        record["title"] = payload.get("title") or payload.get("place_name")

    return record


# ─────────────────────────────────────────────────────────────────────────────
# Calendar export
# ─────────────────────────────────────────────────────────────────────────────

ICS_DIR = config.OUT / "ics"


def write_ics(record: dict) -> Path | None:
    """
    Materialise the calendar file at save time.

    Generating it here rather than in the web layer keeps one implementation of
    the RFC 5545 details (folding, exclusive DTEND, alarms); the route just serves
    the file.
    """
    if record.get("category") != "deadline" or not record.get("deadline_date"):
        return None
    try:
        ics = to_ics(record)
    except ValueError:
        return None
    ICS_DIR.mkdir(parents=True, exist_ok=True)
    path = ICS_DIR / f"{record['shortcode']}.ics"
    path.write_text(ics)
    return path


def _ics_escape(text: str) -> str:
    return (text.replace("\\", "\\\\").replace(";", r"\;")
                .replace(",", r"\,").replace("\n", r"\n"))


def _fold(line: str) -> str:
    """RFC 5545 caps lines at 75 octets; continuations start with a space."""
    out, current = [], line
    while len(current.encode()) > 73:
        cut = 73
        while len(current[:cut].encode()) > 73:
            cut -= 1
        out.append(current[:cut])
        current = " " + current[cut:]
    out.append(current)
    return "\r\n".join(out)


def to_ics(item: dict, reminder_days: int = 2) -> str:
    """
    One VEVENT for the deadline, with alarms.

    An all-day VEVENT plus VALARMs is deliberately low-tech: it needs no push
    infrastructure, no service worker and no server running at the right moment.
    The user's own calendar does the reminding, on every device they already own.
    """
    deadline = item.get("deadline_date")
    if not deadline:
        raise ValueError("Item has no deadline_date")

    d = datetime.strptime(deadline, "%Y-%m-%d").date()
    payload = item.get("payload") or {}

    title = item.get("title") or "Saved opportunity"
    summary = f"Deadline: {title}"

    desc_parts = [payload.get("description") or ""]
    if item.get("organisation"):
        desc_parts.append(f"Organisation: {item['organisation']}")
    if payload.get("eligibility"):
        desc_parts.append(f"Eligibility: {payload['eligibility']}")
    if payload.get("fee"):
        desc_parts.append(f"Fee: {payload['fee']}")
    for link in item.get("registration_links") or []:
        desc_parts.append(f"Apply: {link}")
    if item.get("link_in_bio"):
        desc_parts.append("Registration link is in the creator's Instagram bio.")
    desc_parts.append(f"Saved from: {item.get('url')}")

    stamp = datetime.now().strftime("%Y%m%dT%H%M%SZ")
    uid = f"{item.get('shortcode')}@reelbrain"

    lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//ReelBrain//Deadline//EN",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH",
        "BEGIN:VEVENT",
        f"UID:{uid}",
        f"DTSTAMP:{stamp}",
        # All-day event: DTEND is exclusive, so it must be the following day.
        f"DTSTART;VALUE=DATE:{d.strftime('%Y%m%d')}",
        f"DTEND;VALUE=DATE:{(d.toordinal() + 1) and date.fromordinal(d.toordinal() + 1).strftime('%Y%m%d')}",
        f"SUMMARY:{_ics_escape(summary)}",
        f"DESCRIPTION:{_ics_escape(chr(10).join(p for p in desc_parts if p))}",
    ]

    links = item.get("registration_links") or []
    if links:
        lines.append(f"URL:{_ics_escape(links[0])}")
    if payload.get("location"):
        lines.append(f"LOCATION:{_ics_escape(payload['location'])}")

    for days, label in ((reminder_days, f"{reminder_days} days left"),
                        (0, "Deadline today")):
        lines += [
            "BEGIN:VALARM",
            "ACTION:DISPLAY",
            f"DESCRIPTION:{_ics_escape(f'{label}: {title}')}",
            f"TRIGGER:-P{days}D" if days else "TRIGGER:-PT1H",
            "END:VALARM",
        ]

    lines += ["END:VEVENT", "END:VCALENDAR"]
    return "\r\n".join(_fold(l) for l in lines) + "\r\n"
