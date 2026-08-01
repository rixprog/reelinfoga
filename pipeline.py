"""
End-to-end: paste a reel URL → get the food spot and where it is.

    python pipeline.py <url>              human-readable
    python pipeline.py <url> --json       JSONL events, for the web UI
    python pipeline.py --batch urls.txt

In --json mode every stage transition is emitted as one line of JSON on stdout so
the frontend can render live progress instead of a spinner. Stage ids match the
`ProcessingStep` union in src/lib/types.ts.
"""

from __future__ import annotations

import argparse
import json
import random
import sys
import time
from pathlib import Path

import config
import data
import extract
import media
import store
import transcribe as transcribe_mod
import verticals

# Mirrors ProcessingStep in src/lib/types.ts
STAGES = [
    ("downloading", "Fetching reel"),
    ("extracting_audio", "Extracting frames and audio"),
    ("transcribing", "Transcribing and translating"),
    ("classifying", "Working out what this reel is"),
    ("understanding", "Extracting the details"),
    ("saving", "Saving and cleaning up"),
]

_JSON = False
_EVENTS = sys.stdout   # the real stdout, reserved for JSON events


def _enter_json_mode() -> None:
    """
    Reserve stdout for events and push everything else to stderr.

    data.py, transcribe.py and friends all use bare print(), which lands on
    stdout. Rebinding sys.stdout here is a one-line way to guarantee the event
    stream stays pure JSONL without threading a logger through every module —
    and a stray print that happened to be valid JSON would otherwise corrupt
    the stream in a way that is very unpleasant to debug.
    """
    global _JSON, _EVENTS
    _JSON = True
    _EVENTS = sys.stdout
    sys.stdout = sys.stderr


def emit(event: str, **fields) -> None:
    """One JSON object per line on stdout; ignored in human mode."""
    if _JSON:
        print(json.dumps({"event": event, **fields}, ensure_ascii=False,
                         default=str), file=_EVENTS, flush=True)


def log(msg: str) -> None:
    """Human-readable chatter. In JSON mode sys.stdout is already stderr."""
    print(msg, flush=True)


