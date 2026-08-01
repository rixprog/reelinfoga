"""Central config. Reads .env, never hardcodes secrets."""

import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

ROOT = Path(__file__).resolve().parent
DOWNLOADS = ROOT / "downloads"
OUT = ROOT / "out"

GROQ_API_KEY = os.getenv("GROQ_API_KEY") or ""
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY") or ""
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY") or ""

# "gemini" | "claude"
EXTRACTION_PROVIDER = os.getenv("EXTRACTION_PROVIDER", "gemini").lower()

# Gemini reads the raw MP4 (audio + every frame) rather than sampled keyframes:
# measurably cheaper, and it can't miss a signboard that appears between samples.
# flash-lite matched full flash on extraction accuracy at ~3x the speed, which is
# what free-tier rate limits reward. Pinned rather than *-latest so an alias change
# can't silently alter behaviour mid-build. If real reels (messy signboards, motion
# blur, Indic script) come back weak, GEMINI_MODEL=gemini-3.6-flash is the upgrade.
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-3.1-flash-lite")

# Inline uploads are capped by request size; anything larger goes via the Files API.
GEMINI_INLINE_MAX_BYTES = 18 * 1024 * 1024

IG_USERNAME = os.getenv("IG_USERNAME") or ""
IG_SESSION_FILE = os.getenv("IG_SESSION_FILE") or None

EXTRACTION_MODEL = os.getenv("EXTRACTION_MODEL", "claude-opus-5")
MAX_COMMENTS = int(os.getenv("MAX_COMMENTS", "100"))
KEYFRAMES = int(os.getenv("KEYFRAMES", "6"))

# Groq audio models
ASR_MODEL = "whisper-large-v3"


def require(name: str) -> str:
    """Fail loudly and early rather than 401-ing deep inside the pipeline."""
    value = globals().get(name) or ""
    if not value:
        raise RuntimeError(
            f"{name} is not set. Copy .env.example to .env and fill it in."
        )
    return value
