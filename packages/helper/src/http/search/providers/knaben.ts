import type { SearchResult } from '../model.js'
import { json, normalize, row } from '../normalize.js'
import type { SourceResult } from '../normalize.js'

export async function searchKnaben(
  query: string,
  signal: AbortSignal,
  limit: number,
): Promise<SourceResult> {
  const results: SearchResult[] = []
  let total = 0,
    partial = false
  try {
    // Small first batch keeps useful results when a larger subsequent request stalls.
    for (let from = 0; from < limit;) {
      const size = Math.min(from === 0 ? 10 : 50, limit - from)
      const data = await json('https://api.knaben.org/v1', signal, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          search_type: '100%',
          search_field: 'title',
          query,
          order_by: 'seeders',
          order_direction: 'desc',
          size,
          from,
        }),
      })
      if (!Array.isArray(data.hits)) throw new Error('Invalid Knaben response')
      total = Number(row(data.total).value ?? data.total) || 0
      results.push(
        ...(await normalize(
          'Knaben',
          data.hits.map((item) => {
            const value = row(item)
            return {
              id: value.id,
              name: value.title,
              infoHash: value.hash,
              magnet: value.magnetUrl,
              seeders: value.seeders,
              leechers: value.peers,
              size: value.bytes,
              added: value.date,
              username: value.tracker,
            }
          }),
        )),
      )
      from += size
      if (data.hits.length < size) break
    }
  } catch (error) {
    if (!results.length) throw error
    partial = true
  }
  return { results: results.slice(0, limit), limited: total > results.length, partial }
}
