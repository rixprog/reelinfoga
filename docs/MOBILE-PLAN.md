# ReelBrain Mobile — thin client plan

> **Scope rule for this phase: the site code is not touched.**
> No edits to `src/`, no edits to the API routes, no new backend service. The
> laptop keeps running `npm run dev` exactly as it does now, and the phone is a
> thin client that talks to it over wifi. Site UI work resumes after the app.

## 1. The backend already exists and already works

Verified, not assumed — every route the app needs answers over the LAN today:

```
laptop: http://10.91.217.154:3000        (next dev already binds 0.0.0.0)

  /api/analyze          POST   share a reel          200
  /api/analyze/[id]     GET    job progress          200
  /api/reels            GET    the library           200
  /api/search           GET    hybrid search         200
  /api/thumb/[id]       GET    thumbnail             200
  /api/compare          GET    product comparison    200
  /api/itinerary        GET    destinations          200
  /api/trip/rough|plan  POST   trip planner          200
```

So the whole backend task is: **nothing.** Keep the dev server running.

One thing that would normally bite here doesn't: React Native's `fetch` is not a
browser, so it does not enforce CORS. No headers to add, no middleware, no config.

---

## 2. Architecture

```
┌───────────────────────┐        ┌──────────────────────────────┐
│  PHONE                │        │  LAPTOP (unchanged)          │
│                       │        │                              │
│  Instagram            │        │  npm run dev  :3000          │
│    ⋮ Share            │        │    ├── /api/*  route handlers│
│      ↓                │  wifi  │    └── spawns pipeline.py    │
│  ReelBrain (Expo)     │ ─────► │                              │
│    · share intent     │  HTTP  │  python: extraction, search, │
│    · library          │ ◄───── │          trip planning       │
│    · search           │        │                              │
│    · map              │        │  out/index.json (the store)  │
│    · settings: URL    │        │                              │
└───────────────────────┘        └──────────────────────────────┘
```

The phone holds **no business logic**. It receives a shared URL, POSTs it, polls, and
renders. Every model call, every ffmpeg invocation, every embedding stays on the
laptop where it already works.

---

## 3. What actually gets built

Small. Six files of substance.

| | |
|---|---|
| `app/_layout.tsx` | Tabs: Library · Map · Alerts · Settings |
| `app/index.tsx` | Library — list, filter chips, pull-to-refresh, processing strip |
| `app/reel/[id].tsx` | Detail — renders whichever card the category calls for |
| `app/search.tsx` | Search field + results |
| `app/settings.tsx` | **Backend URL + Test connection** — see §5, this is not optional |
| `lib/api.ts` | Thin fetch wrapper around the routes above |
| `lib/share.ts` | Receives the intent, queues, POSTs |

Everything else is presentation, and the shapes are already defined — `src/lib/cards.ts`,
`deadline.ts`, `food-spot.ts` and `store-client.ts` are pure TypeScript types with no
React in them. **Copy those four files across unchanged.** The API contract and the
type definitions are the two things that make this a small job.

---

## 4. Stack

**Expo + expo-router + TypeScript**, with `expo-share-intent` for the share sheet.

The one non-negotiable: **share intents do not work in Expo Go.** You need a
development build:

```
npx create-expo-app reelbrain-app --template
npx expo install expo-share-intent expo-router expo-secure-store
eas build --profile development --platform android
```

Install that APK once on the phone; after it, `npx expo start --dev-client` gives
normal hot reload. Do this **before writing any UI** — it is the only step that can
eat a day, and everything else is trivial once it exists.

Android only for now. iOS needs a Share Extension target and a paid developer account,
which is a bad trade at this stage.

---

## 5. The two things that will actually break

**Your laptop's IP changes with every network.** Hardcoding it guarantees a dead app
at the venue. So: the backend URL lives in settings, persisted, with a "Test
connection" button that hits `/api/reels` and reports plainly. Ship this on day one,
not as polish — it is the difference between debugging for ten seconds and ten minutes.

**Many venue and campus wifi networks block device-to-device traffic** (AP isolation).
Your phone and laptop can both have internet and still not see each other. This kills
the demo silently and is not obvious when it happens. Mitigations, in order of
preference:

1. **Phone hotspot, laptop joins it.** Always works, no dependencies. Rehearse on it.
2. `npx expo start --tunnel` / ngrok — works through anything, adds latency.
3. Tailscale on both — solid, needs setup on the day.

Test #1 the day before. This is the highest-risk item in the whole plan and it has
nothing to do with code.

---

## 6. Flow

Unchanged from the previous plan, because this part was never about architecture:

```
in Instagram → Share → ReelBrain → dismissed immediately
   ↓  (POST /api/analyze, phone stops caring)
laptop processes ~40s
   ↓
phone polls while foregrounded → card appears in Library
```

**Notifications:** skip push for now. Push needs Expo's service and a registered token,
which is real setup for a laptop-hosted backend that cannot reach out to the phone.
Instead the app polls while open, and `notify.py` already sends Telegram/email — which
arrives on the phone anyway, from the laptop, with zero new work. Revisit push when the
backend moves off the laptop.

**Geofencing:** phase 3. It is on-device (`expo-location`), so it still works with a
laptop backend — it just needs the nearby list, which `/api/reels` already returns.
Don't build it until the share loop is solid.

---

## 7. Phases

**Phase 1 — the loop.** Dev build, settings screen, share intent, POST + poll, Library
list, one detail screen. This is the demo.

**Phase 2 — retrieval.** Search, category filters, the remaining detail cards, map.

**Phase 3 — the payoff.** Geofencing and proximity alerts. Trip planner on mobile.

Ship Phase 1 and rehearse it on a phone hotspot before starting Phase 2.

---

## 8. What I cannot verify

Everything up to the network boundary I can test from here. **The share intent I
cannot** — it needs a physical Android device with the dev build installed, an
Instagram app, and a real tap. Same for geofencing.

So the honest split: I can write it and prove the API layer works end to end against
the real backend; you have to run the build and confirm the share sheet actually shows
ReelBrain. Expect one round of fixes there.
