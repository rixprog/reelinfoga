# Five design directions — pick one before we build

These are not five colour schemes. They are **five different answers to "what is the
home screen"**, and each implies a different flow, a different tab bar, and a different
thing the app is *for*. Generating five skins of the same layout would tell you
nothing; this tells you something.

Generate the **same three screens** for each direction — Home, Reel Detail (food spot),
and that direction's Signature screen — so you are comparing like with like.

---

## The decision underneath

The product exists because *"your saved folder is a graveyard"*. So the question each
direction answers differently is: **when the app opens, what is the user looking at?**

| | Home is… | Strongest at | Honest weakness |
|---|---|---|---|
| **1. Triage Inbox** | an unread queue | making you actually process what you saved | adds work — people saved reels *to avoid* work |
| **2. Smart Feed** | a card grid | familiarity, zero learning curve | it *is* a folder of saved reels — risks recreating the graveyard |
| **3. Map First** | a live map | food + travel, best demo moment | a DSA revision reel has nowhere to live |
| **4. Agenda** | what matters *when* | the reminder promise, deadlines | most reels have no date; needs a good "someday" bucket |
| **5. Collections** | auto-made shelves | brief item #10, feels instantly organised | one extra tap to reach anything |

**My recommendation: 4 (Agenda) or 5 (Collections).** Direction 2 is the safe choice
and also the one most likely to reproduce the exact problem you set out to solve —
opening it feels like opening the saved folder again. Direction 3 demos best and breaks
on half your content. Try 4 and 5 first; generate 2 as a control.

---

# THE PROMPT

Paste **Part 1** every time. Then paste **one** direction from Part 2. Then Part 3.

---

## PART 1 — product context (constant)

```
You are a senior product designer. Design high-fidelity Android screens (1080x2400,
dark theme, production quality — not wireframes) for an app called ReelBrain.

THE PROBLEM
People save hundreds of Instagram reels and never see them again. The saved folder is
a graveyard: a biryani place they meant to try, an internship that closed last week, a
Wayanad itinerary they forgot. The app's job is to bring things BACK at the right
moment — not to be another folder.

WHAT IT DOES
The user shares a reel from Instagram. The app watches the video, listens to the audio,
reads the on-screen text and the comments, and extracts what actually matters:
  · Food spot  — restaurant, area, dishes, offers, phone, map location
  · Deadline   — internship/hackathon/scholarship, closing date, registration link
  · Travel     — places to visit, and a costed day-by-day itinerary
  · Recipe     — ingredients with quantities, numbered steps, timings
  · Product    — items, specs, prices, side-by-side comparison, store links
  · Other      — anything else, still structured (e.g. a DSA revision reel becomes
                 key points + complexity + LeetCode problem numbers)

THE CAPTURE FLOW — design around this, not around a form
  1. User is inside Instagram. Taps Share → ReelBrain. The app does NOT open.
  2. ~40 seconds of processing happens on a server.
  3. The reel appears in the app. The user comes back to it later — or never, until
     the app surfaces it.
There is no "paste a URL" input as the primary action. Capture happens elsewhere.

USER
Indian, 18–30, mid-range Android. Content is code-mixed (Malayalam, Tamil, Hindi,
English). Prices in ₹ with Indian digit grouping (₹1,49,999).

NON-NEGOTIABLE — THIS APP SHOWS ITS WORKING
Two ideas must be visible in the UI, not hidden in a details tab:

1. EVIDENCE. Every extracted fact is traceable. The detail screen has a permanent
   "How we know" panel:
       [ON-SCREEN]  place name: "EVERGREEN RESTAURANT"
       [CAPTION]    area: "THIRUMANGALAM ANNANAGAR"
       [AUDIO]      offer: "for 500 rupees they are giving 2 combos"
   Small monospace-ish source chips. Make it feel like receipts, not debug output.

2. CONFIDENCE. Three visually distinct states, because the app refuses to guess:
       HIGH   green  — pinned on the map, Directions enabled
       MEDIUM amber  — "Is this the place?" confirm card
       LOW    grey   — no location claimed at all
   A MEDIUM result must never look like a HIGH one. Approximate map pins are DASHED
   and faded. Someone will drive to these pins.

Also: prices taken from the reel are tagged FROM REEL (green); prices the AI estimated
are tagged ESTIMATE (grey). Never the same treatment.

VISUAL BASELINE — and it must NOT look like an AI-generated app mockup
There is a recognisable "generated app" look and it comes from a specific set of
habits. Avoid every one of them by name:
  · EMOJI USED AS ICONS. The single biggest tell — no shipped app does this. Use thin
    outline icons, 1.5px stroke, one consistent set.
  · purple/violet gradients, glow, sparkles, "AI" motifs
  · glassmorphism, frosted blur, heavy drop shadows
  · a card that has a border AND a shadow AND a background tint — pick one
  · a different bright colour for every category — it turns the UI into a parrot
  · centred, symmetrical, evenly spaced layouts
  · every piece of text the same size and weight

Instead:
  Type with violent hierarchy — 28px/600 screen titles, 15px/500 row titles,
  13px/400 secondary, 11px/500 uppercase labels with wide letter-spacing.
  Near-monochrome UI. Background #09090B · surfaces #18181B · hairline borders
  #27272A · text #FAFAFA / #A1A1AA / #52525B.
  ONE accent colour, plus amber #FBBF24 and red #F87171 for urgency only. Category is
  signalled by a 2px left edge or a small monochrome line icon — never a filled block.
  THE PHOTOGRAPHY CARRIES ALL THE COLOUR; the chrome stays neutral around it.
  Dense and confident. Tight spacing inside a group, generous between groups.
  Left-aligned. One elevation level. Hairline rules instead of card borders where
  possible.
  Tabular numerals for every price, countdown and distance.
  Motion fast and quiet, 150–200ms, no bounce.
  Reference: Linear, Things 3, Raycast, Notion Calendar — dark, dense, restrained,
  unmistakably designed by a person.
```

