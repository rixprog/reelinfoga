# Image prompts — site redesign

Copy one block at a time into GPT's image generator. Each is self-contained.

**Generate in this order and stop after the first two.** Analyze and Reels define the
whole system — if those two land, the rest follow from them. If they don't, changing
them is cheap; changing seven screens is not.

Every block ends with the same **CRAFT** section. It is doing most of the work — it
forbids, by name, the specific habits that make a design read as AI-generated. Do not
trim it.

Text will render as gibberish. That is normal. **Judge layout, hierarchy, density and
spacing rhythm** — not letterforms.

---

## 1 — ANALYZE  *(generate first)*

```
High-fidelity web app UI design, LIGHT theme, desktop 1440x1024, flat straight-on
screen — no browser chrome, no device frame, no hands, no perspective.

App: "ReelBrain". Paste an Instagram reel link and it extracts what matters.

Top: a thin white sticky nav, 56px, hairline bottom border. Left: a small violet
rounded-square logo mark and the wordmark "ReelBrain". Then five plain text links —
Analyze, Reels, Map, Saved, History — where "Analyze" is active, marked ONLY by a 2px
violet underline beneath it. Right: a small magnifier icon with a faint "⌘K" chip.

Centred single column, about 720px wide, on a very light grey page:

1. A large white input pill with a hairline border reading "Paste an Instagram reel
   link", and beside it a solid violet button "Analyze".

2. Below it, a VERTICAL step list with a thin grey rail connecting the dots down the
   left edge:
     ● Fetching reel                  1.2s     (filled violet dot, black text)
     ● Extracting frames and audio    0.8s     (filled violet dot)
     ◍ Transcribing…                           (violet ring, active, slight glow ring)
     ○ Working out what this is                (hollow grey dot, grey text)
     ○ Extracting the details                  (hollow grey)
     ○ Saving                                  (hollow grey)
   Times right-aligned in small tabular grey figures.

3. Below that, a white card with a hairline border: a small portrait photo thumbnail
   of an Indian restaurant meal on the left, then "@tharun_blogger · 4,344 likes ·
   26s · Tamil" in small grey, and beneath it the caption "That evergreen combo
   #food #viral" in near-black.

4. Below that, a result block: a small uppercase violet-tinted chip "FOOD SPOT" and a
   green chip "high confidence"; then in large bold near-black "Evergreen Restaurant";
   beneath in grey "Thirumangalam, Anna Nagar, Chennai"; then a solid violet button
   "Open food spot view →".

CRAFT — must not look like an AI-generated mockup:
Type hierarchy with real contrast: 32px/700 page title, 15px/500 card titles,
13px/400 body, 11px/600 uppercase labels with wide letter-spacing. Near-monochrome
UI: #FAFAFA page, #FFFFFF surfaces, #ECECEF hairline borders, #18181B and #71717A
text. ONE accent, violet #7C3AED, used ONLY on the logo, the active nav underline and
primary buttons — never as a card fill or a background. The photography carries all
the colour. Thin line icons, 1.5px stroke, one consistent set. NO EMOJI ANYWHERE.
One elevation level, a single very soft shadow, never stacked. Left-aligned content,
generous vertical rhythm, tabular numerals for all times.
Reference: Linear, Things 3, Raycast.
Avoid: emoji as icons, purple or violet gradients, glow, sparkles, glassmorphism,
frosted blur, 3D floating shapes, filled pill nav items, cards with a border AND a
shadow AND a tint, a different colour per category, centred symmetrical layouts,
uniform text sizes, lorem ipsum.
```

---

## 2 — REELS  *(generate second)*

