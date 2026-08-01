"""
Search across every saved reel.

Hybrid on purpose, because the two arms fail in opposite ways:

  SEMANTIC (gemini-embedding-2, 3072-dim) finds things by meaning — "that video
  about sorting algorithms" matches a reel that only ever said "two-pointer" and
  "quicksort". It is weak on rare proper nouns it has no strong sense of.

  KEYWORD (BM25-ish, pure Python) nails exactly those: "Soochipara", "boAt
  Rockerz 450", a phone number. It is useless when the user's words never appear
  in the reel.

Merged with Reciprocal Rank Fusion, which needs no score calibration between two
scales that are not comparable.

Embeddings are cached per reel and keyed by a hash of the indexed text, so
re-running search costs nothing and re-extracting a reel invalidates just that
one entry.
"""

from __future__ import annotations

import hashlib
import json
import math
import re
import tempfile
from collections import Counter
from pathlib import Path

import config
import store

EMBED_MODEL = "gemini-embedding-2"
VECTORS = config.OUT / "vectors.json"

_client = None


def _gemini():
    global _client
    if _client is None:
        from google import genai
        _client = genai.Client(api_key=config.require("GEMINI_API_KEY"))
    return _client


# ─────────────────────────────────────────────────────────────────────────────
# What gets indexed
# ─────────────────────────────────────────────────────────────────────────────

def index_text(item: dict) -> str:
    """
    Flatten a saved reel into one searchable blob.

    Everything goes in — caption, hashtags, both transcripts, and every string
    inside the extracted payload. The user searching months later has no idea
    which field their memory of the reel lives in, so we don't make them guess.
    """
    parts: list[str] = []

    def add(v):
        if isinstance(v, str) and v.strip():
            parts.append(v.strip())
        elif isinstance(v, (int, float)) and not isinstance(v, bool):
            parts.append(str(v))
        elif isinstance(v, dict):
            for k, sub in v.items():
                # Evidence quotes duplicate text already indexed and drown the
                # signal; the reasoning field is about our process, not content.
                if k in ("evidence", "reasoning"):
                    continue
                add(sub)
        elif isinstance(v, list):
            for sub in v:
                add(sub)

    parts.append(item.get("title") or "")
    parts.append(item.get("category") or "")
    parts.append(item.get("caption") or "")
    parts.append(" ".join(item.get("hashtags") or []))
    parts.append(f"by @{item.get('owner')}" if item.get("owner") else "")
    parts.append(item.get("transcript_english") or "")
    add(item.get("payload") or {})

    return "\n".join(p for p in parts if p)[:12000]


def _fingerprint(text: str) -> str:
    return hashlib.sha256(text.encode()).hexdigest()[:16]


# ─────────────────────────────────────────────────────────────────────────────
# Vector store
# ─────────────────────────────────────────────────────────────────────────────

def _load_vectors() -> dict:
    if not VECTORS.exists():
        return {}
    try:
        return json.loads(VECTORS.read_text())
    except (json.JSONDecodeError, OSError):
        return {}


def _save_vectors(data: dict) -> None:
    config.OUT.mkdir(parents=True, exist_ok=True)
    fd, tmp = tempfile.mkstemp(dir=str(config.OUT), suffix=".tmp")
    try:
        with open(fd, "w") as f:
            json.dump(data, f)
        Path(tmp).replace(VECTORS)
    except Exception:
        Path(tmp).unlink(missing_ok=True)
        raise


def embed(text: str, task: str = "RETRIEVAL_DOCUMENT") -> list[float] | None:
    """
    One text per call — the batch form silently returned a single vector for
    three inputs when tested, so we do not use it.
    """
    from google.genai import types
    try:
        r = _gemini().models.embed_content(
            model=EMBED_MODEL, contents=text[:8000],
            config=types.EmbedContentConfig(task_type=task),
        )
        return list(r.embeddings[0].values)
    except Exception as e:
        print(f"[search] embed failed ({type(e).__name__}: {str(e)[:90]})")
        return None


def reindex(verbose: bool = True) -> dict:
    """Embed anything new or changed. Unchanged reels cost nothing."""
    items = store.all_items()
    vectors = _load_vectors()
    added = skipped = failed = 0

    for item in items:
        sc = item.get("shortcode")
        if not sc:
            continue
        text = index_text(item)
        fp = _fingerprint(text)
        if vectors.get(sc, {}).get("fingerprint") == fp:
            skipped += 1
            continue
        vec = embed(text)
        if vec is None:
            failed += 1
            continue
        vectors[sc] = {"fingerprint": fp, "vector": vec}
        added += 1
        if verbose:
            print(f"  embedded {sc} ({item.get('category')})")

    # Drop vectors for reels that no longer exist.
    live = {i.get("shortcode") for i in items}
    for gone in [k for k in vectors if k not in live]:
        del vectors[gone]

    _save_vectors(vectors)
    return {"embedded": added, "unchanged": skipped, "failed": failed,
            "total": len(vectors)}


# ─────────────────────────────────────────────────────────────────────────────
# Keyword arm
# ─────────────────────────────────────────────────────────────────────────────

_TOKEN = re.compile(r"[a-z0-9]+")
STOPWORDS = {
    "the", "a", "an", "and", "or", "of", "to", "in", "on", "for", "with", "is",
    "was", "it", "that", "this", "show", "me", "find", "reel", "video", "about",
    "which", "what", "where", "i", "my", "saved", "one",
}


def tokenise(text: str) -> list[str]:
    return [t for t in _TOKEN.findall(text.lower())
            if t not in STOPWORDS and len(t) > 1]


