"""
Trip planning with costs, in two stages.

    STAGE 1 — rough_plan(destination)
        Runs the moment a travel reel is saved. No user input needed. Answers
        "is this trip worth considering and roughly what does it cost?"

    STAGE 2 — full_plan(destination, prefs)
        After the user says who is going, for how long, from where, and on what
        budget. Answers "here is the actual trip and what it will cost."

Two rules run through both:

  PROVENANCE. A price stated in the reel is DATA. A price we produce is an
  ESTIMATE. They are never merged into one number without saying which is which
  — the whole product is built on being able to show where a claim came from,
  and money is where a wrong claim actually costs the user something.

  REEL FIRST, MODEL SECOND. If the reel named places, those are the trip. Model
  knowledge only fills gaps — and anything it adds is marked `suggested`, so the
  UI can show "from your reel" separately from "we suggested this".
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field

import extract as extract_mod
import geocode
import itinerary as itin
import store

GROUP_TYPES = ["solo", "couple", "family", "friends"]
PACES = ["relaxed", "balanced", "packed"]
STAY_TYPES = ["budget", "mid", "premium"]
COST_CATEGORIES = ["transport", "local_travel", "stay", "food", "entry_fees",
                   "activities", "shopping", "buffer"]


@dataclass
class Prefs:
    days: int = 2
    travellers: int = 2
    group_type: str = "couple"
    origin: str | None = None          # matters enormously for transport cost
    budget_total: int | None = None    # INR, whole trip, all travellers
    pace: str = "balanced"
    stay_type: str = "mid"

    def describe(self) -> str:
        bits = [
            f"{self.travellers} traveller(s), {self.group_type}",
            f"{self.days} day(s)",
            f"pace: {self.pace}",
            f"stay: {self.stay_type}",
        ]
        if self.origin:
            bits.append(f"travelling from {self.origin}")
        else:
            bits.append("origin not given — exclude long-distance transport "
                        "from the total and say so")
        if self.budget_total:
            bits.append(f"TOTAL budget: ₹{self.budget_total:,} for the whole "
                        f"group and whole trip")
        else:
            bits.append("no budget given — produce a sensible mid-range estimate")
        return "; ".join(bits)


# ─────────────────────────────────────────────────────────────────────────────
# Shared schema fragments
# ─────────────────────────────────────────────────────────────────────────────

COST_ITEM = {
    "type": "object",
    "properties": {
        "category": {"type": "string", "enum": COST_CATEGORIES},
        "label": {"type": "string"},
        "amount_inr": {"type": "integer", "description": "Total INR for the group."},
        "basis": {
            "type": "string",
            "description": "How it was worked out, e.g. '₹1,800/night x 2 nights'.",
        },
        "source": {
            "type": "string",
            "enum": ["reel", "estimate"],
            "description": (
                "'reel' ONLY when the reel itself stated this price. Everything "
                "you worked out yourself is 'estimate'. Do not label an estimate "
                "as reel data."
            ),
        },
    },
    "required": ["category", "label", "amount_inr", "basis", "source"],
    "additionalProperties": False,
}

SUGGESTED_PLACE = {
    "type": "object",
    "properties": {
        "name": {
            "type": "string",
            "description": (
                "Real, map-resolvable name — it gets geocoded against "
                "OpenStreetMap. No invented or generic names."
            ),
        },
        "place_type": {"type": "string"},
        "why": {"type": "string", "description": "One line on why it is worth it."},
        "duration_minutes": {"type": ["integer", "null"]},
        "typical_entry_fee_inr": {"type": ["integer", "null"]},
    },
    "required": ["name", "place_type", "why", "duration_minutes",
                 "typical_entry_fee_inr"],
    "additionalProperties": False,
}


# ─────────────────────────────────────────────────────────────────────────────
# Stage 1 — rough plan
# ─────────────────────────────────────────────────────────────────────────────

ROUGH_SCHEMA = {
    "type": "object",
    "properties": {
        "destination": {"type": "string"},
        "overview": {"type": "string", "description": "2-3 sentences."},
        "suggested_days": {"type": "integer"},
        "best_season": {"type": ["string", "null"]},
        "nearest_transport_hub": {
            "type": ["string", "null"],
            "description": "Nearest airport or major railway station.",
        },
        "reel_covers_specific_places": {
            "type": "boolean",
            "description": (
                "True if the saved reels named actual places. False when they "
                "only said 'visit X' — in which case you are filling the gap."
            ),
        },
        "suggested_places": {
            "type": "array",
            "items": SUGGESTED_PLACE,
            "description": (
                "Well-known places to add. If the reels already named plenty, "
                "return few or none — the user's own saves come first."
            ),
        },
        "rough_cost": {
            "type": "object",
            "properties": {
                "per_person_low_inr": {"type": "integer"},
                "per_person_high_inr": {"type": "integer"},
                "excludes_long_distance_travel": {"type": "boolean"},
                "note": {"type": "string"},
            },
            "required": ["per_person_low_inr", "per_person_high_inr",
                         "excludes_long_distance_travel", "note"],
            "additionalProperties": False,
        },
        "reel_stated_prices": {
            "type": "array",
            "items": {"type": "string"},
            "description": "Prices the reels actually stated, quoted verbatim.",
        },
    },
    "required": ["destination", "overview", "suggested_days", "best_season",
                 "nearest_transport_hub", "reel_covers_specific_places",
                 "suggested_places", "rough_cost", "reel_stated_prices"],
    "additionalProperties": False,
}

ROUGH_PROMPT = """\
You produce a quick, honest first look at a trip, from reels the user saved.

