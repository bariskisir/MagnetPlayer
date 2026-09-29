import assert from 'node:assert/strict'
import test from 'node:test'
import { createServer } from 'node:http'
import { Readable } from 'node:stream'
import type { TorrentFile } from 'webtorrent'
import { routeApi } from '../packages/helper/src/http/api-routes.js'
import { routeMedia } from '../packages/helper/src/http/media-routes.js'
import { sendJson } from '../packages/helper/src/http/protocol.js'
import { createRequestPolicy } from '../packages/helper/src/http/request-policy.js'
import { errorMessage, errorStatus } from '../packages/helper/src/errors.js'
import type { TorrentEngine } from '../packages/helper/src/torrent/torrent-engine.js'
import type { Transcoder } from '../packages/helper/src/media/transcoder.js'

test('HTTP routes preserve authentication, JSON validation and streamed byte ranges', async (context) => {
  const content = Buffer.from('0123456789')
  const id = 'a'.repeat(40)
  const commands: string[] = []
  const file = {
    name: 'movie.mp4',
    length: content.length,
    createReadStream: ({ start, end }: { start: number; end: number }) =>
      Readable.from(content.subarray(start, end + 1)),
  } as TorrentFile
  const engine = {
    file: () => file,
    stop: async () => {
      commands.push('torrent')
    },
  } as unknown as TorrentEngine
  const transcoder = {
    stop: async () => {
      commands.push('transcoder')
    },
  } as unknown as Transcoder
  const policy = createRequestPolicy('127.0.0.1', 'https://player.example', 'secret')
  const server = createServer(async (request, response) => {
    try {
      policy.apply(request, response)
      const url = new URL(request.url!, 'http://127.0.0.1')
      if (!policy.authenticated(request, url)) {
        sendJson(response, 401, { error: 'Unauthorized' })
        return
      }
      if (await routeApi(request, response, url, engine, transcoder)) return
      if (
        await routeMedia(request, response, url, {
          engine,
          transcoder,
          baseUrl: '',
          token: 'secret',
        })
      )
        return
      sendJson(response, 404, {})
    } catch (error) {
      sendJson(response, errorStatus(error), { error: errorMessage(error) })
    }
  })
  context.after(
    () =>
      new Promise<void>((resolve, reject) => {
        server.closeAllConnections()
        server.close((error) => (error ? reject(error) : resolve()))
      }),
  )
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const address = server.address()
  assert.ok(address && typeof address !== 'string')
  const base = `http://127.0.0.1:${address.port}`
  const headers = { Authorization: 'Bearer secret', Origin: 'https://player.example' }
  assert.equal((await fetch(`${base}/api/pair`)).status, 401)
  const paired = await fetch(`${base}/api/pair`, { headers })
  assert.deepEqual(await paired.json(), { connected: true })
  assert.equal(paired.headers.get('access-control-allow-origin'), 'https://player.example')
  assert.equal(
    (await fetch(`${base}/api/pair`, { headers: { ...headers, Origin: 'https://other.example' } }))
      .status,
    403,
  )

  const media = `${base}/media/${id}/0/raw?token=secret`
  const ranged = await fetch(media, { headers: { Range: 'bytes=2-5' } })
  assert.equal(ranged.status, 206)
  assert.equal(ranged.headers.get('content-range'), 'bytes 2-5/10')
  assert.equal(ranged.headers.get('content-type'), 'video/mp4')
  assert.equal(await ranged.text(), '2345')
  const head = await fetch(media, { method: 'HEAD' })
  assert.equal(head.headers.get('content-length'), '10')
  assert.equal(await head.text(), '')
  const invalid = await fetch(media, { headers: { Range: 'bytes=10-' } })
  assert.equal(invalid.status, 416)
  assert.equal(invalid.headers.get('content-range'), 'bytes */10')

  const select = `${base}/api/torrents/${id}/select`
  assert.equal((await fetch(select, { method: 'POST', headers, body: '{}' })).status, 415)
  const malformed = await fetch(select, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: '{"index":"0"}',
  })
  assert.equal(malformed.status, 400)
  assert.deepEqual(commands, [])
  const stopped = await fetch(`${base}/api/stop`, { method: 'POST', headers })
  assert.deepEqual(await stopped.json(), { stopped: true })
  assert.deepEqual(commands, ['transcoder', 'torrent'])
})
