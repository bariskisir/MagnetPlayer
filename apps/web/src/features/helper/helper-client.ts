import { HELPER_COMMAND, helperBaseUrl, helperConnection } from './connection-settings'

type RequestOptions = {
  method?: string
  data?: unknown
  file?: File
  signal?: AbortSignal
  timeout?: number
}

export async function helperRequest<T = Record<string, never>>(
  path: string,
  { method = 'GET', data, file, signal, timeout = 40000 }: RequestOptions = {},
): Promise<T> {
  const connection = helperConnection()
  let response: Response
  try {
    response = await fetch(`${helperBaseUrl(connection)}${path}`, {
      method,
      headers: {
        ...(connection.token ? { Authorization: `Bearer ${connection.token}` } : {}),
        ...(file
          ? { 'Content-Type': 'application/x-bittorrent' }
          : data
            ? { 'Content-Type': 'application/json' }
            : {}),
      },
      ...(file ? { body: file } : data ? { body: JSON.stringify(data) } : {}),
      signal: signal
        ? AbortSignal.any([signal, AbortSignal.timeout(timeout)])
        : AbortSignal.timeout(timeout),
      cache: 'no-store',
    })
  } catch (error) {
    if (signal?.aborted) throw error
    throw new Error(
      `Could not reach the local helper at ${connection.host}:${connection.port}. Keep its terminal open and allow local network access in your browser. Run "${HELPER_COMMAND}" to start it.`,
    )
  }
  const result = await response.json()
  if (!response.ok) throw new Error(result.error || 'The helper could not complete this request.')
  return result as T
}
