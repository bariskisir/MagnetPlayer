import { createServer } from 'node:http'
import { randomBytes } from 'node:crypto'
import { errorMessage, errorStatus } from '../errors.js'
import { VERSION, DEFAULT_PORT, DEFAULT_SITE } from '../config.js'
import { TorrentEngine } from '../torrent/engine.js'
import { Transcoder } from '../media/transcoder.js'
import { createRequestPolicy } from './request-policy.js'
import { sendJson } from './protocol.js'
import { routeApi } from './api.js'
import { routeMedia } from './media.js'

type HelperOptions = {
  root: string
  port?: number
  bind?: string
  site?: string
  noAuth?: boolean
  ffmpeg?: string
}

export async function startHelper({
  root,
  port = DEFAULT_PORT,
  bind = '127.0.0.1',
  site = DEFAULT_SITE,
  noAuth = true,
  ffmpeg,
}: HelperOptions) {
  const token = noAuth ? null : randomBytes(32).toString('hex')
  const engine = new TorrentEngine(root)
  const transcoder = new Transcoder(root, ffmpeg)
  const policy = createRequestPolicy(bind, new URL(site).origin, token)
  let baseUrl = ''
  const server = createServer(async (request, response) => {
    try {
      policy.apply(request, response)
      if (request.method === 'OPTIONS') {
        response.writeHead(204)
        response.end()
        return
      }
      const url = new URL(request.url || '/', 'http://127.0.0.1')
      if (url.pathname === '/health' && request.method === 'GET') {
        sendJson(response, 200, { name: 'magnet-player-helper', version: VERSION, apiVersion: 1 })
        return
      }
      if (!policy.authenticated(request, url)) {
        sendJson(response, 401, {
          error: 'Pair the site using the connection key printed in the helper terminal.',
        })
        return
      }
      if (await routeApi(request, response, url, engine, transcoder)) return
      if (await routeMedia(request, response, url, { engine, transcoder, baseUrl, token })) return
      sendJson(response, 404, { error: 'Endpoint not found.' })
    } catch (error) {
      if (response.destroyed) return
      if (response.headersSent) response.destroy()
      else sendJson(response, errorStatus(error), { error: errorMessage(error) })
    }
  })
  server.requestTimeout = 120000
  server.headersTimeout = 15000
  try {
    await new Promise<void>((resolve, reject) => {
      server.once('error', reject)
      server.listen(port, bind, () => {
        server.removeListener('error', reject)
        resolve()
      })
    })
  } catch (error) {
    await engine.close()
    throw error
  }
  const address = server.address()
  if (!address || typeof address === 'string')
    throw new Error('The helper did not bind a TCP port.')
  // Wildcard listen addresses are not usable as local FFmpeg source hosts.
  const host =
    bind === '0.0.0.0'
      ? '127.0.0.1'
      : bind === '::'
        ? '[::1]'
        : bind.includes(':')
          ? `[${bind}]`
          : bind
  baseUrl = `http://${host}:${address.port}`
  return {
    token,
    baseUrl,
    async close() {
      server.closeAllConnections()
      const closed = new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      )
      await Promise.all([transcoder.stop(), engine.close(), closed])
    },
  }
}
