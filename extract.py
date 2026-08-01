"""
Structured extraction: everything we scraped → one FoodSpot JSON object.

One multimodal call rather than a chain of specialists (OCR → NER → relation
extraction). The signals only make sense *together*: the transcript says "ee kada"
("this shop"), the signboard in frame 3 says AL FAHAM, the caption says "Kozhikode
🔥", and a reply says "Palayam-il alle?". No single source names the place. Read
together they do — and vision handles the on-screen text in the same pass.

(This file used to hold the ffmpeg audio helper; that now lives in media.py.)
"""

from __future__ import annotations

import base64
import json
from dataclasses import dataclass
from pathlib import Path

import comments as comments_mod
import config
from data import ReelData

_anthropic_client = None
_gemini_client = None


def anthropic_client():
    global _anthropic_client
    if _anthropic_client is None:
        import anthropic
        _anthropic_client = anthropic.Anthropic(
            api_key=config.require("ANTHROPIC_API_KEY"))
    return _anthropic_client


def gemini_client():
    global _gemini_client
    if _gemini_client is None:
        from google import genai
        _gemini_client = genai.Client(api_key=config.require("GEMINI_API_KEY"))
    return _gemini_client


# ─────────────────────────────────────────────────────────────────────────────
# Schema  —  enforced by the API, so no defensive parsing downstream
# ─────────────────────────────────────────────────────────────────────────────

FOOD_SPOT_SCHEMA = {
    "type": "object",
    "properties": {
        "is_food_content": {
            "type": "boolean",
            "description": "True only if this reel is about a specific eatery, dish, or food experience.",
        },
        "place_name": {
            "type": ["string", "null"],
            "description": "Restaurant/stall/hotel name exactly as it appears. null if not determinable.",
        },
        "place_aliases": {
            "type": "array",
            "items": {"type": "string"},
            "description": "Alternate spellings or transliterations seen across sources.",
        },
        "area": {"type": ["string", "null"], "description": "Locality or neighbourhood."},
        "city": {"type": ["string", "null"]},
        "state": {"type": ["string", "null"]},
        "landmark": {
            "type": ["string", "null"],
            "description": "Navigational hint, e.g. 'near the bus stand', 'opposite Focus Mall'.",
        },
        "full_address": {"type": ["string", "null"]},
        "dishes": {
            "type": "array",
            "items": {"type": "string"},
            "description": "Specific dishes shown or named.",
        },
        "cuisine": {"type": ["string", "null"]},
        "price_band": {
            "type": ["string", "null"],
            "enum": ["budget", "mid", "premium", None],
            "description": "budget = street food/thattukada, mid = casual dining, premium = fine dining.",
        },
        "veg_status": {
            "type": ["string", "null"],
            "enum": ["veg", "non-veg", "both", None],
        },
        "offers": {
            "type": "array",
            "items": {"type": "string"},
            "description": (
                "Deals, prices or promotions stated in the reel, e.g. "
                "'Buy 1 Get 1 on chicken and mutton biryani', '₹500 veg/non-veg "
                "combo'. These usually come from the spoken audio, not the visuals."
            ),
        },
        "contact": {
            "type": ["string", "null"],
            "description": "Phone number shown on screen or spoken, if any.",
        },
        "evidence": {
            "type": "array",
            "description": "One entry per extracted fact. Every claim must be traceable.",
            "items": {
                "type": "object",
                "properties": {
                    "field": {"type": "string", "description": "Which field this supports."},
                    "source": {
                        "type": "string",
                        "enum": ["frame", "transcript", "caption", "hashtag",
                                 "comment", "creator_reply", "geotag", "tagged_user"],
                    },
                    "quote": {"type": "string", "description": "Exact text seen, or what was visible in the frame."},
                },
                "required": ["field", "source", "quote"],
                "additionalProperties": False,
            },
        },
        "search_summary": {
            "type": "string",
            "description": "2-3 sentence English summary for semantic search. Include place, city, dishes, vibe.",
        },
        "confidence": {
            "type": "string",
            "enum": ["high", "medium", "low"],
            "description": (
                "Confidence in the PLACE IDENTIFICATION specifically — NOT how sure "
                "you are of your overall judgement. If place_name is null this MUST "
                "be 'low', even when you are certain the reel contains no place. "
                "high = place named unambiguously AND city known (safe to pin on a "
                "map); medium = probable but should be confirmed by the user; "
                "low = no resolvable place."
            ),
        },
        "reasoning": {"type": "string", "description": "One sentence on how you concluded."},
    },
    "required": [
        "is_food_content", "place_name", "place_aliases", "area", "city", "state",
        "landmark", "full_address", "dishes", "cuisine", "price_band", "veg_status",
        "offers", "contact", "evidence", "search_summary", "confidence", "reasoning",
    ],
    "additionalProperties": False,
}


