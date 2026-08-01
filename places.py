"""
Every saved place with coordinates, for the map.

Deliberately separate from trip.py: drawing pins must never invoke a language
model. This only reads the store and the geocode cache, so a warm map is
instant and a cold one costs one Nominatim call per unseen place.
"""

from __future__ import annotations

import json
import sys

import geocode
import store


def collect(limit_new: int = 12) -> list[dict]:
    """
    Located places across every vertical.

    `limit_new` caps how many UNCACHED lookups one request may perform.
    Nominatim's policy allows 1/sec, so an uncapped cold start on a large
    library would hang the page for minutes; cached entries are always free,
    so the map fills in over a few visits rather than blocking once.
    """
    out: list[dict] = []
    seen: set[str] = set()
    budget = limit_new

    def add(name, category, sub, shortcode, area=None, city=None, state=None):
        nonlocal budget
        key = f"{name}|{city or sub}".lower()
        if not name or key in seen:
            return
        seen.add(key)

        query = ", ".join(x for x in (name, area, city, state) if x)
        cached = geocode._load().get(f"{query}, India")
        if cached is None and budget <= 0:
            return  # not cached and out of budget: leave it for a later visit
        if cached is None:
            budget -= 1

        hit = geocode.geocode_with_fallback(name, area=area, city=city, state=state)
        if not hit:
            return
        out.append({
            "shortcode": shortcode,
            "name": name,
            "category": category,
            "sub": sub or "",
            "lat": hit.lat,
            "lon": hit.lon,
            "approximate": hit.approximate,
            "osm": hit.display_name,
        })

    for item in store.all_items():
        p = item.get("payload") or {}
        cat = item.get("category")

        if cat == "food_spot" and p.get("place_name"):
            add(p["place_name"], "food_spot",
                ", ".join(x for x in (p.get("area"), p.get("city")) if x),
                item["shortcode"], area=p.get("area"), city=p.get("city"),
                state=p.get("state"))

        elif cat == "travel":
            dest = p.get("destination")
            for pl in p.get("places") or []:
                add(pl.get("name"), "travel", dest or "", item["shortcode"],
                    area=pl.get("area"), city=dest, state=p.get("state"))

    return out


if __name__ == "__main__":
    real = sys.stdout
    if "--json" in sys.argv:
        sys.stdout = sys.stderr
    data = collect()
    print(json.dumps({"places": data}), file=real)
