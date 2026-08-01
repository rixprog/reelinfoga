# ReelBrain — Full Plan

**Scope for this document:** the whole product's architecture, with the **Food Spot**
vertical designed end-to-end. Other verticals (Jobs, Recipes, Travel, Products, Events)
are sketched at the end — they reuse the same pipeline with a different extraction
schema, which is the point of the design.

---

## 1. The core insight

The naive design is a pipeline of specialists:

```
video → ffmpeg → Whisper → translate → NER → relation extraction → geocode
                    ↑ OCR model ↑ comment classifier ↑ ...
```

That's six models to build, tune, and keep in sync. It also throws away the thing that
actually matters: **the signals only make sense together.** The transcript says "ee
kada" ("this shop"), the on-screen text says "AL FAHAM", the caption says "Kozhikode
beach 🔥", a comment says "Palayam-il alle?" — no single signal names the place, but
together they do.

**So: one multimodal call does the extraction.** We give Claude Opus 5 everything at
once — keyframes, transcript, caption, hashtags, top comments — and constrain the output
with a JSON schema.

```
                    ┌─────────────────────────────────┐
  keyframes (6-8) ──┤                                 │
  transcript (en) ──┤   Claude Opus 5                 │──► FoodSpot JSON
  caption ──────────┤   structured outputs            │    (name, area, city,
  hashtags ─────────┤   output_config.format          │     dishes, price band,
  top comments ─────┤                                 │     evidence, confidence)
  creator handle ───┤                                 │
                    └─────────────────────────────────┘
```

Vision handles OCR *and* scene understanding in the same pass (it can tell a restaurant
interior from a home kitchen, which matters for filtering). One prompt to iterate on
instead of six models to tune. For a 48-hour build this isn't a shortcut — it's the
better architecture.

---

## 2. System architecture

```
┌──────────────┐
│  Instagram   │  user taps Share → "ReelBrain"  (Web Share Target API)
│  app / web   │  or pastes URL into the app
└──────┬───────┘
       │  POST /api/ingest  {url}
       ▼
┌─────────────────────────┐        ┌──────────────────────┐
│  Next.js 15 (web/)      │◄──────►│  FastAPI (api/)      │
│  · PWA, mobile-first    │  REST  │  · /ingest           │
│  · share target         │        │  · /search           │
│  · map + feed + search  │        │  · /nearby           │
│  · confirm-place cards  │        │  · /reels/{id}       │
└─────────────────────────┘        └──────┬───────────────┘
                                          │ enqueue
                                          ▼
                                   ┌──────────────┐
                                   │ Redis + Celery│
                                   └──────┬───────┘
                                          ▼
        ┌─────────────────────────────────────────────────────────┐
        │  Ingest worker  (the whole product lives here)          │
        │                                                         │
        │  1. fetch      yt-dlp → mp4 + metadata + caption        │
        │  2. comments   scraper → top N + replies                │
        │  3. frames     ffmpeg → 6-8 keyframes (scene-change)    │
        │  4. audio      ffmpeg → 16kHz mono wav                  │
        │  5. asr        Sarvam Saaras → native + English         │
        │  6. extract    Claude Opus 5 (multimodal, JSON schema)  │
        │  7. resolve    Google Places → place_id, lat/lng        │
        │  8. embed      Voyage → vector(1024)                    │
        │  9. persist    Postgres                                 │
        └────────────────────────┬────────────────────────────────┘
                                 ▼
                    ┌────────────────────────────┐
                    │ Postgres 16                │
                    │  pgvector  semantic search │
                    │  PostGIS   nearby queries  │
                    │  pg_trgm   Manglish fuzzy  │
                    │  tsvector  keyword         │
                    └────────────────────────────┘
```

---

## 3. Ingestion — how reels get in

**Chosen path: share-sheet / paste URL.** Instagram has no API for a user's saved
collection, so this is the only path that works today without asking users to hand over
credentials.

### 3a. The share target (this is the whole UX)

`web/public/manifest.json`:

```json
{
  "name": "ReelBrain",
  "share_target": {
    "action": "/share",
    "method": "GET",
    "params": { "title": "title", "text": "text", "url": "url" }
  }
}
```

Once the PWA is installed on Android, **ReelBrain appears in Instagram's native share
sheet.** Tap share → ReelBrain → done. That single flow is the demo's opening beat and
it costs about 20 lines of config. iOS Safari doesn't support Web Share Target — iOS
users paste the URL (and the native app in Phase 2 gets a proper Share Extension).

