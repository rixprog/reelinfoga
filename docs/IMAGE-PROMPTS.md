# Image-generation prompts — 5 home screens

Copy one block into GPT's image generator. Each is self-contained.

All five render the **home screen**, because that is what differs. Pick a direction
from these, then use `DESIGN-DIRECTIONS.md` for the remaining screens.

---

## Why these prompts are written the way they are

"Make it look professional" does nothing. AI-generated app mockups have a specific,
recognisable look, and it comes from a specific list of habits:

| The tell | Why it reads as generated |
|---|---|
| **Emoji used as icons** (🍽️ ⏰ 🗺️) | The single biggest giveaway. No shipped app does this. |
| Purple/violet gradients, glow, sparkles | The house style of every AI product demo |
| Glassmorphism, frosted blur | Was a trend in 2021; now signals "template" |
| Everything the same size and weight | Real design has violent typographic contrast |
| Cards with a border **and** a shadow **and** a tint | Over-decoration. Pick one. |
| A different bright colour per category | Turns the UI into a parrot. Photos should carry colour. |
| Centred, symmetrical, evenly spaced | Real UIs are left-aligned with deliberate rhythm |

So every prompt below carries a **CRAFT** block that forbids these by name and
specifies a real type scale instead. That block is doing most of the work — do not
trim it to save characters.

The reference points are named on purpose: **Linear, Things 3, Raycast, Notion
Calendar**. Those are dark, dense, restrained, and unmistakably designed by people.

---

## The CRAFT block (already inside every prompt below)

> Type: 28px/600 screen title, 15px/500 row titles, 13px/400 secondary,
> 11px/500 uppercase labels with wide letter-spacing. Real hierarchy, not one size.
> Colour: near-monochrome UI — #09090B background, #18181B surfaces, hairline #27272A
> borders, white/grey text. ONE accent. Category shown as a 2px left edge or a small
> monochrome line icon, never a filled colour block. Photography carries all the colour.
> Icons: thin line icons, 1.5px stroke, one consistent set. NO EMOJI ANYWHERE.
> Density: tight inside a row, generous between groups. Left-aligned. One elevation.
> Reference: Linear, Things 3, Raycast, Notion Calendar.
> Avoid: emoji as icons, purple/violet gradients, glow, sparkles, glassmorphism,
> frosted blur, heavy shadows, centred symmetrical layouts, a different colour per
> category, uniform text sizes.

---

## 1 — TRIAGE INBOX

```
High-fidelity Android app UI design, dark theme, portrait 1080x2400, flat straight-on
screen only — no device frame, no hands, no perspective.

App: "ReelInfoga". It saves Instagram reels and extracts the useful information.

HOME = AN INBOX of unread saved reels. The user processes them: act, or archive.
Header: "Inbox" in large white text, with a small grey "6 unread" beside it.
Under it a thin hairline divider, then a quiet one-line summary: "2 closing this week".
Then a single-column list of wide rows, each separated by a hairline rule (no card
borders). Each row: portrait photo thumbnail on the left (56x76, 8px radius), then a
bold title, a grey second line, and a small right-aligned status in tabular numerals.
Rows top to bottom:
 · biryani plate photo — "Evergreen Restaurant" — "Thirumangalam, Chennai" — "2.1 km"
 · event poster — "AI Hackathon 2026" — "IIT Madras" — "13d" in amber
 · waterfall photo — "Wayanad" — "7 places saved" — "trip"
 · black headphones photo — "Budget headphones under ₹2,000, boAt vs OnePlus" (long
   enough to truncate with an ellipsis) — "2 products" — "₹1,499"
ONE row is mid-swipe, pulled left, revealing a narrow action rail behind it with three
thin line icons: calendar, map pin, archive. This is the key interaction — make it
clearly readable.
Bottom navigation bar with 4 thin line icons and small labels: Inbox, Archive, Map,
Settings.

CRAFT — must not look like an AI-generated mockup:
Type 28px/600 title, 15px/500 row titles, 13px/400 secondary, 11px/500 uppercase
labels with wide letter-spacing. Near-monochrome UI: #09090B background, #18181B
surfaces, hairline #27272A rules, white and grey text. ONE accent colour. Category is a
2px left edge or a small monochrome line icon, never a filled colour block. Photography
carries all the colour. Thin line icons, 1.5px stroke, one consistent set. NO EMOJI
ANYWHERE. Tight spacing inside a row, generous between groups. Left-aligned. One
elevation level, no drop shadows.
Reference: Linear, Things 3, Raycast.
Avoid: emoji as icons, purple or violet gradients, glow, sparkles, glassmorphism,
frosted blur, centred symmetrical layouts, a different colour per category, uniform
text sizes, lorem ipsum.
```

---

## 2 — SMART FEED  *(the control)*

