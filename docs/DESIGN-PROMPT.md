# UI design generation prompt

Paste everything inside the fence into GPT (or any image/design model). It is written
to be used as-is.

Two notes before you do:

- **Ask for screens in batches of 3–4**, not all 14 at once. Quality collapses past
  about four screens per generation, and you want consistency more than speed.
- The section marked **NON-NEGOTIABLE** is what makes this app not look like every
  other AI wrapper. If you trim the prompt for length, trim elsewhere.

---

```
You are a senior product designer. Design the complete mobile UI for an app called
ReelBrain. Output high-fidelity mobile screens (iPhone 15 / Android, 1179x2556),
dark theme, production quality — not wireframes.

═══════════════════════════════════════════════════════════════
THE PRODUCT
═══════════════════════════════════════════════════════════════

People save hundreds of Instagram reels and never see them again. Their saved folder
is a graveyard: a biryani place they meant to visit, an internship that closed last
week, a Wayanad itinerary they forgot about.

ReelBrain watches, listens to and reads every reel you share to it, then extracts what
actually matters — the restaurant and where it is, the application deadline and its
registration link, the recipe's ingredients and steps, the products and their prices —
and brings it back at the moment you need it.

The user is Indian, 18–30, on a mid-range Android phone. Content is code-mixed
(Malayalam, Tamil, Hindi, English). Prices are in ₹.

THE CORE LOOP — design around this, not around a form:
  1. User is inside Instagram. Taps Share → ReelBrain. App does NOT open.
  2. ~40 seconds later: a push notification. "Saved: Al Faham, Kozhikode."
  3. Days later they search for it, or walk near it and the phone buzzes.

The user never waits and watches a progress bar. Capture happens outside the app.
The app is where things come BACK.

═══════════════════════════════════════════════════════════════
NON-NEGOTIABLE: THIS APP SHOWS ITS WORKING
═══════════════════════════════════════════════════════════════

Every AI app claims things. This one proves them. Two ideas must be visible in the UI,
not buried in a details tab:

1. EVIDENCE. Every extracted fact is traceable to where it came from. The reel detail
   screen has a permanent "How we know" panel:
       [ON-SCREEN]  place name: "EVERGREEN RESTAURANT"
       [CAPTION]    area: "THIRUMANGALAM ANNANAGAR"
       [AUDIO]      offer: "for 500 rupees they are giving 2 combos"
   Source tags are small monospace-ish chips. This panel is a hero element. Design it
   to feel like receipts, not like debug output.

2. CONFIDENCE. Three visually distinct states, because the app refuses to guess:
       HIGH    green   — pinned on the map, "Directions" enabled
       MEDIUM  amber   — "Is this the place?" confirm card with candidates
       LOW     grey    — no location claimed at all
   A MEDIUM result must never look like a HIGH one. Approximate map pins are DASHED
   and faded, and say "approximate — this is the area, not the venue" when tapped.
   Someone will drive to these pins. Design accordingly.

Also: prices extracted from the reel are labelled FROM REEL (green); prices the AI
estimated are labelled ESTIMATE (grey). Never the same treatment.

═══════════════════════════════════════════════════════════════
VISUAL DIRECTION
═══════════════════════════════════════════════════════════════

Dark, near-black, calm and dense — a well-built utility, not a playful consumer toy.
Think Linear or Arc rather than Duolingo. The content is colourful (food, travel,
thumbnails); the chrome must recede so it can be.

  Background      #09090B, surfaces #18181B, borders #27272A
  Text            #FAFAFA primary, #A1A1AA secondary, #52525B tertiary
  Accent          one only, for primary actions
  Semantic        green #34D399 confirmed/cheap · amber #FBBF24 caution/soon
                  red #F87171 urgent/expired · sky #38BDF8 in-progress

  Category colours (used as a thin left edge or a glyph tint, never a filled card):
    Food 🍽️ coral · Deadline ⏰ amber · Travel 🗺️ teal
    Recipe 👨‍🍳 orange · Product 🛍️ violet · Other 📌 grey

  Type            Inter or SF. Tabular numerals for every price, countdown, distance.
  Radius          12px cards, 8px chips, 16px sheets
  Spacing         4px base grid. Generous vertical rhythm; this is a reading app.
  Motion          Fast and quiet. 150-200ms. No bounce.

Thumbnails are portrait 9:16 crops. They carry the visual identity — let them.

═══════════════════════════════════════════════════════════════
SCREENS
═══════════════════════════════════════════════════════════════

Bottom tab bar throughout: Library · Map · Alerts · Profile (4 tabs, icons + labels).

── 1. LIBRARY (home) ──────────────────────────────────────────
Pinned search bar: "Search everything you've saved".
Below it, a PROCESSING STRIP, only when jobs are running: a horizontal row of small
thumbnails with a thin progress line and the current stage as micro-copy
("reading the frames…"). Collapses to nothing when idle.
Category filter chips, horizontally scrollable: All · Food · Deadlines · Travel ·
Recipes · Products · Other, each with a count.
Then a 2-column card grid, newest first:
  · portrait thumbnail
  · category glyph + colour edge
  · title (2 lines max)
  · ONE line of category-specific detail: "3 days left" / "Kozhikode" /
    "45 min · 5 ingredients" / "₹1,499"
Deadlines closing within 48h float to the top with an amber ring, regardless of when
they were saved.

── 2. LIBRARY — EMPTY STATE ───────────────────────────────────
The most important screen in the app: it must teach the share gesture. Show a small
mock of Instagram's share sheet with ReelBrain in it, an arrow, and one line:
"Share any reel here. We'll do the rest." Warm, not apologetic.

── 3. REEL DETAIL — FOOD SPOT ─────────────────────────────────
Hero thumbnail (40% height) with a gradient scrim, back and overflow buttons floating.
Place name, area/city, confidence chip.
Primary button: Directions. Secondary: open original reel.
Chips: cuisine, price band, veg/non-veg.
Dish chips. Offers in green ("₹500 veg/non-veg combo", "Buy 1 Get 1").
Then the EVIDENCE PANEL (see NON-NEGOTIABLE).
Then a transcript block with a 3-way toggle: Original / English / Romanised — showing
Malayalam script in the Original tab. This multilingual capability is a headline
feature; make it look deliberate.

── 4. REEL DETAIL — DEADLINE ──────────────────────────────────
Countdown as the loudest element ("13 days left", amber; "Closes today", red).
Two date cards side by side: Apply before / Event date. If the year was inferred,
a small amber note: "year inferred — worth checking".
Eligibility, fee, prize, stipend as a compact key/value grid.
Buttons: Add to calendar (primary), Register ↗.
If the link came from the creator's bio, label it "Link in bio ↗" and say the bio may
have moved on — weaker evidence, shown honestly.

── 5. REEL DETAIL — RECIPE ────────────────────────────────────
Three time cards: Prep / Cook / Total.
Ingredients as a checklist with tappable checkboxes — quantities right-aligned and
tabular so they form a column.
Method as numbered steps with per-step durations. A cook-mode affordance
(keep screen awake, large type).

── 6. REEL DETAIL — PRODUCT ───────────────────────────────────
Product cards with price, specs as key/value rows, pros in green, cons in red.
Store buttons in brand colours: Amazon amber, Flipkart blue, Shopping green.
Micro-copy: "opens a search for this model".
Below: a side-by-side comparison table, horizontally scrollable, first column frozen.

── 7. REEL DETAIL — OTHER (the catch-all) ─────────────────────
Proves nothing saved is ever wasted. Title, topic, summary, key points as bullets,
"To do" items in green, extracted entities (people / organisations / links / tools) as
labelled chips, hashtag-style tags at the bottom.
Design it so a saved DSA revision reel looks as considered as a restaurant.

── 8. SEARCH ──────────────────────────────────────────────────
Full-screen on focus. Recent searches, then suggestions phrased the way people think:
"that biryani recipe", "cheap earphones", "internship deadlines".
Results: thumbnail left, title, matched snippet with the query terms highlighted,
category chip right. A small footer line per result showing WHY it matched
("meaning 0.78 · keyword 3.7") — subtle, greyed, but present. It makes the search feel
intelligent rather than lucky.

── 9. MAP ─────────────────────────────────────────────────────
Full-bleed OpenStreetMap, dark tiles. Numbered pins tinted by category.
Segmented control floating at top: Food / Travel / All.
"Near me" FAB bottom-right.
Bottom sheet at rest: a peek showing the nearest saved place and its distance.
Tapping a pin expands the sheet: thumbnail, name, distance, Directions, open reel.
Approximate pins are dashed and faded.

── 10. ALERTS ─────────────────────────────────────────────────
Section 1 — Deadlines, urgency-sorted, coloured left edge, countdown right-aligned,
Calendar and Register actions inline. Expired items dimmed but NOT hidden.
Section 2 — Nearby: "You're 400m from Al Faham" with a thumbnail and Directions.
Empty state should read as good news, not as a broken screen.

── 11. TRIP PLANNER — three states in one flow ────────────────
(a) Rough plan: destination header, per-person cost range, suggested days, and two
    clearly separated groups — "From your reels" (green chips) and "We suggest"
    (checkboxes, since the reel only named the destination).
(b) Preferences form: days, travellers, who's going (solo/couple/family/friends),
    pace, stay tier, starting city, total budget. Segmented controls and steppers,
    not dropdowns.
(c) Costed itinerary: map at top with a colour-coded route per day; three stat tiles
    (Total / Per person / Under budget by); a day-by-day timeline with times, notes
    and per-item costs; then a cost breakdown table where every row is tagged FROM
    REEL or ESTIMATE; then "what these numbers assume".

── 12. ONBOARDING (3 screens) ─────────────────────────────────
1. The problem, shown not told: a scroll of saved reels going grey.
2. The gesture: Instagram share sheet → ReelBrain.
3. Permissions, each with an honest one-line reason:
   notifications ("so we can tell you before a deadline closes"),
   location ("so we can nudge you when you're near a place you saved").

── 13. PROFILE / SETTINGS ─────────────────────────────────────
Notification channels (Push / Telegram / Email) as toggles. Language preference.
Storage used, with a line explaining that videos are deleted after processing and only
the extracted data is kept — this is a trust feature, present it as one.
"Re-process all reels" as a secondary action.

── 14. SYSTEM STATES ──────────────────────────────────────────
Design these as a set; they are half the real app:
  · Offline — share still queued, "3 reels waiting to sync"
  · Processing failed — with a Retry that looks calm, not alarming
  · Reel not food/deadline/anything — the "Other" card, framed as success
  · No location permission — map with a clear, non-nagging prompt
  · Long Malayalam text — show that the layout survives it

═══════════════════════════════════════════════════════════════
DELIVERABLES
═══════════════════════════════════════════════════════════════
1. The screens above, in batches of 3-4 for consistency.
2. A component sheet: card variants per category, confidence chips, source tags,
   filter chips, buttons, bottom sheet, processing strip, map pin states.
3. A one-page style guide: colour tokens with hex, type scale, spacing, radii.
4. Light-mode variants for Library and one detail screen (dark is default; prove the
   system survives inversion).

CONSTRAINTS
· Thumb-reachable: primary actions in the bottom third.
· Every number tabular. Every price ₹ with Indian digit grouping (₹1,49,999).
· No lorem ipsum — use the real examples in this brief.
· Assume a 6.1" screen and a mid-range Android; avoid effects that need a flagship.
· Do not design a chatbot. There is no conversation in this product.
```
