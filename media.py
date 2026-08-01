"""
ffmpeg helpers: audio for the ASR, keyframes for the vision model.

(This replaces the old extract.py, which only did audio and had a hardcoded Windows
path. `extract.py` is now the LLM extraction step.)

Keyframes matter as much as audio here: in Indian food reels the restaurant name is
usually *burned into the video* as on-screen text — a signboard, a menu, the bill —
and never spoken aloud. The audio track is often just background music.
"""

from __future__ import annotations

import re
import subprocess
from pathlib import Path

import imageio_ffmpeg

FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()

# Long-edge cap for keyframes. Vision tokens scale with pixel count, so 768px keeps
# a 6-frame reel at a few cents per extraction instead of ~4x that at full res.
FRAME_LONG_EDGE = 768

# Cap the LONG edge, whichever it is. Reels are portrait (720x1280), so a
# width-only `scale='min(768,iw)':-2` is a no-op on them — it leaves the 1280px
# height untouched and quietly costs ~4x the intended vision tokens.
_SCALE = (
    f"scale="
    f"w='if(gt(iw,ih),min({FRAME_LONG_EDGE},iw),-2)':"
    f"h='if(gt(iw,ih),-2,min({FRAME_LONG_EDGE},ih))'"
)


def _run(args: list[str]) -> subprocess.CompletedProcess:
    return subprocess.run(args, check=True, capture_output=True, text=True)


def purge_media(work_dir: str | Path, keep_thumbnail: bool = True) -> dict:
    """
    Delete the video, audio and keyframes once extraction is done.

    We measured ~18 MB per reel, so a user with 500 saved reels would cost 9 GB of
    video we never read again — everything downstream (search, reminders, the map)
    runs on the extracted JSON. Deleting also means we are not sitting on a copy of
    other people's copyrighted video.

    The thumbnail is kept by default because the UI needs an image per reel and it
    is a few KB, not video. Pass keep_thumbnail=False to remove that too.
    """
    work_dir = Path(work_dir)
    if not work_dir.exists():
        return {"freed_bytes": 0, "removed": 0}

    patterns = ["*.mp4", "*.wav", "*.m4a", "*.webm", "*.mkv", "frames/*.jpg"]
    if not keep_thumbnail:
        patterns.append("*.jpg")

    freed = 0
    removed = 0
    for pattern in patterns:
        for p in work_dir.glob(pattern):
            if p.is_file():
                try:
                    freed += p.stat().st_size
                    p.unlink()
                    removed += 1
                except OSError:
                    pass

    frames_dir = work_dir / "frames"
    if frames_dir.is_dir() and not any(frames_dir.iterdir()):
        frames_dir.rmdir()

    return {"freed_bytes": freed, "removed": removed}


def probe_duration(video_path: str | Path) -> float | None:
    """Duration in seconds, parsed from ffmpeg's own stderr (no ffprobe needed)."""
    proc = subprocess.run(
        [FFMPEG, "-i", str(video_path)], capture_output=True, text=True
    )
    m = re.search(r"Duration:\s*(\d+):(\d+):(\d+\.?\d*)", proc.stderr)
    if not m:
        return None
    h, mnt, s = m.groups()
    return int(h) * 3600 + int(mnt) * 60 + float(s)


def extract_audio(video_path: str | Path, output_path: str | Path) -> Path:
    """16 kHz mono WAV — what Whisper wants."""
    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    _run([FFMPEG, "-y", "-i", str(video_path), "-vn",
          "-ac", "1", "-ar", "16000", str(output_path)])
    return output_path


def clip_audio(audio_path: str | Path, output_path: str | Path,
               seconds: int = 30) -> Path:
    """
    First N seconds — used for language detection so we don't pay for a full
    transcription pass just to find out what language it's in.
    """
    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    _run([FFMPEG, "-y", "-i", str(audio_path), "-t", str(seconds),
          "-ac", "1", "-ar", "16000", str(output_path)])
    return output_path


def extract_keyframes(
    video_path: str | Path,
    output_dir: str | Path,
    count: int = 6,
    duration: float | None = None,
) -> list[Path]:
    """
    `count` frames sampled evenly across the video.

    Uniform sampling beats ffmpeg scene-detection here: scene-detect returns an
    unpredictable number of frames (sometimes 1, sometimes 40) and text overlays
    often persist *across* cuts, so cut boundaries aren't where the information is.
    Even sampling is deterministic and costs the same.
    """
    video_path = Path(video_path)
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    duration = duration or probe_duration(video_path) or 0.0
    if duration <= 0:
        # Unknown duration — grab a single frame so the pipeline still has vision input.
        out = output_dir / "frame_00.jpg"
        _run([FFMPEG, "-y", "-i", str(video_path), "-frames:v", "1",
              "-vf", _SCALE, str(out)])
        return [out] if out.exists() else []

    # Skip the very start/end: reels open on a title card and end on a follow CTA.
    start, end = duration * 0.08, duration * 0.92
    step = (end - start) / max(count - 1, 1)

    frames: list[Path] = []
    for i in range(count):
        ts = start + step * i
        out = output_dir / f"frame_{i:02d}.jpg"
        try:
            _run([FFMPEG, "-y", "-ss", f"{ts:.2f}", "-i", str(video_path),
                  "-frames:v", "1", "-q:v", "3",
                  "-vf", _SCALE, str(out)])
            if out.exists():
                frames.append(out)
        except subprocess.CalledProcessError:
            continue

    return frames