---

## PART 2 — pick ONE direction

### ▸ Direction 1 — TRIAGE INBOX

```
DIRECTION: TRIAGE INBOX.

The home screen is an INBOX, not a gallery. Newly processed reels arrive UNREAD, with
a count badge. The user's job is to process them: act on it, file it, or archive it.
The app is an email client for saved content.

Home: a single-column list of unread reels, newest first. Each row is a wide card —
portrait thumbnail on the left, extracted headline and the one fact that matters on the
right ("closes in 3 days", "Kozhikode, 2.1km away", "45 min · 5 ingredients").
Swipe right = archive. Swipe left = reveal quick actions (Add to calendar, Directions,
Register). A pinned summary bar at the top: "6 unread · 2 closing this week".
Archived items are still searchable but out of sight.

Tab bar: Inbox · Archive · Map · Settings

Signature screen: the swipe-action state, mid-gesture — one card pulled left showing
its action rail, the row beneath it partly visible. Show that acting takes one thumb.

Tone: purposeful, slightly severe. Zero Inbox energy. The empty state is a reward, not
a void — design it to feel earned.
```

### ▸ Direction 2 — SMART FEED  *(the control)*

```
DIRECTION: SMART FEED.

The home screen is a rich, filterable grid of everything saved. Familiar and
low-friction — closest to what people already know from Instagram saves or Pinterest.

Home: pinned search bar. Horizontally scrollable filter chips with counts
(All · Food · Deadlines · Travel · Recipes · Products · Other). Below, a 2-column
masonry grid of portrait cards: thumbnail, category glyph, title (2 lines), and one
line of category-specific detail. Cards vary in height with the thumbnail.
A thin PROCESSING STRIP sits under the search bar only while reels are being processed
— small thumbnails with a progress line and micro-copy ("reading the frames…") —
and collapses to nothing when idle.
Deadlines closing within 48h float to the top with an amber ring regardless of save
date.

Tab bar: Library · Search · Map · Alerts

Signature screen: the same grid with a category filter active (Deadlines), showing how
the cards change shape when the content type changes.

Tone: calm, dense, content-forward. The chrome should disappear behind the thumbnails.
```

### ▸ Direction 3 — MAP FIRST

```
DIRECTION: MAP FIRST.

The home screen IS a map. Everything with a location is a pin; everything without one
lives in a bottom sheet you pull up. This is a spatial memory app — "what did I save
near here?"

Home: full-bleed dark OpenStreetMap, edge to edge, no header. Category-tinted pins,
clustered when zoomed out. A floating segmented control at the top (Food / Travel /
All) and a "near me" FAB. A persistent bottom sheet at rest height shows the nearest
saved place with its distance and thumbnail; dragging it up reveals the full library
list, including the non-spatial items (deadlines, recipes, products) grouped under
"Not on the map".
Approximate pins are DASHED and faded and say so when tapped.

Tab bar: none. A map, a bottom sheet, and a settings icon. Resist adding tabs.

Signature screen: bottom sheet expanded to ~70%, map still visible above, showing the
transition between spatial and non-spatial content.

Tone: immersive, confident, almost like a navigation app. The map is the product.
```

