type TitleQuery = { query: string; type: 'movie' | 'series'; season?: number; episode?: number }

export function identifyTitle(name: string): TitleQuery {
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

export function toWebVtt(source: string) {
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
