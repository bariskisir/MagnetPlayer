export type WatchProgress = { time: number; duration: number }

export type MediaPreferences = {
  subtitleLanguage?: string | null
  audioTrack?: string
  volume?: number
  muted?: boolean
  rate?: number
}

export type VideoReference = { name: string; path: string; length: number }

export type LibraryEntry = {
  id: string
  name: string
  magnet: string
  videos: VideoReference[]
  lastFile?: string
  progress: Record<string, WatchProgress>
  mediaPrefs?: Record<string, MediaPreferences>
  addedAt?: number
  updatedAt: number
}
