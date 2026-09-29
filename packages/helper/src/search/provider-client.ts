import { VERSION } from '../config.js'

export async function fetchProviderJson(
  url: URL | string,
  signal: AbortSignal,
  options: RequestInit = {},
): Promise<unknown> {
  const headers = new Headers(options.headers)
  if (!headers.has('User-Agent')) headers.set('User-Agent', `MagnetPlayerHelper/${VERSION}`)
  if (!headers.has('Accept')) headers.set('Accept', 'application/json')
  const response = await fetch(url, {
    ...options,
    headers,
    signal: AbortSignal.any([signal, AbortSignal.timeout(10000)]),
  })
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  return response.json()
}

export function providerUrl(base: string, params: Record<string, string | number>): URL {
  const url = new URL(base)
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, String(value))
  return url
}
