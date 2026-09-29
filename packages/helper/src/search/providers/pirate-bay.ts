import type { SearchResult } from '../../contracts/search.js'
export type { SearchResult } from '../../contracts/search.js'

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
): Promise<SearchResult[]> {
  const q = query.trim()
  if (!q || q.length > 200) throw new Error('Enter a search term between 1 and 200 characters.')
  const url = new URL('https://apibay.org/q.php')
  url.searchParams.set('q', q)
  try {
    const response = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: signal
        ? AbortSignal.any([signal, AbortSignal.timeout(20000)])
        : AbortSignal.timeout(20000),
    })
    if (!response.ok) throw new Error(`APIBay returned HTTP ${response.status}.`)
    return parsePirateBayResults(await response.json()).slice(0, 100)
  } catch (error) {
    if (signal?.aborted) throw error
    throw new Error('Could not search Pirate Bay. Please try again later.', { cause: error })
  }
}
