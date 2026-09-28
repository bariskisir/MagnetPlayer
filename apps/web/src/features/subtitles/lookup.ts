import type { CachedSubtitleTrack } from './types'

type TitleQuery = { query: string; type: 'movie' | 'series'; season?: number; episode?: number }
type SubtitleResult = { language: string; display?: string; url: string }

function identifyTitle(name: string): TitleQuery {
  const base = name.split(/[\\/]/).pop() || name
  const episode = base.match(/[ ._-]S(\d{1,2})[ ._-]*E(\d{1,3})/i)
  const year = base.match(/\b(19|20)\d{2}\b/)
  const title = base
    .replace(/\.[^.]+$/, '')
    .replace(/[._]+/g, ' ')
    .replace(/[([]?(19|20)\d{2}[)\]]?/g, ' ')
    .replace(/\b(1080p|720p|2160p|480p|4k|bluray|web[- ]?dl|webrip|hdtv|x26[45]|h26[45])\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return {
    query: episode
      ? title.replace(/\s+S\d{1,2}\s*E\d{1,3}.*/i, '').trim()
      : year
        ? `${title} ${year[0]}`
        : title,
    type: episode ? 'series' : 'movie',
    ...(episode ? { season: Number(episode[1]), episode: Number(episode[2]) } : {}),
  }
}

function toWebVtt(source: string) {
  const body = source
    .replace(/^\uFEFF/, '')
    .replace(/\r/g, '')
    .replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, '$1.$2')
    .replace(/^WEBVTT\s*/i, '')
  return `WEBVTT\n\n${body}`
}

export function pickLocaleSubtitle<T extends { language: string }>(
  tracks: T[],
  languages: readonly string[],
): T | null {
  const normalize = (code: string) => code.toLowerCase().replace(/_/g, '-')
  const candidates = languages.map(normalize)
  for (const candidate of candidates) {
    const exact = tracks.find((track) => normalize(track.language) === candidate)
    if (exact) return exact
  }
  for (const candidate of candidates) {
    const match = tracks.find(
      (track) => normalize(track.language).split('-')[0] === candidate.split('-')[0],
    )
    if (match) return match
  }
  return null
}

async function request(url: string, signal: AbortSignal, failure: string) {
  const response = await fetch(url, {
    signal: AbortSignal.any([signal, AbortSignal.timeout(20000)]),
  })
  if (!response.ok) throw new Error(failure)
  return response
}

export async function findSubtitles(
  name: string,
  signal: AbortSignal,
  onStatus: (message: string) => void,
): Promise<CachedSubtitleTrack[]> {
  const title = identifyTitle(name)
  onStatus('Searching titles…')
  const catalog = await request(
    `https://v3-cinemeta.strem.io/catalog/${title.type}/top/search=${encodeURIComponent(title.query)}.json`,
    signal,
    'Title lookup is unavailable.',
  )
  const data = (await catalog.json()) as { metas?: Array<{ id: string }> }
  const match = data.metas?.find((item) => /^tt\d+$/.test(item.id))
  if (!match) throw new Error('No title match found. Try a clearer video filename.')
  onStatus('Searching subtitles…')
  const params = new URLSearchParams({ id: match.id })
  if (title.season !== undefined && title.episode !== undefined) {
    params.set('season', String(title.season))
    params.set('episode', String(title.episode))
  }
  const response = await request(
    `https://subtitles.vidy.st/search?${params}`,
    signal,
    'Subtitle search is unavailable.',
  )
  const results = ((await response.json()) as SubtitleResult[])
    .filter((item) => item.url && item.language)
    .sort((a, b) => (a.display || a.language).localeCompare(b.display || b.language))
  onStatus(`Loading ${results.length} subtitles…`)
  const downloaded = await Promise.allSettled(
    results.map(async (item) => {
      const subtitle = await request(
        new URL(item.url, 'https://subtitles.vidy.st').href,
        signal,
        'Could not download this subtitle.',
      )
      return {
        language: item.language,
        label: item.display || item.language,
        vtt: toWebVtt(await subtitle.text()),
      }
    }),
  )
  signal.throwIfAborted()
  return downloaded.flatMap((item) => (item.status === 'fulfilled' ? [item.value] : []))
}
