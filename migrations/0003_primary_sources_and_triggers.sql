-- ============================================================
-- Migration 0003: per-entity news URLs, materiality triggers,
-- structured payload, role routing, classification rationale
-- ============================================================

-- ENTITIES additions
ALTER TABLE entities
  ADD COLUMN IF NOT EXISTS news_url text,
  ADD COLUMN IF NOT EXISTS news_url_type text DEFAULT 'html'
    CHECK (news_url_type IN ('html', 'rss', 'none')),
  ADD COLUMN IF NOT EXISTS materiality_triggers text,
  ADD COLUMN IF NOT EXISTS tier_is_ceiling boolean NOT NULL DEFAULT false;

-- NEWS_ITEMS additions
ALTER TABLE news_items
  ADD COLUMN IF NOT EXISTS structured_payload jsonb,
  ADD COLUMN IF NOT EXISTS classification_rationale text,
  ADD COLUMN IF NOT EXISTS roles_to_notify text[] NOT NULL DEFAULT '{}';

-- ============================================================
-- BACKFILL: news_url and materiality_triggers per entity
-- ============================================================

UPDATE entities SET
  news_url = 'https://press.almonty.com/live-market-announcements/',
  materiality_triggers = 'Sandong ramp-up, offtakes & commercial agreements, North American developments, production levels'
WHERE name = 'Almonty Industries';

UPDATE entities SET
  news_url = 'https://masanhightechmaterials.com/investor_category/corporate-announcement/',
  materiality_triggers = 'Potential sales process, decrease in production, expansion projects, flow of material, offtake & commercial agreements'
WHERE name = 'Masan High-tech Materials';

UPDATE entities SET
  news_url = 'https://www.wolfram.at/en/news-media/news/',
  materiality_triggers = 'Potential strategic European asset designation, offtake & commercial agreements, production levels'
WHERE name = 'Wolfram Bergbau und Hütten AG';

UPDATE entities SET
  news_url = 'https://www.eqresources.com.au/site/invest-in-us/asx-announcements',
  materiality_triggers = 'Mount Carbide expansion, EXIM bank involvement and LOI, offtake & commercial agreements'
WHERE name = 'EQ Resources Limited';

UPDATE entities SET
  news_url = 'https://trinity-metals.com/en/investor/latest-news',
  materiality_triggers = 'Financings from external government entities (eg. EXIM), offtake & commercial agreements, production levels, strategic investments'
WHERE name = 'Trinity Metals';

UPDATE entities SET
  news_url = 'https://trinity-metals.com/en/investor/latest-news',
  materiality_triggers = 'Financings from external government entities (eg. EXIM), offtake & commercial agreements, production levels, strategic investments'
WHERE name = 'LuNA Smelter';

UPDATE entities SET
  news_url = NULL,
  materiality_triggers = NULL
WHERE name = 'Uzbekistan State (Ingichka)';

UPDATE entities SET
  news_url = NULL,
  materiality_triggers = 'Important because of its scale and affiliation with China. Relevant: any operational issues, production levels, exports to China (main tungsten import in China)'
WHERE name = 'Jiaxin International Resources Investment Limited';

UPDATE entities SET
  news_url = 'https://www.tungstenwest.com/regulatory-news',
  materiality_triggers = 'Securing of restart financing, recovery levels, timeline to first production, EU strategic involvement, commercial & offtake agreements'
WHERE name = 'Tungsten West PLC';

UPDATE entities SET
  news_url = 'https://fireweedmetals.com/news/',
  materiality_triggers = 'Government funding, strategic investments, updated Feasibility Study results, supporting government polic