```
High-fidelity Android app UI design, dark theme, portrait 1080x2400, flat straight-on
screen only — no device frame, no hands, no perspective.

App: "ReelInfoga". It saves Instagram reels and extracts the useful information.

HOME = A FILTERABLE GRID of everything saved.
Header: "Library" large and white. Beneath it a subtle search field with a thin
magnifier icon and placeholder "Search everything you've saved".
Then one horizontally scrolling row of small pill filters, the first one active
(white fill, dark text), the rest outlined: "All 32", "Food 12", "Deadlines 6",
"Travel 9", "Recipes 4", "Products 3".
Below: a 2-column masonry grid of cards of varying height. Each card is a portrait
photograph with a short caption block underneath — a bold title on one or two lines and
a single grey detail line. No borders around the cards; the photo defines the shape.
Cards:
 · biryani plate — "Evergreen Restaurant" — "Thirumangalam, Chennai"
 · event poster, with a single thin amber rule along its left edge — "AI Hackathon
   2026" — "13 days left"
 · waterfall — "Wayanad" — "7 places"
 · black headphones — "Budget headphones" — "₹1,499"
 · biryani cooking in a pot — "Chicken Biryani" — "105 min · 5 ingredients"
 · dark code editor screenshot — "DSA Day 12: Two Pointers" — "O(n) time"

CRAFT — must not look like an AI-generated mockup:
Type 28px/600 title, 15px/500 card titles, 13px/400 secondary, 11px/500 uppercase
labels with wide letter-spacing. Near-monochrome UI: #09090B background, #18181B
surfaces, hairline #27272A rules, white and grey text. ONE accent colour. Category is a
2px left edge or a small monochrome line icon, never a filled colour block. Photography
carries all the colour. Thin line icons, 1.5px stroke, one consistent set. NO EMOJI
ANYWHERE. Tight spacing inside a card, generous between them. Left-aligned. One
elevation level, no drop shadows.
Bottom navigation, 4 thin line icons with labels: Library, Search, Map, Alerts.
Reference: Linear, Arc, Things 3.
Avoid: emoji as icons, purple or violet gradients, glow, sparkles, glassmorphism,
frosted blur, centred symmetrical layouts, a different colour per category, uniform
text sizes, lorem ipsum.
```

---

## 3 — MAP FIRST

```
High-fidelity Android app UI design, dark theme, portrait 1080x2400, flat straight-on
screen only — no device frame, no hands, no perspective.

App: "ReelInfoga". It saves Instagram reels and extracts the useful information.

HOME = A FULL-BLEED MAP, edge to edge, no header.
A dark desaturated map of the Kerala/Chennai region: muted grey-green terrain, darker
water, thin road lines, small place labels in grey. Restrained, like Apple Maps dark or
a Mapbox dark style — not a bright cartoon map.
Small circular markers sit on it, mostly monochrome white-on-dark with a thin ring; two
are filled with a single accent colour to mark the selected one. ONE marker is drawn
with a DASHED ring and reduced opacity — an approximate location. One cluster shows a
small count "3".
Floating near the top: a compact segmented control, three options "Food / Travel / All"
with All selected — subtle, dark, hairline border, not a bright pill.
A circular button with a thin location-arrow icon floats above the sheet on the right.
A BOTTOM SHEET is docked at roughly one third height: rounded top corners, #18181B,
small centred drag handle, hairline top border. Inside: an 11px uppercase label
"NEAREST", then one row — biryani plate thumbnail (48x64), "Evergreen Restaurant" bold,
"Thirumangalam, Chennai · 400 m" grey beneath, and a small outlined "Directions"
button. The top edge of a second row peeks below, hinting at more.
No bottom tab bar. A single thin settings-gear icon floats top-left.

CRAFT — must not look like an AI-generated mockup:
Type 15px/500 row titles, 13px/400 secondary, 11px/500 uppercase labels with wide
letter-spacing. Near-monochrome UI over the map. ONE accent colour, used only for the
selected marker and the primary action. Thin line icons, 1.5px stroke. NO EMOJI
ANYWHERE. Left-aligned sheet content. One elevation — the sheet — with a hairline
border, no heavy shadow.
Reference: Apple Maps dark, Citymapper, Arc Search.
Avoid: emoji as icons, purple or violet gradients, glow, sparkles, glassmorphism,
frosted blur, bright saturated map tiles, a different colour per category, lorem ipsum.
```

---

## 4 — AGENDA

