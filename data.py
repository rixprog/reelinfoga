"""
Instagram collection layer.

Design rule: **fetch the post exactly once.**

The previous version had a `get_post()` call inside every getter, so a single reel
triggered ~20 network round-trips (and downloaded the video twice). Instagram bans
that pattern quickly. Everything below hangs off one `Post.from_shortcode` call and
one download, returned as a single `ReelData`.
"""

from __future__ import annotations

import itertools
import re
from dataclasses import dataclass, field, asdict
from datetime import datetime
from pathlib import Path

import instaloader
from instaloader import Post

import config

SHORTCODE_RE = re.compile(r"/(?:reel|reels|p|tv)/([^/?#]+)")


# ─────────────────────────────────────────────────────────────────────────────
# Models
# ─────────────────────────────────────────────────────────────────────────────

@dataclass
class Comment:
    id: int
    text: str
    author: str
    likes: int
    is_creator: bool               # posted by the reel's owner → authoritative
    parent_id: int | None = None   # set when this is a reply
    created_at: datetime | None = None
    has_location_intent: bool = False


@dataclass
class ReelData:
    url: str
    shortcode: str
    mediaid: int
    owner: str
    caption: str
    hashtags: list[str]
    mentions: list[str]
    tagged_users: list[str]
    likes: int
    comment_count: int
    date_utc: datetime | None
    video_duration: float | None
    accessibility_caption: str | None

    # geotag — the highest-value field in this whole file
    location_name: str | None = None
    location_lat: float | None = None
    location_lng: float | None = None
    location_id: int | None = None

    video_path: Path | None = None
    thumbnail_path: Path | None = None
    comments: list[Comment] = field(default_factory=list)

    # Which signals were actually reachable. Anonymous runs lose geotag + comments,
    # and the extraction prompt adapts to what's here rather than hunting for
    # evidence that can never arrive.
    logged_in: bool = False

    # populated later in the pipeline
    owner_bio: str | None = None
    owner_followers: int | None = None

    @property
    def has_geotag(self) -> bool:
        return self.location_lat is not None and self.location_lng is not None

    def to_dict(self) -> dict:
        d = asdict(self)
        d["video_path"] = str(self.video_path) if self.video_path else None
        d["thumbnail_path"] = str(self.thumbnail_path) if self.thumbnail_path else None
        d["date_utc"] = self.date_utc.isoformat() if self.date_utc else None
        for c in d["comments"]:
            c["created_at"] = c["created_at"].isoformat() if c["created_at"] else None
        return d


# ─────────────────────────────────────────────────────────────────────────────
# Loader
# ─────────────────────────────────────────────────────────────────────────────

_loader: instaloader.Instaloader | None = None


def get_loader() -> instaloader.Instaloader:
    """
    One shared, logged-in loader.

    Login matters more than it looks: `Post.location` returns None when anonymous
    (instaloader enforces this because Instagram does), and comments 401 quickly.
    Without a session you lose both geotags and comment mining.
    """
    global _loader
    if _loader is not None:
        return _loader

    L = instaloader.Instaloader(
        download_videos=True,
        download_video_thumbnails=True,
        download_comments=False,   # we fetch comments ourselves, threaded
        save_metadata=True,
        compress_json=False,
        post_metadata_txt_pattern="",
        # one directory per reel — see the note in `_locate_media`
        dirname_pattern=str(config.DOWNLOADS / "{target}"),
        # Anonymous: fail on the first 429 so fetch_reel can hand off to yt-dlp.
        # instaloader's rate controller *sleeps* rather than raising (it waited
        # ~11 minutes on a real run), so retries here don't surface as an
        # exception at all — they just hang the pipeline. Logged in, retries are
        # worth it because the fallback can't see comments or geotags.
        max_connection_attempts=3 if config.IG_USERNAME else 1,
        request_timeout=30.0,
        quiet=True,
    )

    if config.IG_USERNAME:
        try:
            if config.IG_SESSION_FILE:
                L.load_session_from_file(config.IG_USERNAME, config.IG_SESSION_FILE)
            else:
                L.load_session_from_file(config.IG_USERNAME)
            print(f"[data] logged in as {config.IG_USERNAME}")
        except FileNotFoundError:
            print(
                f"[data] WARNING no session file for {config.IG_USERNAME!r}.\n"
                f"       Run:  instaloader --login {config.IG_USERNAME}\n"
                f"       Continuing anonymously — geotags will be None and "
                f"comments will likely fail."
            )
    else:
        print(
            "[data] anonymous mode — caption, video, hashtags and tagged users work.\n"
            "       Geotag and comments are login-gated by Instagram and will be absent."
        )

    _loader = L
    return L