def process(url: str, *, keyframes: int | None = None,
            with_owner_profile: bool | None = None) -> dict:
    keyframes = keyframes or config.KEYFRAMES
    # The creator bio is reachable anonymously, but it costs a second request to
    # api/v1/users/web_profile_info/ — the most aggressively throttled endpoint we
    # touch, and the one that 429'd on every real run so far. Anonymous runs skip
    # it by default: weak city inference is not worth spending the rate-limit
    # budget that the reel fetch itself needs.
    if with_owner_profile is None:
        with_owner_profile = bool(config.IG_USERNAME)
    log(f"\n{'=' * 70}\n{url}\n{'=' * 70}")
    emit("start", url=url, stages=[{"id": s, "label": l} for s, l in STAGES])

    # 1 ── collect (single fetch, single download)
    emit("stage", stage="downloading", status="processing")
    log("[1/5] fetching post…")
    reel = data.fetch_reel(url, with_comments=True,
                           with_owner_profile=with_owner_profile)

    mode = "logged in" if reel.logged_in else "anonymous"
    log(f"      @{reel.owner} · {reel.likes} likes · {mode}")

    signals = ["frames", "caption"]
    if reel.hashtags:
        signals.append(f"{len(reel.hashtags)} hashtags")
    if reel.tagged_users:
        signals.append(f"tagged: {', '.join('@' + u for u in reel.tagged_users)}")
    if reel.location_name:
        coords = f" ({reel.location_lat}, {reel.location_lng})" if reel.has_geotag else ""
        signals.append(f"geotag: {reel.location_name}{coords}")
    if reel.comments:
        signals.append(f"{len(reel.comments)} comments")
    log(f"      signals: {' · '.join(signals)}")
    if not reel.logged_in:
        log("      (no geotag/comments — login-gated; city must come from "
            "frames, caption or hashtags)")

    if not reel.video_path:
        raise RuntimeError("No video downloaded — is the post a video?")

    work = config.DOWNLOADS / reel.shortcode
    emit("stage", stage="downloading", status="completed",
         detail=f"@{reel.owner} · {reel.likes} likes")

    # 2 ── keyframes (where the signboard lives)
    emit("stage", stage="extracting_audio", status="processing")
    log(f"[2/5] extracting {keyframes} keyframes…")
    frames = media.extract_keyframes(reel.video_path, work / "frames",
                                     count=keyframes,
                                     duration=reel.video_duration)
    log(f"      {len(frames)} frames")
    emit("stage", stage="extracting_audio", status="completed",
         detail=f"{len(frames)} keyframes")

    # 3 ── transcribe
    emit("stage", stage="transcribing", status="processing")
    log("[3/5] transcribing…")
    transcript = transcribe_mod.run(reel.video_path, work)
    log(f"      native  : {transcript.native[:90] or '(no speech)'}")
    log(f"      english : {transcript.english[:90] or '(none)'}")
    if transcript.low_confidence:
        log("      (low-confidence audio — flagged for the model to judge, "
            "not discarded)")
    emit("stage", stage="transcribing", status="completed",
         detail=f"language: {transcript.language or 'unknown'}")

    # 4 ── route (cheap, text-only) then extract with that vertical's schema
    emit("stage", stage="classifying", status="processing")
    log("[4/6] classifying…")
    routed = verticals.classify(reel, transcript)
    category = routed.get("category", "other")
    log(f"      category: {category} — {routed.get('reason','')[:80]}")
    emit("stage", stage="classifying", status="completed", detail=category)

    emit("stage", stage="understanding", status="processing")
    log(f"[5/6] extracting {category} ({config.EXTRACTION_PROVIDER})…")
    if category == "deadline":
        spot = verticals.extract_deadline(reel, transcript, frames)
        headline = spot.payload.get("title") or "no opportunity identified"
    elif category == "travel":
        spot = verticals.extract_travel(reel, transcript, frames)
        places = spot.payload.get("places") or []
        headline = (f"{spot.payload.get('destination') or 'unknown'} "
                    f"— {len(places)} place(s)")
    elif category == "recipe":
        spot = verticals.extract_recipe(reel, transcript, frames)
        headline = spot.payload.get("dish_name") or "no dish identified"
    elif category == "product":
        spot = verticals.extract_product(reel, transcript, frames)
        prods = spot.payload.get("products") or []
        headline = f"{len(prods)} product(s) — {spot.payload.get('product_category') or '?'}"
    elif category == "food_spot":
        spot = extract.extract_food_spot(reel, transcript, frames)
        spot.category = "food_spot"
        headline = spot.payload.get("place_name") or "no place identified"
    else:
        # Nothing the user saved should end up as a blank entry, so the
        # catch-all still produces a structured, searchable card.
        spot = verticals.extract_generic(reel, transcript, frames)
        headline = spot.payload.get("title") or "extracted"
    log(f"      {spot.input_tokens} in / {spot.output_tokens} out tokens")

    # "Link in bio" is how a huge share of Indian opportunity reels actually
    # distribute their registration URL. Spend the extra (throttled) profile
    # request only here — when the reel is a deadline and we still have no link,
    # which is exactly when the bio is the difference between actionable and not.
    if spot.category == "deadline":
        p = spot.payload
        if p.get("link_in_bio") or not p.get("registration_links"):
            log(f"      no direct link — checking @{reel.owner}'s bio…")
            bio = data.fetch_owner_bio(reel.owner)
            before = len(p.get("registration_links") or [])
            spot.payload = verticals.resolve_bio_links(p, bio)
            gained = len(spot.payload.get("registration_links") or []) - before
            log(f"      bio contributed {gained} link(s)")

    emit("stage", stage="understanding", status="completed", detail=headline)

    # 6 ── persist, then delete the media we no longer need
    emit("stage", stage="saving", status="processing")
    result = {
        "url": url,
        "category": spot.category,
        "reel": reel.to_dict(),
        "transcript": {
            "language": transcript.language,
            "native": transcript.native,
            "english": transcript.english,
            "roman": transcript.roman,
            "low_confidence": transcript.low_confidence,
        },
        "food_spot": spot.payload,
        "model": spot.model,
        "usage": {"input_tokens": spot.input_tokens,
                  "output_tokens": spot.output_tokens},
    }

    config.OUT.mkdir(parents=True, exist_ok=True)
    out_path = config.OUT / f"{reel.shortcode}.json"
    out_path.write_text(json.dumps(result, indent=2, ensure_ascii=False, default=str))

    record = store.build_record(
        shortcode=reel.shortcode, url=url, category=spot.category,
        reel=result["reel"], transcript=result["transcript"],
        payload=spot.payload, model=spot.model,
    )
    store.upsert(record)
    ics_path = store.write_ics(record)
    if ics_path:
        log(f"      calendar file → {ics_path}")

    if config.NOTIFY_ON_SAVE:
        import notify
        for r in notify.notify_saved(record):
            log(f"      notify {r.channel}: {'OK' if r.ok else 'FAIL ' + r.detail}")

    # Everything downstream runs on the extracted JSON, so the video is dead
    # weight the moment extraction returns — ~18 MB per reel of it.
    if config.KEEP_MEDIA:
        log("[6/6] KEEP_MEDIA set — media retained")
        freed = {"freed_bytes": 0, "removed": 0}
    else:
        freed = media.purge_media(work, keep_thumbnail=config.KEEP_THUMBNAIL)
        log(f"[6/6] saved → {out_path}  "
            f"(purged {freed['removed']} media files, "
            f"{freed['freed_bytes'] / 1e6:.1f} MB)")
    result["purged"] = freed
    emit("stage", stage="saving", status="completed",
         detail=f"freed {freed['freed_bytes'] / 1e6:.1f} MB")

    if not _JSON:
        if spot.category == "deadline":
            summarize_deadline(spot.payload)
        elif spot.category == "travel":
            summarize_travel(spot.payload)
        elif spot.category == "recipe":
            summarize_recipe(spot.payload)
        elif spot.category == "product":
            summarize_product(spot.payload)
        elif spot.category == "other":
            summarize_generic(spot.payload)
        else:
            summarize(spot.payload, reel)
    emit("done", result=result)
    return result


