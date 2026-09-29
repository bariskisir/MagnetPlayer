import { Music } from 'lucide-react'
import type { MediaPlayerProps } from './player-types'
import PlayerPanel from './PlayerPanel'
import { PausePlaybackContext } from './playback-context'
import { usePlayback } from './use-playback'

export default function AudioPlayer({
  id,
  file,
  entry,
  stats,
  onProgress,
  onPrefs,
  autoPlay = false,
  children,
}: MediaPlayerProps) {
  const playback = usePlayback<HTMLAudioElement>({ id, file, entry, onProgress, onPrefs, autoPlay })
  return (
    <>
      <div className="video-stage audio-stage">
        <div className="audio-card">
          <Music size={48} aria-hidden="true" />
          <h2>{file.name}</h2>
          {playback.source && (
            <audio
              ref={playback.attachMedia}
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
