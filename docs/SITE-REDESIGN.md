# Site redesign — structure and design system

## 0. The one open question

**Reels / Saved / History overlap.** As described, History is Reels with different
cards. The split this document designs against:

| Section | The question it answers | Shape |
|---|---|---|
| **Reels** | *what have I got?* | Thumbnail grid, search, filter, group into collections |
| **Saved** | *what do I need to act on?* | Collections + starred items. A shortlist, not the archive |
| **History** | *what did I add, and when?* | Reverse-chronological log with summaries and run info |

If Saved meant something else, everything below still holds — only that one screen
changes.

---

## 1. Navigation

```
DESKTOP  ┌──────────────────────────────────────────────────────────┐
         │ ◼ ReelBrain   Analyze  Reels  Map  Saved  History     ⌘K │
         └──────────────────────────────────────────────────────────┘

MOBILE   top: ◼ ReelBrain                                    ⌘ search
         bottom: [Analyze] [Reels] [Map] [Saved] [History]
```

- **Desktop**: a single sticky bar, 56px, hairline bottom border. Logo left, five
  text links, search affordance right. The active item gets a **2px underline in the
  accent colour**, not a filled pill — a pill on a text nav is the most generic thing
  in web design.
- **Mobile**: the same five as a bottom bar. Five is the maximum a tab bar can carry;
  it works because every label is one word. Icons are thin line, 1.5px stroke,
  **never emoji**.
- **Category views are not in the nav.** They are pushed screens reached from Analyze
  or from a Reels card. Putting six categories in a nav bar would be a menu, not a
  product.

---

## 2. Analyze — `/analyze` (and `/`)

The flow is a **single column that grows downward**. Nothing jumps; each stage
appends beneath the last, so the eye never has to re-find its place.

```
┌─ paste a reel link ─────────────────┐  [ Analyze ]
└─────────────────────────────────────┘

  ●  Fetching reel              1.2s     ← done: filled dot, hairline connector
  │
  ●  Extracting frames + audio  0.8s
  │
  ◍  Transcribing…                       ← active: ring + subtle pulse
  │
  ○  Working out what this is            ← pending: hollow, muted
  │
  ○  Extracting the details
  │
  ○  Saving

┌─────────────────────────────────────────────────────┐
│ [thumb]  @tharun_blogger · 4,344 likes · 26s · TA   │  ← appears after
│          "That evergreen combo 😋 #food #viral"      │    TRANSCRIBING
└─────────────────────────────────────────────────────┘

        FOOD SPOT · high confidence
        Evergreen Restaurant
        Thirumangalam, Anna Nagar, Chennai
        [ Open food spot view → ]
```

Three deliberate decisions:

1. **The stepper is vertical with a connecting rail.** Horizontal steppers force
   truncated labels and read as a wizard. A vertical rail reads as a log, which is
   what this is.
2. **The metadata card lands the moment transcription finishes**, not at the end.
   That is the first proof the thing is real, and it arrives ~15s in rather than ~40s.
3. **The result is a summary, not the whole payload.** A button opens the
   category-specific view. Dumping every field into the analyze column makes six
   categories look identical.

---

## 3. Category views — pushed, not navigated

`/reel/[id]` picks a layout from the category. These must not look like one template
with different words in it.

| Category | Layout spine |
|---|---|
| **Food** | Wide hero photo · place + confidence · **inline map preview** with Directions · dish chips · offers in green · evidence · transcript |
| **Travel** | Map first, full width, numbered pins · places as a vertical list matching the pin numbers · "Build an itinerary" as the primary action |
| **Recipe** | Two columns: ingredients as a **tickable checklist** with right-aligned tabular quantities, method as numbered steps with per-step timings. Cook mode toggle: bigger type, screen stays awake |
| **Product** | Product cards side by side, then a **comparison table** with a frozen first column, then store buttons in brand colours |
| **Deadline** | Countdown as the loudest element · two date tiles (apply before / event) · eligibility grid · calendar + register |
| **Other** | Title, topic, key points, actionable items, entity chips, tags |

The two panels that appear on **every** category, because they are the product:

- **Evidence** — "How we know", with a monospace source tag per row. Receipts, not
  debug output.
- **Confidence** — high / medium / low, visually distinct. A medium result must never
  look like a high one.

---