```
High-fidelity Android app UI design, dark theme, portrait 1080x2400, flat straight-on
screen only — no device frame, no hands, no perspective.

App: "ReelInfoga". It saves Instagram reels and extracts the useful information.

HOME = A TIMELINE organised by WHEN THINGS MATTER, not when they were saved.
Header: "Today" large and white, with "Tuesday, 4 August" small and grey beneath it.
Then a vertical list with sticky uppercase section headers in 11px grey with wide
letter-spacing, each preceded by a hairline rule running to the right edge:

 TODAY
  · biryani plate thumbnail — "You're 400 m from Evergreen Restaurant" —
    "Thirumangalam, Chennai" — small outlined "Directions" button on the right.
    A 2px accent-coloured edge runs down the left of this row.
  · event poster thumbnail — "AI Hackathon 2026 closes today" — "IIT Madras" —
    "Today" in amber, right-aligned. 2px amber left edge.

 THIS WEEK
  · workshop poster — "Build Your Own Jarvis" — "Articon, RSET" — "3d" right-aligned

 THIS MONTH
  · waterfall photo — "Wayanad" — "7 places · itinerary not built" — "plan"

 SOMEDAY
  · biryani cooking in a pot — "Chicken Biryani" — "105 min · serves 4"
  · black headphones — "Budget headphones under ₹2,000" — "2 products"
  · dark code editor screenshot — "DSA Day 12: Two Pointers" — "saved 3 weeks ago"

Each row: small rounded thumbnail (48x64) left, bold title, grey reason line beneath,
right-aligned status in tabular numerals. Rows separated by hairline rules, no card
borders. Colour comes from URGENCY only — today is accented, this week is amber,
everything else is plain grey.

CRAFT — must not look like an AI-generated mockup:
Type 28px/600 screen title, 15px/500 row titles, 13px/400 secondary, 11px/500 uppercase
section labels with wide letter-spacing. Near-monochrome UI: #09090B background,
#18181B surfaces, hairline #27272A rules, white and grey text. ONE accent colour plus
amber for urgency — nothing else. Photography carries all the colour. Thin line icons,
1.5px stroke, one consistent set. NO EMOJI ANYWHERE. Tight inside a row, generous
between sections. Left-aligned. One elevation, no drop shadows.
Bottom navigation, 4 thin line icons with labels: Agenda, Library, Map, Settings.
Reference: Things 3, Notion Calendar, Linear.
Avoid: emoji as icons, purple or violet gradients, glow, sparkles, glassmorphism,
frosted blur, centred symmetrical layouts, a different colour per category, uniform
text sizes, lorem ipsum.
```

---

## 5 — COLLECTIONS

```
High-fidelity Android app UI design, dark theme, portrait 1080x2400, flat straight-on
screen only — no device frame, no hands, no perspective.

App: "ReelInfoga". It saves Instagram reels and extracts the useful information.

HOME = AUTO-BUILT COLLECTIONS. Shelves the app filled for you; the user never files
anything.
Header: "Collections" large and white, "32 reels, filed for you" small and grey below.
Then ONE wide horizontal card, set apart by a hairline amber left edge: an 11px
uppercase label "CLOSING THIS WEEK", the title "2 deadlines", and two small overlapping
poster thumbnails on the right.
Below, a 2-column grid of collection cards. Each has a COLLAGE COVER built from 3
overlapping photographs from that collection, then beneath it a bold name and a grey
count. A small monochrome line icon sits in the corner of each cover.
 · "Food Spots" — "12 places" — biryani, dosa, a lit restaurant front
 · "Deadlines" — "6 open" — event posters
 · "Travel" — "9 places" — waterfall, tea hills, mountain road
 · "Recipes" — "4 dishes" — cooking pot, plated biryani, spices
 · "Products" — "3 items" — headphones, a phone, an earbud case
 · "Everything Else" — "7 reels" — a code editor, a chart, a whiteboard
Bottom navigation, 4 thin line icons with labels: Collections, Search, Map, Settings.

CRAFT — must not look like an AI-generated mockup:
Type 28px/600 screen title, 15px/500 collection names, 13px/400 counts, 11px/500
uppercase labels with wide letter-spacing. Near-monochrome UI: #09090B background,
#18181B surfaces, hairline #27272A rules, white and grey text. ONE accent colour.
Category shown by a small monochrome line icon, never a filled colour block — the
collage photography carries all the colour. Thin line icons, 1.5px stroke, one
consistent set. NO EMOJI ANYWHERE. Tight inside a card, generous between them.
Left-aligned. One elevation, no drop shadows.
Reference: Things 3, Bear, Arc, editorial magazine layout.
Avoid: emoji as icons, purple or violet gradients, glow, sparkles, glassmorphism,
frosted blur, centred symmetrical layouts, a different colour per category, uniform
text sizes, lorem ipsum.
```

---

## If the render comes back wrong

Predictable drifts, and the fix for each:

| What happened | Add to the prompt |
|---|---|
| Text is gibberish | Normal. Judge layout, hierarchy and density; ignore letterforms. For legible copy ask for "UI wireframe with real readable text labels". |
| Phone in a hand on a desk | "flat UI design, no device frame, no hands, no perspective, straight-on screen only" |
| Went light or colourful | Repeat "dark theme, near-black #09090B background" at the very end |
| Emoji appeared anyway | "absolutely no emoji, use thin outline icons only" — and say it twice |
| Invented a chatbot | "no chat interface, no message bubbles, no large centre text input" |
| Looks like a template dashboard | "editorial, restrained, high typographic contrast, dense, designed by a person" |
