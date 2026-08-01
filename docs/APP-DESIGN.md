# App design — derived from the reference

The reference you generated is a **landing page**: hero, feature grid, pricing, footer.
Useful for the site later; it does not contain a single app screen. So this doc keeps
its visual language and applies it to the screens the app actually needs.

## What we keep from it

- **Category cards** — photograph background, dark scrim at the bottom, small white
  icon badge, label. This is the strongest element in the reference and it maps
  directly onto the Collections home. Keep it exactly.
- **Light theme.** Genuinely differentiating — almost every AI-built app is dark.
- **Icon tiles** — 40x40 rounded square, pale tinted fill, coloured line icon inside.
  Good for list rows and feature rows.
- **Generous white space and soft elevation.**

## What we drop

- Pricing tiers, hero with floating phones, "Our Amazing Features" — website sections.
- The 3D floating shapes (sphere, donut, torus). They read as decoration on a landing
  page and as noise inside a working app.
- Home / Feed / Features / Pricing as tabs — those are site pages.

## The rule that keeps this from looking generic

Purple is the *accent*, not the surface. **The photography carries the colour.** In the
reference the category cards work because the burger and the balloons are doing the
work and the chrome is quiet. If purple starts filling cards and backgrounds, it
collapses into the same look as every other generated app. One accent, used sparingly,
on a mostly white and grey page.

---

## Tokens

```
Primary        #7C3AED   (violet-600)   buttons, active nav, links
Primary soft   #EDE9FE                  active pill fill, icon tile backgrounds
Background     #FAFAFA                  app background
Surface        #FFFFFF                  cards
Border         #ECECEF                  hairlines
Text           #18181B primary · #71717A secondary · #A1A1AA tertiary

Semantic       green  #16A34A   confirmed, cheap, "from reel"
               amber  #F59E0B   closing soon, needs confirmation
               red    #DC2626   closes today, expired

Category tint  (icon tile background only, never a whole card)
  Food   #FFEDD5 / icon #EA580C      Deadline #FEF3C7 / icon #D97706
  Travel #CCFBF1 / icon #0D9488      Recipe   #FFE4E6 / icon #E11D48
  Product#EDE9FE / icon #7C3AED      Other    #F4F4F5 / icon #71717A

Type           28/700 screen title · 17/600 card title · 15/500 row title
               13/400 secondary · 11/600 uppercase label, +0.06em tracking
               Inter or Plus Jakarta Sans. Tabular numerals for money and counts.
Radius         20 cards · 14 buttons · 12 icon tiles · 999 pills
Elevation      one level: 0 1px 3px rgba(0,0,0,.06). No stacked shadows.
Tabs           Home · Search · Map · Alerts   (icon + label, active = soft pill)
```

---

# APP SCREEN PROMPTS

Each is self-contained. Same visual language throughout.

## 1 — HOME (collections)

```
High-fidelity Android app UI design, portrait 1080x2400, LIGHT theme, flat straight-on
screen — no device frame, no hands, no perspective.

App: "ReelBrain" — it saves Instagram reels and extracts the useful information.

Top: small violet rounded-square logo mark and the word "ReelBrain" left-aligned, a
thin bell icon on the right. Below, a large heading "Your saved reels" in near-black,
and a grey subtitle "32 reels, filed for you".
Then a pill-shaped search field, white with a hairline border and a thin magnifier
icon: "Search everything you've saved".

Then ONE wide highlight card, white with a pale amber left edge: an 11px uppercase
amber label "CLOSING THIS WEEK", a bold line "2 deadlines", and two small overlapping
poster thumbnails on the right.

Then a 2-COLUMN GRID of category cards. Each card is a tall rounded rectangle (20px
radius) filled edge-to-edge with a PHOTOGRAPH, a soft dark gradient over the lower
third, a small white circular badge in the upper-left holding a thin line icon, and at
the bottom in white: a bold name and a small count.
  · "Food Spots"  "12 places"   — photo of biryani on a banana leaf
  · "Travel"      "9 places"    — photo of a green waterfall in Kerala
  · "Recipes"     "4 dishes"    — photo of a cooking pot with spices
  · "Deadlines"   "6 open"      — photo of a university campus notice board
  · "Products"    "3 items"     — photo of black wireless headphones
  · "Everything Else" "7 reels"  — photo of a laptop with code on screen

Bottom navigation bar, white, four items with thin line icons and small labels:
Home, Search, Map, Alerts. The active item (Home) has a soft violet pill behind its
icon.

STYLE: background #FAFAFA, white cards, hairline #ECECEF borders, one soft shadow level.
Accent violet #7C3AED used ONLY for the logo, the active nav pill and primary buttons.
THE PHOTOGRAPHY CARRIES ALL THE COLOUR — the chrome stays white, grey and near-black.
Inter font. Headings 28px bold, card titles 17px semibold, counts 13px grey. Generous
white space, left-aligned, 20px card radius.
Avoid: emoji as icons, purple gradients or purple-filled cards, glassmorphism, 3D
floating shapes, drop-shadow stacking, centred symmetrical layouts, lorem ipsum.
Crisp, modern, professional — like Airbnb or Things 3, not a template dashboard.
```