### 3b. Fetching the media — and the honest risk

`yt-dlp` handles the video + caption + basic metadata. **Comments are the hard part**
and the biggest technical risk in this build:

| Source | Reality |
|---|---|
| Public reel, no auth | yt-dlp gets video + caption. Comments: unreliable. |
| With session cookies | Comments work, but rate-limited and account-risky |
| `instaloader` w/ session | Same tradeoff, better comment threading |
| Third-party (Apify etc.) | Works, costs money, adds a dependency |

**Mitigation for the hackathon — do both:**

1. **Live path** — works for public reels. If comments fail, the pipeline degrades
   gracefully: we still have video, audio, and caption. Never crash on missing comments.
2. **Seeded path** — for the 20–30 demo reels, cache the full payload (video, caption,
   comments) as JSON in `seed/` ahead of time. The demo never depends on Instagram
   being cooperative at 4pm on stage.

This is not cheating. It's the same thing you'd do in production with a cache layer, and
it makes the difference between a demo that works and a demo that doesn't.

**Also handle YouTube Shorts and TikTok URLs** — yt-dlp does all three with the same
call, comments are easier on both, and "works across platforms" is a strong judge answer
to "what about Instagram's ToS?"

---

## 4. Language strategy — the actual differentiator

Target languages: **Malayalam, Tamil, Kannada, Telugu, Hindi** (+ English, + heavy
code-mixing, which is the normal case not the edge case).

### 4a. ASR + translation

**Primary: Sarvam AI.** Built for Indian languages, and critically their
**speech-to-text-translate** endpoint goes audio → English directly in one call, which
is exactly the shape we need. They also ship a transliteration API for the Manglish
problem.

**Fallback: Whisper large-v3** (self-hosted via `faster-whisper`, or the OpenAI API).
Solid on Hindi and Tamil; noticeably weaker on Malayalam, which is our primary language —
hence Sarvam first.

**Also viable:** ElevenLabs Scribe (strong multilingual), AI4Bharat IndicConformer
(open weights, free, more setup).

> Verify Sarvam's current model names, language coverage, and pricing before you wire it
> up — this space moves monthly. The pipeline is provider-agnostic behind one
> `transcribe(audio) -> {native, english, lang}` function; swapping providers should be
> a one-file change.

### 4b. Three text representations, stored per reel

| Column | Content | Used for |
|---|---|---|
| `transcript_native` | Original script (മലയാളം) | Display, provenance, re-processing |
| `transcript_en` | English translation | **Embeddings, FTS, LLM extraction** |
| `transcript_roman` | Romanized ("ee kada Kozhikode-il") | Manglish/Tanglish fuzzy search |

### 4c. Where the Manglish search win actually comes from — be precise

It is tempting to assume romanization is what makes search work. It mostly isn't.
When a user types *"kozhikode biryani reel"*, the words that carry the meaning are
**proper nouns**, and proper nouns survive translation unchanged. The English translation
already contains "Kozhikode" and "biryani". Semantic search on `transcript_en` handles
the bulk of queries on its own.

Romanization earns its keep in a narrower, real set of cases:

- Dish and place names with **no English equivalent** — *puttu*, *kappa*, *thattukada*,
  *porotta*
- **Spelling variance** — Kozhikode / Kozhikkode / Calicut; Thattukada / Thattu kada
- Queries typed **entirely in Manglish** — *"nalla beef fry evide"*

