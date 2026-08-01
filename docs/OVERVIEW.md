# ReelBrain

> An AI-powered reel organizer that turns saved short-form videos into searchable
> knowledge, recommendations, reminders, and location-based actions.

**Hackathon scope: the Food Spot vertical.** Save a food reel → we watch it, listen to
it, read the caption and comments, work out *which restaurant it is and where* → it
lands on your map. When you're nearby, you get a nudge.

---

## Why this is hard (and therefore worth building)

Nobody has solved **place resolution from a reel**. The restaurant name is usually:

- burned into the video as on-screen text, not spoken
- spoken in Malayalam/Tamil/Telugu/Kannada/Hindi, not English
- mentioned nowhere at all — and lives *only* in the comments, where 200 people asked
  "evide aanu location?" and the creator replied once with an address

Every one of those is a different extraction problem. Solving all of them together is
the product.

## Docs

| Doc | What's in it |
|---|---|
| [docs/PLAN.md](docs/PLAN.md) | Full architecture, pipeline design, language strategy, risks |
| [docs/48H.md](docs/48H.md) | Hour-by-hour hackathon execution plan + demo script |
| [docs/SCHEMA.sql](docs/SCHEMA.sql) | Postgres schema (pgvector + PostGIS) |

## Stack

```
web/     Next.js 15 · TypeScript · Tailwind · shadcn/ui   (mobile-first PWA)
api/     FastAPI · Python 3.11                            (ingest + AI pipeline)
worker/  Celery + Redis                                   (async reel processing)
db/      Postgres 16 · pgvector · PostGIS · pg_trgm
```

**AI:** Sarvam AI (Indic ASR + translation) → Claude Opus 5 (multimodal extraction)
→ Voyage (embeddings) → Google Places (geocoding).

## Status

Planning. Nothing built yet.
