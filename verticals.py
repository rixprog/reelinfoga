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

from datetime import date, datetime, timedelta
from pathlib import Path

import config
import extract as extract_mod
from data import ReelData

CATEGORIES = ["food_spot", "deadline", "other"]


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
                "other = neither."
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

Pick "food_spot" only for a specific eatery, dish or food experience.

Otherwise "other".
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
                                 "comment", "creator_reply", "tagged_user"],
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
   - TODAY's date is given in the evidence. Use it for relative phrases like \
"next Friday", "in 2 weeks", "month end", "tomorrow".
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
    parts = [
        "=== TODAY ===",
        f"{today.isoformat()} ({today.strftime('%A, %d %B %Y')})",
        "Resolve every relative or partial date against this.",
        "",
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