_BASE = """\
You identify the specific food place featured in an Indian short-form video (reel).

How to read the evidence:

1. ON-SCREEN TEXT IS THE STRONGEST SIGNAL. In Indian food reels the restaurant name \
is usually burned into the video — signboards, menu boards, billboards, the bill, \
delivery packaging — and never spoken aloud. Read every frame carefully, including \
text in Malayalam/Tamil/Telugu/Kannada/Hindi script. The audio is often just \
background music.

2. TAGGED ACCOUNTS often ARE the restaurant. A handle like @alfaham_kozhikode is \
strong evidence for both the name and the city.

3. HASHTAGS frequently carry the city (#kozhikode, #kochifood) even when nothing \
else does.

4. Reels code-mix heavily (Malayalam/Tamil/Telugu/Kannada/Hindi + English). Treat \
transliterations of the same name as the same place and list them in place_aliases.
"""

_WITH_COMMENTS = """\
5. A comment marked CREATOR comes from the person who posted the reel. They know \
where they filmed. Treat it as near-authoritative — it outranks the transcript.

6. A reply to a "where is this?" question is usually the answer, even from a random \
account. Weigh it by likes.
"""

_WITH_GEOTAG = """\
7. The INSTAGRAM GEOTAG is ground truth for location. Still extract the place name, \
but never contradict the geotag's city.
"""

_NO_LOGIN_NOTE = """\
NOTE ON AVAILABLE EVIDENCE: this reel was collected without an Instagram login, so \
there are NO comments and NO geotag — those sections will be empty. Do not treat \
their absence as meaningful. It also means the frames, caption, hashtags and tagged \
accounts are all you have, so read the frames especially carefully: if the place \
name appears anywhere on screen, that is very likely the only place it appears.

Because there is no geotag, the city must come from the caption, hashtags, tagged \
handles, or spoken audio. If none of them names a city, set city to null rather than \
inferring one from the cuisine — "it's a biryani place so probably Hyderabad" is \
exactly the kind of guess that puts a pin in the wrong state.

EVIDENCE SOURCES: you may only use "frame", "transcript", "caption", "hashtag" or \
"tagged_user" in the evidence array. Never "comment", "creator_reply" or "geotag" — \
none of those were provided, so attributing a fact to them is a fabricated citation. \
We show these quotes to the user as proof, so a wrong source label is as bad as a \
wrong fact.
"""

_RULES = """\
Rules:

- DO NOT GUESS. If no source names a resolvable place, return place_name: null with \
confidence "low". A null is far more useful to us than a plausible-sounding \
hallucination — we geocode this output, and a wrong name puts a wrong pin on a map.
- Never invent an address, area, or city that appears in no source.
- Every non-null field needs a matching entry in `evidence` with the exact quote, or \
a description of what was visible in the frame.
- confidence "high" only when the place name is unambiguous AND you know the city.
- MULTIPLE BRANCHES: if the sources list several cities for one brand (e.g. a frame \
reading "Dubai, Abu Dhabi"), this is a chain. Do NOT silently pick one and call it \
high confidence — that pins the map to a branch the reel may not be about. Put every \
city you saw in `place_aliases`, set `city` to the one the footage is actually from \
if that is determinable, and otherwise leave `city` null with confidence "medium".
- If the reel is a recipe filmed at home, a food meme, or otherwise not about a \
specific eatery, set is_food_content false and leave place fields null.
"""


def build_system_prompt(*, has_comments: bool, has_geotag: bool,
                        logged_in: bool = True) -> str:
    """
    Tailor the prompt to the signals actually present.

    Listing comment/geotag rules when neither can exist is not harmless: it invites
    the model to compensate for "missing" evidence it was told to expect, and that
    pressure is what turns a null into a confident wrong guess.
    """
    parts = [_BASE]
    if has_comments:
        parts.append(_WITH_COMMENTS)
    if has_geotag:
        parts.append(_WITH_GEOTAG)
    if not logged_in:
        parts.append(_NO_LOGIN_NOTE)
    parts.append(_RULES)
    return "\n".join(parts)


