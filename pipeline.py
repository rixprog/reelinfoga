"""
End-to-end: paste a reel URL → get the food spot and where it is.

    python pipeline.py https://www.instagram.com/reel/XXXX/
    python pipeline.py --batch urls.txt

Stages:
    fetch (1 request)  →  frames + audio  →  detect lang  →  transcribe
                       →  translate  →  rank comments  →  Claude  →  JSON
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
import transcribe as transcribe_mod


def process(url: str, *, keyframes: int | None = None,
            with_owner_profile: bool = True) -> dict:
    keyframes = keyframes or config.KEYFRAMES

    print(f"\n{'=' * 70}\n{url}\n{'=' * 70}")

    # 1 ── collect (single fetch, single download)
    print("[1/5] fetching post…")
    reel = data.fetch_reel(url, with_comments=True,
                           with_owner_profile=with_owner_profile)
    mode = "logged in" if reel.logged_in else "anonymous"
    print(f"      @{reel.owner} · {reel.likes} likes · {mode}")

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
    print(f"      signals: {' · '.join(signals)}")

    if not reel.logged_in:
        print("      (no geotag/comments — login-gated; city must come from "
              "frames, caption or hashtags)")

    if not reel.video_path:
        raise RuntimeError("No video downloaded — is the post a video?")

    work = config.DOWNLOADS / reel.shortcode

    # 2 ── keyframes (where the signboard lives)
    print(f"[2/5] extracting {keyframes} keyframes…")
    frames = media.extract_keyframes(reel.video_path, work / "frames",
                                     count=keyframes,
                                     duration=reel.video_duration)
    print(f"      {len(frames)} frames")

    # 3 ── transcribe
    print("[3/5] transcribing…")
    transcript = transcribe_mod.run(reel.video_path, work)
    print(f"      native  : {transcript.native[:90] or '(no speech)'}")
    print(f"      english : {transcript.english[:90] or '(none)'}")
    if transcript.low_confidence:
        print(f"      (low-confidence audio — flagged for the model to judge, "
              f"not discarded)")

    # 4 ── extract
    print(f"[4/5] extracting food spot ({config.EXTRACTION_PROVIDER})…")
    spot = extract.extract_food_spot(reel, transcript, frames)
    print(f"      {spot.input_tokens} in / {spot.output_tokens} out tokens")

    # 5 ── persist
    result = {
        "url": url,
        "reel": reel.to_dict(),
        "transcript": {
            "language": transcript.language,
            "native": transcript.native,
            "english": transcript.english,
            "roman": transcript.roman,
        },
        "food_spot": spot.payload,
        "model": spot.model,
        "usage": {"input_tokens": spot.input_tokens,
                  "output_tokens": spot.output_tokens},
    }

    config.OUT.mkdir(parents=True, exist_ok=True)
    out_path = config.OUT / f"{reel.shortcode}.json"
    out_path.write_text(json.dumps(result, indent=2, ensure_ascii=False, default=str))
    print(f"[5/5] saved → {out_path}")

    summarize(spot.payload, reel)
    return result


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
    ap.add_argument("--no-profile", action="store_true",
                    help="skip the creator profile request (one fewer call)")
    args = ap.parse_args()

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
                    with_owner_profile=not args.no_profile)
        except Exception as e:
            failures += 1
            print(f"  FAILED {url}\n  {type(e).__name__}: {e}", file=sys.stderr)

        # Jittered pause between reels. Instagram throttles predictable cadences,
        # and a soft-ban mid-hackathon costs far more than the wait does.
        if i < len(urls) - 1:
            delay = random.uniform(20, 40)
            print(f"\n… sleeping {delay:.0f}s before the next reel")
            time.sleep(delay)

    if failures:
        print(f"\n{failures}/{len(urls)} failed", file=sys.stderr)
    return 1 if failures == len(urls) else 0


if __name__ == "__main__":
    raise SystemExit(main())
