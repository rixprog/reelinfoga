"""
Turn saved travel reels into a day-by-day plan.

Split of responsibilities, deliberately:

  GEOMETRY IS CODE. Geocoding, distances and visit order are computed here.
  Language models are unreliable at arithmetic over coordinates and will happily
  claim two places are "nearby" when they are 40 km apart — which is exactly the
  error that ruins a real trip.

  NARRATIVE IS THE MODEL. Once the route is fixed, the model is good at the part
  code is bad at: what to do first, where lunch fits, what to skip if it rains,
  how long the drive feels.

So: cluster and order algorithmically, then hand the model a settled route and
ask it to write the day.
"""

from __future__ import annotations

import json
import math
from dataclasses import dataclass, field

import extract as extract_mod
import geocode
import store


@dataclass
class Stop:
    name: str
    place_type: str
    description: str = ""
    area: str | None = None
    duration_minutes: int | None = None
    best_time_of_day: str | None = None
    entry_fee: str | None = None
    tips: str | None = None
    lat: float | None = None
    lon: float | None = None
    osm_name: str | None = None
    approximate: bool = False
    source_reel: str | None = None
    source_url: str | None = None

    @property
    def located(self) -> bool:
        return self.lat is not None and self.lon is not None


@dataclass
class Destination:
    name: str
    state: str | None = None
    stops: list[Stop] = field(default_factory=list)
    best_season: str | None = None

    @property
    def located_stops(self) -> list[Stop]:
        return [s for s in self.stops if s.located]


def haversine_km(a: Stop, b: Stop) -> float:
    """Straight-line distance. Road distance is longer, especially in the hills —
    this is for ORDERING stops, not for quoting travel times to the user."""
    R = 6371.0
    p1, p2 = math.radians(a.lat), math.radians(b.lat)
    dp = math.radians(b.lat - a.lat)
    dl = math.radians(b.lon - a.lon)
    h = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * R * math.asin(math.sqrt(h))


def collect_destinations(items: list[dict] | None = None) -> dict[str, Destination]:
    """
    Gather travel places from every saved reel, grouped by destination.

    Deduplicated by lowercased name: several reels about Wayanad will each name
    Soochipara, and the itinerary should send you there once.
    """
    items = items if items is not None else store.all_items()
    out: dict[str, Destination] = {}

    for item in items:
        if item.get("category") != "travel":
            continue
        payload = item.get("payload") or {}
        dest_name = (payload.get("destination") or "").strip()
        if not dest_name:
            continue

        dest = out.setdefault(dest_name, Destination(
            name=dest_name,
            state=payload.get("state"),
            best_season=payload.get("best_season"),
        ))
        seen = {s.name.strip().lower() for s in dest.stops}

        for p in payload.get("places") or []:
            name = (p.get("name") or "").strip()
            if not name or name.lower() in seen:
                continue
            seen.add(name.lower())
            dest.stops.append(Stop(
                name=name,
                place_type=p.get("place_type") or "other",
                description=p.get("description") or "",
                area=p.get("area"),
                duration_minutes=p.get("duration_minutes"),
                best_time_of_day=p.get("best_time_of_day"),
                entry_fee=p.get("entry_fee"),
                tips=p.get("tips"),
                source_reel=item.get("shortcode"),
                source_url=item.get("url"),
            ))

    return out


def locate(dest: Destination, verbose: bool = True) -> Destination:
    """Geocode every stop. Nominatim is throttled to 1/sec, so this takes a moment."""
    for s in dest.stops:
        if s.located:
            continue
        hit = geocode.geocode_with_fallback(
            s.name, area=s.area, city=dest.name, state=dest.state)
        if hit:
            s.lat, s.lon, s.osm_name = hit.lat, hit.lon, hit.display_name
            s.approximate = hit.approximate
            if verbose:
                mark = "~" if hit.approximate else "✓"
                note = "  (AREA ONLY — not the venue)" if hit.approximate else ""
                print(f"  {mark} {s.name} → {hit.lat:.4f}, {hit.lon:.4f}{note}")
        elif verbose:
            print(f"  ✗ {s.name} — not found on OpenStreetMap")
    return dest