@dataclass
class Extraction:
    """Result of one structured extraction, whichever vertical produced it."""
    payload: dict
    model: str
    input_tokens: int
    output_tokens: int
    category: str = "food_spot"

    def __getitem__(self, k):
        return self.payload[k]

    @property
    def confidence(self) -> str:
        return self.payload.get("confidence", "low")

    @property
    def place_name(self) -> str | None:
        return self.payload.get("place_name")


# Kept so existing call sites and tests keep working.
FoodSpot = Extraction


# ─────────────────────────────────────────────────────────────────────────────

def _encode(path: Path) -> dict:
    return {
        "type": "image",
        "source": {
            "type": "base64",
            "media_type": "image/jpeg",
            "data": base64.standard_b64encode(path.read_bytes()).decode(),
        },
    }


def to_gemini_schema(schema: dict) -> dict:
    """
    Translate our JSON Schema into the OpenAPI 3.0 subset Gemini accepts.

    Two incompatibilities, both of which fail at request time if left alone:
      · union types  {"type": ["string","null"]}  ->  {"type":"string","nullable":true}
      · `additionalProperties` is rejected outright, so it's stripped
    `null` members of an enum move into `nullable` for the same reason.
    """
    out = dict(schema)
    out.pop("additionalProperties", None)

    t = out.get("type")
    if isinstance(t, list):
        non_null = [x for x in t if x != "null"]
        out["type"] = non_null[0] if non_null else "string"
        if "null" in t:
            out["nullable"] = True

    if "enum" in out:
        clean = [x for x in out["enum"] if x is not None]
        if len(clean) != len(out["enum"]):
            out["nullable"] = True
        out["enum"] = clean

    if "properties" in out:
        out["properties"] = {k: to_gemini_schema(v)
                             for k, v in out["properties"].items()}
    if "items" in out:
        out["items"] = to_gemini_schema(out["items"])

    return out


def build_evidence_block(reel: ReelData, transcript, ranked) -> str:
    """Everything non-visual, laid out so provenance is unambiguous to the model."""
    parts: list[str] = []

    # Omit the geotag/comment sections entirely when anonymous rather than printing
    # "(none)". An empty section still reads as "we looked and found nothing", which
    # is a different claim from "this channel was never available".
    if reel.location_name:
        geotag = reel.location_name
        if reel.has_geotag:
            geotag += f"  [lat {reel.location_lat}, lng {reel.location_lng}]"
        parts += ["=== INSTAGRAM GEOTAG ===", geotag, ""]

    parts += [
        "=== CREATOR ===",
        f"@{reel.owner}" + (f"\nbio: {reel.owner_bio}" if reel.owner_bio else ""),
        "",
        "=== TAGGED ACCOUNTS ===",
        ", ".join(f"@{u}" for u in reel.tagged_users) or "(none)",
        "",
        "=== CAPTION ===",
        reel.caption or "(empty)",
        "",
        "=== HASHTAGS ===",
        " ".join(f"#{h}" for h in reel.hashtags) or "(none)",
        "",
    ]

    if getattr(transcript, "low_confidence", False):
        parts += [
            "=== TRANSCRIPT QUALITY WARNING ===",
            "Whisper had low confidence on this audio. That means ONE of two things, "
            "and you must decide which by reading the text:",
            "  (a) the audio is background MUSIC — the text will read as song lyrics "
            "(poetic, repetitive, about love/moon/heart, unrelated to food). If so, "
            "ignore the transcript completely and use no evidence from it.",
            "  (b) the audio is REAL SPEECH that was simply hard to hear over music — "
            "the text will be garbled but will mention food, prices, offers or places. "
            "If so, USE IT: garbled speech about a '₹500 combo' or 'Buy 1 Get 1' is "
            "genuine evidence, and often the only place a price or offer appears.",
            "Transcription errors are expected either way, so judge by meaning, not "
            "by fluency.",
            "",
        ]

    parts += [
        f"=== TRANSCRIPT (detected: {transcript.language}) ===",
        transcript.native or "(no speech detected)",
        "",
        "=== TRANSCRIPT (English) ===",
        transcript.english or "(none)",
        "",
    ]

    if ranked:
        parts += [
            "=== COMMENTS (ranked: creator replies and location answers first) ===",
            comments_mod.format_for_llm(ranked),
            "",
        ]

    parts.append("Identify the food place. Return JSON matching the schema.")
    return "\n".join(parts)