```
High-fidelity web app UI design, LIGHT theme, desktop 1440x1024, flat straight-on
screen — no browser chrome, no device frame, no hands, no perspective.

App: "ReelBrain" — the saved-reels library.

Top: the same thin white sticky nav — violet logo mark, "ReelBrain", then Analyze,
Reels, Map, Saved, History as plain text links, with "Reels" active and marked ONLY
by a 2px violet underline.

Content, full width with generous side margins:

Row 1: a wide white search pill with a hairline border and a thin magnifier icon,
reading "Search by meaning — that biryani place, cheap earphones". To its right, a
small square outline button with a thin filter icon, and a two-state grid/list toggle.

Row 2: a small uppercase grey label "COLLECTIONS", then a horizontal row of four
rounded rectangular cards, each a COLLAGE of 3 overlapping small photos with a bold
name and a grey count beneath: "Kerala trip · 9", "Internships · 6", "Gadgets · 3",
and a dashed-outline card with a thin plus icon reading "New collection".

Row 3: a small uppercase grey label "ALL REELS · 32", then a DENSE GRID of tall 9:16
portrait photo thumbnails, 6 across, 2 rows, small 12px corner radius, tight 10px
gaps. Real varied content: a plated biryani, a Kerala waterfall, a college event
poster, black wireless headphones, a cooking pot with spices, a dark code editor
screenshot, a mountain road, a tea plantation, a restaurant interior, a dosa, a lake,
a lecture slide.
Each tile carries a tiny coloured dot in its top-left corner indicating category —
nothing else on the tile. One tile is hovered and shows a soft dark gradient at its
bottom with a short white title.

This screen should feel like a photo library: the images ARE the interface, the
chrome nearly disappears.

CRAFT — must not look like an AI-generated mockup:
Type hierarchy with real contrast: 32px/700 page title, 15px/500 titles, 13px/400
body, 11px/600 uppercase labels with wide letter-spacing. Near-monochrome UI:
#FAFAFA page, #FFFFFF surfaces, #ECECEF hairline borders, #18181B and #71717A text.
ONE accent, violet #7C3AED, on the logo, the active nav underline and primary buttons
only. The photography carries all the colour. Thin line icons, 1.5px stroke, one
consistent set. NO EMOJI ANYWHERE. One elevation level, very soft, never stacked.
Left-aligned. Dense grid, tight gaps.
Reference: Are.na, Cosmos, Arc, Things 3.
Avoid: emoji as icons, purple or violet gradients, glow, sparkles, glassmorphism,
frosted blur, 3D floating shapes, permanent caption blocks under every tile, cards
with a border AND a shadow AND a tint, centred symmetrical layouts, lorem ipsum.
```

---

## 3 — CATEGORY VIEW: FOOD SPOT

```
High-fidelity web app UI design, LIGHT theme, desktop 1440x1024, flat straight-on
screen — no browser chrome, no device frame, no perspective.

App: "ReelBrain" — the detail view for one saved food reel. Same thin white nav at
top (Analyze, Reels, Map, Saved, History), no item underlined since this is a pushed
screen; a small "← Reels" text link sits below the nav.

Two-column layout, roughly 60/40:

LEFT column:
 · A wide landscape photograph of an Indian restaurant meal, 16:9, 16px radius.
 · A small green pill "High confidence".
 · "Evergreen Restaurant" in large bold near-black.
 · "Thirumangalam, Anna Nagar, Chennai" in grey.
 · A row of small grey outlined chips: "Indian", "Budget", "Veg & non-veg".
 · A small uppercase grey label "DISHES" then wrapped light chips: Chicken Biryani,
   Mutton Biryani, Tandoori Chicken, Parotta, Paneer Tikka, Gobi 65.
 · A small uppercase grey label "OFFERS" then two lines each preceded by a small
   green dot: "₹500 for veg/non-veg combo", "Buy 1 Get 1 on chicken and mutton
   biryani".
 · A white bordered panel titled "How we know" — three rows, each with a small
   MONOSPACE uppercase tag chip on the left and quoted text on the right:
     [ON-SCREEN] place name: "EVERGREEN RESTAURANT"
     [CAPTION]   area: "THIRUMANGALAM ANNANAGAR"
     [AUDIO]     offer: "for 500 rupees they are giving 2 combos"
   It should read like a receipt — evidence, not debug output.
 · A transcript block with three small toggle pills: Tamil (active), English,
   Romanised, and two lines of Tamil script beneath.

RIGHT column (sticky):
 · A small LIGHT map panel, 16px radius, showing Chennai streets in soft greys and
   pale greens with ONE violet circular pin.
 · Beneath it: a solid violet button "Get directions" and a white outlined button
   "Open in Google Maps".
 · A small key/value list: Phone 8111055777 · Price Budget · Cuisine Indian.

CRAFT — must not look like an AI-generated mockup:
[same CRAFT block as screen 1]
Reference: Airbnb listing detail, Linear, Things 3.
```

---

## 4 — MAP

