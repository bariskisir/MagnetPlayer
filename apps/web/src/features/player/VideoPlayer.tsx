import '@videojs/react/video/skin.css'
import { lazy, Suspense, useRef } from 'react'
import { VideoPlayer as Player, VideoSkin, Video } from '@videojs/react/video'
import { useSubtitles } from '../subtitles/use-subtitles'
import { useSubtitleOverlay } from '../subtitles/use-subtitle-overlay'
import { AudioPreferences } from './AudioPreferences'
import { SubtitlePreferences } from './SubtitlePreferences'
import PlayerPanel from './PlayerPanel'
import { PausePlaybackContext } from './playback-context'
import { usePlayback } from './use-playback'
import type { MediaPreferences } from '../library/library-types'
import type { MediaPlayerProps } from './player-types'

const HlsJsVideo = lazy(async () => ({
  default: (await import('@videojs/react/media/hlsjs-video')).HlsJsVideo,
}))

export default function VideoPlayer({
  id,
  file,
  entry,
  stats,
  onProgress,
  onPrefs,
  autoPlay = false,
  children,
}: MediaPlayerProps) {
  const stageRef = useRef<HTMLDivElement | null>(null)
  const preferences = entry?.mediaPrefs?.[file.path]
  const savePreferences = (patch: MediaPreferences) => onPrefs(id, file.path, patch)
  const playback = usePlayback({ id, file, entry, onProgress, onPrefs, autoPlay })
  const subtitles = useSubtitles(`${id}/${file.path}`, file.name, preferences?.subtitleLanguage)
  const overlay = useSubtitleOverlay(playback.media, stageRef, subtitles, (language) => {
    subtitles.selectLanguage(language)
    savePreferences({ subtitleLanguage: language })
  })
  const Media = playback.compatibility ? HlsJsVideo : Video

  return (
    <>
      <div ref={stageRef} className={`video-stage${overlay.pictureInPicture ? ' pip' : ''}`}>
        <Player title={file.name}>
          <VideoSkin className="magnet-skin">
            <Suspense fallback={null}>
              {playback.source && (
                <Media
                  ref={playback.attachMedia}
                  src={playback.source}
                  playsInline
                  preload="metadata"
                  crossOrigin="anonymous"
                  {...playback.mediaEvents}
                >
                  {subtitles.tracks.map((track) => (
                    <track
                      key={track.url}
                      kind="subtitles"
                      src={track.url}
                      srcLang={track.language}
                      label={track.label}
                    />
                  ))}
                </Media>
              )}
            </Suspense>
            {playback.source && subtitles.tracks.length > 0 && (
              <SubtitlePreferences
                key={`subtitle:${playback.source}`}
                language={subtitles.activeLanguage}
              />
            )}
            {playback.source && (
              <AudioPreferences
                key={`audio:${playback.source}`}
                initialTrack={preferences?.audioTrack}
                onChange={(audioTrack) => savePreferences({ audioTrack })}
              />
            )}
            {overlay.text && !overlay.pictureInPicture && (
              <div className="subtitle-overlay">{overlay.text}</div>
            )}
          </VideoSkin>
        </Player>
        {playback.failure && (
          <p role="alert" className="inline-error">
            {playback.failure}
          </p>
        )}
      </div>
      <PausePlaybackContext value={playback.pause}>
        <PlayerPanel
          stats={stats}
          length={file.length}
          message={playback.message}
          subtitleNote={subtitles.note}
        >
          {children}
        </PlayerPanel>
      </PausePlaybackContext>
    </>
  )
}