## 4. Map — `/map`

Full-bleed map, chrome floating on top.

- Category filter as a floating segmented control: All · Food · Travel
- Pins are numbered circles, tinted by category. **Approximate pins are dashed and
  faded** and say so when opened — someone will drive to these.
- Clicking a pin opens a bottom sheet (mobile) or a left card (desktop): thumbnail,
  name, distance, **Open in Google Maps**, Open in OSM, and a link to the reel.
- A collapsed list rail on desktop showing every located item, synced with the map.

---

## 5. Reels — `/reels`

The Instagram-saved-folder screen, done properly.

```
[ search by meaning… ]                    [⌗ filter]  [▦ ▤]

 COLLECTIONS  (+ new)
 ┌──────┐ ┌──────┐ ┌──────┐
 │Kerala│ │Interns│ │Gadgets│      ← user-made groups, collage covers
 └──────┘ └──────┘ └──────┘

 ┌────┐┌────┐┌────┐┌────┐┌────┐
 │ 9:16││    ││    ││    ││    │   ← dense 9:16 thumbnail grid
 └────┘└────┘└────┘└────┘└────┘
```

- **9:16 thumbnails in a dense grid** — 2 up on phone, 5–6 on desktop. This is the
  screen that should feel like Instagram, so the photography is the entire interface
  and the chrome nearly disappears.
- A small category dot sits in the corner of each tile; the title appears on hover
  (desktop) or under the tile (mobile). No permanent caption block — it kills density.
- **Filter is an icon that opens a sheet**: category, confidence, has-location,
  date range, collection. Active filters show as removable chips under the search bar.
- **Grouping**: select mode → tick tiles → "Add to collection". Collections appear as
  a row of collage covers above the grid and are what `/saved` shows.

---

## 6. Saved — `/saved`

Collections as large collage cards, plus a starred row. Opening a collection is the
Reels grid, scoped. This is the only screen with big cards; everywhere else is dense.

---

## 7. History — `/history`

Reverse-chronological, grouped by day with sticky date headers.

Each row: time, small thumbnail, title, one-line summary, category chip, and quiet
run info (language detected, model, duration). **"View more" opens the reel.**
A search field filters the log itself.

This is the only screen that shows what the *system* did rather than what the user
saved — so it is the one place the token counts and timings belong.

---

## 8. Design system

### The rule everything hangs on

**The accent is an accent. The photography carries the colour.** Violet appears on
the logo, the active nav underline, and primary buttons. Nothing else. Every card,
every surface, every background stays white/grey/near-black so the reel thumbnails
do the work. Break this and it collapses into the generated-app look immediately.

### Tokens

```
Background   #FAFAFA      Surface #FFFFFF      Border #ECECEF (hairline, 1px)
Ink          #18181B / #71717A / #A1A1AA
Accent       #7C3AED      Accent soft #EDE9FE
Semantic     #16A34A ok · #F59E0B soon · #DC2626 urgent

Type         32/700 -0.02em   page titles
             20/600           section titles
             15/500           card titles
             13/400           body + secondary
             11/600 +0.09em uppercase   labels
             Tabular numerals for money, counts, distances, times

Radius       16 cards · 12 tiles · 10 buttons · 999 pills
Elevation    ONE level. 0 1px 3px rgba(0,0,0,.06). Never stacked.
Spacing      4px base. Tight inside a group (8-12), generous between (32-48)
Icons        thin line, 1.5px stroke, one set. NO EMOJI.
```

### Banned, by name

These are what make a design read as generated, and they are forbidden throughout:

- emoji used as icons
- purple/violet gradients, glows, sparkles, "AI" motifs
- glassmorphism, frosted blur, heavy or stacked drop shadows
- a card carrying a border **and** a shadow **and** a tint
- a different bright colour per category as a filled block
- centred, symmetrical, evenly spaced layouts
- every piece of text at the same size and weight
- 3D floating shapes

Reference points: **Linear, Things 3, Raycast, Notion Calendar, Arc.**

---

## 9. Routes

```
/                 → Analyze (the landing action)
/reels            → grid, search, filter, group
/map              → all located items
/saved            → collections + starred
/history          → processing log
/reel/[id]        → category-specific view       (not in nav)
/trips/[dest]     → itinerary + costing          (not in nav)
```