## 2 — REEL DETAIL (food spot)

```
High-fidelity Android app UI design, portrait 1080x2400, LIGHT theme, flat straight-on
screen — no device frame, no hands, no perspective.

App: "ReelBrain". This is the detail screen for one saved reel.

Top 38% of the screen: a full-bleed PHOTOGRAPH of a plated chicken biryani, with a
soft dark gradient at the top holding a white circular back arrow on the left and a
share icon on the right.

Below, on a white sheet that overlaps the photo with a 24px rounded top edge:
  · A small green pill with a thin check icon reading "High confidence"
  · "Evergreen Restaurant" as a large bold heading
  · "Thirumangalam, Anna Nagar, Chennai" in grey beneath
  · A full-width violet button "Get directions" with a thin navigation icon
  · A row of small grey outlined chips: "Indian", "Budget", "Veg & non-veg"

  · An 11px uppercase grey label "DISHES", then wrapped light-grey chips:
    "Chicken Biryani", "Mutton Biryani", "Tandoori Chicken", "Parotta"

  · An 11px uppercase grey label "OFFERS", then two rows each with a small green dot:
    "₹500 for veg/non-veg combo" and "Buy 1 Get 1 on chicken and mutton biryani"

  · A bordered white panel titled "How we know" — three rows, each with a small
    monospace uppercase tag chip on the left and quoted text on the right:
      [ON-SCREEN] "EVERGREEN RESTAURANT"
      [CAPTION]   "THIRUMANGALAM ANNANAGAR"
      [AUDIO]     "for 500 rupees they are giving 2 combos"
    This panel should feel like a receipt — evidence, not debug output.

  · A transcript block with three small toggle pills: "Malayalam" (active),
    "English", "Romanised", and two lines of Malayalam script beneath.

STYLE: background #FAFAFA, white surfaces, hairline #ECECEF borders, one soft shadow.
Violet #7C3AED only on the primary button. Green #16A34A only for the confidence pill
and offer dots. Inter font, 28px bold heading, 15px body, 11px uppercase labels with
wide letter-spacing. Left-aligned, generous vertical rhythm, 20px radii.
Avoid: emoji as icons, purple gradients, purple-filled cards, glassmorphism, 3D shapes,
centred layouts, lorem ipsum.
Crisp, modern, professional — like Airbnb listing detail.
```

## 3 — SEARCH

```
High-fidelity Android app UI design, portrait 1080x2400, LIGHT theme, flat straight-on
screen — no device frame, no hands, no perspective.

App: "ReelBrain" search screen, keyboard dismissed.

Top: a pill-shaped white search field with a hairline border, containing a thin
magnifier icon and the typed text "that biryani recipe", with a small clear (x) icon
on the right.
Below it a row of small outlined filter pills, "All" active in soft violet:
"All", "Food", "Deadlines", "Travel", "Recipes", "Products".

Then a vertical list of results, each a white card with a hairline border:
  · square photo thumbnail (72x72, 12px radius) on the left
  · bold title, then a grey two-line snippet with a few words subtly highlighted in
    pale violet, then a tiny grey footer line
Results:
  1. photo of biryani in a pot — "Restaurant Style Chicken Biryani" —
     "serves 4, requires 1 hour of marination and 45 minutes of cooking time" —
     footer "@kerala_kitchen · Recipe"
  2. photo of a plated biryani at a restaurant — "Evergreen Restaurant" —
     "budget-friendly veg and non-veg combos, bucket biryani deals" —
     footer "@tharun_blogger · Food spot"
  3. photo of a Kerala waterfall — "Wayanad" — "7 places saved across 3 reels" —
     footer "@wayanad_diaries · Travel"

Bottom navigation, white, four thin line icons with labels: Home, Search, Map, Alerts.
Search is active with a soft violet pill behind its icon.

STYLE: background #FAFAFA, white cards, hairline #ECECEF borders, one soft shadow.
Violet #7C3AED only for the active pill and the highlighted query words.
THE PHOTOGRAPHY CARRIES THE COLOUR. Inter font, 15px titles, 13px grey snippets,
11px footers. Left-aligned, 16px card radius.
Avoid: emoji as icons, purple gradients, glassmorphism, 3D shapes, centred layouts,
lorem ipsum.
```

