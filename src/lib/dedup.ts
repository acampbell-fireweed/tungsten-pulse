import { createHash } from 'crypto'

export function hashUrl(url: string): string {
  let normalized: string
  try {
    const u = new URL(url.toLowerCase())
    // Keep hostname + path only; strip query params and fragment
    normalized = u.hostname + u.pathname.replace(/\/+$/, '')
  } catch {
    normalized = url.toLowerCase().replace(/\/+$/, '')
  }
  return createHash('sha256').update(normalized).digest('hex')
}

export function buildDedupHash(
  title: string,
  publishedAt: Date,
  primaryEntityName: string | null,
): string {
  const normalizedTitle = title
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  const dateStr = publishedAt.toISOString().slice(0, 10)
  const entityPart = primaryEntityName?.toLowerCase() ?? ''
  return createHash('sha256')
    .update(`${normalizedTitle}|${dateStr}|${entityPart}`)
    .digest('hex')
}
