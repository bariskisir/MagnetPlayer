const HASH = /^urn:btih:([a-f0-9]{40}|[a-z2-7]{32})$/i

const PUBLIC_TRACKERS = [
  // Active entries from https://thepiratebay.org/static/main.js (print_trackers).
  'udp://tracker.opentrackr.org:1337',
  'udp://open.stealth.si:80/announce',
  'udp://tracker.torrent.eu.org:451/announce',
  'udp://tracker.bittor.pw:1337/announce',
  'udp://public.popcorn-tracker.org:6969/announce',
  'udp://tracker.dler.org:6969/announce',
  'udp://exodus.desync.com:6969',
  'udp://open.demonii.com:1337/announce',
  'udp://glotorrents.pw:6969/announce',
  'udp://tracker.coppersurfer.tk:6969',
  'udp://torrent.gresille.org:80/announce',
  'udp://p4p.arenabg.com:1337',
  'udp://tracker.internetwarriors.net:1337',
  // Keep HTTP discovery available alongside the site's UDP trackers.
  'http://tracker2.dler.org:80/announce',
  'http://tracker.dler.org:6969/announce',
]

function trackerKey(value: string): string {
  try {
    const url = new URL(value)
    // UDP announce paths do not identify separate tracker endpoints.
    return url.protocol === 'udp:' ? `udp://${url.host}` : url.href
  } catch {
    return value.trim()
  }
}

export function withDiscoveryTrackers(magnet: string): string {
  const url = new URL(magnet)
  const existing = new Set(
    url.searchParams
      .getAll('tr')
      .filter((tracker) => tracker.trim())
      .map(trackerKey),
  )
  const defaults = new Set(PUBLIC_TRACKERS.map(trackerKey))
  if ([...existing].some((tracker) => !defaults.has(tracker))) return magnet
  // Upgrade previously saved search magnets when the default list changes.
  return (
    magnet +
    PUBLIC_TRACKERS.filter((tracker) => !existing.has(trackerKey(tracker)))
      .map((tracker) => `&tr=${encodeURIComponent(tracker)}`)
      .join('')
  )
}

function validateMagnet(value: string): { magnet: string } | { message: string } {
  let url: URL
  try {
    url = new URL(value.trim())
  } catch {
    return { message: 'Paste a valid magnet link to continue.' }
  }
  if (url.protocol !== 'magnet:' || !url.searchParams.getAll('xt').some((xt) => HASH.test(xt))) {
    return {
      message: 'This player needs a BitTorrent v1 magnet link (magnet:?xt=urn:btih:…).',
    }
  }
  // WebTorrent's magnet parser expects literal urn:btih: in xt. Repair links
  // previously generated with URLSearchParams, including saved search entries.
  const magnet = value.trim().replace(/([?&]xt=)[^&]*/g, (parameter: string, prefix: string) => {
    const xt = new URLSearchParams(parameter.slice(1)).get('xt') ?? ''
    return HASH.test(xt) ? `${prefix}${xt.replace(/^urn:btih:/i, 'urn:btih:')}` : parameter
  })
  return { magnet }
}

export const isMagnetLink = (value: string) => 'magnet' in validateMagnet(value)

export function parseMagnetLink(value: string): string {
  const result = validateMagnet(value)
  if ('message' in result) throw new Error(result.message)
  return withDiscoveryTrackers(result.magnet)
}