def summarize_recipe(r: dict) -> None:
    print(f"\n{'─' * 70}")
    if not r.get("is_recipe"):
        print("  Not a recipe.")
        print(f"{'─' * 70}")
        return
    print(f"  DISH        {r.get('dish_name') or '—'}")
    print(f"  CUISINE     {r.get('cuisine') or '—'}   "
          f"SERVES  {r.get('servings') or '—'}   "
          f"{r.get('veg_status') or ''}")
    times = [f"prep {r['prep_time_minutes']}min" if r.get('prep_time_minutes') else None,
             f"cook {r['cook_time_minutes']}min" if r.get('cook_time_minutes') else None,
             f"total {r['total_time_minutes']}min" if r.get('total_time_minutes') else None]
    print(f"  TIME        {' · '.join(t for t in times if t) or '—'}")
    print(f"\n  INGREDIENTS ({len(r.get('ingredients') or [])})")
    for i in r.get("ingredients") or []:
        qty = " ".join(x for x in (i.get("quantity"), i.get("unit")) if x) or "—"
        note = f"  ({i['notes']})" if i.get("notes") else ""
        print(f"    · {qty:<12} {i.get('item')}{note}")
    print(f"\n  STEPS ({len(r.get('steps') or [])})")
    for st in r.get("steps") or []:
        dur = f" [{st['duration_minutes']}min]" if st.get("duration_minutes") else ""
        print(f"    {st.get('order')}. {st.get('instruction')}{dur}")
        if st.get("tip"):
            print(f"       tip: {st['tip']}")
    print(f"{'─' * 70}")


