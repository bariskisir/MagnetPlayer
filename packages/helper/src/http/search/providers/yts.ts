import type { SearchResult } from '../model.js'
import { json, list, normalize, row, text, url } from '../normalize.js'
import type { SourceResult } from '../normalize.js'

export async function searchYts(
  query: string,
  signal: AbortSignal,
  limit: number,
): Promise<SourceResult> {
  const results: SearchResult[] = []
  let hasMore = false,
    partial = false
  try {
    for (let page = 1; page <= 10 && results.length < limit; page++) {
      const data = await json(
        url('https://yts.gg/api/v2/list_movies.json', {
          query_term: query,
          sort_by: 'seeds',
          limit: 50,
          page,
        }),
        signal,
      )
      if (data.status !== 'ok') throw new Error('Invalid YTS response')
      const body = row(data.data),
        movies = list(body.movies)
      for (const item of movies) {
        const movie = row(item)
        results.push(
          ...(await normalize(
            'YTS',
            list(movie.torrents).map((torrent) => {
              const value = row(torrent),
                quality = text(value.quality)
              return {
                id: movie.id,
                name: `${text(movie.title_long || movie.title)} [${quality} ${text(value.type)}]`,
                infoHash: value.hash,
                seeders: value.seeds,
                leechers: value.peers,
                size: value.size_bytes,
                added: value.date_uploaded_unix,
                imdb: movie.imdb_code,
                username: 'YTS',
              }
            }),
          )),
        )
      }
      hasMore = Number(body.movie_count) > page * 50
      if (!hasMore || !movies.length) break
    }
  } catch (error) {
    if (!results.length) throw error
    partial = true
  }
  return { results: results.slice(0, limit), limited: hasMore || results.length > limit, partial }
}
