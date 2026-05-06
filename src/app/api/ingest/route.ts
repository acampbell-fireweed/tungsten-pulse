import { NextResponse } from 'next/server'
import Parser from 'rss-parser'
import { supabaseServer } from '@/lib/supabase'
import { STATIC_SOURCES, SourceConfig } from '@/lib/sources'
import { hashUrl, buildDedupHash } from '@/lib/dedup'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DbEntity {
  id: string
  name: string
  website_url: string | null
  news_url: string | null
  news_url_type: 'html' | 'rss' | 'none' | null
  materiality_triggers: string | null
  materiality_tier_default: number
}

interface RawItem {
  title: string
  url: string
  published_at: Date
  body_text: string | null
  source_name: string
  source_tier: '1_primary' | '2_wire' | '3_trade' | '4_secondary'
  entity_name_for_lookup: string | null
}

interface NewsApiArticle {
  title: string
  url: string
  publishedAt: string
  content?: string | null
  description?: string | null
}

// ---------------------------------------------------------------------------
// Dynamic source builders
// ---------------------------------------------------------------------------

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

function buildEntitySources(entities: DbEntity[]): SourceConfig[] {
  const sources: SourceConfig[] = []

  for (const entity of entities) {
    if (!entity.news_url || entity.news_url_type === 'none') continue
    sources.push({
      id: `${slugify(entity.name)}-primary`,
      name: `${entity.name} primary news`,
      type: entity.news_url_type === 'rss' ? 'rss' : 'html',
      url: entity.news_url,
      entity_name_for_lookup: entity.name,
      source_tier: '1_primary',
      entity_context: {
        ticker: null,
        primary_project: null,
        materiality_triggers: entity.materiality_triggers,
      },
    })
  }

  // NewsAPI queries for top 10 by materiality tier (already sorted desc from DB query)
  const top10 = entities.slice(0, 10)
  for (const entity of top10) {
    sources.push({
      id: `newsapi-${slugify(entity.name)}`,
      name: `NewsAPI: ${entity.name}`,
      type: 'newsapi',
      query: entity.name,
      entity_name_for_lookup: entity.name,
      source_tier: '4_secondary',
    })
  }

  return sources
}

// ---------------------------------------------------------------------------
// Fetchers
// ---------------------------------------------------------------------------

type RssItem = {
  title?: string
  link?: string
  pubDate?: string
  contentSnippet?: string
  content?: string
}

async function fetchRssItems(source: SourceConfig): Promise<RawItem[]> {
  const parser = new Parser({ timeout: 10_000 })
  const feed = await parser.parseURL(source.url!)
  return (feed.items as RssItem[])
    .filter(item => item.link && item.title)
    .map(item => ({
      title: item.title!,
      url: item.link!,
      published_at: item.pubDate ? new Date(item.pubDate) : new Date(),
      body_text: item.contentSnippet ?? item.content ?? null,
      source_name: source.name,
      source_tier: source.source_tier,
      entity_name_for_lookup: source.entity_name_for_lookup ?? null,
    }))
}

async function fetchHtmlItems(source: SourceConfig): Promise<RawItem[]> {
  if (!source.url) return []

  // 1. Fetch the HTML
  let html: string
  try {
    const res = await fetch(source.url, {
      signal: AbortSignal.timeout(15_000),
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; TungstenPulseBot/0.1)' },
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    html = await res.text()
  } catch (err) {
    throw new Error(`Fetch failed: ${err instanceof Error ? err.message : String(err)}`)
  }

  // 2. Trim HTML to keep token cost down
  const MAX_HTML = 50_000
  const trimmed = html.length > MAX_HTML ? html.slice(0, MAX_HTML) : html

  // 3. Send to Claude for structured extraction
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set')

  const ctx = source.entity_context
  const triggerLine = ctx?.materiality_triggers
    ? `Known materiality triggers for this entity: ${ctx.materiality_triggers}`
    : ''
  const tickerLine = ctx?.ticker ? `Ticker: ${ctx.ticker}` : ''
  const projectLine = ctx?.primary_project ? `Primary project: ${ctx.primary_project}` : ''

  const prompt = `You are extracting recent news items from a tungsten mining company's investor relations / news page.

ENTITY: ${source.entity_name_for_lookup}
${tickerLine}
${projectLine}
${triggerLine}

The HTML below is the company's news/announcements page. Extract each distinct news item that appears to have been published in the last 90 days (or all visible items if dates are unclear).

For each item, return a JSON object with:
- title: string — the headline as written
- url: string — full URL to the original announcement (resolve relative URLs against the source page)
- published_at: ISO 8601 datetime if available, else null
- summary: string — 2-3 sentence factual summary in your own words
- body_text: string or null — full article body if visible inline; null if you only see a headline link

Return ONLY a JSON array. If the page contains nothing extractable, return [].
No prose, no markdown, no preamble — just the JSON array.

SOURCE URL: ${source.url}

HTML:
${trimmed}`

  const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-5',
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    }),
    signal: AbortSignal.timeout(60_000),
  })

  if (!claudeRes.ok) {
    const errText = await claudeRes.text()
    throw new Error(`Claude API ${claudeRes.status}: ${errText.slice(0, 200)}`)
  }

  const claudeJson = await claudeRes.json() as { content: { type: string; text?: string }[] }
  const text = claudeJson.content?.[0]?.text ?? ''

  // 4. Parse the JSON array out of Claude's response
  let items: Array<{ title: string; url: string; published_at: string | null; summary: string; body_text: string | null }>
  try {
    const cleaned = text.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim()
    items = JSON.parse(cleaned)
    if (!Array.isArray(items)) throw new Error('not an array')
  } catch {
    throw new Error(`Could not parse Claude JSON: ${text.slice(0, 200)}`)
  }

  // 5. Map to RawItem shape
  return items
    .filter(it => it.title && it.url)
    .map(it => ({
      title: it.title,
      url: it.url,
      published_at: it.published_at ? new Date(it.published_at) : new Date(),
      body_text: it.body_text ?? it.summary ?? null,
      source_name: source.name,
      source_tier: source.source_tier,
      entity_name_for_lookup: source.entity_name_for_lookup ?? null,
    }))
}
async function fetchNewsApiItems(source: SourceConfig): Promise<RawItem[]> {
  const apiKey = process.env.NEWS_API_KEY
  if (!apiKey) throw new Error('NEWS_API_KEY is not set')
  const params = new URLSearchParams({
    q: source.query!,
    apiKey,
    pageSize: '20',
    sortBy: 'publishedAt',
    language: 'en',
  })
  const res = await fetch(`https://newsapi.org/v2/everything?${params}`)
  if (!res.ok) throw new Error(`NewsAPI responded ${res.status}: ${await res.text()}`)
  const json = (await res.json()) as { articles?: NewsApiArticle[] }
  return (json.articles ?? [])
    .filter(a => a.url && a.title)
    .map(a => ({
      title: a.title,
      url: a.url,
      published_at: new Date(a.publishedAt),
      body_text: a.content ?? a.description ?? null,
      source_name: source.name,
      source_tier: source.source_tier,
      entity_name_for_lookup: source.entity_name_for_lookup ?? null,
    }))
}

