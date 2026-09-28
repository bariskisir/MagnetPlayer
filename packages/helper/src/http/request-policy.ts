import { timingSafeEqual } from 'node:crypto'
import { networkInterfaces } from 'node:os'
import type { IncomingMessage, ServerResponse } from 'node:http'

export function createRequestPolicy(bind: string, origin: string, token: string | null) {
  const hosts = new Set([
    '127.0.0.1',
    'localhost',
    '[::1]',
    bind.toLowerCase(),
    bind.includes(':') ? `[${bind.toLowerCase()}]` : bind.toLowerCase(),
  ])
  if (bind === '0.0.0.0' || bind === '::') {
    for (const interfaces of Object.values(networkInterfaces())) {
      for (const address of interfaces ?? []) {
        hosts.add(
          address.family === 'IPv6' ? `[${address.address.toLowerCase()}]` : address.address,
        )
      }
    }
  }
  const secret = token ? Buffer.from(token) : null
  return {
    apply(request: IncomingMessage, response: ServerResponse) {
      response.setHeader('Referrer-Policy', 'no-referrer')
      response.setHeader('X-Content-Type-Options', 'nosniff')
      const host = new URL(`http://${request.headers.host || 'invalid'}`).hostname.toLowerCase()
      if (!hosts.has(host)) throw Object.assign(new Error('Invalid host.'), { status: 403 })
      if (!request.headers.origin) return
      if (request.headers.origin !== origin)
        throw Object.assign(new Error('This website is not allowed to use the helper.'), {
          status: 403,
        })
      response.setHeader('Access-Control-Allow-Origin', origin)
      response.setHeader('Vary', 'Origin')
      response.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, Range')
      response.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, POST, DELETE, OPTIONS')
      response.setHeader(
        'Access-Control-Expose-Headers',
        'Content-Range, Content-Length, Accept-Ranges',
      )
      response.setHeader('Access-Control-Allow-Private-Network', 'true')
    },
    authenticated(request: IncomingMessage, url: URL) {
      if (!secret) return true
      const supplied =
        request.headers.authorization?.replace(/^Bearer /, '') ||
        url.searchParams.get('token') ||
        ''
      const bytes = Buffer.from(supplied)
      return bytes.length === secret.length && timingSafeEqual(bytes, secret)
    },
  }
}
