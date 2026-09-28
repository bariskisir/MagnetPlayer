import parseTorrent from 'parse-torrent'
import type { SearchResult } from './model.js'

export type Row = Record<string, unknown>
export type SourceResult = { results: SearchResult[]; limited?: boolean; partial?: boolean }
export const row = (value: unknown): Row =>
  value && typeof value === 'object' ? (value as Row) : {}
export const list = (value: unknown): unknown[] => (Array.isArray(value) ? value : [])
export const text = (value: unknown): string =>
  typeof value === 'string' || typeof value === 'number' ? String(value) : ''
const stat = (value: unknown): number | null =>
  value === null || value === undefined || value === ''
    ? null
    : Number.isFinite(Number(value)) && Number(value) >= 0
      ? Number(value)
      : null
const date = (value: unknown): number =>
  typeof value === 'number' ? value : Math.max(0, Date.parse(text(value)) / 1000) || 0
const hash = (value: unknown): string =>
  /^[a-f0-9]{40}$/i.test(text(value)) && !/^0+$/.test(text(value)) ? text(value).toLowerCase() : ''

async function request(
  url: URL | string,
  signal: AbortSignal,
  options: RequestInit = {},
): Promise<Response> {
  const response = await fetch(url, {
    ...options,
    headers: { 'User-Agent': 'MagnetPlayerHelper/1.0', ...options.headers },
    signal: AbortSignal.any([signal, AbortSignal.timeout(10000)]),
  })
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  return response
}

export async function json(
  url: URL | string,
  signal: AbortSignal,
  options: RequestInit = {},
): Promise<Row> {
  return row(await (await request(url, signal, options)).json())
}

export async function normalizeSource(name: string, data: Row): Promise<SearchResult | null> {
  const suppliedHash = hash(data.infoHash)
  const suppliedMagnet = text(data.magnet)
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
      const parsedHash = hash(parsed.infoHash)
      if (suppliedHash && parsedHash !== suppliedHash) return null
      infoHash = parsedHash
    } catch {
      if (!infoHash) return null
    }
  }
  if (!infoHash) return null
  const title = text(data.name) || parsed?.name || infoHash
  const params = new URLSearchParams({ dn: title })
  if (suppliedMagnet.startsWith('magnet:?')) {
    const source = new URL(suppliedMagnet)
    for (const [key, value] of source.searchParams) {
      if (['tr', 'ws', 'as', 'xs', 'x.pe'].includes(key)) params.append(key, value)
    }
  }
  return {
    id: text(data.id) || infoHash,
    name: title,
    infoHash,
    seeders: stat(data.seeders),
    leechers: stat(data.leechers),
    size: stat(data.size),
    files: stat(data.files),
    added: date(data.added),
    username: text(data.username),
    status: text(data.status),
    imdb: text(data.imdb),
    magnet: `magnet:?xt=urn:btih:${infoHash}&${params}`,
    sources: [name],
  }
}

export async function normalize(name: string, data: Row[]): Promise<SearchResult[]> {
  return (await Promise.all(data.map((item) => normalizeSource(name, item)))).filter(
    (item): item is SearchResult => item !== null,
  )
}

export function url(base: string, params: Record<string, string | number>): URL {
  const result = new URL(base)
  for (const [key, value] of Object.entries(params)) result.searchParams.set(key, String(value))
  return result
}
