"""
Verticals beyond food: the deadline/opportunity extractor, plus the router.

The pipeline is vertical-agnostic — a vertical is just a JSON schema, a system
prompt, and a name. This file adds `deadline`, which covers internships, jobs,
hackathons, scholarships, workshops, events and sales: anything where the reel is
useless to you after a certain date.

Routing is a cheap TEXT-ONLY classifier call before the expensive multimodal one.
Two calls beat one fat union schema here: each vertical keeps a tight schema the
model can actually satisfy, and adding a vertical stays a ~40-line change.
"""

from __future__ import annotations

import re
from datetime import date, datetime, timedelta
from pathlib import Path

import config
import extract as extract_mod
from data import ReelData

CATEGORIES = ["food_spot", "deadline", "travel", "recipe", "product", "other"]


# ─────────────────────────────────────────────────────────────────────────────
# Router
# ─────────────────────────────────────────────────────────────────────────────

CLASSIFY_SCHEMA = {
    "type": "object",
    "properties": {
        "category": {
            "type": "string",
            "enum": CATEGORIES,
            "description": (
                "food_spot = a specific restaurant/eatery/dish worth visiting. "
                "deadline = any opportunity with a date you would regret missing: "
                "internship, job, hackathon, scholarship, admission, workshop, "
                "event, competition, registration, sale or offer that expires. "
                "travel = places to visit — a destination, waterfall, viewpoint, "
                "trek, beach, fort, stay, or a 'things to do in X' list. "
                "recipe = how to COOK something yourself, with ingredients and "
                "steps. "
                "product = reviewing, comparing or recommending things to BUY — "
                "gadgets, headphones, phones, appliances, cosmetics. "
                "other = none of these."
            ),
        },
        "reason": {"type": "string"},
    },
    "required": ["category", "reason"],
    "additionalProperties": False,
}

CLASSIFY_PROMPT = """\
Classify an Indian short-form video (reel) from its caption, hashtags and audio \
transcript.

Pick "deadline" whenever the reel is about an opportunity that closes: applications, \
registrations, admissions, hiring, competitions, scholarships, workshops, events, or \
a sale/offer with an end date. It still counts if no explicit date is stated — \
"applications open now", "link in bio to apply" and "limited seats" are all deadline \
content.

Pick "travel" when the reel is about a PLACE TO VISIT — a destination, waterfall, \
viewpoint, trek, beach, fort, resort, homestay, or a "things to do in X" list. The \
test is whether someone would save it to plan a trip.

Pick "recipe" when the reel teaches you to COOK something — ingredients and steps, \
filmed in a kitchen. A reel about eating biryani at a restaurant is "food_spot"; a \
reel about making biryani at home is "recipe".

Pick "product" when the reel reviews, compares, unboxes or recommends things to \
BUY. The test is whether the viewer would end up shopping.

Pick "food_spot" only for a specific eatery, dish or food experience. A restaurant \
mentioned inside a travel guide about a destination is "travel", not "food_spot".

Otherwise "other" — but note that "other" is still extracted into a structured \
card, so use it whenever none of the above genuinely fits rather than forcing a \
bad match.
"""


def classify(reel: ReelData, transcript) -> dict:
    """Cheap text-only routing call — no video, so it costs very little."""
    parts = [
        "=== CAPTION ===", reel.caption or "(empty)", "",
        "=== HASHTAGS ===", " ".join(f"#{h}" for h in reel.hashtags) or "(none)", "",
        "=== CREATOR ===", f"@{reel.owner}", "",
        f"=== TRANSCRIPT ({getattr(transcript, 'language', None)}) ===",
        (getattr(transcript, "english", "") or getattr(transcript, "native", "")
         or "(none)")[:3000],
        "",
        "Classify this reel. Return JSON matching the schema.",
    ]
    result = extract_mod.run_extraction(
        CLASSIFY_PROMPT, "\n".join(parts),
        video_path=None, frames=[], schema=CLASSIFY_SCHEMA,
    )
    return result.payload


# ─────────────────────────────────────────────────────────────────────────────
# Deadline vertical
# ─────────────────────────────────────────────────────────────────────────────

OPPORTUNITY_TYPES = [
    "internship", "job", "hackathon", "scholarship", "admission", "workshop",
    "event", "competition", "webinar", "sale", "other",
]

