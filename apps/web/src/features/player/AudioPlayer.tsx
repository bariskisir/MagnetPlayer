import { Music } from 'lucide-react'
import type { ReactNode } from 'react'
import type { MediaFile } from '../helper/types'
import type { LibraryEntry } from '../library/types'
import type { SavePreferences, SaveProgress, TransferStats } from './types'
import PlayerPanel from './PlayerPanel'
import { PausePlaybackContext } from './PlaybackContext'
import { usePlayback } from './usePlayback'

export default function AudioPlayer({
  id,
  file,
  entry,
  stats,
  onProgress,
  onPrefs,
  autoPlay = false,
  children,
}: {
  id: string
  file: MediaFile
  entry?: LibraryEntry
  stats: TransferStats
  onProgress: SaveProgress
  onPrefs: SavePreferences
  autoPlay?: boolean
  children?: ReactNode
}) {
  const playback = usePlayback<HTMLAudioElement>({ id, file, entry, onProgress, onPrefs, autoPlay })
  return (
    <>
      <div className="video-stage audio-stage">
        <div className="audio-card">
          <Music size={48} aria-hidden="true" />
          <h2>{file.name}</h2>
          {playback.source && (
            <audio
              ref={playback.attachVideo}
              src={playback.source}
              controls
              preload="metadata"
              {...playback.mediaEvents}
            />
          )}
          {playback.failure && (
            <p className="inline-error" role="alert">
              {playback.failure}
            </p>
          )}
        </div>
      </div>
      <PausePlaybackContext value={playback.pause}>
        <PlayerPanel stats={stats} length={file.length} message={playback.message}>
          {children}
        </PlayerPanel>
      </PausePlaybackContext>
    </>
  )
}
