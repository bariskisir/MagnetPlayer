import { selectTextTrack, usePlayer } from '@videojs/react'
import { useEffect, useRef } from 'react'

export function SubtitlePreferences({ language }: { language: string | null }) {
  const captions = usePlayer(selectTextTrack)
  const restored = useRef(false)

  useEffect(() => {
    if (restored.current || !captions?.textTrackList.length) return
    const track = captions.textTrackList.find(
      (track) =>
        (track.kind === 'subtitles' || track.kind === 'captions') && track.language === language,
    )
    if (language && !track?.id) return
    restored.current = true
    if (track?.id) captions.selectSubtitlesTrack(track.id)
    captions.toggleSubtitles(false)
  }, [captions, language])

  return null
}