```
High-fidelity web app UI design, LIGHT theme, desktop 1440x1024, flat straight-on
screen — no browser chrome, no device frame, no perspective.

App: "ReelBrain" — the map of everything saved that has a location. Same thin white
nav at top with "Map" active, marked by a 2px violet underline.

Below the nav, a FULL-BLEED light map filling the rest of the screen: southern India,
soft grey roads, pale green terrain, light water, thin grey place labels. Clean and
desaturated like Google Maps light — not a bright cartoon map.

On the map: circular numbered markers, white fill with a thin coloured ring — coral
rings for food, teal for travel. One marker is drawn with a DASHED ring at reduced
opacity. One cluster badge reads "4".

Floating chrome:
 · Top-left, a compact white segmented control with a hairline border and one soft
   shadow: "All | Food | Travel", with All selected in soft violet.
 · Top-right, a small white square button with a thin location-arrow icon.
 · LEFT SIDE, a narrow white list rail about 300px wide with a hairline right border,
   scrollable: rows of small square photo thumbnails with a bold name, a grey
   locality, and a right-aligned distance in tabular figures. One row is selected,
   shown by a soft violet left edge.
 · One marker is open, showing a small white card anchored to it: a thumbnail,
   "Evergreen Restaurant", "Thirumangalam, Chennai · 2.1 km", and two small buttons —
   a solid violet "Directions" and a white outlined "Open in Google Maps".

CRAFT — must not look like an AI-generated mockup:
[same CRAFT block as screen 1]
Reference: Google Maps light, Citymapper, Airbnb map view.
Avoid additionally: dark map tiles, bright saturated map colours, emoji pins.
```

---

## 5 — HISTORY

```
High-fidelity web app UI design, LIGHT theme, desktop 1440x1024, flat straight-on
screen — no browser chrome, no device frame, no perspective.

App: "ReelBrain" — the processing log. Same thin white nav with "History" active,
marked by a 2px violet underline.

A single column about 860px wide, left-aligned:

A white search pill with a hairline border: "Search your history".

Then rows grouped under STICKY DATE HEADERS in small uppercase grey with wide
letter-spacing and a hairline rule running to the right edge: "TODAY", then
"YESTERDAY", then "2 AUGUST".

Each row is a white card with a hairline border, laid out horizontally:
 · a small time in tabular grey figures on the far left (e.g. "14:32")
 · a small square photo thumbnail
 · a bold title and a one-line grey summary beneath it
 · a small category chip on the right (e.g. "Food spot", "Deadline", "Recipe")
 · a very small grey run line underneath: "Tamil · gemini-3.1-flash-lite · 51.7s"
 · a quiet "View more →" text link in violet at the far right

Rows visible: "Evergreen Restaurant" (Food spot), "AI Hackathon 2026" (Deadline),
"Restaurant Style Chicken Biryani" (Recipe), "budget headphones" (Product),
"DSA Day 12: Two Pointers" (Other), "Wayanad" (Travel).

This is the only screen that shows what the SYSTEM did rather than what the user
saved, so the run details belong here and nowhere else. Keep them quiet — small,
grey, secondary.

CRAFT — must not look like an AI-generated mockup:
[same CRAFT block as screen 1]
Reference: Linear activity feed, Vercel deployments list, Things 3 logbook.
```

---

## 6 — MOBILE (Reels + Analyze, side by side)

```
Two high-fidelity mobile app screens side by side, LIGHT theme, each 390x844, flat
straight-on, no device frames, no hands, no perspective.

Both share: a thin white top bar with a small violet rounded-square logo mark and the
wordmark "ReelBrain"; and a white BOTTOM TAB BAR with five thin line icons and small
labels — Analyze, Reels, Map, Saved, History — the active one tinted violet with a
2px violet underline beneath its label. NO EMOJI, line icons only.

LEFT SCREEN — Analyze:
 A white input pill "Paste an Instagram reel link" with a full-width violet "Analyze"
 button beneath it. Then a vertical step list with a thin connecting rail:
 two completed steps with filled violet dots and small grey times, one active step
 with a violet ring reading "Transcribing…", three pending steps as hollow grey dots.
 Below, a white card with a small portrait thumbnail, "@tharun_blogger · 4,344 likes",
 and a caption line.

RIGHT SCREEN — Reels:
 A white search pill with a magnifier icon and a small filter icon beside it.
 A horizontal row of two small collage collection cards.
 Then a dense 2-column grid of tall 9:16 photo thumbnails with tight gaps and 12px
 radius: biryani, waterfall, event poster, headphones, cooking pot, mountain road.
 Each tile has a tiny coloured category dot in its corner.

CRAFT — must not look like an AI-generated mockup:
[same CRAFT block as screen 1, plus: thumb-reachable primary actions, tap targets at
least 44px, no hover-only affordances]
Reference: Things 3 iOS, Arc Search, Instagram saved folder.
```
