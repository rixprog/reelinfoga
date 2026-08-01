"""
Instagram session setup.

Two things need a logged-in session, and they're the two that matter most here:

    post.location   -> returns None when anonymous (hardcoded in instaloader)
    post.get_comments() -> LoginRequiredException

Everything else (caption, video, hashtags, tagged users) works anonymously.

Usage
-----
    # preferred: no password typed anywhere — lifts the session from a browser
    # you're already logged into
    python login.py --browser brave

    # fallback: interactive password prompt
    python login.py --user your_username

    # confirm it actually unlocked geotags + comments
    python login.py --verify

Use a throwaway Instagram account. Automated fetching gets accounts
action-blocked, and you don't want that happening to your real one mid-hackathon.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

import instaloader
from instaloader.instaloader import get_default_session_filename

import config

VERIFY_URL = "https://www.instagram.com/p/C8gVYbLSTFE/"  # any public post


def _write_env_username(username: str) -> None:
    """Persist IG_USERNAME so data.py picks the session up automatically."""
    env = config.ROOT / ".env"
    if not env.exists():
        print(f"  ! no .env found — add IG_USERNAME={username} yourself")
        return

    lines = env.read_text().splitlines()
    for i, line in enumerate(lines):
        if line.strip().startswith("IG_USERNAME="):
            lines[i] = f"IG_USERNAME={username}"
            break
    else:
        lines.append(f"IG_USERNAME={username}")

    env.write_text("\n".join(lines) + "\n")
    print(f"  ✓ .env updated: IG_USERNAME={username}")


def from_browser(browser: str, cookiefile: str | None = None) -> str:
    from instaloader.__main__ import get_cookies_from_instagram

    L = instaloader.Instaloader(quiet=True)
    cookies = get_cookies_from_instagram("instagram", browser, cookiefile)
    if not cookies:
        raise SystemExit(
            f"No Instagram cookies found in {browser}.\n"
            f"Log into instagram.com in {browser} first, then re-run this."
        )

    L.context.update_cookies(cookies)
    username = L.test_login()
    if not username:
        raise SystemExit(
            f"Found {browser} cookies for instagram.com, but they don't correspond to a\n"
            f"logged-in session (visiting the site sets csrftoken/datr without logging in).\n"
            f"Actually sign in at instagram.com in {browser}, then re-run this."
        )

    L.context.username = username
    path = get_default_session_filename(username)
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    L.save_session_to_file(path)

    print(f"  ✓ logged in as {username}")
    print(f"  ✓ session saved to {path}")
    _write_env_username(username)
    return username


def interactive(username: str) -> str:
    L = instaloader.Instaloader(quiet=True)
    L.interactive_login(username)          # prompts for password (+2FA)
    path = get_default_session_filename(username)
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    L.save_session_to_file(path)

    print(f"  ✓ logged in as {username}")
    print(f"  ✓ session saved to {path}")
    _write_env_username(username)
    return username


def verify() -> int:
    """Prove the session unlocks the two gated fields — not just that it loads."""
    import itertools

    import data

    if not config.IG_USERNAME:
        print("  ✗ IG_USERNAME not set in .env — run --browser or --user first")
        return 1

    L = data.get_loader()
    print(f"  is_logged_in: {L.context.is_logged_in}")
    if not L.context.is_logged_in:
        print("  ✗ session did not load")
        return 1

    from instaloader import Post
    post = Post.from_shortcode(L.context, data.shortcode_from_url(VERIFY_URL))

    loc = post.location
    print(f"  location    : {loc}")
    print("                (None here may just mean this post has no geotag —"
          " the point is it no longer fails)")

    try:
        got = list(itertools.islice(post.get_comments(), 3))
        print(f"  ✓ comments  : fetched {len(got)} "
              f"(this raised LoginRequiredException when anonymous)")
        for c in got:
            print(f"      [{c.owner.username}] {c.text[:50]}")
    except Exception as e:
        print(f"  ✗ comments  : {type(e).__name__}: {str(e)[:150]}")
        return 1

    print("\n  Session works. Run: python pipeline.py <reel_url>")
    return 0


def main() -> int:
    ap = argparse.ArgumentParser(description="Set up an Instagram session")
    g = ap.add_mutually_exclusive_group(required=True)
    g.add_argument("--browser", help="firefox | chrome | brave | edge | safari …")
    g.add_argument("--user", help="username for interactive password login")
    g.add_argument("--verify", action="store_true",
                   help="check that geotags and comments actually work now")
    ap.add_argument("--cookiefile", help="explicit path to the browser cookie DB")
    args = ap.parse_args()

    if args.verify:
        return verify()
    if args.browser:
        from_browser(args.browser, args.cookiefile)
    else:
        interactive(args.user)

    print("\n  Now run:  python login.py --verify")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
