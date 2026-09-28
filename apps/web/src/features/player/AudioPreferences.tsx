import { selectAudioTrack, usePlayer } from '@videojs/react'
import { useEffect, useEffectEvent, useRef } from 'react'

export function AudioPreferences({
  initialTrack,
  onChange,
}: {
  initialTrack?: string
  onChange: (track: string) => void
}) {
  const audio = usePlayer(selectAudioTrack)
  const restored = useRef(false)
  const previous = useRef<string | undefined>(undefined)
  const persist = useEffectEvent(onChange)
  useEffect(() => {
    if (!audio?.audioTrackList.length) return
    const tracks = audio.audioTrackList
    const valueAt = (index: number) => tracks[index].id || String(index)
    if (!restored.current) {
      restored.current = true
      const index = tracks.findIndex((_, index) => valueAt(index) === initialTrack)
      if (index >= 0 && !tracks[index].enabled) {
        previous.current = initialTrack
        audio.selectAudioTrack(valueAt(index))
        return
      }
    }
    const selected = tracks.findIndex((track) => track.enabled)
    if (selected >= 0) {
      const value = valueAt(selected)
      if (previous.current !== value) {
        previous.current = value
        persist(value)
      }
    }
  }, [audio, initialTrack])
  return null
}
