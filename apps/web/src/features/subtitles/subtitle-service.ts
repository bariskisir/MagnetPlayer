import type { CachedSubtitleTrack } from './subtitle-types'
import { identifyTitle, toWebVtt } from './subtitle-format'

type SubtitleResult = { language: string; display?: string; url: string }

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