DEADLINE_SCHEMA = {
    "type": "object",
    "properties": {
        "is_opportunity": {"type": "boolean"},
        "title": {
            "type": ["string", "null"],
            "description": "Short name, e.g. 'Google STEP Internship 2027'.",
        },
        "organisation": {"type": ["string", "null"]},
        "opportunity_type": {"type": "string", "enum": OPPORTUNITY_TYPES},
        "description": {"type": "string", "description": "2-3 sentences, English."},

        # Dates — ISO 8601 (YYYY-MM-DD) so they can be sorted and reminded on.
        "deadline_date": {
            "type": ["string", "null"],
            "description": (
                "The date after which it is too late, as YYYY-MM-DD. Resolve "
                "relative phrases ('next Friday', 'this month end') against "
                "TODAY given in the evidence. null if genuinely not stated."
            ),
        },
        "deadline_text": {
            "type": ["string", "null"],
            "description": "The deadline exactly as stated, e.g. 'closes Aug 15'.",
        },
        "event_date": {
            "type": ["string", "null"],
            "description": "YYYY-MM-DD when the event/programme itself happens.",
        },
        "date_confidence": {
            "type": "string",
            "enum": ["explicit", "inferred", "none"],
            "description": (
                "explicit = a full date was stated. inferred = you resolved a "
                "partial or relative date (e.g. 'Aug 15' with no year). "
                "none = no date available."
            ),
        },

        "eligibility": {"type": ["string", "null"]},
        "location": {"type": ["string", "null"], "description": "City, or 'Remote'."},
        "is_remote": {"type": ["boolean", "null"]},
        "fee": {"type": ["string", "null"], "description": "e.g. 'Free', '₹500'."},
        "prize": {"type": ["string", "null"]},
        "stipend": {"type": ["string", "null"]},

        "registration_links": {
            "type": "array",
            "items": {"type": "string"},
            "description": (
                "Every URL that leads to applying: from the caption, on-screen "
                "text, or spoken aloud. Include bare domains seen on screen "
                "(e.g. 'unstop.com/xyz'). Do NOT invent URLs."
            ),
        },
        "link_in_bio": {
            "type": "boolean",
            "description": (
                "True if the reel says the link is in the creator's bio — very "
                "common, and it means no direct URL exists in the reel itself."
            ),
        },
        "contact": {"type": ["string", "null"], "description": "Email or phone."},

        "evidence": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "field": {"type": "string"},
                    "source": {
                        "type": "string",
                        "enum": ["frame", "transcript", "caption", "hashtag",
                                 "comment", "creator_reply", "tagged_user", "bio"],
                    },
                    "quote": {"type": "string"},
                },
                "required": ["field", "source", "quote"],
                "additionalProperties": False,
            },
        },
        "search_summary": {"type": "string"},
        "confidence": {
            "type": "string",
            "enum": ["high", "medium", "low"],
            "description": (
                "Confidence that this is a real, actionable opportunity AND that "
                "the deadline is right. Must be 'low' if deadline_date is null."
            ),
        },
        "reasoning": {"type": "string"},
    },
    "required": [
        "is_opportunity", "title", "organisation", "opportunity_type",
        "description", "deadline_date", "deadline_text", "event_date",
        "date_confidence", "eligibility", "location", "is_remote", "fee",
        "prize", "stipend", "registration_links", "link_in_bio", "contact",
        "evidence", "search_summary", "confidence", "reasoning",
    ],
    "additionalProperties": False,
}


DEADLINE_PROMPT = """\
You extract time-sensitive opportunities from Indian short-form videos (reels): \
internships, jobs, hackathons, scholarships, admissions, workshops, events and \
expiring offers.

The user saved this reel because they might act on it. Your job is to capture \
everything they need to act, and above all WHEN IT CLOSES.

How to read the evidence:

1. ON-SCREEN TEXT IS THE STRONGEST SIGNAL. Deadlines, URLs and eligibility are \
usually burned into the video as text — a poster, a slide, a form screenshot. Read \
every frame carefully.

2. DATES ARE THE POINT. Resolve every date to YYYY-MM-DD.
   - Two dates are given in the evidence: TODAY, and the date the REEL WAS \
POSTED. Resolve relative phrases ("next Friday", "in 2 weeks", "tomorrow", \
"this weekend") against the POST date — that is when the creator was speaking. \
Using today instead silently shifts the deadline by however long the reel sat \
in the user's saved folder before they got round to it.
   - Use TODAY only to decide whether the resolved date has already passed.
   - A recurring-sounding title ("Hello Friday", "Weekend Bootcamp") is a series \
name, not a date. Do not turn it into a deadline.
   - If a date has no year ("August 15"), choose the NEXT occurrence on or after \
TODAY, and set date_confidence to "inferred".
   - Distinguish the APPLICATION DEADLINE from the EVENT DATE. "Hackathon on Sept \
10, register by Aug 30" means deadline_date 2026-08-30 and event_date 2026-09-10. \
Getting these backwards makes the reminder useless.
   - If no deadline is stated at all, set deadline_date null, date_confidence \
"none", and confidence "low". Never guess a deadline — a wrong reminder is worse \
than no reminder, because the user will trust it and miss the real date.

3. LINKS ARE HOW THEY APPLY. Collect every registration URL from the caption, from \
on-screen text, and from the spoken audio. Reels often show a URL only on screen. \
Copy them exactly — do not invent, complete or correct a URL you cannot fully read. \
If the reel says "link in bio", set link_in_bio true; that is not a URL.

4. Reels code-mix (Malayalam/Tamil/Telugu/Kannada/Hindi + English). Dates and URLs \
are usually still in English/digits even when the speech is not.

Rules:
- DO NOT GUESS. Null is better than a plausible invention, especially for dates \
and links.
- Every non-null field needs a matching `evidence` entry with the exact quote or a \
description of what was on screen.
- If the reel is not an opportunity at all, set is_opportunity false and leave the \
fields null.
"""