## 4 — MAP

```
High-fidelity Android app UI design, portrait 1080x2400, LIGHT theme, flat straight-on
screen — no device frame, no hands, no perspective.

App: "ReelBrain" map screen.

A full-bleed LIGHT map of the Chennai / Kerala region — soft grey roads, pale green
parks, light water, thin grey place labels. Clean and desaturated, like Google Maps
light or a Mapbox light style.
Circular map markers sit on it: white circles with a thin coloured ring and a small
line icon inside. Two are food markers, three travel. ONE marker is drawn with a
DASHED ring and reduced opacity — an approximate location. One cluster badge shows "3".
Floating at the top: a compact white segmented control with a hairline border and soft
shadow — "Food | Travel | All", with All selected in soft violet.
A white circular button with a thin location-arrow icon floats on the right, above the
sheet.

A WHITE BOTTOM SHEET is docked at about one third height, 24px rounded top corners,
small grey drag handle, soft shadow. Inside:
  · 11px uppercase grey label "NEAREST"
  · one row: square photo of biryani (56x56, 12px radius), "Evergreen Restaurant" bold,
    "Thirumangalam, Chennai · 400 m" in grey, and a small violet outlined "Directions"
    button on the right
  · the top edge of a second row peeking below, hinting at more

Bottom navigation, white, four thin line icons with labels: Home, Search, Map, Alerts.
Map is active with a soft violet pill.

STYLE: white surfaces, hairline #ECECEF borders, one soft shadow. Violet #7C3AED only
for the selected segment and the Directions button. Inter font. Left-aligned sheet
content, 11px uppercase labels with wide letter-spacing.
Avoid: emoji as icons, purple gradients, dark map tiles, glassmorphism, 3D shapes,
lorem ipsum.
```

## 5 — ALERTS (deadlines + nearby)

```
High-fidelity Android app UI design, portrait 1080x2400, LIGHT theme, flat straight-on
screen — no device frame, no hands, no perspective.

App: "ReelBrain" alerts screen.

Top: large bold heading "Alerts", grey subtitle "Tuesday, 4 August".

Section 1 — an 11px uppercase grey label "CLOSING SOON", then white cards each with a
2px coloured left edge:
  · RED edge — small poster thumbnail — "AI Hackathon 2026" bold — "IIT Madras" grey —
    right-aligned red pill "Closes today". Two small outlined buttons beneath:
    "Add to calendar" and "Register".
  · AMBER edge — poster thumbnail — "Build Your Own Jarvis" — "Articon, RSET" —
    right-aligned amber text "3 days left"
  · GREY edge, slightly faded — "PAYLOAD" — "Electronauts, RSET" — grey "Closed"

Section 2 — an 11px uppercase grey label "NEAR YOU", then one white card with a GREEN
2px left edge: square photo of biryani, "You're 400 m from Evergreen Restaurant" bold,
"Thirumangalam, Chennai" grey, and a small violet "Directions" button on the right.

Bottom navigation, white, four thin line icons with labels: Home, Search, Map, Alerts.
Alerts is active with a soft violet pill and a small red dot badge on its icon.

STYLE: background #FAFAFA, white cards, hairline #ECECEF borders, one soft shadow.
Colour comes from URGENCY only — red, amber, green left edges. Violet #7C3AED only on
buttons. Inter font, 28px heading, 15px card titles, 13px grey, 11px uppercase labels
with wide letter-spacing. Tabular numerals. Left-aligned, 16px radii.
Avoid: emoji as icons, purple gradients, purple-filled cards, glassmorphism, 3D shapes,
centred layouts, lorem ipsum.
```

---

# Images I actually need from you

For the **mockups**, none — the image model draws its own photography.

For the **built app**, three, and only three:

```
1. APP ICON — 1024x1024, flat vector app icon, violet #7C3AED rounded square
   background, a single white line-art mark combining a play triangle and a
   bookmark, centred, generous padding, no text, no gradient mesh, no 3D.
   Simple enough to read at 48px.

2. EMPTY STATE — 800x800, transparent background, flat line illustration in violet
   #7C3AED and grey, thin 2px strokes: a phone with a share arrow leaving it and
   landing in an open folder. Minimal, no text, no shading, no 3D, plenty of
   negative space.

3. ONBOARDING — 1080x1080, transparent background, flat line illustration, violet
   and grey, 2px strokes: the Instagram share sheet as a simple rounded rectangle
   with three app icons in a row, an arrow pointing to the middle one. Clean,
   diagrammatic, no realistic UI, no text.
```

Everything else in the real app is a **thumbnail pulled from the actual reel** — that
pipeline already works and stores one per reel.
