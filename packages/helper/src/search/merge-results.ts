import type { SearchResult } from '../contracts/search.js'

function magnet(result: SearchResult): string {
  return (
    result.magnet || `magnet:?xt=urn:btih:${result.infoHash}&dn=${encodeURIComponent(result.name)}`
  )
}

export function mergeResults(results: SearchResult[]): SearchResult[] {
  const merged = new Map<string, SearchResult>()
  for (const result of results) {
    const existing = merged.get(result.infoHash)
    if (!existing) {
      merged.set(result.infoHash, { ...result })
      continue
    }
    existing.sources = [...new Set([...(existing.sources || []), ...(result.sources || [])])]
    for (const key of ['seeders', 'leechers', 'size', 'files'] as const) {
      if (result[key] !== null) existing[key] = Math.max(existing[key] ?? 0, result[key])
    }
    existing.imdb ||= result.imdb
    existing.username ||= result.username
    const base = magnet(existing),
      params = new URL(base).searchParams
    const extra: string[] = []
    for (const [key, value] of new URL(magnet(result)).searchParams) {
      if (['tr', 'ws', 'as', 'xs', 'x.pe'].includes(key) && !params.getAll(key).includes(value)) {
        params.append(key, value)
        extra.push(`${key}=${encodeURIComponent(value)}`)
      }
    }
    existing.magnet = base + (extra.length ? `&${extra.join('&')}` : '')
  }
  return [...merged.values()].sort(
    (a, b) => (b.seeders ?? -1) - (a.seeders ?? -1) || a.infoHash.localeCompare(b.infoHash),
  )
}