def build_deadline_evidence(reel: ReelData, transcript, ranked) -> str:
    """Same evidence layout as the food vertical, plus TODAY for date resolution."""
    import comments as comments_mod

    today = date.today()
    posted = getattr(reel, "date_utc", None)

    parts = ["=== TODAY ===",
             f"{today.isoformat()} ({today.strftime('%A, %d %B %Y')})", ""]

    # The post date is the anchor for relative dates, not today. A reel saying
    # "next Friday" means the Friday after IT WAS POSTED; resolving that against
    # today silently shifts the deadline by however long the reel sat unsaved.
    if posted:
        try:
            posted_d = posted.date() if hasattr(posted, "date") else posted
            age = (today - posted_d).days
            parts += [
                "=== REEL POSTED ON ===",
                f"{posted_d.isoformat()} ({posted_d.strftime('%A, %d %B %Y')}) "
                f"— {age} day(s) ago",
                "Resolve relative phrases ('next Friday', 'tomorrow', 'this "
                "weekend') against THIS date, not against today.",
            ]
            if age > 45:
                parts.append(
                    f"WARNING: this reel is {age} days old. Any deadline it "
                    f"mentions has probably already passed — say so rather than "
                    f"rolling the date forward to a future year."
                )
            parts.append("")
        except Exception:
            pass
    else:
        parts += [
            "=== REEL POSTED ON ===",
            "(unknown)",
            "Without a post date, do NOT resolve relative phrases like 'next "
            "Friday' — return null instead of guessing.",
            "",
        ]
    parts += [
        "=== CREATOR ===", f"@{reel.owner}"
        + (f"\nbio: {reel.owner_bio}" if reel.owner_bio else ""), "",
        "=== TAGGED ACCOUNTS ===",
        ", ".join(f"@{u}" for u in reel.tagged_users) or "(none)", "",
        "=== CAPTION ===", reel.caption or "(empty)", "",
        "=== HASHTAGS ===",
        " ".join(f"#{h}" for h in reel.hashtags) or "(none)", "",
    ]

    if getattr(transcript, "low_confidence", False):
        parts += [
            "=== TRANSCRIPT QUALITY WARNING ===",
            "Whisper had low confidence. If the text reads as song lyrics, ignore "
            "it. If it is garbled speech that still mentions dates, links or an "
            "organisation, USE IT — transcription errors are expected.",
            "Treat numbers in low-confidence audio with suspicion: prefer a date "
            "or URL you can read on screen over one you only heard.",
            "",
        ]

    parts += [
        f"=== TRANSCRIPT ({getattr(transcript, 'language', None)}) ===",
        getattr(transcript, "native", "") or "(no speech detected)", "",
        "=== TRANSCRIPT (English) ===",
        getattr(transcript, "english", "") or "(none)", "",
    ]

    if ranked:
        parts += [
            "=== COMMENTS ===",
            comments_mod.format_for_llm(ranked), "",
        ]

    parts.append("Extract the opportunity. Return JSON matching the schema.")
    return "\n".join(parts)


def extract_deadline(reel: ReelData, transcript, frames: list[Path],
                     max_comments: int = 30) -> extract_mod.Extraction:
    import comments as comments_mod

    ranked = comments_mod.rank_comments(reel.comments, limit=max_comments)
    evidence = build_deadline_evidence(reel, transcript, ranked)
    result = extract_mod.run_extraction(
        DEADLINE_PROMPT, evidence, reel.video_path, frames, DEADLINE_SCHEMA,
    )
    result.category = "deadline"
    result.payload = _sanity_check_dates(result.payload)
    return result


# Bare domains count: bios are written as "unstop.com/x" or "linktr.ee/y" far more
# often than as full https:// URLs.
_URL_RE = re.compile(
    r"\b((?:https?://)?(?:[\w-]+\.)+[a-z]{2,}(?:/[^\s,)\]]*)?)", re.IGNORECASE)

# Domains that are almost never a registration target, so they only add noise.
_LINK_NOISE = {
    "instagram.com", "www.instagram.com", "facebook.com", "youtube.com",
    "twitter.com", "x.com", "whatsapp.com", "gmail.com",
}


