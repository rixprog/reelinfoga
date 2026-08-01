"""
Transcription: detect language → transcribe in that language → translate to English.

Three passes, deliberately:

  1. detect    — on a 30s clip only, so we don't pay for a full run just to learn
                 the language
  2. transcribe — with the detected code. Forcing the right language materially
                 improves Whisper on Indian languages vs. letting it auto-detect
                 mid-stream (it drifts, especially with code-mixing)
  3. translate  — Whisper's translate task, which always outputs English

We keep all three text forms: native (display + provenance), English (embeddings,
search, LLM extraction), romanized (Manglish/Tanglish fuzzy matching).
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from pathlib import Path

from groq import Groq

import config
import media

_client: Groq | None = None


def client() -> Groq:
    global _client
    if _client is None:
        _client = Groq(api_key=config.require("GROQ_API_KEY"))
    return _client


# ─────────────────────────────────────────────────────────────────────────────
# Language identification
# ─────────────────────────────────────────────────────────────────────────────

# Whisper's verbose_json reports a language *name*, capitalised ("Malayalam"), not
# a code. Keep this map wide: an unmapped name used to fall through to None, which
# silently threw away the detection instead of surfacing it.
LANG_NAME_TO_CODE = {
    # target languages
    "malayalam": "ml", "tamil": "ta", "telugu": "te", "kannada": "kn",
    "hindi": "hi", "english": "en",
    # other Indian languages that show up
    "urdu": "ur", "bengali": "bn", "marathi": "mr", "gujarati": "gu",
    "punjabi": "pa", "odia": "or", "oriya": "or", "assamese": "as",
    "nepali": "ne", "sinhala": "si", "sanskrit": "sa",
    # languages Whisper commonly *mis*detects Indic audio as — mapped so the
    # mistake is visible in logs rather than silently becoming None
    "italian": "it", "spanish": "es", "portuguese": "pt", "french": "fr",
    "german": "de", "dutch": "nl", "romanian": "ro", "turkish": "tr",
    "indonesian": "id", "malay": "ms", "swahili": "sw", "welsh": "cy",
    "arabic": "ar", "persian": "fa", "russian": "ru", "japanese": "ja",
    "korean": "ko", "chinese": "zh", "thai": "th", "vietnamese": "vi",
}

# What we actually expect from an Indian food reel. Anything else is a red flag.
TARGET_LANGUAGES = {"ml", "ta", "te", "kn", "hi", "en"}

# Unicode blocks — an independent check on what Whisper claims.
SCRIPT_RANGES = {
    "ml": (0x0D00, 0x0D7F),
    "ta": (0x0B80, 0x0BFF),
    "te": (0x0C00, 0x0C7F),
    "kn": (0x0C80, 0x0CFF),
    "hi": (0x0900, 0x097F),   # Devanagari
}


def detect_script(text: str) -> str | None:
    """Dominant Indic script in `text`, by character count."""
    if not text:
        return None
    counts = {code: 0 for code in SCRIPT_RANGES}
    for ch in text:
        cp = ord(ch)
        for code, (lo, hi) in SCRIPT_RANGES.items():
            if lo <= cp <= hi:
                counts[code] += 1
                break
    best = max(counts, key=counts.get)
    return best if counts[best] >= 5 else None


def _lang_field(resp) -> tuple[str | None, str | None]:
    """Returns (iso_code, raw_name). Raw name is kept so misdetections are visible."""
    raw = getattr(resp, "language", None)
    if raw is None and isinstance(resp, dict):
        raw = resp.get("language")
    if not raw:
        return None, None
    name = str(raw).strip().lower()
    code = LANG_NAME_TO_CODE.get(name) or (name if len(name) == 2 else None)
    return code, name


def detect_language(audio_path: str | Path, clip_seconds: int = 30) -> str | None:
    """
    Whisper's own language ID, run on a short clip.

    Passing no `language` is what makes Whisper auto-detect; verbose_json then
    reports what it decided.
    """
    audio_path = Path(audio_path)
    clip = audio_path.with_name(audio_path.stem + "_probe.wav")
    try:
        media.clip_audio(audio_path, clip, seconds=clip_seconds)
        probe = clip
    except Exception:
        probe = audio_path   # clipping failed, just use the whole file

    with open(probe, "rb") as f:
        resp = client().audio.transcriptions.create(
            file=(probe.name, f.read()),
            model=config.ASR_MODEL,
            response_format="verbose_json",
            temperature=0,
        )

    code, raw_name = _lang_field(resp)

    # Cross-check against the script actually produced. Whisper sometimes reports
    # "english" for heavily code-mixed audio while emitting Malayalam text.
    script = detect_script(getattr(resp, "text", "") or "")
    if script and code != script:
        print(f"[transcribe] whisper said {raw_name!r} but script looks {script!r} "
              f"— trusting the script")
        return script

    # An Indian food reel detected as Italian/Welsh/etc. means detection failed —
    # usually noisy audio or background music over very little speech. Forcing that
    # wrong code into the transcription pass makes the output worse, so we drop
    # back to auto-detect and say so loudly.
    if code and code not in TARGET_LANGUAGES:
        print(f"[transcribe] WARNING detected {raw_name!r} ({code}) — outside the "
              f"expected set {sorted(TARGET_LANGUAGES)}. Detection probably failed; "
              f"falling back to auto-detect.")
        return None

    if code is None and raw_name:
        print(f"[transcribe] WARNING unmapped language name {raw_name!r}")

    return code


# ─────────────────────────────────────────────────────────────────────────────
# Transcription / translation
# ─────────────────────────────────────────────────────────────────────────────

# Whisper's own decoder fallback thresholds, and they hold up on real reels:
# a Tamil-song reel scored avg_logprob -0.76 / compression 2.54, while a clean
# narrated reel scored -0.08 / 1.64.
#
# Deliberately NOT using no_speech_prob: measured on those same two reels it runs
# *higher* for clean speech (0.54) than for the song (0.12), so it would invert the
# decision.
LOGPROB_FLOOR = -0.5
COMPRESSION_CEILING = 2.4


def _quality(segments) -> tuple[float | None, float | None]:
    if not segments:
        return None, None
    get = ((lambda s, k: s.get(k)) if isinstance(segments[0], dict)
           else (lambda s, k: getattr(s, k, None)))
    lp = [get(s, "avg_logprob") for s in segments if get(s, "avg_logprob") is not None]
    cr = [get(s, "compression_ratio") for s in segments
          if get(s, "compression_ratio") is not None]
    return (sum(lp) / len(lp) if lp else None,
            max(cr) if cr else None)


def transcribe(audio_path: str | Path, language: str | None = None):
    """Returns (text, avg_logprob, compression_ratio)."""
    audio_path = Path(audio_path)
    with open(audio_path, "rb") as f:
        kwargs = dict(
            file=(audio_path.name, f.read()),
            model=config.ASR_MODEL,
            response_format="verbose_json",
            temperature=0,
        )
        if language:
            kwargs["language"] = language
        resp = client().audio.transcriptions.create(**kwargs)

    lp, cr = _quality(getattr(resp, "segments", None) or [])
    return (getattr(resp, "text", "") or "").strip(), lp, cr


def translate_to_english(audio_path: str | Path) -> str:
    """
    Whisper's translate task — audio straight to English, no separate MT step.

    Note the honest limitation: quality on Malayalam and Kannada is noticeably
    weaker than on Hindi or Tamil. If English output looks thin, that's the place
    to swap in a dedicated Indic model (Sarvam) — this function is the seam.
    """
    audio_path = Path(audio_path)
    with open(audio_path, "rb") as f:
        resp = client().audio.translations.create(
            file=(audio_path.name, f.read()),
            model=config.ASR_MODEL,
            response_format="json",
            temperature=0,
        )
    return (getattr(resp, "text", "") or "").strip()


# ─────────────────────────────────────────────────────────────────────────────
# Romanization  (Manglish / Tanglish)
# ─────────────────────────────────────────────────────────────────────────────

_SANSCRIPT_SCHEMES = {
    "ml": "malayalam", "ta": "tamil", "te": "telugu",
    "kn": "kannada", "hi": "devanagari",
}


def romanize(text: str, language: str | None) -> str:
    """
    Native script → Latin, for trigram matching on queries like "nalla thattukada".

    Worth keeping in perspective: most search value comes from the English
    translation, because place and dish names are proper nouns that survive
    translation intact. This earns its keep on untranslatables (puttu, thattukada)
    and spelling variance (Kozhikode/Calicut).
    """
    if not text or not language or language == "en":
        return text or ""

    scheme = _SANSCRIPT_SCHEMES.get(language)
    if not scheme:
        return ""

    try:
        from indic_transliteration import sanscript
        out = sanscript.transliterate(text, scheme, sanscript.ITRANS)
        return re.sub(r"[~^]", "", out).lower()
    except Exception as e:
        print(f"[transcribe] romanize skipped ({type(e).__name__}: {e})")
        return ""


# ─────────────────────────────────────────────────────────────────────────────

@dataclass
class Transcript:
    language: str | None
    native: str
    english: str
    roman: str
    avg_logprob: float | None = None
    compression_ratio: float | None = None

    @property
    def low_confidence(self) -> bool:
        """
        Whisper found this audio hard. That is a HINT, not a verdict.

        An earlier version treated this as a gate and dropped the transcript when
        it tripped. That was a mistake with real cost: a Tamil food review scoring
        avg_logprob -1.27 was discarded, and it contained the price ("₹500 combo"),
        the offer ("Buy 1 Get 1 on chicken and mutton biryani"), the locality
        ("Thirumangalam") and a phone number — none of which appeared anywhere else
        in the reel.

        The score conflates two different things: background music with no speech,
        and real speech that is simply hard to hear over background music. A scalar
        can't separate them. The model reading the actual words can — so we always
        pass the text through, flagged, and let it judge.
        """
        if self.avg_logprob is not None and self.avg_logprob < LOGPROB_FLOOR:
            return True
        if (self.compression_ratio is not None
                and self.compression_ratio > COMPRESSION_CEILING):
            return True
        return False

    @property
    def has_text(self) -> bool:
        return bool(self.native.strip())


def run(video_path: str | Path, work_dir: str | Path) -> Transcript:
    """video → {language, native, english, roman, quality}"""
    work_dir = Path(work_dir)
    work_dir.mkdir(parents=True, exist_ok=True)
    audio = media.extract_audio(video_path, work_dir / "audio.wav")

    language = detect_language(audio)
    print(f"[transcribe] detected language: {language}")

    native, lp, cr = transcribe(audio, language=language)

    t = Transcript(language=language, native=native, english="", roman="",
                   avg_logprob=lp, compression_ratio=cr)

    if not t.has_text:
        return t

    if t.low_confidence:
        print(f"[transcribe] low-confidence audio "
              f"(avg_logprob={lp}, compression_ratio={cr}) — keeping the "
              f"transcript but flagging it for the extractor to judge")

    # Always translate. A low score often means "speech over loud music", which is
    # exactly the case where the English version carries the offer, the price and
    # the locality — the highest-value text in the whole reel.
    t.english = native if language == "en" else translate_to_english(audio)
    t.roman = romanize(native, language)
    return t
