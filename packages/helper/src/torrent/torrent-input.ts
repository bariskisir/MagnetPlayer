import parseTorrent from 'parse-torrent'
import { isTorrentId, MAX_TORRENT_FILE_SIZE } from '../contracts/torrent.js'

export async function parseTorrentInput(input: string | Uint8Array) {
  const isMagnet = typeof input === 'string'
  if (isMagnet) {
    if (input.length > 16384 || !input.startsWith('magnet:?'))
      throw new Error('A valid magnet link is required.')
  } else {
    if (!input.byteLength) throw new Error('The .torrent file is empty.')
    if (input.byteLength > MAX_TORRENT_FILE_SIZE)
      throw Object.assign(new Error('The .torrent file must be 10 MB or smaller.'), { status: 413 })
  }
  const parsed = await parseTorrent(input).catch(() => {
    throw new Error(isMagnet ? 'Invalid magnet link.' : 'Invalid .torrent file.')
  })
  if (!isTorrentId(parsed.infoHash)) throw new Error('A BitTorrent v1 hash is required.')
  if (!isMagnet && !parsed.info) throw new Error('Invalid .torrent file.')
  return parsed
}
