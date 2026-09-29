import type { FileSnapshot } from '../../../../../packages/helper/src/contracts/torrent'
export type {
  ByteRange,
  FileSnapshot,
  TorrentSnapshot,
  TransferStats,
} from '../../../../../packages/helper/src/contracts/torrent'

export type HelperConnectionSettings = { token: string; port: number; host: string }

export interface MediaFile extends FileSnapshot {
  readonly streamURL: string
  readonly compatibilityURL: string
  readonly downloadURL: string
  select(offset?: number): Promise<void>
  cursor(offset: number): Promise<void>
}
