export type ByteRange = [start: number, end: number]

export type HelperConnectionSettings = { token: string; port: number; host: string }

export type FileSnapshot = {
  index: number
  name: string
  path: string
  length: number
  downloaded: number
  downloadedRanges: ByteRange[]
  progress: number
  done: boolean
}

export type TorrentSnapshot = {
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

export interface MediaFile extends FileSnapshot {
  readonly streamURL: string
  readonly compatibilityURL: string
  readonly downloadURL: string
  select(offset?: number): Promise<void>
  cursor(offset: number): Promise<void>
}
