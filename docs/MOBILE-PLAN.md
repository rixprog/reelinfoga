# ReelBrain Mobile — restructure plan

## 1. Mobile is not a port. It's the unlock.

Three things the brief asked for are **crippled or impossible on the web**, and all
three are native primitives:

| Capability | Web | Native |
|---|---|---|
| Share a reel straight from Instagram | Android PWA only, and only if installed. **iOS: impossible** | Share sheet on both, first-class |
| Notifications that actually arrive | Needs the tab open, or a Telegram bot as a workaround | Real push, app closed |
| **"You're 500m from a saved biryani place"** | **Not possible.** Chrome removed the Geofencing API; `watchPosition` dies when the tab backgrounds | `CLCircularRegion` / `GeofencingClient` — works with the app closed |

That third row is the one that matters. It was example #3 in your original brief and
I had to tell you it couldn't be built. On mobile it's ~80 lines.

So this isn't "same product, smaller screen". The web version was a proof that the
**extraction** works. Mobile is where the **product** works.

---

## 2. The flow inverts

This is the single biggest design change, and everything else follows from it.

```
WEB (pull)                          MOBILE (push)
────────────────────────            ────────────────────────
open site                           (already in Instagram)
paste URL                           tap Share → ReelBrain
WAIT 30-60s staring at stages       dismissed instantly, back to scrolling
read result                         notification 40s later: "Saved: Al Faham"
                                    open it whenever — or never, until you
                                    walk past the place
```

On the web the user **waits**. On mobile the user **forgets** — and the app's job is
to bring it back at the right moment. Concretely:

- The progress-stage UI stops being the centrepiece. It moves to a small strip on
  the home screen. Nobody watches it.
- **The home screen is the library, not an input box.** Capture happens outside the
  app, in Instagram's share sheet.
- The reel detail screen becomes something you land on from a notification, a search,
  or a map pin — rarely straight after saving.
- Processing must survive the app being killed. That means a server-side job, not an
  in-app one.

---

## 3. Architecture

```
┌──────────────────────────┐
│  Instagram (any app)     │
│      ⋮ → Share           │
└────────────┬─────────────┘
             │  Android: ACTION_SEND intent filter
             │  iOS:     Share Extension target
             ▼
┌──────────────────────────────────────────────┐
│  ReelBrain app (React Native / Expo)         │
│  · receives URL, writes to LOCAL queue       │
│  · returns to Instagram in <300ms            │
│  · syncs queue → API when online             │
│  · SQLite mirror of the library (offline)    │
│  · geofences registered from saved places    │
└────────────┬─────────────────────────────────┘
             │  HTTPS
             ▼
┌──────────────────────────────────────────────┐
│  FastAPI  (wraps the EXISTING python core)   │
│  POST /ingest      → job id, returns instantly│
│  GET  /reels       → library (paged, delta)   │
│  GET  /search      → hybrid search            │
│  POST /trip/*      → planner                  │
│  GET  /thumb/{id}  → image                    │
│  POST /devices     → push token registration  │
└────────────┬─────────────────────────────────┘
             ▼
┌──────────────────────────────────────────────┐
│  Worker (Celery or RQ + Redis)               │
│  the pipeline exactly as it is today          │
│  → push notification on completion            │
└──────────────────────────────────────────────┘
```

### What survives, what dies

| | Lines | Fate |
|---|---|---|
| `data.py` `media.py` `transcribe.py` `extract.py` `verticals.py` `comments.py` | ~2,900 | **Untouched.** Platform-agnostic. |
| `trip.py` `itinerary.py` `geocode.py` `search.py` `store.py` | ~1,900 | **Untouched.** |
| `notify.py` `reminders.py` | ~500 | Extended — add a push channel alongside Telegram/email |
| `pipeline.py` | 500 | Becomes a worker task instead of a CLI. Keep the CLI; it's how you debug. |
| `src/**` (Next.js) | 4,263 | **Replaced** by the app. The API route *contracts* carry over almost 1:1. |

**The pivot is cheap because the core was never web-specific.** The one real piece of
new backend work is turning subprocess-spawning into a proper queue.

### One thing that must change: `store.py`

A flat JSON file was right for one user on one laptop. Multi-device, with an offline
mirror that needs delta sync, it isn't — concurrent writes will corrupt it. Move to
SQLite server-side (still zero-ops, still one file) with `updated_at` on every row so
the app can ask *"what changed since X?"*. That's a ~4-function change, exactly as the
module docstring predicted.

---

## 4. Stack

**React Native + Expo (dev build), TypeScript.**

Reasons, in order: the team already writes TypeScript; `expo-share-intent` handles the
Android intent filter *and* the iOS Share Extension from one config plugin; EAS builds
mean no Xcode/Android Studio setup; and `expo-location`, `expo-notifications`,
`expo-sqlite` cover geofencing, push and offline with no native code.

**Honest constraints, up front:**

- **Expo Go cannot receive share intents.** You need a development build (`eas build
  --profile development`). Budget half a day the first time; it is the single most
  common way this plan stalls.
