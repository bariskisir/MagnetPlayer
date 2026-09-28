import type { Torrent } from 'webtorrent'

export type ByteRange = [start: number, end: number]
export interface PieceMap {
  readonly pieceLength: number
  bitfield?: { get(index: number): boolean }
}
export interface FileExtent {
  offset: number
  length: number
}
export interface RuntimeTorrent extends Torrent, PieceMap {
  destroyed: boolean
}
export interface FileSnapshot {
  index: number
  name: string
  path: string
  length: number
  downloaded: number
  downloadedRanges: ByteRange[]
  progress: number
  done: boolean
}
export interface TorrentSnapshot {
  infoHash: string
  name: string
  error: string
  files: FileSnapshot[]
  selected: number | null
  cursor: number
  speed: number
  upload: number
  peers: number
}
