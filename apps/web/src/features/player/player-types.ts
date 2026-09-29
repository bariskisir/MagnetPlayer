import type { ReactNode } from 'react'
import type { MediaFile, TransferStats } from '../helper/helper-types'
import type { LibraryEntry, MediaPreferences } from '../library/library-types'

export type SaveProgress = (id: string, path: string, time: number, duration: number) => void
export type SavePreferences = (id: string, path: string, patch: MediaPreferences) => void

export interface MediaPlayerProps {
  id: string
  file: MediaFile
  entry?: LibraryEntry
  stats: TransferStats
  onProgress: SaveProgress
  onPrefs: SavePreferences
  autoPlay?: boolean
  children?: ReactNode
}
