# ReelBrain

Paste an Instagram reel link. ReelBrain watches the video, reads the text burned into
the frames, listens to the audio (Malayalam / Tamil / Hindi / English, usually
code-mixed), reads the caption and comments — then extracts what actually matters and
makes it searchable, mappable and actionable.

Your saved folder is a graveyard: a biryani place you meant to try, an internship that
closed last week, a Wayanad itinerary you forgot about. This turns it into something
you can use.

---

## Run it

**You need:** Node 20+, Python 3.11+, and a Gemini + Groq API key. Both have free
tiers. ffmpeg is bundled — nothing to install.

```bash
git clone https://github.com/rixprog/reelinfoga.git
cd reelinfoga

# 1. Python side — the extraction pipeline
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt

# 2. Node side — the web app
npm install

# 3. Config
cp .env.example .env      # then fill in the keys below

# 4. Go
npm run dev               # http://localhost:3000
```

Paste a reel link on the home page and watch it work.

### The keys

Only two are required.

| Key | Needed for | Where |
|---|---|---|
| `GEMINI_API_KEY` | **Required.** Extraction + search embeddings | [aistudio.google.com/apikey](https://aistudio.google.com/apikey) — free tier |
| `GROQ_API_KEY` | **Required.** Transcription (Whisper) | [console.groq.com/keys](https://console.groq.com/keys) — free tier |
| `TELEGRAM_BOT_TOKEN` | Optional. Notifications | [@BotFather](https://t.me/BotFather) → `/newbot` |
| `TELEGRAM_CHAT_ID` | Optional. Who gets them | message your bot, then open `https://api.telegram.org/bot<TOKEN>/getUpdates` |
| `IG_USERNAME` | Optional. Unlocks comments + geotags | `.venv/bin/instaloader --login <throwaway>` |

Leave `IG_USERNAME` blank and it runs anonymously — you still get the video, caption,
hashtags and tagged accounts. Instagram gates comments and geotags behind a login, so
those need a session. **Use a throwaway account:** automated fetching gets accounts
action-blocked.

---

## The five sections

| | |
|---|---|
| **Analyze** `/` | Paste a link, watch the steps run, get the category and a summary |
| **Reels** `/reels` | Dense thumbnail grid. Search by *meaning*, filter, group into collections, play inline |
| **Map** `/map` | Every located place across every category, with Google Maps and OSM links |
| **Saved** `/saved` | Your shortlist — starred reels and collections |
| **History** `/history` | A processing log: what was analyzed, when, in what language |

## What it extracts

Every reel is sorted into one of six categories, each with its own screen:

- **Food spot** — restaurant, area, dishes, offers, phone, map location
- **Deadline** — internships, hackathons, scholarships. Application deadline *and*
  event date kept separate, plus calendar export and registration links
- **Travel** — places geocoded onto OpenStreetMap, plus a costed day-by-day itinerary
- **Recipe** — ingredients with quantities, numbered steps with timings
- **Product** — specs, prices, and a comparison that merges *across* reels
- **Other** — the catch-all, so nothing saved is ever a blank entry

Two things are visible on every screen, because they are the point:

**Evidence** — every extracted fact is traceable. *"How we know: [ON-SCREEN]
'EVERGREEN RESTAURANT'"*.

**Confidence** — high / medium / low. The app refuses to guess: a medium result never
looks like a high one, and approximate map pins are dashed and say so. Someone will
drive to these pins.

---

## Command line

The pipeline runs standalone — useful for debugging and batches.

```bash
.venv/bin/python pipeline.py "https://www.instagram.com/reel/XXXX/"
.venv/bin/python pipeline.py --batch urls.txt

.venv/bin/python search.py "that biryani recipe"
.venv/bin/python search.py --reindex

.venv/bin/python trip.py Wayanad --days 2 --travellers 4 --origin Kochi --budget 40000
.venv/bin/python reminders.py --dry-run
```

## Notifications

Optional, and Telegram is the only genuinely free channel — no approval, no business
account. Set the two `TELEGRAM_*` keys, then check **Settings** in the app and hit
*Send a test message*.

You get a message when a reel finishes processing, and again before a saved deadline
closes — each with the reel's thumbnail attached. For the daily reminder job:

```
0 9 * * *  cd ~/projects/reelbrain && .venv/bin/python reminders.py
```

Reminders fire at 7 days, 2 days and the morning of — each exactly once, so a daily
cron never re-sends the same alert.

---

## How it works

```
instaloader ──(429)──> yt-dlp          collection, with a fallback
      ↓
ffmpeg: 6 keyframes + 16 kHz audio     media
      ↓
detect language → transcribe → translate → romanise
      ↓
cheap text-only classifier             routing
      ↓
one multimodal call per vertical       extraction (strict JSON schema)
      ↓
store + PURGE the video                18 MB → 160 KB per reel
```

A few decisions worth knowing:

**The video is deleted after extraction.** Everything downstream reads the extracted
JSON, so keeping it would cost ~9 GB for 500 reels of data nothing reads again. Reels
still play in the app — via Instagram's own embed, which also stays correct if the
creator edits or deletes the original.

**One multimodal call, not a chain of specialists.** The signals only make sense
together: the transcript says *"ee kada"*, frame 3 shows a signboard, the caption says
*"Kozhikode"*. No single source names the place; read together they do.

**Search is hybrid.** Semantic embeddings find things by meaning; BM25 catches the rare
proper nouns embeddings are weak on. Merged with reciprocal rank fusion.

**Geometry is code, narrative is the model.** Distances, routes and cost totals are
computed in Python. Models are unreliable at arithmetic and will call two places
"nearby" when they are 40 km apart.

## Layout

```
pipeline.py      end to end: URL → extracted JSON
verticals.py     the six categories: a schema + a prompt each
extract.py       provider-agnostic structured extraction (gemini | claude)
data.py          Instagram collection, single fetch, yt-dlp fallback
transcribe.py    language detect → transcribe → translate → romanise
search.py        hybrid semantic + keyword search
trip.py          costed itineraries      geocode.py   OSM geocoding
store.py         the saved library       notify.py    Telegram / email
src/             the Next.js app
```

## Notes

- `.env` is gitignored and must never be committed.
- Instagram rate-limits hard. Profile lookups are cached with a cooldown, and the
  pipeline falls back to yt-dlp on a 429 rather than sleeping through it.
- The mobile app lives on the `mobile-app` branch, not here.
