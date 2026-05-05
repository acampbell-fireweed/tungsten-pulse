CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- TABLE 1: entities
CREATE TABLE entities (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    name                    TEXT NOT NULL,
    ticker                  TEXT,
    stage                   TEXT NOT NULL CHECK (stage IN ('producer', 'developer', 'explorer')),
    country                 TEXT,
    primary_project         TEXT,
    is_fireweed_peer        BOOLEAN NOT NULL DEFAULT true,
    materiality_tier_default INTEGER NOT NULL DEFAULT 4,
    notes                   TEXT,
    website_url             TEXT,
    news_search_keywords    TEXT[] NOT NULL DEFAULT '{}',
    last_news_at            TIMESTAMPTZ
);

ALTER TABLE entities ENABLE ROW LEVEL SECURITY;

-- TABLE 2: news_items
CREATE TABLE news_items (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    published_at    TIMESTAMPTZ NOT NULL,
    source          TEXT NOT NULL,
    source_feed_id  TEXT,
    source_tier     TEXT NOT NULL CHECK (source_tier IN ('1_primary', '2_wire', '3_trade', '4_secondary')),
    title           TEXT NOT NULL,
    url             TEXT NOT NULL,
    url_hash        TEXT NOT NULL,
    dedup_hash      TEXT NOT NULL,
    canonical_id    UUID REFERENCES news_items (id) ON DELETE SET NULL,
    summary         TEXT,
    body_text       TEXT,
    tier            INTEGER CHECK (tier BETWEEN 1 AND 5),
    category        TEXT CHECK (category IN ('corporate', 'government', 'prices', 'china', 'midstream') OR category IS NULL),
    entity_ids      UUID[] NOT NULL DEFAULT '{}',
    pushed_at       TIMESTAMPTZ,
    archived        BOOLEAN NOT NULL DEFAULT false
);

CREATE UNIQUE INDEX news_items_url_idx       ON news_items (url);
CREATE INDEX        news_items_url_hash_idx  ON news_items (url_hash);
CREATE INDEX        news_items_dedup_hash_idx ON news_items (dedup_hash);
CREATE INDEX        news_items_published_at_idx ON news_items (published_at DESC);
CREATE INDEX        news_items_canonical_id_idx ON news_items (canonical_id);

ALTER TABLE news_items ENABLE ROW LEVEL SECURITY;

-- TABLE 3: profiles
CREATE TABLE profiles (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    auth_user_id        UUID REFERENCES auth.users (id) ON DELETE CASCADE,
    email               TEXT NOT NULL UNIQUE,
    display_name        TEXT NOT NULL,
    role                TEXT NOT NULL CHECK (role IN ('vp_corp_dev', 'vp_exploration', 'vp_evaluations', 'vp_external_affairs', 'ceo')),
    notify_push         BOOLEAN NOT NULL DEFAULT true,
    notify_digest       BOOLEAN NOT NULL DEFAULT true,
    digest_time_local   TIME NOT NULL DEFAULT '06:00',
    timezone            TEXT NOT NULL DEFAULT 'America/Vancouver',
    is_active           BOOLEAN NOT NULL DEFAULT false
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
