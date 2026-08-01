"""
Place name → coordinates, via OpenStreetMap Nominatim.

Nominatim is free and needs no key, which is why it is the default. It comes with
a usage policy we actually have to honour, and this module is built around it:

  · max 1 request/second — enforced globally, not per call site
  · a real User-Agent identifying the app — requests without one get blocked
  · cache aggressively — repeat lookups of the same place are the policy's
    single biggest complaint

Coverage for small Indian establishments is weaker than Google Places. A miss
returns None rather than a guess: a wrong pin on a map is worse than no pin,
because the user drives to it.
"""

from __future__ import annotations

import json
import tempfile
import time
import urllib.parse
import urllib.request
from dataclasses import dataclass, asdict, replace
from pathlib import Path

import config

CACHE = config.OUT / "geocode.json"
NOMINATIM = "https://nominatim.openstreetmap.org/search"

# Required by the usage policy — an anonymous UA gets 403'd.
USER_AGENT = "ReelBrain/0.1 (hackathon project; reel-to-map)"

MIN_INTERVAL = 1.1          # seconds between requests, per the 1/sec limit
_last_request = 0.0


@dataclass
class Place:
    query: str
    display_name: str
    lat: float
    lon: float
    osm_type: str | None = None
    osm_id: int | None = None
    category: str | None = None
    place_type: str | None = None
    importance: float | None = None
    # True when this is an area-level stand-in, not the venue itself. Callers
    # MUST surface this: an approximate pin looks identical to a real one on a
    # map, and someone will navigate to it.
    approximate: bool = False

    @property
    def osm_url(self) -> str:
        return f"https://www.openstreetmap.org/?mlat={self.lat}&mlon={self.lon}#map=17/{self.lat}/{self.lon}"


def _load() -> dict:
    if not CACHE.exists():
        return {}
    try:
        return json.loads(CACHE.read_text())
    except (json.JSONDecodeError, OSError):
        return {}


def _save(data: dict) -> None:
    config.OUT.mkdir(parents=True, exist_ok=True)
    fd, tmp = tempfile.mkstemp(dir=str(config.OUT), suffix=".tmp")
    try:
        with open(fd, "w") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        Path(tmp).replace(CACHE)
    except Exception:
        Path(tmp).unlink(missing_ok=True)
        raise


def _throttle() -> None:
    global _last_request
    gap = time.time() - _last_request
    if gap < MIN_INTERVAL:
        time.sleep(MIN_INTERVAL - gap)
    _last_request = time.time()


def geocode(name: str, *, area: str | None = None, city: str | None = None,
            state: str | None = None, country: str = "India") -> Place | None:
    """
    Resolve one place. Cached forever — geography does not move.

    Failures are cached too. Small eateries and waterfalls frequently are not in
    OSM at all, and re-querying every run for something that will never resolve
    just burns the rate limit other lookups need.
    """
    parts = [p for p in (name, area, city, state, country) if p]
    query = ", ".join(parts)
    if not name:
        return None

    cache = _load()
    if query in cache:
        entry = cache[query]
        return Place(**entry) if entry else None

    qs = urllib.parse.urlencode({
        "q": query,
        "format": "jsonv2",
        "limit": "1",
        "addressdetails": "0",
    })
    req = urllib.request.Request(f"{NOMINATIM}?{qs}",
                                 headers={"User-Agent": USER_AGENT})

    try:
        _throttle()
        with urllib.request.urlopen(req, timeout=20) as r:
            results = json.loads(r.read().decode())
    except Exception as e:
        print(f"[geocode] failed for {query!r} ({type(e).__name__}: {str(e)[:80]})")
        return None      # transient — do NOT cache, so it retries next run

    if not results:
        cache[query] = None
        _save(cache)
        print(f"[geocode] no match for {query!r}")
        return None

    top = results[0]
    place = Place(
        query=query,
        display_name=top.get("display_name", query),
        lat=float(top["lat"]),
        lon=float(top["lon"]),
        osm_type=top.get("osm_type"),
        osm_id=top.get("osm_id"),
        category=top.get("category"),
        place_type=top.get("type"),
        importance=top.get("importance"),
    )
    cache[query] = asdict(place)
    _save(cache)
    return place


def geocode_with_fallback(name: str, *, area=None, city=None, state=None,
                          country="India") -> Place | None:
    """
    Try most specific first, then widen.

    A small waterfall may not be in OSM by name, but its district always is —
    an area-level pin is genuinely useful for planning ("it's in this part of
    Wayanad") where a failed lookup gives the user nothing.
    """
    attempts = [
        dict(name=name, area=area, city=city, state=state),
        dict(name=name, city=city, state=state),
        dict(name=name, state=state),
    ]
    seen = set()
    for kwargs in attempts:
        key = tuple(sorted((k, v) for k, v in kwargs.items() if v))
        if key in seen:
            continue
        seen.add(key)
        hit = geocode(country=country, **kwargs)
        if hit:
            return hit

    # Last resort: the surrounding area. Useful for "roughly where in the
    # district", useless for navigation — so it is flagged, not returned as if
    # we had found the venue.
    if area or city:
        fallback = geocode(name=area or city, city=city if area else None,
                           state=state, country=country)
        if fallback:
            return replace(fallback, query=f"{name} (approx: {fallback.query})",
                           approximate=True)
    return None


def stats() -> dict:
    cache = _load()
    return {"cached": len(cache),
            "resolved": sum(1 for v in cache.values() if v),
            "misses": sum(1 for v in cache.values() if not v)}


if __name__ == "__main__":
    import sys
    for q in sys.argv[1:] or ["Soochipara Waterfalls, Wayanad, Kerala"]:
        p = geocode(q)
        print(f"{q!r}\n  -> {p.display_name if p else 'NO MATCH'}")
        if p:
            print(f"     {p.lat}, {p.lon}   {p.osm_url}")