def summarize_product(p: dict) -> None:
    print(f"\n{'─' * 70}")
    if not p.get("is_product_content"):
        print("  Not product content.")
        print(f"{'─' * 70}")
        return
    print(f"  CATEGORY    {p.get('product_category') or '—'}")
    print(f"  VERDICT     {(p.get('verdict') or '')[:120]}")
    for prod in p.get("products") or []:
        price = f"₹{prod['price_inr']:,}" if prod.get("price_inr") else (prod.get("price_text") or "price not stated")
        print(f"\n    {prod.get('name')}   {price}")
        for sp in prod.get("specs") or []:
            print(f"      {sp.get('label')}: {sp.get('value')}")
        for pro in prod.get("pros") or []:
            print(f"      + {pro}")
        for con in prod.get("cons") or []:
            print(f"      - {con}")
        for link in verticals.buy_links(prod.get("name") or "", prod.get("brand")):
            print(f"      {link['store']}: {link['url']}")
    print(f"{'─' * 70}")


def summarize_generic(g: dict) -> None:
    print(f"\n{'─' * 70}")
    print(f"  TITLE       {g.get('title') or '—'}")
    print(f"  TOPIC       {g.get('topic') or '—'}")
    print(f"  TAGS        {', '.join(g.get('tags') or []) or '—'}")
    print(f"\n  {g.get('summary') or ''}")
    if g.get("key_points"):
        print("\n  KEY POINTS")
        for k in g["key_points"]:
            print(f"    · {k}")
    if g.get("actionable_items"):
        print("\n  DO")
        for a in g["actionable_items"]:
            print(f"    → {a}")
    ent = g.get("entities") or {}
    for label, vals in ent.items():
        if vals:
            print(f"  {label:<18} {', '.join(vals)}")
    print(f"{'─' * 70}")


def summarize_travel(t: dict) -> None:
    print(f"\n{'─' * 70}")
    if not t.get("is_travel_content"):
        print("  Not travel content.")
        print(f"{'─' * 70}")
        return
    print(f"  DESTINATION {t.get('destination') or '—'}"
          + (f", {t['state']}" if t.get('state') else ""))
    if t.get("best_season"):
        print(f"  SEASON      {t['best_season']}")
    print(f"  CONFIDENCE  {str(t.get('confidence','?')).upper()}")
    print(f"\n  PLACES ({len(t.get('places') or [])})")
    for p in t.get("places") or []:
        dur = f"{p['duration_minutes']}min" if p.get("duration_minutes") else "—"
        print(f"    · {p.get('name'):<34} {p.get('place_type'):<11} {dur:<7}"
              f"{p.get('best_time_of_day') or ''}")
        if p.get("tips"):
            print(f"        tip: {p['tips'][:80]}")
    print(f"\n  {t.get('reasoning','')}")
    print(f"{'─' * 70}")


def summarize_deadline(d: dict) -> None:
    print(f"\n{'─' * 70}")
    if not d.get("is_opportunity"):
        print("  Not an opportunity.")
        print(f"{'─' * 70}")
        return

    days = verticals.days_until(d.get("deadline_date"))
    print(f"  TITLE       {d.get('title') or '—'}")
    print(f"  ORG         {d.get('organisation') or '—'}")
    print(f"  TYPE        {d.get('opportunity_type') or '—'}")

    if d.get("deadline_date"):
        when = (f"{abs(days)} days ago" if days is not None and days < 0
                else "today" if days == 0
                else f"in {days} days")
        print(f"  DEADLINE    {d['deadline_date']}  ({when})"
              f"   [{d.get('date_confidence')}]")
    else:
        print(f"  DEADLINE    not stated  ({d.get('deadline_text') or '—'})")
    if d.get("event_date"):
        print(f"  EVENT ON    {d['event_date']}")

    for f in ("eligibility", "location", "fee", "stipend", "prize", "contact"):
        if d.get(f):
            print(f"  {f.upper():<11} {d[f]}")
    for link in d.get("registration_links") or []:
        print(f"  APPLY       {link}")
    if d.get("link_in_bio"):
        print("  APPLY       (link in creator's bio)")
    print(f"  CONFIDENCE  {str(d.get('confidence','?')).upper()}")

    ev = d.get("evidence") or []
    if ev:
        print("\n  EVIDENCE")
        for e in ev[:8]:
            q = e.get("quote", "")
            q = q[:64] + "…" if len(q) > 64 else q
            print(f"    · {e.get('field','?'):<14} {e.get('source','?'):<12} {q}")
    print(f"\n  {d.get('reasoning','')}")
    print(f"{'─' * 70}")