def links_from_bio(bio: dict) -> list[str]:
    """
    Pull candidate registration links out of a profile.

    `external_url` is the literal "link in bio" slot and goes first. The biography
    text is scanned too, because creators routinely paste a second URL there
    (a form, an aggregator) that the single link slot cannot hold.
    """
    found: list[str] = []

    if bio.get("external_url"):
        found.append(bio["external_url"])

    for match in _URL_RE.finditer(bio.get("biography") or ""):
        found.append(match.group(1))

    out: list[str] = []
    for link in found:
        cleaned = link.rstrip(".,);:")
        host = re.sub(r"^https?://", "", cleaned, flags=re.I).split("/")[0].lower()
        if host in _LINK_NOISE:
            continue
        if cleaned not in out:
            out.append(cleaned)
    return out


def resolve_bio_links(payload: dict, bio: dict | None) -> dict:
    """
    Fold bio links into the extraction, keeping provenance honest.

    They are appended rather than merged in silently: a link found on the profile
    is weaker evidence than one shown in the reel itself — the bio may have moved
    on to a newer opportunity since this reel was posted. Marking the source lets
    the UI say where it came from instead of implying the reel contained it.
    """
    if not bio:
        return payload

    links = links_from_bio(bio)
    if not links:
        return payload

    existing = payload.get("registration_links") or []
    added = [l for l in links if l not in existing]
    if not added:
        return payload

    payload["registration_links"] = existing + added
    payload["bio_links"] = added
    payload.setdefault("evidence", []).append({
        "field": "registration_links",
        "source": "bio",
        "quote": f"@{bio.get('username')} bio: {', '.join(added)}",
    })
    return payload


def _sanity_check_dates(payload: dict) -> dict:
    """
    Guard the two failure modes that would silently produce a useless reminder.

    A model that returns a deadline already in the past, or one absurdly far out,
    has almost certainly mis-resolved a year. We keep the value (it may still be
    informative) but demote confidence so the UI stops presenting it as fact.
    """
    raw = payload.get("deadline_date")
    if not raw:
        payload["deadline_passed"] = None
        return payload

    try:
        d = datetime.strptime(raw, "%Y-%m-%d").date()
    except (ValueError, TypeError):
        payload["deadline_date"] = None
        payload["date_confidence"] = "none"
        payload["confidence"] = "low"
        payload["deadline_passed"] = None
        return payload

    today = date.today()
    payload["deadline_passed"] = d < today

    if d > today + timedelta(days=730):
        payload["confidence"] = "low"
        payload["reasoning"] = (
            (payload.get("reasoning") or "")
            + f" [flagged: deadline {raw} is more than 2 years out — likely a "
              f"mis-resolved year]"
        ).strip()

    return payload


def days_until(iso_date: str | None) -> int | None:
    if not iso_date:
        return None
    try:
        d = datetime.strptime(iso_date, "%Y-%m-%d").date()
    except (ValueError, TypeError):
        return None
    return (d - date.today()).days


# ─────────────────────────────────────────────────────────────────────────────
# Travel vertical
# ─────────────────────────────────────────────────────────────────────────────

PLACE_TYPES = [
    "waterfall", "viewpoint", "trek", "lake", "dam", "beach", "temple", "fort",
    "museum", "park", "wildlife", "restaurant", "cafe", "stay", "activity",
    "market", "other",
]

TRAVEL_SCHEMA = {
    "type": "object",
    "properties": {
        "is_travel_content": {"type": "boolean"},
        "destination": {
            "type": ["string", "null"],
            "description": (
                "The region the reel is about, as a traveller would name it — "
                "'Wayanad', 'Munnar', 'Coorg'. This is the grouping key for "
                "itineraries, so keep it consistent and do not include the state."
            ),
        },
        "state": {"type": ["string", "null"]},
        "country": {"type": ["string", "null"]},
        "best_season": {"type": ["string", "null"]},
        "summary": {"type": "string", "description": "2-3 sentences, English."},
        "places": {
            "type": "array",
            "description": (
                "Every distinct place shown or named. One reel often covers "
                "several — a '5 places in Wayanad' reel should yield 5 entries."
            ),
            "items": {
                "type": "object",
                "properties": {
                    "name": {
                        "type": "string",
                        "description": (
                            "Proper name as it would appear on a map, e.g. "
                            "'Soochipara Waterfalls'. Not 'the waterfall'."
                        ),
                    },
                    "place_type": {"type": "string", "enum": PLACE_TYPES},
                    "area": {"type": ["string", "null"]},
                    "description": {"type": "string"},
                    "duration_minutes": {
                        "type": ["integer", "null"],
                        "description": "Typical time spent there. Used to pack days.",
                    },
                    "best_time_of_day": {
                        "type": ["string", "null"],
                        "enum": ["early morning", "morning", "afternoon",
                                 "evening", "night", None],
                    },
                    "entry_fee": {"type": ["string", "null"]},
                    "tips": {"type": ["string", "null"]},
                },
                "required": ["name", "place_type", "area", "description",
                             "duration_minutes", "best_time_of_day",
                             "entry_fee", "tips"],
                "additionalProperties": False,
            },
        },
        "evidence": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "field": {"type": "string"},
                    "source": {
                        "type": "string",
                        "enum": ["frame", "transcript", "caption", "hashtag",
                                 "comment", "creator_reply", "geotag",
                                 "tagged_user", "bio"],
                    },
                    "quote": {"type": "string"},
                },
                "required": ["field", "source", "quote"],
                "additionalProperties": False,
            },
        },
        "search_summary": {"type": "string"},
        "confidence": {
            "type": "string",
            "enum": ["high", "medium", "low"],
            "description": (
                "Confidence in the destination and the place names. Must be 'low' "
                "if no place could be named specifically enough to find on a map."
            ),
        },
        "reasoning": {"type": "string"},
    },
    "required": ["is_travel_content", "destination", "state", "country",
                 "best_season", "summary", "places", "evidence",
                 "search_summary", "confidence", "reasoning"],
    "additionalProperties": False,
}

