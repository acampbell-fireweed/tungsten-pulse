const PRIMARY_HOSTNAMES = new Set([
  'prnewswire.com',
  'cision.com',
  'globenewswire.com',
  'businesswire.com',
  'newsfilecorp.com',
  'sedarplus.ca',
  'sec.gov',
  'defense.gov',
  'energy.gov',
  'exim.gov',
  'canada.ca',
  'ec.europa.eu',
  'gov.bc.ca',
  'yukon.ca',
  'meti.go.jp',
  'mofcom.gov.cn',
])

const WIRE_HOSTNAMES = new Set([
  'reuters.com',
  'bloomberg.com',
  'wsj.com',
  'ft.com',
  'ap.org',
  'dowjones.com',
])

const TRADE_HOSTNAMES = new Set([
  'miningweekly.com',
  'mining-journal.com',
  'argusmedia.com',
  'spglobal.com',
  'fastmarkets.com',
  'kitco.com',
])

function extractHostname(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return null
  }
}

export function buildEntityDomainSet(websiteUrls: (string | null)[]): Set<string> {
  const domains = new Set<string>()
  for (const url of websiteUrls) {
    if (!url) continue
    const hostname = extractHostname(url)
    if (hostname) domains.add(hostname)
  }
  return domains
}

export function classifySourceTier(
  url: string,
  entityDomains: Set<string> = new Set(),
): '1_primary' | '2_wire' | '3_trade' | '4_secondary' {
  const hostname = extractHostname(url)
  if (!hostname) return '4_secondary'
  if (PRIMARY_HOSTNAMES.has(hostname) || entityDomains.has(hostname)) return '1_primary'
  if (WIRE_HOSTNAMES.has(hostname)) return '2_wire'
  if (TRADE_HOSTNAMES.has(hostname)) return '3_trade'
  return '4_secondary'
}
