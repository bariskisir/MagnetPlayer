import type { IncomingMessage, ServerResponse } from 'node:http'

export function sendJson(response: ServerResponse, status: number, value: unknown) {
  response.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' })
  response.end(JSON.stringify(value))
}

export async function readJsonBody(
  request: IncomingMessage,
): Promise<{ magnet?: string; index?: number; offset?: number }> {
  if (!request.headers['content-type']?.startsWith('application/json'))
    throw Object.assign(new Error('JSON request required.'), { status: 415 })
  let size = 0
  const chunks = []
  for await (const chunk of request) {
    size += chunk.length
    if (size > 32768) throw Object.assign(new Error('Request is too large.'), { status: 413 })
    chunks.push(chunk)
  }
  try {
    const parsed: unknown = JSON.parse(Buffer.concat(chunks).toString())
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed))
      throw new Error('JSON object required.')
    if ('magnet' in parsed && typeof parsed.magnet !== 'string') throw new Error('Invalid magnet.')
    for (const key of ['index', 'offset'] as const) {
      if (
        key in parsed &&
        (typeof (parsed as Record<string, unknown>)[key] !== 'number' ||
          !Number.isFinite((parsed as Record<string, number>)[key]))
      )
        throw new Error('Invalid numeric field.')
    }
    return parsed as { magnet?: string; index?: number; offset?: number }
  } catch {
    throw new Error('Invalid JSON request.')
  }
}

export function parseByteRange(header: string | undefined, length: number) {
  if (length <= 0) return null
  if (!header) return { start: 0, end: length - 1, partial: false }
  const match = /^bytes=(\d*)-(\d*)$/.exec(header)
  if (!match || (!match[1] && !match[2])) return null
  const start = match[1] ? Number(match[1]) : Math.max(0, length - Number(match[2]))
  const end = match[1] && match[2] ? Math.min(Number(match[2]), length - 1) : length - 1
  if (
    !Number.isSafeInteger(start) ||
    !Number.isSafeInteger(end) ||
    start < 0 ||
    start > end ||
    start >= length
  )
    return null
  return { start, end, partial: true }
}
