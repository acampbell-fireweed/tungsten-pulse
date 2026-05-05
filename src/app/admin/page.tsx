import { supabaseServer } from '@/lib/supabase'

interface NewsItem {
  id: string
  published_at: string
  source: string
  source_tier: string
  title: string
  url: string
  entity_ids: string[]
}

export default async function AdminPage() {
  const { data: newsItems, error: newsError } = await supabaseServer
    .from('news_items')
    .select('id, published_at, source, source_tier, title, url, entity_ids')
    .order('published_at', { ascending: false })
    .limit(100)

  if (newsError) {
    return (
      <main className="bg-[#0c0d10] text-[#ebe6dc] min-h-screen p-8 font-mono text-sm">
        <p className="text-red-400">Error loading news items: {newsError.message}</p>
      </main>
    )
  }

  const items: NewsItem[] = newsItems ?? []

  // Collect all unique entity IDs across results
  const allEntityIds = Array.from(new Set(items.flatMap(item => item.entity_ids ?? [])))

  const entityMap: Record<string, string> = {}
  if (allEntityIds.length > 0) {
    const { data: entities } = await supabaseServer
      .from('entities')
      .select('id, name')
      .in('id', allEntityIds)
    for (const entity of entities ?? []) {
      entityMap[entity.id] = entity.name
    }
  }

  return (
    <main className="bg-[#0c0d10] text-[#ebe6dc] min-h-screen p-8">
      <header className="mb-8">
        <h1 className="font-serif text-4xl font-light tracking-tight">Tungsten Pulse — Admin</h1>
        <p className="font-mono text-xs tracking-widest opacity-60 mt-2">Last 100 ingested items</p>
      </header>

      <div className="overflow-x-auto">
        <table className="w-full font-mono text-xs border-collapse">
          <thead>
            <tr className="border-b border-[#ebe6dc]/20 text-left">
              <th className="py-2 pr-4 font-normal tracking-widest uppercase opacity-50">Published</th>
              <th className="py-2 pr-4 font-normal tracking-widest uppercase opacity-50">Source</th>
              <th className="py-2 pr-4 font-normal tracking-widest uppercase opacity-50">Tier</th>
              <th className="py-2 pr-4 font-normal tracking-widest uppercase opacity-50">Entities</th>
              <th className="py-2 font-normal tracking-widest uppercase opacity-50">Title</th>
            </tr>
          </thead>
          <tbody>
            {items.map(item => {
              const entityNames = (item.entity_ids ?? [])
                .map(id => entityMap[id])
                .filter(Boolean)
                .join(', ')
              const published = new Date(item.published_at)
                .toISOString()
                .slice(0, 16)
                .replace('T', ' ')
              return (
                <tr key={item.id} className="border-b border-[#ebe6dc]/10 hover:bg-[#ebe6dc]/5">
                  <td className="py-2 pr-4 opacity-60 whitespace-nowrap">{published}</td>
                  <td className="py-2 pr-4 opacity-80 max-w-[140px] truncate">{item.source}</td>
                  <td className="py-2 pr-4 opacity-60 whitespace-nowrap">{item.source_tier}</td>
                  <td className="py-2 pr-4 opacity-80 max-w-[160px] truncate">{entityNames || '—'}</td>
                  <td className="py-2">
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="opacity-80 hover:opacity-100 underline underline-offset-2 decoration-[#ebe6dc]/30 hover:decoration-[#ebe6dc]/60"
                    >
                      {item.title}
                    </a>
                  </td>
                </tr>
              )
            })}
            {items.length === 0 && (
              <tr>
                <td colSpan={5} className="py-8 text-center opacity-40">
                  No items ingested yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <footer className="mt-12 text-xs opacity-30 font-mono">
        {items.length} items shown · unauthenticated · access control in session 5
      </footer>
    </main>
  )
}