// ---------------------------------------------------------------------------
// Entity-name matching (simple substring; replaced by Claude in Session 3)
// ---------------------------------------------------------------------------

function findMatchingEntityName(title: string, entities: DbEntity[]): string | null {
  const lower = title.toLowerCase()
  for (const entity of entities) {
    if (lower.includes(entity.name.toLowerCase())) return entity.name
  }
  return null
}

// ---------------------------------------------------------------------------
// Route handlers
// ---------------------------------------------------------------------------

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const entityFilter = searchParams.get('entity')
  return runIngest(entityFilter)
}

export async function POST(req: Request) {
  const { searchParams } = new URL(req.url)
  const entityFilter = searchParams.get('entity')
  return runIngest(entityFilter)
}

async function runIngest(entityFilter?: string | null) {
  const errors: string[] = []
  let total_fetched = 0
  let new_inserted = 0
  let duplicates_skipped = 0

  // Fetch all entities — this also validates that the server client can bypass RLS.
  let entities: DbEntity[] = []
  try {
    const { data, error } = await supabaseServer
      .from('entities')
      .select('id, name, website_url, news_url, news_url_type, materiality_triggers, materiality_tier_default')
      .order('materiality_tier_default', { ascending: false })
    if (error) throw new Error(error.message)
    entities = data ?? []
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: `Failed to fetch entities: ${err instanceof Error ? err.message : String(err)}`,
      },
      { status: 500 },
    )
  }

  let allSources: SourceConfig[] = [...STATIC_SOURCES, ...buildEntitySources(entities)]

  let newsapi_sources_skipped = 0
  if (process.env.VERCEL === '1') {
    const before = allSources.length
    allSources = allSources.filter(s => s.type !== 'newsapi')
    newsapi_sources_skipped = before - allSources.length
    console.log(`[ingest] Vercel env detected — skipped ${newsapi_sources_skipped} NewsAPI source(s)`)
  }

  for (const source of allSources) {
    let items: RawItem[] = []
    try {
      items =
        source.type === 'rss'
          ? await fetchRssItems(source)
          : source.type === 'html'
            ? await fetchHtmlItems(source)
            : await fetchNewsApiItems(source)
    } catch (err) {
      errors.push(`[${source.id}] fetch failed: ${err instanceof Error ? err.message : String(err)}`)
      continue
    }

    total_fetched += items.length

    for (const item of items) {
      if (!item.url || !item.title) continue

      const url_hash = hashUrl(item.url)
      const matchedEntity =
        item.entity_name_for_lookup ?? findMatchingEntityName(item.title, entities)
      const dedup_hash = buildDedupHash(item.title, item.published_at, matchedEntity)

      try {
        const { data: existing, error: lookupError } = await supabaseServer
          .from('news_items')
          .select('id')
          .eq('url_hash', url_hash)
          .maybeSingle()

        if (lookupError) {
          errors.push(`[${source.id}] url_hash lookup failed: ${lookupError.message}`)
          continue
        }

        if (existing) {
          duplicates_skipped++
          continue
        }

        const { error: insertError } = await supabaseServer.from('news_items').insert({
          published_at: item.published_at.toISOString(),
          source: item.source_name,
          source_tier: item.source_tier,
          title: item.title,
          url: item.url,
          url_hash,
          dedup_hash,
          body_text: item.body_text,
          entity_ids: [],
          archived: false,
        })

        if (insertError) {
          // 23505 = unique_violation: a parallel run inserted the same URL first
          if (insertError.code === '23505') {
            duplicates_skipped++
          } else {
            errors.push(
              `[${source.id}] insert failed for "${item.title.slice(0, 60)}": ${insertError.message}`,
            )
          }
        } else {
          new_inserted++
        }
      } catch (err) {
        errors.push(
          `[${source.id}] DB error: ${err instanceof Error ? err.message : String(err)}`,
        )
      }
    }
  }

  return NextResponse.json({
    ok: true,
    summary: {
      total_fetched,
      new_inserted,
      duplicates_skipped,
      newsapi_sources_skipped,
      errors_count: errors.length,
      errors,
    },
    sources_processed: allSources.length,
  })
}