def order_route(stops: list[Stop]) -> list[Stop]:
    """
    Nearest-neighbour ordering from the most central stop.

    Not optimal — TSP is not worth solving for eight waterfalls — but it reliably
    beats the order reels happened to be saved in, which is what the user would
    otherwise get. Starting from the centroid-nearest stop avoids anchoring the
    whole route to an outlier.
    """
    # Order by places we actually found. An approximate pin sits at the district
    # centroid, so letting it steer nearest-neighbour makes the real route worse;
    # it is appended afterwards instead.
    exact = [s for s in stops if s.located and not s.approximate]
    approx = [s for s in stops if s.located and s.approximate]
    located = exact
    if len(located) <= 2:
        return located + approx

    clat = sum(s.lat for s in located) / len(located)
    clon = sum(s.lon for s in located) / len(located)
    centre = Stop(name="_c", place_type="other", lat=clat, lon=clon)

    remaining = located[:]
    current = min(remaining, key=lambda s: haversine_km(centre, s))
    remaining.remove(current)
    route = [current]

    while remaining:
        nxt = min(remaining, key=lambda s: haversine_km(route[-1], s))
        remaining.remove(nxt)
        route.append(nxt)

    return route + approx


def split_days(route: list[Stop], days: int) -> list[list[Stop]]:
    """
    Balance stops across days by TIME, not by count.

    Three waterfalls with treks is a full day; six viewpoints is not. Splitting on
    count produces one exhausting day and one empty one.
    """
    if days <= 1 or len(route) <= 1:
        return [route]

    durations = [s.duration_minutes or 60 for s in route]
    total = sum(durations)
    target = total / days

    out: list[list[Stop]] = []
    current: list[Stop] = []
    acc = 0.0

    for stop, dur in zip(route, durations):
        # Keep the route contiguous: only break between days, never reorder,
        # or the plan starts zig-zagging across the district.
        if current and acc + dur / 2 > target and len(out) < days - 1:
            out.append(current)
            current, acc = [], 0.0
        current.append(stop)
        acc += dur

    if current:
        out.append(current)
    return out


# ─────────────────────────────────────────────────────────────────────────────
# Narrative
# ─────────────────────────────────────────────────────────────────────────────

ITINERARY_SCHEMA = {
    "type": "object",
    "properties": {
        "title": {"type": "string"},
        "overview": {"type": "string", "description": "2-3 sentences."},
        "days": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "day": {"type": "integer"},
                    "theme": {"type": "string"},
                    "items": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "time": {"type": "string",
                                         "description": "e.g. '08:00' or '13:30'"},
                                "stop_name": {
                                    "type": "string",
                                    "description": (
                                        "EXACTLY one of the stop names given, or "
                                        "'Meal'/'Travel' for filler entries."
                                    ),
                                },
                                "note": {"type": "string"},
                            },
                            "required": ["time", "stop_name", "note"],
                            "additionalProperties": False,
                        },
                    },
                },
                "required": ["day", "theme", "items"],
                "additionalProperties": False,
            },
        },
        "tips": {"type": "array", "items": {"type": "string"}},
    },
    "required": ["title", "overview", "days", "tips"],
    "additionalProperties": False,
}

ITINERARY_PROMPT = """\
You write a practical travel itinerary from a route that has ALREADY been fixed.

The stops, their order and the day-splits are given to you and are correct — they
were computed from real coordinates. Do not reorder stops, do not move them
between days, and do not invent stops that are not in the list. Your job is the
part that needs judgement, not arithmetic:

- assign sensible clock times, respecting each stop's best_time_of_day
- insert 'Meal' entries at plausible hours, and 'Travel' entries where the gap
  between two stops is large
- write a short, specific note for each stop, using its description and tips
- give each day a theme and add practical tips (footwear for treks, cash for
  entry fees, when to start to avoid crowds)

Be concrete and honest. Distances between consecutive stops are given in km,
straight-line — real road time in hilly terrain is often double, so leave slack
rather than promising a tight schedule.
"""