def shortcode_from_url(url: str) -> str:
    m = SHORTCODE_RE.search(url)
    if not m:
        raise ValueError(f"Not an Instagram post/reel URL: {url}")
    return m.group(1)


# ─────────────────────────────────────────────────────────────────────────────
# Media
# ─────────────────────────────────────────────────────────────────────────────

def _locate_media(target_dir: Path) -> tuple[Path | None, Path | None]:
    """
    Find this reel's video and thumbnail.

    The old code did `list(Path("downloads").rglob("*.mp4"))[0]`, which scans the
    whole tree and returns an arbitrary file. Correct for the first reel, silently
    wrong for every one after it — you'd transcribe another reel's audio with no
    error raised. Scoping the glob to a per-shortcode directory fixes it.
    """
    videos = sorted(target_dir.glob("*.mp4"))
    images = sorted(p for p in target_dir.glob("*.jpg") if p.is_file())
    return (videos[0] if videos else None, images[0] if images else None)


# ─────────────────────────────────────────────────────────────────────────────
# Comments
# ─────────────────────────────────────────────────────────────────────────────

def _fetch_comments(post: Post, owner: str, limit: int) -> list[Comment]:
    """
    Flatten Instagram's two-level comment tree into a list with `parent_id` intact.

    Threading is load-bearing for this product: the answer to "where is this?" lives
    in the *reply*, and the reply almost never repeats the question. Keeping the link
    is what lets the ranker in comments.py pull the pair through together.
    """
    out: list[Comment] = []
    try:
        for c in itertools.islice(post.get_comments(), limit):
            try:
                author = c.owner.username
            except Exception:
                author = "?"
            out.append(Comment(
                id=int(c.id),
                text=c.text or "",
                author=author,
                likes=c.likes_count or 0,
                is_creator=(author == owner),
                created_at=c.created_at_utc,
            ))
            for a in (c.answers or []):
                try:
                    a_author = a.owner.username
                except Exception:
                    a_author = "?"
                out.append(Comment(
                    id=int(a.id),
                    text=a.text or "",
                    author=a_author,
                    likes=a.likes_count or 0,
                    is_creator=(a_author == owner),
                    parent_id=int(c.id),
                    created_at=a.created_at_utc,
                ))
    except Exception as e:
        # Comments are the flakiest part of scraping. Degrade, never crash —
        # transcript + caption + frames still produce a usable extraction.
        print(f"[data] WARNING comment fetch failed ({type(e).__name__}: {e})")

    return out


# ─────────────────────────────────────────────────────────────────────────────
# Public entrypoint
# ─────────────────────────────────────────────────────────────────────────────

def fetch_via_ytdlp(url: str, target_dir: Path) -> ReelData:
    """
    Fallback collector.

    Instagram rate-limits instaloader's GraphQL path aggressively — a handful of
    anonymous requests earned an 11-minute 429 backoff — while yt-dlp reached the
    same reel immediately because it hits different endpoints. It also speaks
    YouTube Shorts and TikTok, so this doubles as multi-platform support.

    It cannot see comments, geotags or tagged users, but none of those are
    available anonymously anyway, so nothing is lost in that mode.
    """
    import yt_dlp

    target_dir.mkdir(parents=True, exist_ok=True)
    opts = {
        "outtmpl": str(target_dir / "%(id)s.%(ext)s"),
        "quiet": True,
        "no_warnings": True,
        "noprogress": True,
    }
    with yt_dlp.YoutubeDL(opts) as ydl:
        info = ydl.extract_info(url, download=True)

    caption = info.get("description") or ""
    videos = sorted(target_dir.glob("*.mp4"))

    return ReelData(
        url=url,
        shortcode=info.get("id") or shortcode_from_url(url),
        mediaid=0,
        owner=info.get("uploader") or info.get("channel") or "unknown",
        caption=caption,
        hashtags=re.findall(r"#(\w+)", caption),
        mentions=re.findall(r"@([A-Za-z0-9._]+)", caption),
        tagged_users=[],                       # not exposed by yt-dlp
        likes=info.get("like_count") or 0,
        comment_count=info.get("comment_count") or 0,
        date_utc=None,
        video_duration=info.get("duration"),
        accessibility_caption=None,
        video_path=videos[0] if videos else None,
        logged_in=False,
    )