- **iOS Share Extension is a separate binary** with its own memory limit. It must do
  nothing but hand the URL to the app group — no network, no parsing.
- **Android background location** requires a Play Store declaration and a privacy
  policy. Fine for a hackathon build; a real blocker for release. Plan for it, don't
  discover it.
- **iOS caps you at 20 monitored geofence regions.** With 200 saved food spots you
  must register only the nearest 20 and re-register as the user moves. This is a real
  algorithm, not a config value.

Alternatives considered: Flutter (better share plugin maturity, but throws away the
TypeScript reuse), native Kotlin (best share handling, doubles the work for iOS).

---

## 5. Screens

Bottom tabs — four, because five is where a tab bar starts feeling like a menu.

```
┌─────────┬─────────┬─────────┬─────────┐
│ Library │  Map    │ Alerts  │ Profile │
└─────────┴─────────┴─────────┴─────────┘
```

**Search is not a tab.** It's a persistent bar at the top of Library. Making it a tab
implies it's a separate mode; it's the primary way you use the library.

### 1. Library (home)
- Search bar pinned at top
- **Processing strip** under it when jobs are in flight — thumbnail + stage, collapses
  to nothing when idle
- Category filter chips: All · Food · Deadlines · Travel · Recipes · Products · Other
- Card grid, newest first. Each card: thumbnail, title, category glyph, one line of
  category-specific detail (a countdown for deadlines, a city for food, a cook time
  for recipes)
- Deadline cards closing in <48h float to the top regardless of date saved
- Empty state teaches the share gesture with an actual screenshot of Instagram's sheet

### 2. Map
- OSM tiles, pins for food spots and travel places
- Segmented control: Food / Travel / All
- "Near me" FAB → sorts by distance, draws a radius
- **Approximate pins render dashed and faded**, exactly as on web, and say so when
  tapped. This is not decoration — someone will navigate to one.
- Tap a pin → bottom sheet → Directions / open reel / full detail

### 3. Alerts
Two sections, one list:
- **Deadlines** — sorted by urgency, colour-coded, "Add to calendar" and "Register"
- **Nearby** — geofence hits, with the reel that triggered them
- Empty state is a good sign, and should say so rather than looking broken

### 4. Profile
Account, notification channels (push / Telegram / email — reuse `notify.py`), language
preference, storage used, "re-run extraction on all reels" (you *will* want this after
a prompt change), and the debug panel.

### Detail screens (pushed, not tabbed)
- **Reel detail** — hero thumbnail, category card, **evidence panel**, transcript
  toggle (Original / English / Romanised), source link
- **Trip planner** — destination → prefs form → costed itinerary + map. Reached from a
  Travel collection, not the tab bar.
- **Comparison** — product table, reached from a Product collection.

### The one screen concept that must not be lost

**The evidence panel.** "How we know: on-screen — 'EVERGREEN RESTAURANT'". It is the
thing that makes this app feel trustworthy rather than magic, and it's the hardest to
re-explain to a designer who hasn't seen it. It gets a prominent, permanent place in
the reel detail screen — not an accordion, not a "details" tab.

Same for **confidence**: HIGH pins on the map, MEDIUM shows a confirm card, LOW never
claims a location. That distinction must be visible, not buried.

---

## 6. Offline and sync

The share sheet fires whether or not there's signal — on a train, in a lift. So:

1. Share writes the URL to a **local SQLite queue** and returns immediately. No network
   on the critical path.
2. A background task drains the queue when connectivity returns.
3. The library is a **local mirror**, so the app opens instantly and works offline.
4. Sync is delta-based: `GET /reels?since=<cursor>`.
5. A queued-but-unsent reel shows in the library as pending — the user should never
   wonder whether their share landed.

---

## 7. Phases

**Phase 1 — the loop (2–3 days).** Expo dev build, share intent on Android, local
queue, FastAPI wrapping `pipeline.py`, library list, reel detail, push on completion.
This is the demo: share from Instagram, notification, open, see the card.

**Phase 2 — retrieval (1–2 days).** Search bar, category filters, map with pins,
Alerts with deadlines and calendar export.

**Phase 3 — the payoff (2 days).** Background geofencing and proximity push. Trip
planner. Product comparison. This is where the brief's promises land.

**Phase 4 — iOS + polish.** Share Extension, region-limit juggling, onboarding,
empty states.

Ship Phase 1 before designing Phase 3. The share→notification loop is the whole
product; everything else is a view onto it.

---

## 8. Risks

| Risk | Mitigation |
|---|---|
| Dev build setup eats a day | Do it **first**, before any UI. It's the only true blocker. |
| Backend has to be hosted now | A single cheap VM runs API + worker + Redis. Ngrok for the demo. |
| Instagram rate limits hit harder with more users | Per-creator profile cache already exists; add a global token bucket and a shared media cache keyed by shortcode. |
| iOS 20-region cap | Register nearest-20, re-register on significant location change. |
| Play Store background-location review | Not a hackathon problem. Is a launch problem. Write the privacy policy early. |
| Cold-start latency (~40s) feels slow | It doesn't, because nobody is watching. This is precisely why the flow inverts. |
