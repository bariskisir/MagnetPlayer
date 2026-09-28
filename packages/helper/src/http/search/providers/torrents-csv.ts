import type { SearchResult } from '../model.js'
import { json, normalize, row, text, url } from '../normalize.js'
import type { SourceResult } from '../normalize.js'

export async function searchTorrentsCsv(
  query: string,
  signal: AbortSignal,
  limit: number,
): Promise<SourceResult> {
  const results: SearchResult[] = []
  const seen = new Set<string>()
  let after = '',
    hasMore = false,
    partial = false
  try {
    for (let page = 0; page < 20 && results.length < limit; page++) {
      const data = await json(
        url('https://torrents-csv.com/service/search', {
          q: query,
          size: Math.min(100, limit),
          ...(after ? { after } : {}),
        }),
        signal,
      )
      const torrents = Array.isArray(data.torrents) ? data.torrents : []
      if (!Array.isArray(data.torrents)) throw new Error('Invalid Torrents-csv response')
      const found = await normalize(
        'Torrents-csv',
        torrents.map((item) => {
          const value = row(item)
          return {
            id: value.id,
            name: value.name,
            infoHash: value.infohash,
            seeders: value.seeders,
            leechers: value.leechers,
            size: value.size_bytes,
            added: value.created_unix,
          }
        }),
      )
      for (const item of found)
        if (!seen.has(item.infoHash)) {
          seen.add(item.infoHash)
          results.push(item)
        }
      const next = text(data.next)
      hasMore = Boolean(torrents.length && next && next !== after)
      if (!hasMore || !found.length) break
      after = next
    }
  } catch (error) {
    if (!results.length) throw error
    partial = true
  }
  return { results: results.slice(0, limit), limited: hasMore, partial }
}