TRAVEL_PROMPT = """\
You extract places worth visiting from an Indian travel reel, so they can be
geocoded and turned into an itinerary.

How to read the evidence:

1. ON-SCREEN TEXT IS THE STRONGEST SIGNAL. Travel reels caption each location as
they cut between them — read every frame. A "5 hidden spots in Wayanad" reel
usually names all five only on screen.

2. NAMES MUST BE MAP-RESOLVABLE. This is the single most important rule: every
name you return gets looked up on OpenStreetMap. "Soochipara Waterfalls" works;
"this waterfall", "the second spot", "a hidden gem" do not. If a place is shown
but never named, leave it out rather than inventing a label — an unfindable name
produces a wrong pin, and the user drives to it.

3. ONE REEL, MANY PLACES. Do not collapse a list reel into a single entry.
Extract each place separately with its own type and description.

4. DESTINATION IS THE GROUPING KEY. Use the name a traveller would say —
"Wayanad", not "Wayanad district, Kerala, India". Itineraries are built by
grouping on this exact string, so consistency matters more than precision.

5. duration_minutes drives how many places fit in a day. Estimate honestly from
what the reel shows: a viewpoint is 30 minutes, a waterfall with a trek in is
120+, a museum 60.

6. best_time_of_day matters for planning. Sunrise viewpoints, waterfalls before
the afternoon heat, sunset points in the evening.

Rules:
- DO NOT GUESS a place name. Null and fewer places beat a fabricated one.
- Every non-null field needs a matching `evidence` entry.
- If the reel is not about visitable places, set is_travel_content false.
"""


def build_travel_evidence(reel: ReelData, transcript, ranked) -> str:
    import comments as comments_mod

    parts = [
        "=== CREATOR ===", f"@{reel.owner}", "",
        "=== TAGGED ACCOUNTS ===",
        ", ".join(f"@{u}" for u in reel.tagged_users) or "(none)", "",
    ]
    if reel.location_name:
        coords = (f"  [lat {reel.location_lat}, lng {reel.location_lng}]"
                  if reel.has_geotag else "")
        parts += ["=== INSTAGRAM GEOTAG ===", f"{reel.location_name}{coords}",
                  "This is ground truth for the region.", ""]

    parts += [
        "=== CAPTION ===", reel.caption or "(empty)", "",
        "=== HASHTAGS ===",
        " ".join(f"#{h}" for h in reel.hashtags) or "(none)", "",
    ]

    if getattr(transcript, "low_confidence", False):
        parts += [
            "=== TRANSCRIPT QUALITY WARNING ===",
            "Whisper had low confidence. If it reads as song lyrics, ignore it. "
            "If it is garbled speech naming places, use it — but prefer a "
            "spelling you can read on screen over one you only heard.",
            "",
        ]

    parts += [
        f"=== TRANSCRIPT ({getattr(transcript, 'language', None)}) ===",
        getattr(transcript, "native", "") or "(no speech detected)", "",
        "=== TRANSCRIPT (English) ===",
        getattr(transcript, "english", "") or "(none)", "",
    ]
    if ranked:
        parts += ["=== COMMENTS ===", comments_mod.format_for_llm(ranked), ""]

    parts.append("Extract the places. Return JSON matching the schema.")
    return "\n".join(parts)


def extract_travel(reel: ReelData, transcript, frames: list[Path],
                   max_comments: int = 30) -> extract_mod.Extraction:
    import comments as comments_mod

    ranked = comments_mod.rank_comments(reel.comments, limit=max_comments)
    evidence = build_travel_evidence(reel, transcript, ranked)
    result = extract_mod.run_extraction(
        TRAVEL_PROMPT, evidence, reel.video_path, frames, TRAVEL_SCHEMA,
    )
    result.category = "travel"
    return result


# ─────────────────────────────────────────────────────────────────────────────
# Recipe vertical
# ─────────────────────────────────────────────────────────────────────────────