def narrate(dest: Destination, day_groups: list[list[Stop]]) -> dict:
    lines = [
        f"DESTINATION: {dest.name}" + (f", {dest.state}" if dest.state else ""),
        f"BEST SEASON: {dest.best_season or 'not stated'}",
        f"TRIP LENGTH: {len(day_groups)} day(s)",
        "",
    ]

    for i, group in enumerate(day_groups, 1):
        lines.append(f"=== DAY {i} (route order is fixed) ===")
        for j, s in enumerate(group):
            bits = [f"{j + 1}. {s.name} [{s.place_type}]"]
            if s.approximate:
                bits.append("LOCATION APPROXIMATE — area only")
            if s.duration_minutes:
                bits.append(f"~{s.duration_minutes} min")
            if s.best_time_of_day:
                bits.append(f"best: {s.best_time_of_day}")
            if s.entry_fee:
                bits.append(f"fee: {s.entry_fee}")
            lines.append("   " + " | ".join(bits))
            if s.description:
                lines.append(f"      {s.description[:200]}")
            if s.tips:
                lines.append(f"      tip: {s.tips[:160]}")
            if j + 1 < len(group):
                d = haversine_km(s, group[j + 1])
                lines.append(f"      ↓ {d:.1f} km straight-line to next stop")
        lines.append("")

    lines.append("Write the itinerary. Return JSON matching the schema.")

    result = extract_mod.run_extraction(
        ITINERARY_PROMPT, "\n".join(lines),
        video_path=None, frames=[], schema=ITINERARY_SCHEMA,
    )
    return result.payload


def build(destination: str, days: int = 1, items: list[dict] | None = None,
          verbose: bool = True) -> dict:
    dests = collect_destinations(items)
    dest = dests.get(destination)
    if not dest:
        raise ValueError(
            f"No saved travel reels for {destination!r}. "
            f"Have: {sorted(dests) or 'nothing yet'}")

    if verbose:
        print(f"[itinerary] {dest.name}: {len(dest.stops)} stop(s), geocoding…")
    locate(dest, verbose=verbose)

    route = order_route(dest.stops)
    unlocated = [s for s in dest.stops if not s.located]
    if not route:
        raise ValueError("None of the saved places could be found on OpenStreetMap.")

    groups = split_days(route, days)
    plan = narrate(dest, groups)

    return {
        "destination": dest.name,
        "state": dest.state,
        "best_season": dest.best_season,
        "days_requested": days,
        "plan": plan,
        "route": [
            {"day": di + 1, **{k: v for k, v in s.__dict__.items()}}
            for di, group in enumerate(groups) for s in group
        ],
        "unlocated": [s.name for s in unlocated],
    }


if __name__ == "__main__":
    import argparse
    import sys

    ap = argparse.ArgumentParser(description="Build a travel itinerary")
    ap.add_argument("destination", nargs="?")
    ap.add_argument("--days", type=int, default=1)
    ap.add_argument("--list", action="store_true")
    ap.add_argument("--json", action="store_true",
                    help="emit only JSON on stdout (progress goes to stderr)")
    args = ap.parse_args()

    if args.json:
        # Same contract as pipeline.py --json: stdout carries the payload and
        # nothing else, so the web layer can parse it without filtering chatter.
        real_stdout = sys.stdout
        sys.stdout = sys.stderr

    if args.list or not args.destination:
        dests = {name: len(d.stops) for name, d in collect_destinations().items()}
        if args.json:
            print(json.dumps({"destinations": [
                {"name": n, "stops": c} for n, c in sorted(dests.items())
            ]}), file=real_stdout)
        else:
            for name, count in sorted(dests.items()):
                print(f"  {name:<20} {count} stop(s)")
        raise SystemExit(0)

    try:
        out = build(args.destination, args.days, verbose=True)
    except ValueError as e:
        if args.json:
            print(json.dumps({"error": str(e)}), file=real_stdout)
            raise SystemExit(1)
        raise

    text = json.dumps(out, indent=2, ensure_ascii=False, default=str)
    print(text, file=real_stdout if args.json else sys.stdout)