So: build the English semantic path first (it's most of the value), and add `pg_trgm`
fuzzy matching on `transcript_roman` + place aliases as the second retrieval arm. Don't
budget a day for transliteration — budget an hour.

---

## 5. Comment mining — turning the comment section into a location oracle

This is the mechanic nobody else has, and it deserves real design rather than "also send
the comments."

### The pattern being exploited

Food reels reliably produce this thread shape:

```
@someone     "Bro where is this place?? 😍"          142 likes
  └ @creator "Al Faham, Palayam — near the bus stand"  ← authoritative
@another     "evide aanu ith?"                        89 likes
  └ @random  "kozhikode aanu"                          ← partial
```

The answer is almost always there. It's just buried under 300 fire emojis.

### The algorithm

**Step 1 — fetch.** Top ~100 comments by like count, *with reply threads intact*.
Parent/child structure is load-bearing: a reply's meaning depends on its question.

**Step 2 — cheap prefilter.** Regex for location-intent across scripts and romanizations,
so we spend LLM tokens only on comments that might carry an answer:

```python
LOCATION_INTENT = [
    # English
    r"\bwhere\b", r"\blocation\b", r"\baddress\b", r"\bplace\b", r"\bpin\b", r"\bmaps?\b",
    # Malayalam
    r"എവിടെ", r"സ്ഥലം", r"\bevide\b", r"\bevda\b", r"\bsthalam\b",
    # Tamil
    r"எங்கே", r"இடம்", r"\benge[ky]?\b", r"\bidam\b",
    # Telugu
    r"ఎక్కడ", r"\bekkada\b",
    # Kannada
    r"ಎಲ್ಲಿ", r"\belli\b",
    # Hindi
    r"कहाँ", r"कहां", r"\bkahan\b", r"\bkaha\b", r"\bjagah\b",
]
```

Keep a comment if **it** matches, **or if its parent matches** (the reply is the answer,
and the reply itself rarely contains the word "where").

**Step 3 — rank by authority, not by likes alone.** Weight in this order:

1. **Creator replies** — the account that posted the reel. Near-ground-truth. Flag these
   explicitly in the payload.
2. **High-liked replies to location questions** — crowd-verified.
3. Everything else.

**Step 4 — hand ~30 comments to the extractor** as a distinct evidence block, each tagged
with `is_creator`, `likes`, and `reply_to`. The prompt tells the model how to weigh them.
This is why authority is metadata and not something the model has to guess at.

**Step 5 — record provenance.** Every extracted field carries where it came from. When
the UI says *"Found in comments — the creator replied 'Al Faham, Palayam'"* and shows the
quote, that is a genuinely delightful moment and it takes ten minutes to build once
provenance is in the schema. **Do not skip it.** It's the difference between "an app
found a restaurant" and "the app read the comments for me."

---

## 6. Extraction — one call, strict schema

Structured outputs guarantee parseable JSON, so no defensive parsing code.

```python
import anthropic

client = anthropic.Anthropic()

FOOD_SPOT_SCHEMA = {
    "type": "object",
    "properties": {
        "is_food_content": {"type": "boolean"},
        "place_name":  {"type": ["string", "null"],
                        "description": "Restaurant/stall name exactly as it appears"},
        "place_aliases": {"type": "array", "items": {"type": "string"},
                        "description": "Alternate spellings/transliterations seen"},
        "area":        {"type": ["string", "null"], "description": "Locality/neighbourhood"},
        "city":        {"type": ["string", "null"]},
        "landmark":    {"type": ["string", "null"], "description": "e.g. 'near the bus stand'"},
        "dishes":      {"type": "array", "items": {"type": "string"}},
        "cuisine":     {"type": ["string", "null"]},
        "price_band":  {"type": ["string", "null"], "enum": ["budget", "mid", "premium", None]},
        "veg_status":  {"type": ["string", "null"], "enum": ["veg", "non-veg", "both", None]},
        "evidence": {
            "type": "array",
            "description": "One entry per extracted fact, with its source",
            "items": {
                "type": "object",
                "properties": {
                    "field":  {"type": "string"},
                    "source": {"type": "string",
                               "enum": ["frame", "transcript", "caption",
                                        "comment", "creator_reply", "hashtag"]},
                    "quote":  {"type": "string"},
                },
                "required": ["field", "source", "quote"],
                "additionalProperties": False,
            },
        },
        "confidence": {"type": "string", "enum": ["high", "medium", "low"]},
        "reasoning":  {"type": "string", "description": "One sentence on how you concluded"},
    },
    "required": ["is_food_content", "place_name", "place_aliases", "area", "city",
                 "landmark", "dishes", "cuisine", "price_band", "veg_status",
                 "evidence", "confidence", "reasoning"],
    "additionalProperties": False,
}

response = client.messages.create(
    model="claude-opus-5",
    max_tokens=8000,
    thinking={"type": "adaptive"},
    output_config={
        "effort": "high",
        "format": {"type": "json_schema", "schema": FOOD_SPOT_SCHEMA},
    },
    system=EXTRACTION_SYSTEM_PROMPT,
    messages=[{"role": "user", "content": [
        *[{"type": "image", "source": {"type": "base64",
           "media_type": "image/jpeg", "data": f}} for f in frames_b64],
        {"type": "text", "text": build_evidence_block(
            transcript_native, transcript_en, caption, hashtags,
            ranked_comments, creator_handle)},
    ]}],
)
```

### System prompt — the parts that matter

Encode the domain knowledge that makes extraction good:

- *"The restaurant name is most often burned into the video as on-screen text. Read every
  frame carefully, including signboards, menu boards, and bills."*
- *"A reply from the creator (`is_creator: true`) is authoritative and outranks the
  transcript."*
- *"Do not guess. If no place name is resolvable from any source, return null with
  confidence 'low'. A null is more useful than a hallucinated restaurant."*
- *"Indian food reels frequently code-mix. Treat Manglish/Tanglish transliterations of a
  name as the same place and list them in `place_aliases`."*
- *"`price_band`: budget = street food / thattukada, mid = casual dining, premium = fine
  dining or hotel."*

### Cost

At full resolution, ~6 frames costs roughly 25–30k image tokens ≈ **$0.15/reel** on Opus 5
($5/M input). For 50 demo reels that's under $10 — a non-issue.

If you *do* need to cut it: downsample frames to ~768px on the long edge before encoding
(roughly 4× fewer image tokens), or move extraction to `claude-sonnet-5`. Use `count_tokens`
on a real frame set to measure before optimizing — don't guess.

---

## 7. Place resolution — text to a pin on a map

Extraction gives you *"Al Faham, Palayam, Kozhikode"*. That's a string, not a location.

**Google Places Text Search** is the right call for India — best coverage of small
restaurants, and it returns the extras that make the app feel real (rating, hours, price
level, photos).

```python
query = " ".join(filter(None, [place_name, area, city]))
# locationbias: if the IG location tag or an earlier reel gave us a region, bias to it
```

### Confidence tiers → different UX (this is a feature, show it)

| Tier | Condition | UX |
|---|---|---|
| **HIGH** | IG location tag with coords, **or** Places match with name similarity > 0.85 and city agreement | Auto-pin on the map |
| **MEDIUM** | Places returned candidates but the city is ambiguous, or name came from comments only | Card: *"Is this the place?"* + top 3 candidates + the evidence quote |
| **LOW** | Only a dish or cuisine, no resolvable place | Saved to feed, no pin. Prompt: *"Know where this is?"* |

Do not hide the MEDIUM case. A judge asking *"what if the AI is wrong?"* is much better
answered by a confirm card that shows its evidence than by a confident wrong pin.

Cache resolutions in a `places` table keyed by `google_place_id` — many reels point at
the same restaurant, and you should render that as *"3 reels saved here"* on the pin.

---

## 8. Search — hybrid retrieval

Four retrieval arms, merged with Reciprocal Rank Fusion:

```
query ──┬─► pgvector cosine on embedding(transcript_en + caption + dishes)   semantic
        ├─► tsvector FTS on the same English text                            keyword
        ├─► pg_trgm similarity on transcript_roman + place_aliases           Manglish/typos
        └─► structured filters (category, city, ST_DWithin radius)           facets
                                    │
                                    ▼
                       RRF merge → ranked results
```

RRF (`score = Σ 1/(60 + rank_i)`) is three lines of SQL, needs no tuning, and reliably
beats any hand-weighted blend you'd come up with in 48 hours.

**Embeddings: Voyage** (`voyage-3` family) — Anthropic's recommended embeddings partner,
and strong on retrieval. Alternative if you want multilingual embedding of the *native*
script directly and no external API: self-host `bge-m3` (1024-dim, genuinely good on
Indic languages). Anthropic has no embeddings endpoint, so this one call goes elsewhere
regardless.

Embed the **English canonical text** (`transcript_en + caption_en + dishes + place_name`),
not the raw native transcript. Multilingual embedding models exist, but a single-language
index is more predictable and you have 48 hours.

---

## 9. Location notifications — and one honest constraint

**What the brief wants:** *"you walk near a saved biryani place, your phone buzzes."*

**What the web can actually do:** not that. Background geofencing does not exist on the
web — Chrome's Geofencing API was removed and never shipped elsewhere.
`navigator.geolocation.watchPosition()` only runs while your tab is alive and
foregrounded. Web Push can deliver a notification, but the *server* has to know you're
near something, and the server only learns your location when the app tells it.

So for a responsive web app, the achievable version is:

1. **"Near Me" screen** — live foreground geolocation, `ST_DWithin` query, sorted by
   distance, with a map. This is genuinely useful and completely real.
2. **Foreground proximity nudge** — while the app is open, crossing 500m of a saved spot
   fires a local notification. Real, just requires the app to be open.
3. **Demo location simulator** — a dev control that drops your position anywhere in
   Kochi/Kozhikode. This is how you demo the feature on stage without walking to a
   biryani shop.

**Say this out loud in the pitch.** "True background geofencing needs the native app —
that's `GeofencingClient` on Android and `CLCircularRegion` on iOS, and the radius query
logic we've already built is what it calls." Knowing exactly why the web can't do it, and
exactly what the native fix is, reads as competence. Pretending otherwise reads as a bug
waiting to be found.

---

## 10. Data model

Full DDL in [SCHEMA.sql](SCHEMA.sql). The shape:

```
users
  └─ reels           (url, platform, video_path, caption, hashtags, creator,
                      transcript_native/en/roman, lang, embedding, category,
                      status, raw_payload jsonb)
       ├─ reel_comments   (text, author, likes, is_creator, parent_id)
       ├─ extractions     (schema_version, payload jsonb, confidence, model, cost)
       └─ reel_places     (reel_id → place_id, confidence, confirmed_by_user)
                                        │
                              places    ▼
                              (google_place_id, name, aliases[], geog geography(Point),
                               city, area, rating, price_level, hours jsonb)
```

**Design notes:**

- `extractions.payload` is `jsonb`, versioned by `schema_version`. Per-vertical fields
  live here, not as columns. Adding the Jobs vertical means a new schema constant and a
  new prompt — **zero migrations**. This is what makes the "all-in-one platform" story
  credible in a demo.
- `places` is deduplicated by `google_place_id`, so N reels → 1 pin with a reel count.
- `reel_places.confirmed_by_user` captures the confirm-card decision — free training data
  and a nice thing to mention.
- `raw_payload` keeps the untouched scrape so you can re-run the pipeline after a prompt
  change without re-scraping. You *will* change the prompt. Repeatedly.

---

## 11. Generalizing past food (the platform story)

The whole pipeline is vertical-agnostic except the JSON schema and the prompt. A cheap
classifier call routes each reel:

| Category | Schema adds | Action surface |
|---|---|---|
| **Food Spot** ✅ | place, dishes, price band | Map pin, nearby alert, directions |
| Job / Internship | company, role, eligibility, **deadline** | Calendar + reminder |
| Recipe | ingredients[], steps[], prep time | Recipe card, shopping list |
| Travel | places[], best season | **Itinerary generator** (cluster by geo) |
| Product | product, specs{}, price | **Comparison table across saved reels** |
| Event | title, date, venue, reg deadline | Calendar (.ics) |

**Say this in the pitch, don't build it.** One slide: *"Food Spot is one schema. Here are
the other six — same pipeline, ~40 lines each."* That's how a demo of one vertical sells
a platform.

The travel itinerary and the product comparison are the two that make judges lean
forward, because they're both *aggregations across reels* — something no reel app does.
If you finish early, do the product comparison: it's a single LLM call over N saved
reels in the same category, rendered as a table.

---

## 12. Risk register

| Risk | Likelihood | Mitigation |
|---|---|---|
| Instagram comment scraping breaks | **High** | Seeded demo payloads + graceful degradation to caption/audio only |
| Malayalam ASR quality is poor | Medium | On-screen text via vision is often *better* than audio for place names — the multimodal design already hedges this |
| Places API can't find a small thattukada | Medium | Fall back to area-level pin + confirm card. Shows honest confidence rather than a wrong pin |
| Extraction hallucinates a restaurant | Medium | Prompt hard for nulls; `evidence` array makes every claim auditable; confirm card for MEDIUM |
| Pipeline too slow to demo live | Medium | Pre-process demo reels; live-ingest **one** reel on stage to prove it's real; show the queue UI while it runs |
| Google Places quota / billing | Low | Cache aggressively in `places`; $200/mo free tier is plenty |

---

## 13. What "done" looks like for the hackathon

- [ ] Install the PWA, share a reel from Instagram, watch it land in the feed
- [ ] Malayalam reel → correct English transcript displayed alongside the original
- [ ] A reel whose location appears **only in the comments** resolves correctly, with the
      creator's reply quoted as evidence
- [ ] Map view with pins, clustered by city
- [ ] Semantic search: *"that spicy beef place near the beach"* returns the right reel
- [ ] "Near Me" with the location simulator → proximity notification fires
- [ ] A MEDIUM-confidence reel shows the confirm card; confirming it drops the pin
- [ ] One slide showing the other six verticals as the same pipeline
