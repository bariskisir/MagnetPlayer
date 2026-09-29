import { normalizeResults, asRecord, asText } from '../normalize-results.js'
import type { SourceResult } from '../../contracts/search.js'
import { fetchProviderJson, providerUrl } from '../provider-client.js'

export async function searchTorrentsCsv(query: string, signal: AbortSignal): Promise<SourceResult> {
  const data = asRecord(
    await fetchProviderJson(
      providerUrl('https://torrents-csv.com/service/search', { q: query, size: 100 }),
      signal,
    ),
  )
  if (!Array.isArray(data.torrents)) throw new Error('Invalid Torrents-csv response')
  const results = await normalizeResults(
    'Torrents-csv',
    data.torrents.map((item) => {
      const value = asRecord(item)
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
  return { results, limited: Boolean(data.torrents.length && asText(data.next)) }
}