def keyword_scores(query: str, docs: dict[str, str]) -> dict[str, float]:
    """
    BM25 over the indexed blobs. ~30 lines and no dependency, which is the right
    trade at this corpus size.
    """
    q_terms = tokenise(query)
    if not q_terms or not docs:
        return {}

    tokenised = {k: tokenise(v) for k, v in docs.items()}
    lengths = {k: len(v) or 1 for k, v in tokenised.items()}
    avg_len = sum(lengths.values()) / len(lengths)
    counts = {k: Counter(v) for k, v in tokenised.items()}

    n = len(docs)
    df = Counter()
    for terms in counts.values():
        for t in set(terms) & set(q_terms):
            df[t] += 1

    k1, b = 1.5, 0.75
    scores: dict[str, float] = {}
    for key, tf in counts.items():
        score = 0.0
        for t in q_terms:
            if not tf.get(t):
                continue
            idf = math.log(1 + (n - df[t] + 0.5) / (df[t] + 0.5))
            freq = tf[t]
            score += idf * (freq * (k1 + 1)) / (
                freq + k1 * (1 - b + b * lengths[key] / avg_len))
        if score > 0:
            scores[key] = score
    return scores


def cosine(a: list[float], b: list[float]) -> float:
    dot = sum(x * y for x, y in zip(a, b))
    na = math.sqrt(sum(x * x for x in a))
    nb = math.sqrt(sum(y * y for y in b))
    return dot / (na * nb) if na and nb else 0.0


# ─────────────────────────────────────────────────────────────────────────────
# Search
# ─────────────────────────────────────────────────────────────────────────────

RRF_K = 60


def search(query: str, limit: int = 10, category: str | None = None,
           auto_reindex: bool = True) -> list[dict]:
    items = store.all_items()
    if category:
        items = [i for i in items if i.get("category") == category]
    if not items:
        return []

    by_code = {i["shortcode"]: i for i in items if i.get("shortcode")}
    docs = {k: index_text(v) for k, v in by_code.items()}

    if auto_reindex:
        vectors = _load_vectors()
        if any(vectors.get(k, {}).get("fingerprint") != _fingerprint(d)
               for k, d in docs.items()):
            reindex(verbose=False)

    vectors = _load_vectors()

    # --- semantic arm ---
    semantic: list[tuple[str, float]] = []
    q_vec = embed(query, task="RETRIEVAL_QUERY")
    if q_vec:
        sims = [(k, cosine(q_vec, vectors[k]["vector"]))
                for k in by_code if k in vectors]
        semantic = sorted(sims, key=lambda x: -x[1])

    # --- keyword arm ---
    kw = sorted(keyword_scores(query, docs).items(), key=lambda x: -x[1])

    # --- reciprocal rank fusion ---
    fused: dict[str, float] = {}
    detail: dict[str, dict] = {}
    for rank, (k, s) in enumerate(semantic, 1):
        fused[k] = fused.get(k, 0) + 1 / (RRF_K + rank)
        detail.setdefault(k, {})["semantic"] = round(s, 4)
    for rank, (k, s) in enumerate(kw, 1):
        fused[k] = fused.get(k, 0) + 1 / (RRF_K + rank)
        detail.setdefault(k, {})["keyword"] = round(s, 3)

    ranked = sorted(fused.items(), key=lambda x: -x[1])[:limit]

    out = []
    for k, score in ranked:
        item = by_code[k]
        out.append({
            "shortcode": k,
            "title": item.get("title"),
            "thumbnail": bool(item.get("thumbnail")),
            "category": item.get("category"),
            "owner": item.get("owner"),
            "url": item.get("url"),
            "saved_at": item.get("saved_at"),
            "snippet": _snippet(item, query),
            "score": round(score, 5),
            "matched": detail.get(k, {}),
        })
    return out


def _snippet(item: dict, query: str, width: int = 180) -> str:
    """Show the part of the reel that actually matched, not just the summary."""
    payload = item.get("payload") or {}
    body = (payload.get("search_summary") or payload.get("summary")
            or payload.get("description") or item.get("transcript_english")
            or item.get("caption") or "")
    body = " ".join(body.split())
    if not body:
        return ""

    terms = tokenise(query)
    low = body.lower()
    for t in terms:
        pos = low.find(t)
        if pos != -1:
            start = max(0, pos - width // 3)
            out = body[start:start + width]
            return ("…" if start else "") + out + ("…" if start + width < len(body) else "")
    return body[:width] + ("…" if len(body) > width else "")


if __name__ == "__main__":
    import argparse
    import sys

    ap = argparse.ArgumentParser(description="Search saved reels")
    ap.add_argument("query", nargs="*")
    ap.add_argument("--reindex", action="store_true")
    ap.add_argument("--category")
    ap.add_argument("--limit", type=int, default=10)
    ap.add_argument("--json", action="store_true")
    args = ap.parse_args()

    real_stdout = sys.stdout
    if args.json:
        sys.stdout = sys.stderr

    if args.reindex:
        print(json.dumps(reindex()), file=real_stdout if args.json else sys.stdout)
        raise SystemExit(0)

    q = " ".join(args.query)
    if not q:
        ap.error("give a query or --reindex")

    results = search(q, limit=args.limit, category=args.category)
    if args.json:
        print(json.dumps({"query": q, "results": results}, default=str),
              file=real_stdout)
    else:
        for r in results:
            print(f"\n  [{r['category']}] {r['title']}   ({r['score']})")
            print(f"     {r['snippet'][:150]}")
            print(f"     matched: {r['matched']}")
