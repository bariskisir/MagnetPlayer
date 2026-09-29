import { SEARCH_PROVIDERS, type SearchResult } from '../contracts/search.js'
import { searchPirateBay } from './providers/pirate-bay.js'
import { searchTorrentsCsv } from './providers/torrents-csv.js'
import { searchYts } from './providers/yts.js'
import type { SourceResult, SearchResponse } from '../contracts/search.js'
import { mergeResults } from './merge-results.js'

export async function searchProviders(
  query: string,
  providerId = 'piratebay',
  signal?: AbortSignal,
): Promise<SearchResponse> {
  const q = query.trim()
  if (!q || q.length > 200) throw new Error('Enter a search term between 1 and 200 characters.')
  const provider = SEARCH_PROVIDERS.find((item) => item.id === providerId)
  if (!provider) throw new Error('Select a valid search provider.')
  const providers =
    provider.id === 'all' ? SEARCH_PROVIDERS.filter((item) => item.id !== 'all') : [provider]
  const completed = await Promise.allSettled(
    providers.map(async (item): Promise<SourceResult> => {
      const combined = AbortSignal.any([AbortSignal.timeout(20000), ...(signal ? [signal] : [])])
      if (item.id === 'piratebay') {
        const found = await searchPirateBay(q, combined)
        return {
          results: found.map((result) => ({ ...result, sources: ['Pirate Bay'] })),
          limited: found.length >= 100,
        }
      }
      const search = { 'torrents-csv': searchTorrentsCsv, yts: searchYts }[item.id]
      return search(q, combined)
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
    results: merged,
    limited,
    partial: warnings.length > 0,
    warnings,
  }
}