Two situations, and you must tell them apart:

  (a) The reels named specific places ("we visited Soochipara, then Edakkal").
      Those places ARE the trip. Set reel_covers_specific_places true and add
      few or no suggestions — the user saved these on purpose.

  (b) The reels only named a destination ("you have to visit Munnar"). There is
      nothing concrete to plan yet. Set reel_covers_specific_places false and
      suggest the genuinely well-known places a first-time visitor would go to.

Every suggested name gets looked up on OpenStreetMap, so it must be a real,
specific, findable place. "Munnar tea gardens" is too vague; "Kolukkumalai Tea
Estate" is not. If you are not confident a place exists under that name, leave
it out.

rough_cost is a per-person range for a typical mid-range trip, EXCLUDING travel
to the region (which depends entirely on where they start from). Say so in the
note. Be realistic about Indian domestic prices — this is a hackathon project,
not a travel agency, and an inflated number is worse than a vague one.

reel_stated_prices: quote ONLY prices the reels actually stated. If they stated
none, return an empty array. Never move your own estimate into this field.
"""


def _reel_context(dest: itin.Destination, items: list[dict]) -> str:
    lines = [
        f"DESTINATION: {dest.name}" + (f", {dest.state}" if dest.state else ""),
        f"BEST SEASON (from reels): {dest.best_season or 'not stated'}",
        "",
        f"PLACES NAMED ACROSS {len(items)} SAVED REEL(S): {len(dest.stops)}",
    ]
    if dest.stops:
        for s in dest.stops:
            bits = [f"- {s.name} [{s.place_type}]"]
            if s.duration_minutes:
                bits.append(f"~{s.duration_minutes}min")
            if s.entry_fee:
                bits.append(f"entry stated in reel: {s.entry_fee}")
            lines.append(" | ".join(bits))
            if s.description:
                lines.append(f"    {s.description[:160]}")
            if s.tips:
                lines.append(f"    tip: {s.tips[:120]}")
    else:
        lines.append("(none — the reels only named the destination)")

    lines.append("")
    lines.append("REEL CAPTIONS:")
    for i in items[:6]:
        cap = (i.get("caption") or "").replace("\n", " ")[:200]
        if cap:
            lines.append(f"- {cap}")

    return "\n".join(lines)


def rough_plan(destination: str, items: list[dict] | None = None) -> dict:
    """Stage 1. Cheap and instant — no geocoding, no user input."""
    items = items if items is not None else store.all_items()
    dests = itin.collect_destinations(items)
    dest = dests.get(destination)
    if not dest:
        raise ValueError(f"No saved travel reels for {destination!r}. "
                         f"Have: {sorted(dests) or 'nothing yet'}")

    relevant = [i for i in items
                if i.get("category") == "travel"
                and (i.get("payload") or {}).get("destination") == destination]

    payload = extract_mod.run_extraction(
        ROUGH_PROMPT,
        _reel_context(dest, relevant) + "\n\nProduce the rough plan. Return JSON.",
        video_path=None, frames=[], schema=ROUGH_SCHEMA,
    ).payload

    payload["from_reel_places"] = [s.name for s in dest.stops]
    return payload


# ─────────────────────────────────────────────────────────────────────────────
# Stage 2 — full costed plan
# ─────────────────────────────────────────────────────────────────────────────

FULL_SCHEMA = {
    "type": "object",
    "properties": {
        "title": {"type": "string"},
        "overview": {"type": "string"},
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
                                "time": {"type": "string"},
                                "stop_name": {
                                    "type": "string",
                                    "description": (
                                        "EXACTLY one of the given stop names, or "
                                        "'Meal' / 'Travel' / 'Check-in'."
                                    ),
                                },
                                "note": {"type": "string"},
                                "cost_inr": {
                                    "type": ["integer", "null"],
                                    "description": "Group cost for this item, if any.",
                                },
                            },
                            "required": ["time", "stop_name", "note", "cost_inr"],
                            "additionalProperties": False,
                        },
                    },
                },
                "required": ["day", "theme", "items"],
                "additionalProperties": False,
            },
        },
        "costs": {
            "type": "array",
            "items": COST_ITEM,
            "description": "Itemised, covering the WHOLE GROUP for the WHOLE TRIP.",
        },
        "total_inr": {"type": "integer"},
        "per_person_inr": {"type": "integer"},
        "within_budget": {
            "type": ["boolean", "null"],
            "description": "null when no budget was given.",
        },
        "budget_advice": {
            "type": "string",
            "description": (
                "If over budget, say concretely what to cut and how much it "
                "saves. If under, say what is worth adding. Empty if no budget."
            ),
        },
        "assumptions": {
            "type": "array",
            "items": {"type": "string"},
            "description": "What the numbers assume. Be explicit — these are estimates.",
        },
        "tips": {"type": "array", "items": {"type": "string"}},
    },
    "required": ["title", "overview", "days", "costs", "total_inr",
                 "per_person_inr", "within_budget", "budget_advice",
                 "assumptions", "tips"],
    "additionalProperties": False,
}

FULL_PROMPT = """\
You write a complete, costed Indian trip plan.