def fetch_reel(
    url: str,
    *,
    download: bool = True,
    with_comments: bool = True,
    max_comments: int | None = None,
    with_owner_profile: bool = False,
    allow_fallback: bool = True,
) -> ReelData:
    """
    One network fetch, one download, everything returned together.

    `with_owner_profile` is off by default on purpose: `post.owner_profile` is a
    separate request. Turn it on when you want the creator's bio (useful for
    inferring a city when the reel never names one).
    """
    max_comments = max_comments or config.MAX_COMMENTS
    L = get_loader()
    shortcode = shortcode_from_url(url)

    try:
        post = Post.from_shortcode(L.context, shortcode)   # ← the only fetch
    except Exception as e:
        # Anonymous GraphQL gets 429'd fast, and instaloader's response is to sleep
        # for ~11 minutes. That's fatal to a batch run, so hand off to yt-dlp rather
        # than block. Only worth doing when anonymous: logged in we'd be discarding
        # comments and the geotag, which is the whole reason to be logged in.
        if not allow_fallback or L.context.is_logged_in:
            raise
        print(f"[data] instaloader failed ({type(e).__name__}: {str(e)[:90]}) "
              f"— falling back to yt-dlp")
        return fetch_via_ytdlp(url, config.DOWNLOADS / shortcode)

    # -- geotag ---------------------------------------------------------------
    loc_name = loc_lat = loc_lng = loc_id = None
    try:
        loc = post.location
        if loc:
            loc_name, loc_lat, loc_lng, loc_id = loc.name, loc.lat, loc.lng, loc.id
    except Exception as e:
        print(f"[data] WARNING location lookup failed ({type(e).__name__}: {e})")

    reel = ReelData(
        url=url,
        shortcode=post.shortcode,
        mediaid=post.mediaid,
        owner=post.owner_username,
        caption=post.caption or "",
        hashtags=list(post.caption_hashtags or []),
        mentions=list(post.caption_mentions or []),
        tagged_users=list(post.tagged_users or []),
        likes=post.likes,
        comment_count=post.comments,
        date_utc=post.date_utc,
        video_duration=getattr(post, "video_duration", None),
        accessibility_caption=getattr(post, "accessibility_caption", None),
        location_name=loc_name,
        location_lat=loc_lat,
        location_lng=loc_lng,
        location_id=loc_id,
    )

    # -- media ----------------------------------------------------------------
    if download:
        target_dir = config.DOWNLOADS / shortcode
        if not target_dir.exists() or not any(target_dir.glob("*.mp4")):
            config.DOWNLOADS.mkdir(parents=True, exist_ok=True)
            L.download_post(post, target=shortcode)   # ← downloaded once, not twice
        reel.video_path, reel.thumbnail_path = _locate_media(target_dir)

    # -- comments -------------------------------------------------------------
    reel.logged_in = L.context.is_logged_in
    if with_comments:
        if reel.logged_in:
            reel.comments = _fetch_comments(post, reel.owner, max_comments)
        else:
            # Verified: anonymous comment access raises LoginRequiredException on the
            # GraphQL path, and /embed/ + oEmbed both serve a challenge wall. Skip the
            # doomed request rather than burning a call into a guaranteed 401 — every
            # wasted request brings the rate limiter closer.
            print("[data] anonymous — skipping comments (login required by Instagram)")

    # -- creator profile (opt-in: extra request) ------------------------------
    if with_owner_profile:
        try:
            prof = post.owner_profile
            reel.owner_bio = prof.biography
            reel.owner_followers = prof.followers
        except Exception as e:
            print(f"[data] WARNING owner profile failed ({type(e).__name__}: {e})")

    return reel


if __name__ == "__main__":
    import json
    import sys

    url = sys.argv[1] if len(sys.argv) > 1 else \
        "https://www.instagram.com/bluecor_labs/reel/DUM8OhkAFil/"
    r = fetch_reel(url)
    print(json.dumps(r.to_dict(), indent=2, ensure_ascii=False, default=str))
