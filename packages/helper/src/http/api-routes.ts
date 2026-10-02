import type { IncomingMessage, ServerResponse } from 'node:http'
import type { TorrentEngine } from '../torrent/torrent-engine.js'
import type { Transcoder } from '../media/transcoder.js'
import { readJsonBody, readTorrentBody, sendJson } from './protocol.js'
import { searchProviders } from '../search/search-service.js'

export async function routeApi(
  request: IncomingMessage,
  response: ServerResponse,
  url: URL,
  engine: TorrentEngine,
  transcoder: Transcoder,
): Promise<boolean> {
  const { pathname } = url
  const method = request.method
  let result: unknown
  if (pathname === '/api/pair' && method === 'GET') result = { connected: true }
  else if (pathname === '/api/search' && method === 'GET') {
    const controller = new AbortController()
    const cancel = () => controller.abort()
    response.once('close', cancel)
    try {
      result = await searchProviders(
        url.searchParams.get('q') ?? '',
        url.searchParams.get('provider') || 'piratebay',
        controller.signal,
      )
    } finally {
      response.removeListener('close', cancel)
    }
  } else if (pathname === '/api/torrents' && method === 'POST') {
    const contentType = request.headers['content-type']?.split(';')[0].trim().toLowerCase()
    const input =
      contentType === 'application/x-bittorrent'
        ? await readTorrentBody(request)
        : ((await readJsonBody(request)).magnet ?? '')
    await transcoder.stop()
    result = await engine.open(input)
  } else if (pathname === '/api/stop' && method === 'POST') {
    await transcoder.stop()
    await engine.stop()
    result = { stopped: true }
  } else if (pathname === '/api/library' && method === 'DELETE') {
    await transcoder.stop()
    await engine.clear()
    result = { cleared: true }
  } else {
    const actionRoute = /^\/api\/torrents\/([a-f0-9]{40})\/(select|cursor)$/.exec(pathname)
    const torrentRoute = /^\/api\/torrents\/([a-f0-9]{40})$/.exec(pathname)
    if (actionRoute && method === 'POST') {
      const [, id, action] = actionRoute
      const { index, offset } = await readJsonBody(request)
      if (action === 'select') {
        await transcoder.stop()
        result = engine.select(id, index ?? -1, offset)
      } else result = engine.cursor(id, index ?? -1, offset)
    } else if (torrentRoute && method === 'DELETE') {
      await transcoder.stop()
      await engine.remove(torrentRoute[1])
      result = { removed: true }
    } else if (torrentRoute && method === 'GET') {
      const snapshot = engine.snapshot()
      if (snapshot.infoHash !== torrentRoute[1]) throw new Error('This torrent is not active.')
      result = snapshot
    } else return false
  }
  sendJson(response, 200, result)
  return true
}
