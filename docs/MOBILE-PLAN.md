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

## 5. Connectivity: Tailscale, and it is already set up

**Use Tailscale.** It is installed on the laptop and the phone is already on the
tailnet (`motorola edge 60 fusion`, just offline). Setup is: open the app on the phone.

```
laptop   fedora   100.87.174.58   fedora.tail786f1.ts.net
phone    motorola edge 60 fusion  100.115.90.12

verified: GET /api/reels over the tailnet → 200 in 19ms
```

**Base URL: `http://fedora.tail786f1.ts.net:3000`**

That MagicDNS name is the important part — it never changes. The "laptop IP changes
per network" problem I flagged simply stops existing. You still want the settings
screen with a Test-connection button (a laptop that has slept or dropped off the
tailnet needs to be diagnosable in ten seconds, not ten minutes), but you set the
value once and never touch it again.

### Why this beats the alternatives

First, a measurement that reframes "fastest". What actually crosses the phone↔laptop
link is tiny:

```
POST /api/analyze     ~100 bytes   (just the URL)
poll response         ~1 KB
/api/reels            40 KB        (the WHOLE library)
thumbnail             ~69 KB

by contrast, laptop → internet, per reel:
Instagram video       ~18 MB       ← never crosses the phone link
Gemini + Groq         ~1 MB        ← never crosses the phone link
```

Bandwidth is irrelevant here. So the choice is about reliability, not speed:

| | Setup | Works on venue wifi | Cost |
|---|---|---|---|
| Plain LAN IP | none | **No** — AP isolation blocks device-to-device, silently | — |
| Phone hotspot | 1 min | Yes | **Burns your mobile data**: the laptop's internet now goes through the phone, so every reel's 18 MB video download and every API call comes out of your plan |
| **Tailscale** | **done** | **Yes** | none — laptop keeps its own wifi for the heavy traffic |
| ngrok / expo tunnel | 2 min | Yes | public relay, added latency, random URL on free tier |

Tailscale also does NAT traversal, so when both devices are on the same wifi it
connects **directly** — it is not a relay and costs nothing in latency. It only falls
back to a relay when direct fails, and at 40 KB payloads that is still fine.

**Fallback if the tailnet misbehaves on the day:** phone hotspot with the laptop
joined. Accept the data cost, it always works. Worth one rehearsal.

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