RECIPE_SCHEMA = {
    "type": "object",
    "properties": {
        "is_recipe": {"type": "boolean"},
        "dish_name": {"type": ["string", "null"]},
        "cuisine": {"type": ["string", "null"]},
        "description": {"type": "string"},
        "servings": {"type": ["integer", "null"]},
        "prep_time_minutes": {"type": ["integer", "null"]},
        "cook_time_minutes": {"type": ["integer", "null"]},
        "total_time_minutes": {"type": ["integer", "null"]},
        "difficulty": {"type": ["string", "null"],
                       "enum": ["easy", "medium", "hard", None]},
        "veg_status": {"type": ["string", "null"],
                       "enum": ["veg", "non-veg", "egg", "vegan", None]},
        "ingredients": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "item": {"type": "string"},
                    "quantity": {"type": ["string", "null"],
                                 "description": "e.g. '500', '2', '1/2'."},
                    "unit": {"type": ["string", "null"],
                             "description": "e.g. 'g', 'tbsp', 'cups'."},
                    "notes": {"type": ["string", "null"],
                              "description": "e.g. 'finely chopped', 'optional'."},
                },
                "required": ["item", "quantity", "unit", "notes"],
                "additionalProperties": False,
            },
        },
        "steps": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "order": {"type": "integer"},
                    "instruction": {"type": "string"},
                    "duration_minutes": {"type": ["integer", "null"]},
                    "tip": {"type": ["string", "null"]},
                },
                "required": ["order", "instruction", "duration_minutes", "tip"],
                "additionalProperties": False,
            },
        },
        "equipment": {"type": "array", "items": {"type": "string"}},
        "evidence": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "field": {"type": "string"},
                    "source": {"type": "string",
                               "enum": ["frame", "transcript", "caption", "hashtag",
                                        "comment", "creator_reply", "tagged_user",
                                        "bio"]},
                    "quote": {"type": "string"},
                },
                "required": ["field", "source", "quote"],
                "additionalProperties": False,
            },
        },
        "search_summary": {"type": "string"},
        "confidence": {"type": "string", "enum": ["high", "medium", "low"]},
        "reasoning": {"type": "string"},
    },
    "required": ["is_recipe", "dish_name", "cuisine", "description", "servings",
                 "prep_time_minutes", "cook_time_minutes", "total_time_minutes",
                 "difficulty", "veg_status", "ingredients", "steps", "equipment",
                 "evidence", "search_summary", "confidence", "reasoning"],
    "additionalProperties": False,
}

RECIPE_PROMPT = """\
You turn a cooking reel into a recipe someone can actually follow in a kitchen.

How to read the evidence:

1. THE AUDIO CARRIES THE METHOD. Unlike most reels, cooking videos usually have
real narration — quantities, timings and technique are spoken. Use the transcript
heavily. On-screen text usually carries the ingredient LIST.

2. QUANTITIES ARE THE POINT. "Some chilli powder" is useless in a kitchen. Pull
the exact amount whenever it is stated in the audio or shown on screen. If a
quantity genuinely is not given, set quantity null rather than inventing one — a
made-up measurement ruins the dish, and the user will trust it.

3. STEPS IN ORDER, AS ACTIONS. Each step is one thing to do. Include timings
where stated ("fry for 5 minutes"). Do not merge three actions into one step.

4. TIMES. prep_time is chopping and marinating, cook_time is on the heat. If
marination is long (biryani often needs an hour), say so in the step tip rather
than hiding it in prep_time.

5. Reels code-mix heavily. Ingredient names may be spoken in Malayalam/Tamil/
Hindi — give the common English name, and keep the local name in notes when it is
what a shop would call it.

Rules:
- DO NOT INVENT quantities, times or steps that are not shown or said.
- Every non-null field needs a matching `evidence` entry.
- If the reel is not a cooking tutorial, set is_recipe false.
"""


# ─────────────────────────────────────────────────────────────────────────────
# Product vertical
# ─────────────────────────────────────────────────────────────────────────────

