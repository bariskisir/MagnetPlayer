import { PIRATEBAY_SEARCH_PARTITIONS } from './piratebay-search-partitions.js'

import type { SearchResult } from '../model.js'
export type { SearchResult } from '../model.js'

const number = (value: unknown) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0
}
const string = (value: unknown) => (typeof value === 'string' ? value : '')

export function parsePirateBayResults(data: unknown): SearchResult[] {
  if (!Array.isArray(data)) throw new Error('Pirate Bay returned an invalid response.')
  const seen = new Set<string>()
  return data.flatMap((item: unknown) => {
    if (!item || typeof item !== 'object') return []
    const row = item as Record<string, unknown>
    const infoHash = string(row.info_hash).toLowerCase()
    if (!/^[a-f0-9]{40}$/.test(infoHash) || /^0+$/.test(infoHash) || seen.has(infoHash)) return []
    seen.add(infoHash)
    return [
      {
        id: string(row.id),
        name: string(row.name),
        infoHash,
        seeders: number(row.seeders),
        leechers: number(row.leechers),
        size: number(row.size),
        files: number(row.num_files),
        added: number(row.added),
        username: string(row.username),
        status: string(row.status),
        imdb: string(row.imdb),
      },
    ]
  })
}

export async function searchPirateBay(
  query: string,
  signal?: AbortSignal,
  partition?: number,
): Promise<SearchResult[]> {
  const q = query.trim()
  if (!q || q.length > 200) throw new Error('Enter a search term between 1 and 200 characters.')
  const url = new URL('https://apibay.org/q.php')
  url.searchParams.set('q', q)
  if (partition !== undefined) url.searchParams.set('cat', String(partition))
  try {
    const response = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: signal
        ? AbortSignal.any([signal, AbortSignal.timeout(20000)])
        : AbortSignal.timeout(20000),
    })
    if (!response.ok) throw new Error(`APIBay returned HTTP ${response.status}.`)
    return parsePirateBayResults(await response.json())
  } catch (error) {
    if (signal?.aborted) throw error
    throw new Error('Could not search Pirate Bay. Please try again later.', { cause: error })
  }
}

// APIBay ignores page/offset for ordinary searches and caps each query at 100.
export async function searchPirateBayMany(query: string, signal?: AbortSignal, limit = 500) {
  const deadline = AbortSignal.timeout(20000)
  const enough = new AbortController()
  const combined = AbortSignal.any([deadline, enough.signal, ...(signal ? [signal] : [])])
  const initial = await searchPirateBay(query, combined)
  const results = new Map(initial.map((result) => [result.infoHash, result]))
  let limited = false
  let partial = false
  if (initial.length >= 100 && results.size < limit) {
    const queue: { id: number; children: readonly number[] }[] = [...PIRATEBAY_SEARCH_PARTITIONS]
    // Four workers bound upstream concurrency. Workers also consume newly queued children.
    await Promise.all(
      Array.from({ length: 4 }, async () => {
        let partition: (typeof queue)[number] | undefined
        while ((partition = queue.shift())) {
          signal?.throwIfAborted()
          if (combined.aborted) {
            if (!enough.signal.aborted) partial = true
            return
          }
          try {
            const found = await searchPirateBay(query, combined, partition.id)
            if (enough.signal.aborted) return
            for (const result of found) results.set(result.infoHash, result)
            if (results.size >= limit) {
              enough.abort()
              return
            }
            if (found.length >= 100)
              if (partition.children.length)
                queue.push(...partition.children.map((id) => ({ id, children: [] })))
              else limited = true
          } catch (error) {
            if (signal?.aborted) throw error
            if (enough.signal.aborted) return
            partial = true
          }
        }
      }),
    )
  }
  signal?.throwIfAborted()
  return {
    results: [...results.values()]
      .sort((a, b) => (b.seeders ?? -1) - (a.seeders ?? -1) || a.infoHash.localeCompare(b.infoHash))
      .slice(0, limit),
    limited: limited && results.size < limit,
    partial,
  }
}
