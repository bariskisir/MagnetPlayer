import type { AudioStream } from './media-metadata.js'

export const SEGMENT_SECONDS = 4
const languageCodes: Record<string, string> = {
  eng: 'en',
  jpn: 'ja',
  tur: 'tr',
  deu: 'de',
  ger: 'de',
  fra: 'fr',
  fre: 'fr',
  spa: 'es',
  ita: 'it',
  por: 'pt',
  rus: 'ru',
  ara: 'ar',
  hin: 'hi',
  kor: 'ko',
  zho: 'zh',
  chi: 'zh',
  nld: 'nl',
  dut: 'nl',
  swe: 'sv',
  nor: 'no',
  dan: 'da',
  fin: 'fi',
  pol: 'pl',
  ukr: 'uk',
  ces: 'cs',
  cze: 'cs',
  hun: 'hu',
  ron: 'ro',
  rum: 'ro',
  ell: 'el',
  gre: 'el',
  heb: 'he',
  tha: 'th',
  vie: 'vi',
  ind: 'id',
}
const languageNames = new Intl.DisplayNames(['en'], { type: 'language' })

export function mediaPlaylist(duration: number, segmentUrl: (index: number) => string): string {
  const lines = [
    '#EXTM3U',
    '#EXT-X-VERSION:3',
    `#EXT-X-TARGETDURATION:${SEGMENT_SECONDS}`,
    '#EXT-X-MEDIA-SEQUENCE:0',
    '#EXT-X-PLAYLIST-TYPE:VOD',
  ]
  for (let index = 0; index < Math.ceil(duration / SEGMENT_SECONDS); index++) {
    if (index) lines.push('#EXT-X-DISCONTINUITY')
    lines.push(
      `#EXTINF:${Math.min(SEGMENT_SECONDS, duration - index * SEGMENT_SECONDS).toFixed(3)},`,
      segmentUrl(index),
    )
  }
  return [...lines, '#EXT-X-ENDLIST', ''].join('\n')
}

export function masterPlaylist(audio: AudioStream[], fileUrl: (name: string) => string): string {
  const lines = ['#EXTM3U']
  for (const stream of audio) {
    const language = languageCodes[stream.language] || stream.language
    let label = `Audio ${stream.index + 1}`
    try {
      if (language !== 'und')
        label = `${languageNames.of(language) || language.toUpperCase()} (${stream.index + 1})`
    } catch {
      /* Keep the stream label for invalid language tags. */
    }
    lines.push(
      `#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="audio",NAME="${label.replace(/"/g, '')}",LANGUAGE="${language.replace(/"/g, '')}",DEFAULT=${stream.index === 0 ? 'YES' : 'NO'},AUTOSELECT=YES,URI="${fileUrl(`audio-${stream.index}.m3u8`)}"`,
    )
  }
  lines.push('#EXT-X-STREAM-INF:BANDWIDTH=900000,AUDIO="audio"', fileUrl('video.m3u8'))
  return [...lines, ''].join('\n')
}
