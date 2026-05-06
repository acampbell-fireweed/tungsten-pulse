export type SourceTier = '1_primary' | '2_wire' | '3_trade' | '4_secondary'

export interface SourceConfig {
  id: string
  name: string
  type: 'rss' | 'html' | 'newsapi'
  url?: string
  query?: string
  entity_name_for_lookup?: string
  source_tier: SourceTier
  entity_context?: {
    ticker: string | null
    primary_project: string | null
    materiality_triggers: string | null
  }
}

// Static non-entity sources only.
// Entity press-page sources and entity-level NewsAPI queries are built
// dynamically from the entities table at ingest time (see ingest/route.ts).
export const STATIC_SOURCES: SourceConfig[] = [
  // Government / regulatory (RSS — many will return HTML today; failures are logged, not thrown)
  {
    id: 'usgs-minerals',
    name: 'USGS Mineral Resources',
    type: 'rss',
    url: 'https://www.usgs.gov/programs/mineral-resources-program',
    source_tier: '1_primary',
  },
  {
    id: 'eu-dg-grow',
    name: 'EU Commission DG GROW',
    type: 'rss',
    url: 'https://single-market-economy.ec.europa.eu/news_en',
    source_tier: '1_primary',
  },
  {
    id: 'usdod-news',
    name: 'US DoD News',
    type: 'rss',
    url: 'https://www.defense.gov/News/',
    source_tier: '1_primary',
  },
  {
    id: 'doe-mesc',
    name: 'DoE MESC',
    type: 'rss',
    url: 'https://www.energy.gov/mesc/articles',
    source_tier: '1_primary',
  },
  {
    id: 'exim-press',
    name: 'EXIM Bank Press Releases',
    type: 'rss',
    url: 'https://www.exim.gov/news/press-releases',
    source_tier: '1_primary',
  },
  {
    id: 'nrcan-news',
    name: 'Natural Resources Canada',
    type: 'rss',
    url: 'https://www.canada.ca/en/natural-resources-canada/news.html',
    source_tier: '1_primary',
  },
  {
    id: 'bc-mpo',
    name: 'BC Major Projects Office',
    type: 'rss',
    url: 'https://www2.gov.bc.ca/gov/content/industry/major-projects-office',
    source_tier: '1_primary',
  },
  {
    id: 'yukon-gov',
    name: 'Yukon Government News',
    type: 'rss',
    url: 'https://yukon.ca/en/news',
    source_tier: '1_primary',
  },
  {
    id: 'meti-japan',
    name: 'METI Japan',
    type: 'rss',
    url: 'https://www.meti.go.jp/english/press/index.html',
    source_tier: '1_primary',
  },
  {
    id: 'mofcom-china',
    name: 'MOFCOM China',
    type: 'rss',
    url: 'http://english.mofcom.gov.cn/article/policyrelease/',
    source_tier: '1_primary',
  },

  // Topic-level NewsAPI queries
  {
    id: 'newsapi-tungsten-apt',
    name: 'NewsAPI: tungsten APT price',
    type: 'newsapi',
    query: 'tungsten APT price',
    source_tier: '4_secondary',
  },
  {
    id: 'newsapi-tungsten-dpa',
    name: 'NewsAPI: tungsten DPA Title III',
    type: 'newsapi',
    query: 'tungsten DPA Title III',
    source_tier: '4_secondary',
  },
  {
    id: 'newsapi-tungsten-exim',
    name: 'NewsAPI: tungsten EXIM',
    type: 'newsapi',
    query: 'tungsten EXIM',
    source_tier: '4_secondary',
  },
]
