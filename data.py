import re
from pathlib import Path

import instaloader
from instaloader import Post

# ----------------------------------------------------
# Configuration
# ----------------------------------------------------

L = instaloader.Instaloader(
    download_videos=True,
    download_video_thumbnails=True,
    download_comments=False,
    save_metadata=True,
)

# ----------------------------------------------------
# Core
# ----------------------------------------------------

def get_post(reel_url: str) -> Post:
    """
    Returns an Instaloader Post object.
    """
    match = re.search(r"/(?:reel|p)/([^/?]+)/?", reel_url)

    if not match:
        raise ValueError("Invalid Instagram URL")

    shortcode = match.group(1)

    return Post.from_shortcode(L.context, shortcode)


def download_post(reel_url: str, target: str = "downloads") -> bool:
    """
    Downloads the complete reel.
    """
    post = get_post(reel_url)
    return L.download_post(post, target)


def get_caption(reel_url: str) -> str:
    """
    Returns caption text.
    """
    return get_post(reel_url).caption


def get_video(reel_url: str, target: str = "downloads") -> Path:
    """
    Downloads the reel and returns the MP4 path.
    """

    download_post(reel_url, target)

    files = list(Path(target).rglob("*.mp4"))

    if not files:
        raise FileNotFoundError("Video not found.")

    return files[0]


def get_thumbnail(reel_url: str, target: str = "downloads") -> Path:
    """
    Downloads the reel and returns thumbnail path.
    """

    download_post(reel_url, target)

    files = list(Path(target).rglob("*.jpg"))

    if not files:
        raise FileNotFoundError("Thumbnail not found.")

    return files[0]


def get_metadata(reel_url: str) -> dict:
    """
    Returns important metadata.
    """

    post = get_post(reel_url)

    return {
        "shortcode": post.shortcode,
        "mediaid": post.mediaid,
        "owner": post.owner_username,
        "caption": post.caption,
        "likes": post.likes,
        "comments": post.comments,
        "is_video": post.is_video,
        "date": post.date_utc,
        "video_url": post.video_url,
        "thumbnail_url": post.url,
    }

import re


def get_hashtags(reel_url: str) -> list[str]:
    """
    Returns all hashtags from the caption.
    """
    caption = get_caption(reel_url)

    if not caption:
        return []

    return re.findall(r"#(\w+)", caption)


def get_mentions(reel_url: str) -> list[str]:
    """
    Returns all @mentions from the caption.
    """
    caption = get_caption(reel_url)

    if not caption:
        return []

    return re.findall(r"@([A-Za-z0-9._]+)", caption)
    # ----------------------------------------------------
# Owner Profile
# ----------------------------------------------------

def get_owner_profile(reel_url: str):
    """
    Returns the Profile object of the reel owner.
    """
    post = get_post(reel_url)
    return post.owner_profile


def get_owner_username(reel_url: str) -> str:
    """
    Returns owner's username.
    """
    return get_owner_profile(reel_url).username


def get_owner_fullname(reel_url: str) -> str:
    """
    Returns owner's full name.
    """
    return get_owner_profile(reel_url).full_name


def get_owner_id(reel_url: str) -> int:
    """
    Returns owner's Instagram ID.
    """
    return get_owner_profile(reel_url).userid


def get_owner_bio(reel_url: str) -> str:
    """
    Returns owner's biography.
    """
    return get_owner_profile(reel_url).biography


def get_profile_pic(reel_url: str) -> str:
    """
    Returns owner's profile picture URL.
    """
    return get_owner_profile(reel_url).profile_pic_url


def get_followers(reel_url: str) -> int:
    """
    Returns follower count.
    """
    return get_owner_profile(reel_url).followers


def get_followees(reel_url: str) -> int:
    """
    Returns following count.
    """
    return get_owner_profile(reel_url).followees


def is_verified(reel_url: str) -> bool:
    """
    Returns whether the owner is verified.
    """
    return get_owner_profile(reel_url).is_verified


def is_private(reel_url: str) -> bool:
    """
    Returns whether the account is private.
    """
    return get_owner_profile(reel_url).is_private


def get_external_url(reel_url: str):
    """
    Returns external website if present.
    """
    return get_owner_profile(reel_url).external_url


def get_posts_count(reel_url: str) -> int:
    """
    Returns total number of posts.
    """
    return get_owner_profile(reel_url).mediacount


# ----------------------------------------------------
# Demo
# ----------------------------------------------------

if __name__ == "__main__":

    URL = "https://www.instagram.com/bluecor_labs/reel/DUM8OhkAFil/"

    print("=" * 60)
    print("Caption")
    print("=" * 60)
    print(get_caption(URL))

    print("\n")

    print("=" * 60)
    print("Metadata")
    print("=" * 60)
    print(get_metadata(URL))

    print("\n")

    print("=" * 60)
    print("Downloading Reel...")
    print("=" * 60)

    video = get_video(URL)
    thumbnail = get_thumbnail(URL)

    print("Video     :", video)
    print("Thumbnail :", thumbnail)
    print("\n")
    print("=" * 60)
    print("Hashtags")
    print("=" * 60)
    print(get_hashtags(URL))

    print("\n")
    print("=" * 60)
    print("Mentions")
    print("=" * 60)
    print(get_mentions(URL))
    print("\n")
    print("=" * 60)
    print("Owner Information")
    print("=" * 60)

    print("Username      :", get_owner_username(URL))
    print("Full Name     :", get_owner_fullname(URL))
    print("User ID       :", get_owner_id(URL))
    print("Biography     :", get_owner_bio(URL))
    print("Followers     :", get_followers(URL))
    print("Following     :", get_followees(URL))
    print("Posts         :", get_posts_count(URL))
    print("Verified      :", is_verified(URL))
    print("Private       :", is_private(URL))
    print("Website       :", get_external_url(URL))
    print("Profile Pic   :", get_profile_pic(URL))