import { asList, normalizeResults, asRecord, asText } from '../normalize-results.js'
import type { SourceResult } from '../../contracts/search.js'
import { fetchProviderJson, providerUrl } from '../provider-client.js'

export async function searchYts(query: string, signal: AbortSignal): Promise<SourceResult> {
  const data = asRecord(
    await fetchProviderJson(
      providerUrl('https://yts.gg/api/v2/list_movies.json', {
        query_term: query,
        sort_by: 'seeds',
        limit: 50,
        page: 1,
      }),
      signal,
    ),
  )
  if (data.status !== 'ok') throw new Error('Invalid YTS response')
  const body = asRecord(data.data)
  const results = await normalizeResults(
    'YTS',
    asList(body.movies).flatMap((item) => {
      const movie = asRecord(item)
      return asList(movie.torrents).map((torrent) => {
        const value = asRecord(torrent)
        const quality = asText(value.quality)
        return {
          id: movie.id,
          name: `${asText(movie.title_long || movie.title)} [${quality} ${asText(value.type)}]`,
          infoHash: value.hash,
          seeders: value.seeds,
          leechers: value.peers,
          size: value.size_bytes,
          added: value.date_uploaded_unix,
          imdb: movie.imdb_code,
          username: 'YTS',
        }
      })
    }),
  )
  return { results, limited: Number(body.movie_count) > 50 }
}
