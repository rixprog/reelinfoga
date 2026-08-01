# Image-generation prompts — 5 home screens

Copy one block at a time into GPT's image generator. Each is self-contained.

They all render the **home screen**, because that is the thing that differs. Pick a
direction from these, then use `DESIGN-DIRECTIONS.md` (the long brief) for the rest of
the screens.

Keep them this short. `DESIGN-DIRECTIONS.md` is written for a *text* model that will
reason about the product; image models ignore most of a 5,000-word brief and need
"what does it look like" instead.

---

## Shared style line (already inside each prompt below)

> near-black #09090B background, #18181B cards, 12px corner radius, Inter font,
> white primary text, grey secondary, accents only green #34D399 and amber #FBBF24.
> Calm, dense, professional — like Linear or Arc, not playful. Photos vivid, UI chrome
> muted. Crisp app-store-screenshot quality.

---

## 1 — TRIAGE INBOX

```
High-fidelity Android app UI mockup, dark theme, portrait 1080x2400, single screen.

App: "ReelBrain" — saves Instagram reels and extracts the useful information.

HOME = AN INBOX of unread saved reels.
Top: app title "ReelBrain" with a badge "6 unread". Below it a thin summary bar:
"6 unread · 2 closing this week".
Then a single-column list of wide rows. Each row: portrait photo thumbnail on the
left (rounded, 64x88), then a bold white title, then one grey line of detail, then a
small right-aligned status.
Rows visible, top to bottom:
 · biryani plate photo — "Evergreen Restaurant" — "Thirumangalam, Chennai" — "2.1 km"
 · hackathon poster — "AI Hackathon 2026" — "IIT Madras" — "13 days left" in amber
 · waterfall photo — "Wayanad" — "7 places saved" — "trip"
 · headphones photo — "Budget headphones" — "boAt vs OnePlus" — "₹1,499"
ONE row is mid-swipe, pulled left to reveal a coloured action rail behind it with
three icons: calendar, map pin, archive. Show the row partly slid so the rail is
visible — this is the key interaction.
Bottom tab bar, 4 items: Inbox, Archive, Map, Settings.

STYLE: near-black #09090B background, #18181B cards, 12px radius, Inter font, white
primary text, grey secondary, accents only green #34D399 and amber #FBBF24. Calm,
dense, purposeful — like an email client. Photos vivid, chrome muted. Crisp
app-store-screenshot quality. No lorem ipsum.
```

---

## 2 — SMART FEED  *(the control)*

```
High-fidelity Android app UI mockup, dark theme, portrait 1080x2400, single screen.

App: "ReelBrain" — saves Instagram reels and extracts the useful information.

HOME = A FILTERABLE CARD GRID.
Top: app title "ReelBrain", then a search bar reading "Search everything you've saved".
Then a horizontally scrolling row of filter chips with counts:
"All 32", "Food 12", "Deadlines 6", "Travel 9", "Recipes 4", "Products 3".
Below: a 2-column masonry grid of cards of varying height. Each card is a portrait
photo with a small category emoji, a bold white title, and one grey detail line.
Cards visible:
 · biryani plate — "Evergreen Restaurant" — "Thirumangalam, Chennai"
 · hackathon poster with a thin AMBER RING around the card — "AI Hackathon 2026" —
   "13 days left" in amber
 · waterfall — "Wayanad" — "7 places"
 · black headphones — "Budget headphones" — "₹1,499"
 · pot of biryani cooking — "Chicken Biryani" — "105 min · 5 ingredients"
 · dark code editor screenshot — "DSA Day 12: Two Pointers" — "O(n) time"
Bottom tab bar, 4 items: Library, Search, Map, Alerts.

STYLE: near-black #09090B background, #18181B cards, 12px radius, Inter font, white
primary text, grey secondary, accents only green #34D399 and amber #FBBF24. Calm,
dense, content-forward — like Linear or Arc, not playful. Photos vivid, chrome muted.
Crisp app-store-screenshot quality. No lorem ipsum.
```

---

## 3 — MAP FIRST

```
High-fidelity Android app UI mockup, dark theme, portrait 1080x2400, single screen.

App: "ReelBrain" — saves Instagram reels and extracts the useful information.

HOME = A FULL-SCREEN MAP, edge to edge, no header.
A dark-styled OpenStreetMap of Kerala/Chennai region with roads, green terrain and
water. Scattered circular numbered map pins tinted by category: coral for food, teal
for travel. One pin is DASHED and faded (an approximate location). A few pins are
clustered with a count badge "3".
Floating at the top: a small segmented control with three options — "Food", "Travel",
"All" — with "All" selected. A circular "near me" location button floating bottom-right
above the sheet.
A BOTTOM SHEET is docked at about one third of the screen height, rounded top corners,
dark surface, with a small drag handle. It shows: "Nearest saved" heading, then one
wide row — biryani plate photo thumbnail, "Evergreen Restaurant", "Thirumangalam,
Chennai · 400 m away", and a small green "Directions" button. Below it the top edge of
a second row is just visible, suggesting more content when dragged up.
No bottom tab bar. Just a small settings gear floating top-left.

STYLE: near-black #09090B UI surfaces, dark map tiles, #18181B sheet, 16px sheet
radius, Inter font, white primary text, grey secondary, accents green #34D399 and
amber #FBBF24. Immersive and confident, like a navigation app. Crisp
app-store-screenshot quality. No lorem ipsum.
```

