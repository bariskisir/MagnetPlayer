import type { IncomingMessage, ServerResponse, OutgoingHttpHeaders } from 'node:http'
import type { TorrentFile } from 'webtorrent'
import type { TorrentEngine } from '../torrent/engine.js'
import type { Transcoder, SegmentTrack } from '../media/transcoder.js'
import { masterPlaylist, mediaPlaylist } from '../media/hls.js'
import { parseByteRange } from './protocol.js'

type MediaContext = {
  engine: TorrentEngine
  transcoder: Transcoder
  baseUrl: string
  token: string | null
}
const CONTENT_TYPES: Record<string, string> = {
  mp4: 'video/mp4',
  m4v: 'video/mp4',
  webm: 'video/webm',
  ogv: 'video/ogg',
  ogg: 'video/ogg',
  mkv: 'video/x-matroska',
  mov: 'video/quicktime',
  avi: 'video/x-msvideo',
  mpeg: 'video/mpeg',
  mpg: 'video/mpeg',
  ts: 'video/mp2t',
}

function serveOriginal(
  request: IncomingMessage,
  response: ServerResponse,
  url: URL,
  file: TorrentFile,
) {
  const range = parseByteRange(request.headers.range, file.length)
  if (!range) {
    response.writeHead(416, { 'Content-Range': `bytes */${file.length}` })
    response.end()
    return
  }
  const headers: OutgoingHttpHeaders = {
    'Content-Type':
      CONTENT_TYPES[file.name.split('.').pop()!.toLowerCase()] || 'application/octet-stream',
    'Content-Length': range.end - range.start + 1,
    'Accept-Ranges': 'bytes',
    'Cache-Control': 'no-store',
  }
  if (url.searchParams.has('download'))
    headers['Content-Disposition'] =
      `attachment; filename*=UTF-8''${encodeURIComponent(file.name).replace(/'/g, '%27')}`
  if (range.partial) headers['Content-Range'] = `bytes ${range.start}-${range.end}/${file.length}`
  response.writeHead(range.partial ? 206 : 200, headers)
  if (request.method === 'HEAD') {
    response.end()
    return
  }
  const stream = file.createReadStream({ start: range.start, end: range.end })
  response.once('close', () => stream.destroy())
  stream.once('error', () => response.destroy())
  stream.pipe(response)
}

function sendPlaylist(request: IncomingMessage, response: ServerResponse, playlist: string) {
  response.writeHead(200, {
    'Content-Type': 'application/vnd.apple.mpegurl',
    'Cache-Control': 'no-store',
  })
  response.end(request.method === 'HEAD' ? undefined : playlist)
}

export async function routeMedia(
  request: IncomingMessage,
  response: ServerResponse,
  url: URL,
  context: MediaContext,
): Promise<boolean> {
  const match =
    /^\/media\/([a-f0-9]{40})\/(\d+)\/(raw|playlist\.m3u8|video\.m3u8|audio-\d+\.m3u8|\d+\.ts|video-\d+\.ts|audio-\d+-\d+\.ts)$/.exec(
      url.pathname,
    )
  if (!match || !['GET', 'HEAD'].includes(request.method || '')) return false
  const [, id, indexText, resource] = match
  const index = Number(indexText)
  const { engine, transcoder, baseUrl, token } = context
  const file = engine.file(id, index)
  if (resource === 'raw') {
    serveOriginal(request, response, url, file)
    return true
  }
  const credentialQuery = token ? `?token=${encodeURIComponent(token)}` : ''
  const source = `${baseUrl}/media/${id}/${index}/raw${credentialQuery}`
  const metadata = await transcoder.probe(id, index, source)
  if (resource.endsWith('.m3u8')) {
    let playlist: string
    if (resource === 'playlist.m3u8' && metadata.audio.length > 1) {
      playlist = masterPlaylist(metadata.audio, (name) => `${name}${credentialQuery}`)
    } else {
      const audio = /^audio-(\d+)\.m3u8$/.exec(resource)
      if (audio && !metadata.audio.some((stream) => stream.index === Number(audio[1])))
        throw new Error('Invalid audio stream.')
      const prefix = audio ? `audio-${audio[1]}-` : resource === 'video.m3u8' ? 'video-' : ''
      playlist = mediaPlaylist(
        metadata.duration,
        (segment) => `${prefix}${segment}.ts${credentialQuery}`,
      )
    }
    sendPlaylist(request, response, playlist)
  } else {
    const audio = /^audio-(\d+)-(\d+)\.ts$/.exec(resource)
    const video = /^video-(\d+)\.ts$/.exec(resource)
    const track: SegmentTrack = audio
      ? { kind: 'audio', index: Number(audio[1]) }
      : { kind: video ? 'video' : 'muxed' }
    if (track.kind === 'audio' && !metadata.audio.some((stream) => stream.index === track.index))
      throw new Error('Invalid audio stream.')
    const segmentIndex = Number(audio?.[2] ?? video?.[1] ?? resource.split('.')[0])
    const data = await transcoder.segment({
      id,
      fileIndex: index,
      segmentIndex,
      source,
      duration: metadata.duration,
      track,
    })
    response.writeHead(200, {
      'Content-Type': 'video/mp2t',
      'Content-Length': data.length,
      'Cache-Control': 'private, max-age=3600',
    })
    response.end(request.method === 'HEAD' ? undefined : data)
  }
  return true
}
