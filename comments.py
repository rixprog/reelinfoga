"""
Comment mining — the part no other reel app has.

Indian food reels reliably produce this thread shape:

    @someone   "Bro where is this place?? 😍"            142 likes
      └ @creator "Al Faham, Palayam — near the bus stand"   ← the answer
    @another   "evide aanu ith?"                          89 likes
      └ @random  "kozhikode aanu"                            ← partial answer

The location is usually *there*. It's just buried under 300 fire emojis, and it's
almost never in the comment that asks — it's in the reply.

So this module does three things:
  1. flags location-intent comments across scripts and romanizations
  2. propagates that flag to replies (the reply is the answer; it rarely repeats
     the question, so on its own it looks like noise)
  3. ranks by *authority*, not by likes — a creator reply outranks everything
"""

from __future__ import annotations

import math
import re

from data import Comment

# ─────────────────────────────────────────────────────────────────────────────
# "Where is this?" in the languages we care about — native script AND romanized,
# because Indian comment sections are overwhelmingly romanized.
# ─────────────────────────────────────────────────────────────────────────────

LOCATION_INTENT_PATTERNS = [
    # English
    r"\bwhere\b", r"\blocation\b", r"\baddress\b", r"\bplace\b", r"\bspot\b",
    r"\bpin\b", r"\bmaps?\b", r"\bdirections?\b", r"\bwhich\s+(?:city|town|place)\b",
    r"\bname\s+of\s+(?:the\s+)?(?:place|shop|hotel|restaurant)\b",

    # Malayalam
    r"എവിടെ", r"എവിടെയാണ", r"സ്ഥലം", r"ലൊക്കേഷ",
    r"\bevide\b", r"\bevda\b", r"\bevideya\b", r"\bsthalam\b", r"\bethu\s*sthalam\b",

    # Tamil
    r"எங்கே", r"எங்க", r"இடம்",
    r"\beng[ka]e?\b", r"\bengey\b", r"\bidam\b",

    # Telugu
    r"ఎక్కడ", r"ఎక్కడుంది",
    r"\bekkada\b", r"\bekkadi\b",

    # Kannada
    r"ಎಲ್ಲಿ", r"ಎಲ್ಲಿದೆ",
    r"\belli\b", r"\bellide\b",

    # Hindi
    r"कहाँ", r"कहां", r"कहा", r"जगह", r"पता",
    r"\bkahan\b", r"\bkaha[an]*\b", r"\bjagah\b", r"\bpata\b",
]

_INTENT_RE = re.compile("|".join(LOCATION_INTENT_PATTERNS), re.IGNORECASE | re.UNICODE)


def has_location_intent(text: str) -> bool:
    return bool(text) and bool(_INTENT_RE.search(text))


def mark_location_intent(comments: list[Comment]) -> list[Comment]:
    """
    Flag intent, then propagate from parent to reply.

    Without the propagation step the actual answers score as noise: "Al Faham,
    Palayam" contains no question words at all.
    """
    by_id = {c.id: c for c in comments}

    for c in comments:
        c.has_location_intent = has_location_intent(c.text)

    for c in comments:
        if c.parent_id and not c.has_location_intent:
            parent = by_id.get(c.parent_id)
            if parent is not None and has_location_intent(parent.text):
                c.has_location_intent = True

    return comments


# ─────────────────────────────────────────────────────────────────────────────
# Ranking
# ─────────────────────────────────────────────────────────────────────────────

def _score(c: Comment, parent: Comment | None) -> float:
    """
    Authority first, popularity second.

    A creator reply is near-ground-truth: they know where they filmed. A 400-like
    "🔥🔥🔥" is worth nothing. Sorting by likes alone gets this exactly backwards,
    which is why likes only act as a tie-breaker here.
    """
    score = 0.0

    if c.is_creator:
        score += 1000.0                     # authoritative
        if c.parent_id:
            score += 300.0                  # creator *answering* someone — the jackpot

    if c.parent_id and parent is not None and parent.has_location_intent:
        score += 500.0                      # a reply to "where is this?"

    if c.has_location_intent:
        score += 200.0

    score += 20.0 * math.log1p(max(c.likes, 0))   # popularity as tie-breaker

    # Pure emoji / one-word reactions carry no information.
    if len(re.sub(r"[\W_]+", "", c.text, flags=re.UNICODE)) < 3:
        score -= 400.0

    return score


def rank_comments(comments: list[Comment], limit: int = 30) -> list[Comment]:
    """Mark intent, score, return the top `limit` most likely to name the place."""
    if not comments:
        return []

    mark_location_intent(comments)
    by_id = {c.id: c for c in comments}

    ranked = sorted(
        comments,
        key=lambda c: _score(c, by_id.get(c.parent_id) if c.parent_id else None),
        reverse=True,
    )
    return ranked[:limit]


def format_for_llm(comments: list[Comment], by_id: dict[int, Comment] | None = None) -> str:
    """
    Render ranked comments as an evidence block.

    Authority is passed as explicit metadata (`CREATOR`, the quoted parent) rather
    than left for the model to infer — it shouldn't have to guess who's credible.
    """
    if not comments:
        return "(no comments available)"

    by_id = by_id or {c.id: c for c in comments}
    lines = []
    for c in comments:
        tag = "CREATOR" if c.is_creator else c.author
        meta = f"{tag}, {c.likes} likes"
        if c.parent_id:
            parent = by_id.get(c.parent_id)
            snippet = (parent.text[:60] + "…") if parent and len(parent.text) > 60 \
                else (parent.text if parent else "?")
            meta += f', reply to "{snippet}"'
        lines.append(f"- [{meta}] {c.text}")

    return "\n".join(lines)