---

## 4 — AGENDA

```
High-fidelity Android app UI mockup, dark theme, portrait 1080x2400, single screen.

App: "ReelBrain" — saves Instagram reels and extracts the useful information.

HOME = A TIMELINE organised by WHEN THINGS MATTER, not when they were saved.
Top: app title "ReelBrain", subtitle "Tuesday, 4 August".
Then a vertical list with sticky uppercase section headers and a thin vertical line
running down the left edge connecting the entries:

 TODAY
  · biryani plate photo — "You're 400 m from Evergreen Restaurant" —
    "Thirumangalam, Chennai" — small green "Directions" button.
    This row has a subtle green left edge.
  · hackathon poster — "AI Hackathon 2026 closes today" — "IIT Madras" —
    red "Closes today" pill. Red left edge.

 THIS WEEK
  · workshop poster — "Build Your Own Jarvis" — "in 3 days" — amber left edge

 THIS MONTH
  · waterfall photo — "Wayanad trip" — "7 places · plan not built yet" — teal edge

 SOMEDAY
  · pot of biryani — "Chicken Biryani recipe" — "105 min"
  · black headphones — "Budget headphones" — "₹1,499"
  · dark code editor screenshot — "DSA Day 12: Two Pointers" — "saved 3 weeks ago"

Each row: small rounded thumbnail left, bold white title, grey reason line beneath.
Colour comes from URGENCY, not category.
Bottom tab bar, 4 items: Agenda, Library, Map, Settings.

STYLE: near-black #09090B background, #18181B cards, 12px radius, Inter font, white
primary text, grey secondary, accents green #34D399, amber #FBBF24, red #F87171.
Quietly insistent — it should feel like something is looking after you. Photos vivid,
chrome muted. Crisp app-store-screenshot quality. No lorem ipsum.
```

---

## 5 — COLLECTIONS

```
High-fidelity Android app UI mockup, dark theme, portrait 1080x2400, single screen.

App: "ReelBrain" — saves Instagram reels and extracts the useful information.

HOME = AUTO-BUILT COLLECTIONS, like shelves the app filled for you.
Top: app title "ReelBrain", subtitle "32 reels, filed for you".
Then ONE wide highlighted "smart" card, visually distinct with a soft amber border:
"Closing this week" — "2 deadlines" — with two small overlapping poster thumbnails.
Below it, a 2-column grid of COLLECTION cards. Each card has a COLLAGE COVER made of
3-4 overlapping thumbnails from that collection, then a category emoji, a bold white
name, and a grey count:
 · 🍽️ "Food Spots" — "12 places" — collage of biryani, dosa, restaurant fronts
 · ⏰ "Deadlines" — "6 open" — collage of hackathon and workshop posters
 · 🗺️ "Travel" — "9 places" — collage of waterfall, tea hills, mountain road
 · 👨‍🍳 "Recipes" — "4 dishes" — collage of cooking pots and plated food
 · 🛍️ "Products" — "3 items" — collage of headphones and gadgets
 · 📌 "Everything Else" — "7 reels" — collage of code screens and charts
Bottom tab bar, 4 items: Collections, Search, Map, Settings.

STYLE: near-black #09090B background, #18181B cards, 12px radius, Inter font, white
primary text, grey secondary, accents green #34D399 and amber #FBBF24. Tidy, generous,
slightly editorial — it should feel like the app did the filing you were never going to
do. Photos vivid, chrome muted. Crisp app-store-screenshot quality. No lorem ipsum.
```

---

## If the render comes back wrong

Image models drift in predictable ways here:

- **Text turns to gibberish** — normal. Judge layout, hierarchy and density; ignore
  letterforms. If you need legible copy, ask for a "UI wireframe with real readable
  text labels".
- **It draws a phone in a hand on a desk** — add "flat UI design, no device frame, no
  hands, no perspective, straight-on screen only".
- **It goes light/colourful** — repeat "dark theme, near-black background" at the end.
- **It invents a chatbot or a big centre input** — add "no chat interface, no message
  bubbles, no large text input".
