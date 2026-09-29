import type { Torrent } from 'webtorrent'

/** Piece ranges include both boundary pieces. */
export type PieceRange = [first: number, last: number]
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
