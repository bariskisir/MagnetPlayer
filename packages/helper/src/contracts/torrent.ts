/** Byte ranges use an inclusive start and an exclusive end. */
export type ByteRange = [start: number, end: number]

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

export interface TransferStats {
  speed: number
  upload: number
  peers: number
  downloaded: number
  progress: number
  cursor: number
  ranges: ByteRange[]
}

export interface TorrentCommand {
  magnet?: string
  index?: number
  offset?: number
}

export function isTorrentId(value: unknown): value is string {
  return typeof value === 'string' && /^[a-f0-9]{40}$/.test(value)
}
