import parseTorrent from 'parse-torrent'
import type { SearchResult } from '../contracts/search.js'

export type Row = Record<string, unknown>
export const asRecord = (value: unknown): Row =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as Row) : {}
export const asList = (value: unknown): unknown[] => (Array.isArray(value) ? value : [])
export const asText = (value: unknown): string =>
  typeof value === 'string' || typeof value === 'number' ? String(value) : ''
const parseStatistic = (value: unknown): number | null =>
  value === null || value === undefined || value === ''
    ? null
    : Number.isFinite(Number(value)) && Number(value) >= 0
      ? Number(value)
      : null
const parseTimestamp = (value: unknown): number =>
  typeof value === 'number' ? value : Math.max(0, Date.parse(asText(value)) / 1000) || 0
const parseInfoHash = (value: unknown): string =>
  /^[a-f0-9]{40}$/i.test(asText(value)) && !/^0+$/.test(asText(value))
    ? asText(value).toLowerCase()
    : ''

export async function normalizeSource(name: string, data: Row): Promise<SearchResult | null> {
  const suppliedHash = parseInfoHash(data.infoHash)
  const suppliedMagnet = asText(data.magnet)
  let infoHash = suppliedHash
  let parsed: Awaited<ReturnType<typeof parseTorrent>> | undefined
  if (suppliedMagnet.startsWith('magnet:?')) {
    try {
      const source = new URL(suppliedMagnet)
      const xt = source.searchParams.getAll('xt').find((value) => /^urn:btih:/i.test(value))
      const canonical = xt
        ? suppliedMagnet.replace(/([?&]xt=)[^&]*/, `$1${xt.replace(/^urn:btih:/i, 'urn:btih:')}`)
        : suppliedMagnet
      parsed = await parseTorrent(canonical)
      const parsedHash = parseInfoHash(parsed.infoHash)
      if (suppliedHash && parsedHash !== suppliedHash) return null
      infoHash = parsedHash
    } catch {
      if (!infoHash) return null
    }
  }
  if (!infoHash) return null
  const title = asText(data.name) || parsed?.name || infoHash
  const params = new URLSearchParams({ dn: title })
  if (suppliedMagnet.startsWith('magnet:?')) {
    const source = new URL(suppliedMagnet)
    for (const [key, value] of source.searchParams) {
      if (['tr', 'ws', 'as', 'xs', 'x.pe'].includes(key)) params.append(key, value)
    }
  }
  return {
    id: asText(data.id) || infoHash,
    name: title,
    infoHash,
    seeders: parseStatistic(data.seeders),
    leechers: parseStatistic(data.leechers),
    size: parseStatistic(data.size),
    files: parseStatistic(data.files),
    added: parseTimestamp(data.added),
    username: asText(data.username),
    status: asText(data.status),
    imdb: asText(data.imdb),
    magnet: `magnet:?xt=urn:btih:${infoHash}&${params}`,
    sources: [name],
  }
}

export async function normalizeResults(name: string, data: Row[]): Promise<SearchResult[]> {
  return (await Promise.all(data.map((item) => normalizeSource(name, item)))).filter(
    (item): item is SearchResult => item !== null,
  )
}