### ▸ Direction 4 — AGENDA

```
DIRECTION: AGENDA.

The home screen organises everything by WHEN IT MATTERS, not when it was saved. Time
is the primary axis. This is the direct answer to "bring it back at the right moment".

Home: a vertical timeline with sticky section headers:
  TODAY        — "Al Faham is 400m away", a deadline closing today
  THIS WEEK    — deadlines at T-7/T-2, "cook this weekend" suggestions
  THIS MONTH   — trips being planned, dated events
  SOMEDAY      — everything with no date: recipes, food spots, products, other.
                 This bucket must feel intentional and browsable, NOT a dumping
                 ground — it holds most of the library.
Each row: small thumbnail, title, and the reason it is surfaced right now, in plain
words ("closes in 2 days", "you're nearby", "saved 3 months ago, never opened").
Urgency drives colour, not category.

Tab bar: Agenda · Library · Map · Settings

Signature screen: the TODAY section with a live proximity item — "You're 400m from Al
Faham, Kozhikode" with a thumbnail and a Directions button — sitting above a deadline
closing today. Show the two kinds of urgency, time and place, in one view.

Tone: quietly insistent. It should feel like something is looking after you.
```

### ▸ Direction 5 — COLLECTIONS

```
DIRECTION: COLLECTIONS.

The home screen is a set of shelves the app built for you automatically. You never file
anything; it is already filed. Browsing is the primary verb.

Home: a 2-column grid of COLLECTION cards, each with a stacked/collaged cover made
from its reels' thumbnails, a category glyph, a name, and a count:
  Food Spots 12 · Deadlines 6 · Travel 9 · Recipes 4 · Products 3 · Everything Else 7
Above them, one dynamic "smart" collection that changes with context — "Closing this
week (2)" or "Near you (3)" — visually distinct from the permanent shelves.
Tapping a collection pushes to its own list view, styled for that content type: Food
Spots opens with a map header, Deadlines as an urgency-sorted list, Recipes as a photo
grid.

Tab bar: Collections · Search · Map · Settings

Signature screen: the Food Spots collection open — a map strip across the top, list of
places below, sorted by distance.

Tone: tidy, generous, a little editorial. It should feel like the app did the filing
you were never going to do.
```

---

## PART 3 — deliverables (constant)

```
DELIVER, for this direction only:
  1. HOME screen, fully populated with realistic content (use the examples below).
  2. REEL DETAIL — food spot. Hero thumbnail, place name, area, confidence chip,
     Directions button, dish chips, offers in green, then the EVIDENCE panel, then a
     transcript block with a 3-way toggle: Original / English / Romanised — with actual
     Malayalam script in the Original tab.
  3. The SIGNATURE screen named in the direction.

Plus a one-row component strip: category card, confidence chip (all 3 states), source
chip, filter chip, primary button.

REAL CONTENT — no lorem ipsum:
  · Evergreen Restaurant — Thirumangalam, Anna Nagar, Chennai. Chicken Biryani,
    Tandoori Chicken, Parotta. Offer: "₹500 for veg/non-veg combo",
    "Buy 1 Get 1 on chicken and mutton biryani". Phone 8111055777. HIGH confidence.
  · AI Hackathon 2026 — IIT Madras. Closes 15 Aug 2026, 13 days left.
    Prize ₹5,00,000. Free entry.
  · Star One — Dubai/Abu Dhabi. MEDIUM confidence, city unresolved (it's a chain).
  · Restaurant Style Chicken Biryani — 105 min total, 5 ingredients, serves 4.
  · Budget headphones — boAt Rockerz 450 ₹1,499 vs OnePlus Bullets Z2 ₹1,799.
  · DSA Day 12: Two Pointers — O(n) time, O(1) space, LeetCode 167 / 15 / 26.

CONSTRAINTS
  · Android. Bottom-third thumb reach for primary actions.
  · Tabular numerals everywhere. ₹ with Indian grouping.
  · Assume a mid-range phone — no effects that need a flagship.
  · Do NOT design a chatbot. There is no conversation in this product.
```
