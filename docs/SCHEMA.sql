-- ReelBrain — Postgres 16 schema
-- Requires: pgvector, postgis, pg_trgm
--   docker run -e POSTGRES_PASSWORD=x -p 5432:5432 postgis/postgis:16-3.4
--   (then CREATE EXTENSION vector; — or use pgvector/pgvector:pg16 + install postgis)

CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ─────────────────────────────────────────────────────────────────────────────
-- users
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE users (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email       text UNIQUE,
    handle      text,
    home_city   text,                       -- biases place resolution
    created_at  timestamptz NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- places  —  deduplicated by google_place_id; many reels → one place
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE places (
    id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    google_place_id  text UNIQUE,
    name             text NOT NULL,
    aliases          text[] NOT NULL DEFAULT '{}',   -- transliterations & variants
    formatted_address text,
    area             text,
    city             text,
    state            text,
    country          text DEFAULT 'IN',
    geog             geography(Point, 4326) NOT NULL,
    rating           numeric(2,1),
    user_ratings_total integer,
    price_level      smallint,                       -- Google 0-4
    hours            jsonb,
    photo_ref        text,
    raw              jsonb,                          -- full Places response
    created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX places_geog_idx    ON places USING gist (geog);
CREATE INDEX places_city_idx    ON places (city);
CREATE INDEX places_name_trgm   ON places USING gin (name gin_trgm_ops);
CREATE INDEX places_aliases_idx ON places USING gin (aliases);

-- ─────────────────────────────────────────────────────────────────────────────
-- reels
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TYPE reel_status AS ENUM (
    'queued', 'fetching', 'transcribing', 'extracting', 'resolving', 'ready', 'failed'
);

CREATE TYPE reel_category AS ENUM (
    'food_spot', 'job', 'recipe', 'travel', 'product', 'event', 'education',
    'entertainment', 'unknown'
);

CREATE TABLE reels (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id           uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- source
    url               text NOT NULL,
    platform          text NOT NULL DEFAULT 'instagram',  -- instagram|youtube|tiktok
    external_id       text,
    creator_handle    text,
    caption           text,
    hashtags          text[] NOT NULL DEFAULT '{}',
    ig_location_name  text,                    -- IG's own location tag, if present
    ig_location_geog  geography(Point, 4326),  -- gold when present
    posted_at         timestamptz,

    -- media (local paths or object-store keys)
    video_path        text,
    thumbnail_path    text,
    frame_paths       text[] NOT NULL DEFAULT '{}',
    duration_seconds  numeric(6,2),

    -- language
    detected_lang     text,                    -- ml, ta, te, kn, hi, en
    transcript_native text,
    transcript_en     text,
    transcript_roman  text,                    -- Manglish / Tanglish

    -- retrieval
    search_text       text,                    -- canonical English blob that gets embedded
    embedding         vector(1024),            -- voyage-3 / bge-m3
    tsv               tsvector GENERATED ALWAYS AS (
                          to_tsvector('english', coalesce(search_text, ''))
                      ) STORED,

    category          reel_category NOT NULL DEFAULT 'unknown',
    status            reel_status   NOT NULL DEFAULT 'queued',
    error             text,
    raw_payload       jsonb,                   -- untouched scrape; lets you re-run the
                                               -- pipeline after a prompt change
    created_at        timestamptz NOT NULL DEFAULT now(),
    updated_at        timestamptz NOT NULL DEFAULT now(),

    UNIQUE (user_id, url)
);

CREATE INDEX reels_user_idx     ON reels (user_id, created_at DESC);
CREATE INDEX reels_category_idx ON reels (user_id, category);
CREATE INDEX reels_status_idx   ON reels (status) WHERE status <> 'ready';
CREATE INDEX reels_tsv_idx      ON reels USING gin (tsv);
CREATE INDEX reels_roman_trgm   ON reels USING gin (transcript_roman gin_trgm_ops);
CREATE INDEX reels_embedding_idx ON reels
    USING hnsw (embedding vector_cosine_ops);

-- ─────────────────────────────────────────────────────────────────────────────
-- reel_comments  —  the location oracle
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE reel_comments (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    reel_id       uuid NOT NULL REFERENCES reels(id) ON DELETE CASCADE,
    external_id   text,
    parent_id     uuid REFERENCES reel_comments(id) ON DELETE CASCADE,
    author        text,
    is_creator    boolean NOT NULL DEFAULT false,  -- authoritative when true
    text          text NOT NULL,
    text_en       text,
    likes         integer NOT NULL DEFAULT 0,
    has_location_intent boolean NOT NULL DEFAULT false,  -- set by the prefilter
    created_at    timestamptz
);

CREATE INDEX reel_comments_reel_idx ON reel_comments (reel_id, likes DESC);
CREATE INDEX reel_comments_loc_idx  ON reel_comments (reel_id)
    WHERE has_location_intent;

-- ─────────────────────────────────────────────────────────────────────────────
-- extractions  —  vertical-specific payload lives in jsonb, NOT in columns.
-- Adding a new vertical = new schema constant + new prompt. Zero migrations.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE extractions (
    id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    reel_id        uuid NOT NULL REFERENCES reels(id) ON DELETE CASCADE,
    category       reel_category NOT NULL,
    schema_version text NOT NULL,             -- 'food_spot.v1'
    payload        jsonb NOT NULL,            -- matches the JSON schema for that vertical
    confidence     text NOT NULL,             -- high | medium | low
    model          text NOT NULL,             -- 'claude-opus-5'
    input_tokens   integer,
    output_tokens  integer,
    created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX extractions_reel_idx    ON extractions (reel_id, created_at DESC);
CREATE INDEX extractions_payload_idx ON extractions USING gin (payload jsonb_path_ops);

-- ─────────────────────────────────────────────────────────────────────────────
-- reel_places  —  resolution result + the user's confirm decision
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE reel_places (
    reel_id            uuid NOT NULL REFERENCES reels(id) ON DELETE CASCADE,
    place_id           uuid NOT NULL REFERENCES places(id) ON DELETE CASCADE,
    confidence         text NOT NULL,          -- high | medium | low
    name_similarity    real,                   -- extracted name vs Places name
    resolved_from      text,                   -- ig_tag | transcript | frame | comment | creator_reply
    evidence_quote     text,                   -- what we show the user
    confirmed_by_user  boolean,                -- NULL = not asked yet
    confirmed_at       timestamptz,
    created_at         timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (reel_id, place_id)
);

CREATE INDEX reel_places_place_idx   ON reel_places (place_id);
CREATE INDEX reel_places_pending_idx ON reel_places (reel_id)
    WHERE confirmed_by_user IS NULL AND confidence <> 'high';

-- ─────────────────────────────────────────────────────────────────────────────
-- notifications  —  proximity nudges (dedupe so we don't spam the same spot)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE proximity_alerts (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    place_id    uuid NOT NULL REFERENCES places(id) ON DELETE CASCADE,
    distance_m  integer NOT NULL,
    sent_at     timestamptz NOT NULL DEFAULT now(),
    dismissed   boolean NOT NULL DEFAULT false
);

CREATE INDEX proximity_recent_idx ON proximity_alerts (user_id, place_id, sent_at DESC);


-- ═════════════════════════════════════════════════════════════════════════════
-- Query patterns you'll actually need
-- ═════════════════════════════════════════════════════════════════════════════

-- Nearby saved food spots (the "Near Me" screen)
--   :lng, :lat = user position, :radius_m = 2000
--
-- SELECT p.id, p.name, p.area, p.rating,
--        ST_Distance(p.geog, ST_MakePoint(:lng, :lat)::geography) AS distance_m,
--        count(rp.reel_id) AS reel_count
-- FROM places p
-- JOIN reel_places rp ON rp.place_id = p.id
-- JOIN reels r        ON r.id = rp.reel_id AND r.user_id = :user_id
-- WHERE ST_DWithin(p.geog, ST_MakePoint(:lng, :lat)::geography, :radius_m)
--   AND rp.confirmed_by_user IS NOT FALSE
-- GROUP BY p.id
-- ORDER BY distance_m;

-- Hybrid search with Reciprocal Rank Fusion (k = 60)
--
-- WITH semantic AS (
--   SELECT id, row_number() OVER (ORDER BY embedding <=> :qvec) AS rank
--   FROM reels WHERE user_id = :user_id AND embedding IS NOT NULL LIMIT 50
-- ), keyword AS (
--   SELECT id, row_number() OVER (
--            ORDER BY ts_rank(tsv, websearch_to_tsquery('english', :q)) DESC) AS rank
--   FROM reels WHERE user_id = :user_id
--     AND tsv @@ websearch_to_tsquery('english', :q) LIMIT 50
-- ), fuzzy AS (
--   SELECT id, row_number() OVER (
--            ORDER BY similarity(transcript_roman, :q) DESC) AS rank
--   FROM reels WHERE user_id = :user_id
--     AND transcript_roman % :q LIMIT 50
-- )
-- SELECT id, sum(1.0 / (60 + rank)) AS score
-- FROM (SELECT * FROM semantic UNION ALL
--       SELECT * FROM keyword  UNION ALL
--       SELECT * FROM fuzzy) arms
-- GROUP BY id ORDER BY score DESC LIMIT 20;
