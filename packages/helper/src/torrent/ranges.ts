import type { ByteRange, PieceMap, FileExtent } from './types.js'

export const isVideo = (name: string) =>
  /\.(mp4|m4v|webm|ogv|ogg|mov|mkv|avi|mpeg|mpg|ts)$/i.test(name)

export function validId(id: unknown): id is string {
  return typeof id === 'string' && /^[a-f0-9]{40}$/.test(id)
}

// A short rewind keeps skipping back instant, the lookahead keeps the decoder fed
// while the video sits paused. Nothing outside that window is ever requested, so a
// file that is watched from the middle is never downloaded from the start.
const REWIND = 1024 * 1024
const LOOKAHEAD = 24 * 1024 * 1024

// Missing piece runs inside the playhead window, in file order.
export function windowPieces(
  torrent: PieceMap,
  file: FileExtent,
  cursor = 0,
  { rewind = REWIND, lookahead = LOOKAHEAD } = {},
) {
  const ranges: ByteRange[] = []
  if (!torrent.bitfield || !file.length) return ranges
  const { pieceLength } = torrent
  const position = Math.max(0, Math.min(Number.isFinite(cursor) ? cursor : 0, file.length))
  const from = Math.floor((file.offset + Math.max(0, position - rewind)) / pieceLength)
  const to = Math.floor(
    (file.offset + Math.min(file.length, position + lookahead) - 1) / pieceLength,
  )
  for (let piece = from; piece <= to; piece++) {
    if (torrent.bitfield.get(piece)) continue
    const previous = ranges.at(-1)
    if (previous?.[1] === piece - 1) previous[1] = piece
    else ranges.push([piece, piece])
  }
  return ranges
}

export function samePieces(a: ByteRange[], b: ByteRange[]) {
  return (
    a.length === b.length &&
    a.every((range, index) => range[0] === b[index][0] && range[1] === b[index][1])
  )
}

// Only verified pieces are stable: partially requested blocks can be retried.
export function downloadedRanges(torrent: PieceMap, file: FileExtent) {
  const ranges: ByteRange[] = []
  if (!torrent.bitfield || !file.length) return ranges
  const start = Math.floor(file.offset / torrent.pieceLength)
  const end = Math.floor((file.offset + file.length - 1) / torrent.pieceLength)
  for (let piece = start; piece <= end; piece++) {
    if (!torrent.bitfield.get(piece)) continue
    const left = Math.max(0, piece * torrent.pieceLength - file.offset)
    const right = Math.min(file.length, (piece + 1) * torrent.pieceLength - file.offset)
    const previous = ranges.at(-1)
    if (previous?.[1] === left) previous[1] = right
    else ranges.push([left, right])
  }
  return ranges
}