def summarize(fs: dict, reel: data.ReelData) -> None:
    print(f"\n{'─' * 70}")
    if not fs.get("is_food_content"):
        print("  Not food content.")
        print(f"{'─' * 70}")
        return

    name = fs.get("place_name") or "(place not identified)"
    where = ", ".join(x for x in (fs.get("area"), fs.get("city"), fs.get("state")) if x)

    print(f"  PLACE       {name}")
    print(f"  WHERE       {where or '—'}")
    if fs.get("landmark"):
        print(f"  LANDMARK    {fs['landmark']}")
    if fs.get("dishes"):
        print(f"  DISHES      {', '.join(fs['dishes'])}")
    print(f"  CUISINE     {fs.get('cuisine') or '—'}   "
          f"PRICE  {fs.get('price_band') or '—'}   "
          f"VEG  {fs.get('veg_status') or '—'}")
    for offer in (fs.get("offers") or []):
        print(f"  OFFER       {offer}")
    if fs.get("contact"):
        print(f"  CONTACT     {fs['contact']}")
    print(f"  CONFIDENCE  {fs.get('confidence','?').upper()}")

    if reel.has_geotag:
        print(f"  COORDS      {reel.location_lat}, {reel.location_lng}  (IG geotag)")
    else:
        print("  COORDS      needs geocoding (no IG geotag)")

    ev = fs.get("evidence") or []
    if ev:
        print("\n  EVIDENCE")
        for e in ev[:8]:
            quote = e.get("quote", "")
            quote = quote[:64] + "…" if len(quote) > 64 else quote
            print(f"    · {e.get('field','?'):<12} {e.get('source','?'):<14} {quote}")

    print(f"\n  {fs.get('reasoning','')}")
    print(f"{'─' * 70}")


def main() -> int:
    ap = argparse.ArgumentParser(description="Reel → food spot")
    ap.add_argument("url", nargs="?", help="Instagram reel URL")
    ap.add_argument("--batch", type=Path, help="file with one URL per line")
    ap.add_argument("--frames", type=int, default=None)
    ap.add_argument("--json", action="store_true",
                    help="emit JSONL progress events on stdout (for the web UI)")
    ap.add_argument("--profile", action="store_true",
                    help="also fetch the creator bio (extra, heavily rate-limited "
                         "request; on by default only when logged in)")
    ap.add_argument("--no-profile", action="store_true",
                    help="never fetch the creator bio")
    args = ap.parse_args()
    if args.json:
        _enter_json_mode()

    urls = []
    if args.batch:
        urls = [l.strip() for l in args.batch.read_text().splitlines()
                if l.strip() and not l.startswith("#")]
    elif args.url:
        urls = [args.url]
    else:
        ap.error("give a URL or --batch")

    failures = 0
    for i, url in enumerate(urls):
        try:
            process(url, keyframes=args.frames,
                    with_owner_profile=(False if args.no_profile
                                        else True if args.profile else None))
        except Exception as e:
            failures += 1
            emit("error", url=url, message=f"{type(e).__name__}: {e}")
            print(f"  FAILED {url}\n  {type(e).__name__}: {e}", file=sys.stderr)

        # Jittered pause between reels. Instagram throttles predictable cadences,
        # and a soft-ban mid-hackathon costs far more than the wait does.
        if i < len(urls) - 1:
            delay = random.uniform(20, 40)
            log(f"\n… sleeping {delay:.0f}s before the next reel")
            time.sleep(delay)

    if failures:
        print(f"\n{failures}/{len(urls)} failed", file=sys.stderr)
    return 1 if failures == len(urls) else 0


if __name__ == "__main__":
    raise SystemExit(main())
