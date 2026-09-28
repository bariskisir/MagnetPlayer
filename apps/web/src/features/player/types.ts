import type { ByteRange } from '../helper/types'
import type { MediaPreferences } from '../library/types'

export type TransferStats = {
  speed: number
  upload: number
  peers: number
  downloaded: number
  progress: number
  cursor: number
  ranges: ByteRange[]
}

export type SaveProgress = (id: string, path: string, time: number, duration: number) => void
export type SavePreferences = (id: string, path: string, patch: MediaPreferences) => void
