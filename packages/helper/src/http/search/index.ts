import { SEARCH_PROVIDERS, type SearchResult } from './model.js'
import { searchPirateBayMany } from './providers/piratebay.js'
import { searchTorrentsCsv } from './providers/torrents-csv.js'
import { searchKnaben } from './providers/knaben.js'
import { searchYts } from './providers/yts.js'
import type { SourceResult } from './normalize.js'

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

export async function searchProviders(
  query: string,
  providerId = 'piratebay',
  signal?: AbortSignal,
) {
  const q = query.trim()
  if (!q || q.length > 200) throw new Error('Enter a search term between 1 and 200 characters.')
  const provider = SEARCH_PROVIDERS.find((item) => item.id === providerId)
  if (!provider) throw new Error('Select a valid search provider.')
  const providers =
    provider.id === 'all' ? SEARCH_PROVIDERS.filter((item) => item.id !== 'all') : [provider]
  const completed = await Promise.allSettled(
    providers.map(async (item): Promise<SourceResult> => {
      const combined = AbortSignal.any([AbortSignal.timeout(20000), ...(signal ? [signal] : [])])
      const limit = 500
      if (item.id === 'piratebay') {
        const found = await searchPirateBayMany(q, signal, limit)
        return {
          ...found,
          results: found.results.map((result) => ({ ...result, sources: ['Pirate Bay'] })),
        }
      }
      const search = { 'torrents-csv': searchTorrentsCsv, knaben: searchKnaben, yts: searchYts }[
        item.id
      ]
      return search(q, combined, limit)
    }),
  )
  signal?.throwIfAborted()
  const collected: SearchResult[] = [],
    warnings: string[] = []
  let limited = false,
    succeeded = 0
  completed.forEach((item, index) => {
    if (item.status === 'fulfilled') {
      succeeded++
      collected.push(...item.value.results)
      limited ||= Boolean(item.value.limited)
      if (item.value.partial)
        warnings.push(`${providers[index].name}: some results could not be loaded.`)
    } else warnings.push(`${providers[index].name} is unavailable. Try again later.`)
  })
  if (!succeeded) throw new Error(warnings.join(' '))
  const merged = mergeResults(collected)
  return {
    results: merged.slice(0, 500),
    limited: limited || merged.length > 500,
    partial: warnings.length > 0,
    warnings,
  }
}