PRODUCT_SCHEMA = {
    "type": "object",
    "properties": {
        "is_product_content": {"type": "boolean"},
        "product_category": {
            "type": ["string", "null"],
            "description": (
                "Consistent, generic grouping key — 'budget headphones', "
                "'smartphones under 20000'. Comparisons are built by grouping on "
                "this, so keep it broad and repeatable across reels."
            ),
        },
        "verdict": {"type": "string", "description": "The reel's overall take."},
        "products": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "name": {"type": "string",
                             "description": "Full name as sold, e.g. 'boAt Rockerz 450'."},
                    "brand": {"type": ["string", "null"]},
                    "price_inr": {
                        "type": ["integer", "null"],
                        "description": "Price STATED IN THE REEL. null if not stated.",
                    },
                    "price_text": {"type": ["string", "null"],
                                   "description": "Price exactly as stated."},
                    "rating_out_of_5": {"type": ["number", "null"]},
                    "specs": {
                        "type": "array",
                        "description": "Comparable attributes, e.g. battery life, driver size.",
                        "items": {
                            "type": "object",
                            "properties": {
                                "label": {"type": "string"},
                                "value": {"type": "string"},
                            },
                            "required": ["label", "value"],
                            "additionalProperties": False,
                        },
                    },
                    "pros": {"type": "array", "items": {"type": "string"}},
                    "cons": {"type": "array", "items": {"type": "string"}},
                    "best_for": {"type": ["string", "null"]},
                },
                "required": ["name", "brand", "price_inr", "price_text",
                             "rating_out_of_5", "specs", "pros", "cons", "best_for"],
                "additionalProperties": False,
            },
        },
        "evidence": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "field": {"type": "string"},
                    "source": {"type": "string",
                               "enum": ["frame", "transcript", "caption", "hashtag",
                                        "comment", "creator_reply", "tagged_user",
                                        "bio"]},
                    "quote": {"type": "string"},
                },
                "required": ["field", "source", "quote"],
                "additionalProperties": False,
            },
        },
        "search_summary": {"type": "string"},
        "confidence": {"type": "string", "enum": ["high", "medium", "low"]},
        "reasoning": {"type": "string"},
    },
    "required": ["is_product_content", "product_category", "verdict", "products",
                 "evidence", "search_summary", "confidence", "reasoning"],
    "additionalProperties": False,
}

PRODUCT_PROMPT = """\
You extract products from a review, comparison or unboxing reel so they can be
compared side by side and shopped for.

How to read the evidence:

1. NAMES MUST BE SHOPPABLE. The name is used to build a store search, so give the
full model as sold — "boAt Rockerz 450", not "the boAt one" or "black headphones".
If a product is shown but never named clearly enough to search for, leave it out.

2. PRICES ARE REEL DATA. price_inr is what the REEL said. If the reel never
states a price, set it null. Never substitute what you think it costs — the user
will read it as the actual price and budget around it.

3. SPECS SHOULD BE COMPARABLE. Prefer attributes that let two products be lined
up: battery life, driver size, weight, warranty, connectivity. Use consistent
labels across products in the same reel so the comparison table lines up.

4. PROS AND CONS COME FROM THE REEL, not from your general knowledge of the
product. If the reviewer complained about the mic, that is a con; do not add
issues they never mentioned.

5. product_category is a grouping key across reels. Keep it broad and consistent —
"budget headphones" not "boAt Rockerz 450 vs OnePlus Bullets". Several reels
sharing a category is what makes a comparison possible.

Rules:
- DO NOT INVENT prices, specs or model numbers.
- Every non-null field needs a matching `evidence` entry.
- If the reel is not about things to buy, set is_product_content false.
"""


# ─────────────────────────────────────────────────────────────────────────────
# Generic vertical — the catch-all
# ─────────────────────────────────────────────────────────────────────────────

GENERIC_SCHEMA = {
    "type": "object",
    "properties": {
        "title": {"type": "string", "description": "Short, specific headline."},
        "topic": {
            "type": "string",
            "description": "Broad subject, e.g. 'DSA / interview prep', 'fitness'.",
        },
        "summary": {"type": "string", "description": "3-4 sentences, English."},
        "key_points": {
            "type": "array",
            "items": {"type": "string"},
            "description": "The substance of the reel as bullet points.",
        },
        "actionable_items": {
            "type": "array",
            "items": {"type": "string"},
            "description": "Anything the viewer is meant to DO. Empty if nothing.",
        },
        "entities": {
            "type": "object",
            "properties": {
                "people": {"type": "array", "items": {"type": "string"}},
                "organisations": {"type": "array", "items": {"type": "string"}},
                "places": {"type": "array", "items": {"type": "string"}},
                "dates": {"type": "array", "items": {"type": "string"}},
                "prices": {"type": "array", "items": {"type": "string"}},
                "links": {"type": "array", "items": {"type": "string"}},
                "tools_or_resources": {"type": "array", "items": {"type": "string"}},
            },
            "required": ["people", "organisations", "places", "dates", "prices",
                         "links", "tools_or_resources"],
            "additionalProperties": False,
        },
        "tags": {
            "type": "array",
            "items": {"type": "string"},
            "description": "5-8 lowercase tags for searching later.",
        },
        "evidence": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "field": {"type": "string"},
                    "source": {"type": "string",
                               "enum": ["frame", "transcript", "caption", "hashtag",
                                        "comment", "creator_reply", "tagged_user",
                                        "bio"]},
                    "quote": {"type": "string"},
                },
                "required": ["field", "source", "quote"],
                "additionalProperties": False,
            },
        },
        "search_summary": {"type": "string"},
        "confidence": {"type": "string", "enum": ["high", "medium", "low"]},
        "reasoning": {"type": "string"},
    },
    "required": ["title", "topic", "summary", "key_points", "actionable_items",
                 "entities", "tags", "evidence", "search_summary", "confidence",
                 "reasoning"],
    "additionalProperties": False,
}