def extract_food_spot(reel: ReelData, transcript, frames: list[Path],
                      max_comments: int = 30,
                      provider: str | None = None) -> FoodSpot:
    """Dispatch to whichever backend is configured. Same input, same FoodSpot out."""
    ranked = comments_mod.rank_comments(reel.comments, limit=max_comments)
    system = build_system_prompt(
        has_comments=bool(ranked),
        has_geotag=bool(reel.location_name),
        logged_in=reel.logged_in,
    )
    evidence = build_evidence_block(reel, transcript, ranked)

    return run_extraction(system, evidence, reel.video_path, frames,
                          FOOD_SPOT_SCHEMA, provider=provider)


def run_extraction(system: str, evidence: str, video_path: Path | None,
                   frames: list[Path], schema: dict,
                   provider: str | None = None) -> Extraction:
    """Vertical-agnostic: same call shape, different schema and system prompt."""
    provider = (provider or config.EXTRACTION_PROVIDER).lower()
    if provider == "gemini":
        return _extract_gemini(system, evidence, video_path, frames, schema)
    if provider == "claude":
        return _extract_claude(system, evidence, frames, schema)
    raise ValueError(f"Unknown EXTRACTION_PROVIDER {provider!r} (use gemini|claude)")


def _extract_claude(system: str, evidence: str, frames: list[Path],
                    schema: dict) -> Extraction:
    content: list[dict] = [_encode(p) for p in frames]
    content.append({"type": "text", "text": evidence})

    resp = anthropic_client().messages.create(
        model=config.EXTRACTION_MODEL,
        max_tokens=8000,
        thinking={"type": "adaptive"},
        output_config={
            "effort": "high",
            "format": {"type": "json_schema", "schema": schema},
        },
        system=system,
        messages=[{"role": "user", "content": content}],
    )
    text = "".join(b.text for b in resp.content if b.type == "text")
    return Extraction(payload=json.loads(text), model=resp.model,
                    input_tokens=resp.usage.input_tokens,
                    output_tokens=resp.usage.output_tokens)


def _gemini_video_part(video_path: Path):
    """
    Inline the MP4 when it's small enough, otherwise go through the Files API.

    Feeding the raw video beats sampled keyframes on both axes: Gemini sees every
    frame (a signboard that flashes between two samples can't be missed) and it
    tokenises far more cheaply than the equivalent stills.
    """
    import time
    from google.genai import types

    size = video_path.stat().st_size
    if size <= config.GEMINI_INLINE_MAX_BYTES:
        return types.Part.from_bytes(data=video_path.read_bytes(),
                                     mime_type="video/mp4")

    f = gemini_client().files.upload(file=str(video_path))
    for _ in range(60):                       # wait for server-side processing
        if getattr(f.state, "name", str(f.state)) != "PROCESSING":
            break
        time.sleep(2)
        f = gemini_client().files.get(name=f.name)
    return types.Part.from_uri(file_uri=f.uri, mime_type=f.mime_type)


def _extract_gemini(system: str, evidence: str, video_path: Path | None,
                    frames: list[Path], schema: dict) -> Extraction:
    from google.genai import types

    parts = []
    if video_path and Path(video_path).exists():
        parts.append(_gemini_video_part(Path(video_path)))
    else:                                      # fall back to stills
        for p in frames:
            parts.append(types.Part.from_bytes(data=p.read_bytes(),
                                               mime_type="image/jpeg"))
    parts.append(types.Part.from_text(text=evidence))

    resp = gemini_client().models.generate_content(
        model=config.GEMINI_MODEL,
        contents=parts,
        config=types.GenerateContentConfig(
            system_instruction=system,
            response_mime_type="application/json",
            response_schema=to_gemini_schema(schema),
            temperature=0,
        ),
    )
    u = resp.usage_metadata
    return Extraction(payload=json.loads(resp.text), model=config.GEMINI_MODEL,
                    input_tokens=u.prompt_token_count or 0,
                    output_tokens=u.candidates_token_count or 0)