THE ROUTE IS ALREADY FIXED. Stops, their order and the day-splits were computed
from real coordinates. Do not reorder stops, do not move them between days, do
not invent stops. Straight-line distances are given; real road time in hills is
often double, so leave slack.

COSTS — the part that has to be honest:

- Every figure is INR for the WHOLE GROUP over the WHOLE TRIP, unless the label
  says otherwise. per_person_inr = total_inr / number of travellers.
- Mark source "reel" ONLY for a price the reel actually stated (these are given
  to you explicitly). Everything else is "estimate". Never dress your own number
  up as reel data.
- Cover: transport to and from the region (only if an origin was given),
  local travel, stay, food, entry fees, activities, and a buffer of roughly 10%.
- Scale to the group. A family of four needs two rooms; a solo traveller can use
  buses where a couple would take a cab.
- Use realistic Indian domestic prices. A homestay in Wayanad is not ₹15,000 a
  night. When unsure, estimate low and say so in assumptions.
- If a budget was given, make the plan FIT it. If it genuinely cannot, say so
  plainly in budget_advice with specific cuts and what each saves — do not
  quietly produce a plan that busts the budget.

Match the group: a family needs slower mornings and fewer strenuous treks; a
solo traveller can be packed; a couple wants at least one unhurried evening.
"""


def _fmt_stop(s: itin.Stop, i: int) -> list[str]:
    bits = [f"{i}. {s.name} [{s.place_type}]"]
    if s.duration_minutes:
        bits.append(f"~{s.duration_minutes}min")
    if s.entry_fee:
        bits.append(f"entry stated in reel: {s.entry_fee}")
    if s.approximate:
        bits.append("LOCATION APPROXIMATE")
    out = ["   " + " | ".join(bits)]
    if s.description:
        out.append(f"      {s.description[:180]}")
    if s.tips:
        out.append(f"      tip: {s.tips[:140]}")
    return out


def full_plan(destination: str, prefs: Prefs, items: list[dict] | None = None,
              extra_places: list[str] | None = None, verbose: bool = True) -> dict:
    """Stage 2. Geocodes, routes, splits by day, then costs and narrates."""
    items = items if items is not None else store.all_items()
    dests = itin.collect_destinations(items)
    dest = dests.get(destination)
    if not dest:
        raise ValueError(f"No saved travel reels for {destination!r}.")

    # Places the user accepted from the rough plan's suggestions. Marked so the
    # UI can keep "from your reel" and "we suggested this" visually separate.
    for name in extra_places or []:
        if name.strip().lower() in {s.name.strip().lower() for s in dest.stops}:
            continue
        dest.stops.append(itin.Stop(name=name.strip(), place_type="other",
                                    description="(suggested, not from your reels)"))

    if verbose:
        print(f"[trip] {dest.name}: {len(dest.stops)} stop(s), geocoding…")
    itin.locate(dest, verbose=verbose)

    route = itin.order_route(dest.stops)
    if not route:
        raise ValueError("None of these places could be found on OpenStreetMap.")
    groups = itin.split_days(route, prefs.days)

    reel_prices = [f"{s.name}: {s.entry_fee}" for s in dest.stops if s.entry_fee]

    lines = [
        f"DESTINATION: {dest.name}" + (f", {dest.state}" if dest.state else ""),
        f"BEST SEASON: {dest.best_season or 'not stated'}",
        f"TRAVELLERS: {prefs.describe()}",
        "",
        "PRICES ACTUALLY STATED IN THE REELS (source='reel' for these only):",
        *([f"  - {p}" for p in reel_prices] or ["  (none)"]),
        "",
    ]
    for i, group in enumerate(groups, 1):
        lines.append(f"=== DAY {i} (order is fixed) ===")
        for j, s in enumerate(group):
            lines += _fmt_stop(s, j + 1)
            if j + 1 < len(group):
                lines.append(f"      ↓ {itin.haversine_km(s, group[j + 1]):.1f} km "
                             f"straight-line to next")
        lines.append("")
    lines.append("Write the costed plan. Return JSON matching the schema.")

    plan = extract_mod.run_extraction(
        FULL_PROMPT, "\n".join(lines),
        video_path=None, frames=[], schema=FULL_SCHEMA,
    ).payload

    plan = _reconcile_totals(plan, prefs)

    return {
        "destination": dest.name,
        "state": dest.state,
        "prefs": prefs.__dict__,
        "plan": plan,
        "route": [
            {"day": di + 1, **s.__dict__}
            for di, group in enumerate(groups) for s in group
        ],
        "unlocated": [s.name for s in dest.stops if not s.located],
    }


def _reconcile_totals(plan: dict, prefs: Prefs) -> dict:
    """
    Recompute the totals from the line items.

    The model is asked for total_inr and per_person_inr, and it is perfectly
    capable of returning a total that does not match its own itemised costs.
    Arithmetic is not its job — summing here means the headline number always
    agrees with the breakdown the user can see.
    """
    costs = plan.get("costs") or []
    total = sum(int(c.get("amount_inr") or 0) for c in costs)

    if total:
        stated = int(plan.get("total_inr") or 0)
        if stated and abs(stated - total) > max(50, total * 0.02):
            plan.setdefault("assumptions", []).append(
                f"Total recomputed from the itemised costs (₹{total:,}); the "
                f"model's own headline figure was ₹{stated:,}."
            )
        plan["total_inr"] = total
        plan["per_person_inr"] = round(total / max(prefs.travellers, 1))

    if prefs.budget_total:
        plan["within_budget"] = plan["total_inr"] <= prefs.budget_total
        plan["budget_delta_inr"] = prefs.budget_total - plan["total_inr"]
    else:
        plan["within_budget"] = None
        plan["budget_delta_inr"] = None

    return plan


if __name__ == "__main__":
    import argparse
    import sys

    ap = argparse.ArgumentParser(description="Plan and cost a trip")
    ap.add_argument("destination")
    ap.add_argument("--rough", action="store_true")
    ap.add_argument("--days", type=int, default=2)
    ap.add_argument("--travellers", type=int, default=2)
    ap.add_argument("--group", default="couple", choices=GROUP_TYPES)
    ap.add_argument("--origin")
    ap.add_argument("--budget", type=int)
    ap.add_argument("--pace", default="balanced", choices=PACES)
    ap.add_argument("--stay", default="mid", choices=STAY_TYPES)
    ap.add_argument("--add", action="append", default=[],
                    help="extra place to include (repeatable)")
    ap.add_argument("--json", action="store_true")
    args = ap.parse_args()

    real_stdout = sys.stdout
    if args.json:
        sys.stdout = sys.stderr

    try:
        if args.rough:
            out = rough_plan(args.destination)
        else:
            out = full_plan(args.destination, Prefs(
                days=args.days, travellers=args.travellers, group_type=args.group,
                origin=args.origin, budget_total=args.budget, pace=args.pace,
                stay_type=args.stay,
            ), extra_places=args.add)
    except ValueError as e:
        if args.json:
            print(json.dumps({"error": str(e)}), file=real_stdout)
            raise SystemExit(1)
        raise

    print(json.dumps(out, indent=2, ensure_ascii=False, default=str),
          file=real_stdout)