GENERIC_PROMPT = """\
This reel did not fit any specialised category, so you are the fallback. Extract
it into a useful structured card anyway — nothing the user saved should end up as
a blank entry.

Capture what the reel is actually FOR. A DSA revision reel should yield the
concepts covered and the resources named. A fitness reel should yield the
exercises and the sets. A news clip should yield what happened and who is
involved.

- key_points is the substance. Be specific: "two-pointer technique for sorted
  arrays" beats "talks about arrays".
- actionable_items only when the viewer is meant to do something. Empty array is
  a perfectly good answer.
- entities: pull out anything the user might later search by. Leave arrays empty
  rather than padding them.
- tags will be used for retrieval months from now, so favour the words the user
  would actually type.
- search_summary is what gets embedded for semantic search — write it as a dense,
  natural description of the reel's content.

Do not invent detail that is not in the reel. A thin reel gets a thin card, and
that is fine.
"""


def _evidence_block(reel: ReelData, transcript, ranked, tail: str) -> str:
    """Shared layout for the verticals that need no special framing."""
    import comments as comments_mod

    parts = [
        "=== CREATOR ===", f"@{reel.owner}", "",
        "=== TAGGED ACCOUNTS ===",
        ", ".join(f"@{u}" for u in reel.tagged_users) or "(none)", "",
        "=== CAPTION ===", reel.caption or "(empty)", "",
        "=== HASHTAGS ===",
        " ".join(f"#{h}" for h in reel.hashtags) or "(none)", "",
    ]
    if getattr(transcript, "low_confidence", False):
        parts += [
            "=== TRANSCRIPT QUALITY WARNING ===",
            "Whisper had low confidence. If it reads as song lyrics, ignore it. "
            "If it is garbled speech that still carries content, use it — but "
            "treat numbers and names in it with suspicion and prefer anything "
            "you can read on screen.",
            "",
        ]
    parts += [
        f"=== TRANSCRIPT ({getattr(transcript, 'language', None)}) ===",
        getattr(transcript, "native", "") or "(no speech detected)", "",
        "=== TRANSCRIPT (English) ===",
        getattr(transcript, "english", "") or "(none)", "",
    ]
    if ranked:
        parts += ["=== COMMENTS ===", comments_mod.format_for_llm(ranked), ""]
    parts.append(tail)
    return "\n".join(parts)


def _simple_extract(reel: ReelData, transcript, frames: list[Path], *,
                    prompt: str, schema: dict, category: str, tail: str,
                    max_comments: int = 30) -> extract_mod.Extraction:
    import comments as comments_mod

    ranked = comments_mod.rank_comments(reel.comments, limit=max_comments)
    evidence = _evidence_block(reel, transcript, ranked, tail)
    result = extract_mod.run_extraction(prompt, evidence, reel.video_path,
                                        frames, schema)
    result.category = category
    return result


def extract_recipe(reel, transcript, frames, max_comments: int = 30):
    return _simple_extract(reel, transcript, frames, prompt=RECIPE_PROMPT,
                           schema=RECIPE_SCHEMA, category="recipe",
                           tail="Extract the recipe. Return JSON matching the schema.",
                           max_comments=max_comments)


def extract_product(reel, transcript, frames, max_comments: int = 30):
    return _simple_extract(reel, transcript, frames, prompt=PRODUCT_PROMPT,
                           schema=PRODUCT_SCHEMA, category="product",
                           tail="Extract the products. Return JSON matching the schema.",
                           max_comments=max_comments)


def extract_generic(reel, transcript, frames, max_comments: int = 30):
    return _simple_extract(reel, transcript, frames, prompt=GENERIC_PROMPT,
                           schema=GENERIC_SCHEMA, category="other",
                           tail="Extract this reel. Return JSON matching the schema.",
                           max_comments=max_comments)


# ─────────────────────────────────────────────────────────────────────────────
# Buy links
# ─────────────────────────────────────────────────────────────────────────────

def buy_links(product_name: str, brand: str | None = None) -> list[dict]:
    """
    Store SEARCH links, not product links.

    Deliberate: a model cannot know a real Amazon ASIN or Flipkart product id, and
    a fabricated one is a 404 the user hits after we told them where to buy. A
    search URL is built from the product name we actually extracted, always
    resolves, and lands them on the right listing.
    """
    import urllib.parse

    q = " ".join(x for x in (brand, product_name) if x)
    # A brand repeated in the name makes the search worse, not better.
    if brand and product_name.lower().startswith(brand.lower()):
        q = product_name
    enc = urllib.parse.quote_plus(q)

    return [
        {"store": "Amazon", "url": f"https://www.amazon.in/s?k={enc}"},
        {"store": "Flipkart", "url": f"https://www.flipkart.com/search?q={enc}"},
        {"store": "Google Shopping",
         "url": f"https://www.google.com/search?tbm=shop&q={enc}"},
    ]
