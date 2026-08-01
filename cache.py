"""
Persistent caches for the requests Instagram throttles hardest.

The most effective response to rate limiting is not to route around it but to
stop making the request. Two properties of this workload make that easy:

  · Saved reels cluster on a handful of creators. A student saving 40 internship
    reels is usually following ~5 accounts, so 40 bio fetches serve 5 bios.
  · Bios change slowly. A week-old bio is almost always still correct.

Cached on disk, not in memory, because every `python pipeline.py` is a fresh
process — an in-memory cache would be empty on every single reel.
"""

from __future__ import annotations

import json
import tempfile
import time
from pathlib import Path

import config

PROFILES = config.OUT / "profiles.json"

# Bios drift slowly; a week is a fair trade against hammering a throttled endpoint.
TTL_SECONDS = 7 * 24 * 3600

# After a failure, wait before trying that username again. Retrying a 429
# immediately is what turns a short throttle into a long one.
NEGATIVE_TTL_SECONDS = 30 * 60


def _load() -> dict:
    if not PROFILES.exists():
        return {}
    try:
        return json.loads(PROFILES.read_text())
    except (json.JSONDecodeError, OSError):
        return {}


def _save(data: dict) -> None:
    config.OUT.mkdir(parents=True, exist_ok=True)
    fd, tmp = tempfile.mkstemp(dir=str(config.OUT), suffix=".tmp")
    try:
        with open(fd, "w") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        Path(tmp).replace(PROFILES)
    except Exception:
        Path(tmp).unlink(missing_ok=True)
        raise


def get_profile(username: str) -> tuple[dict | None, str]:
    """
    Returns (profile_or_None, status) where status is one of:
      hit      — usable cached profile
      miss     — never fetched, or the entry expired
      cooldown — a recent fetch failed; don't retry yet
    """
    entry = _load().get(username)
    if not entry:
        return None, "miss"

    age = time.time() - entry.get("fetched_at", 0)

    if entry.get("failed"):
        return (None, "cooldown") if age < NEGATIVE_TTL_SECONDS else (None, "miss")

    if age > TTL_SECONDS:
        return None, "miss"

    return entry.get("data"), "hit"


def put_profile(username: str, data: dict | None) -> None:
    """`data=None` records a failure so we back off instead of retrying at once."""
    store = _load()
    store[username] = {
        "fetched_at": time.time(),
        "failed": data is None,
        "data": data,
    }
    _save(store)


def stats() -> dict:
    store = _load()
    now = time.time()
    fresh = sum(1 for e in store.values()
                if not e.get("failed") and now - e.get("fetched_at", 0) <= TTL_SECONDS)
    return {
        "profiles": len(store),
        "fresh": fresh,
        "failed": sum(1 for e in store.values() if e.get("failed")),
    }


def clear() -> None:
    PROFILES.unlink(missing_ok=True)
