const HASH = /^urn:btih:([a-f0-9]{40}|[a-z2-7]{32})$/i

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
  return { magnet: value.trim() }
}

export const isMagnetLink = (value: string) => 'magnet' in validateMagnet(value)

export function parseMagnetLink(value: string): string {
  const result = validateMagnet(value)
  if ('message' in result) throw new Error(result.message)
  return result.magnet
}
