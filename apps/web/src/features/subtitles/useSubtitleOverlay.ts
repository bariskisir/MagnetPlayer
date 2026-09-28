import { useEffect, useEffectEvent, useRef, useState } from 'react'
import type { RefObject } from 'react'
import type { SubtitleSelection } from './types'

export function useSubtitleOverlay(
  video: HTMLVideoElement | null,
  stageRef: RefObject<HTMLDivElement | null>,
  selection: SubtitleSelection,
  onLanguageChange: (language: string | null) => void,
) {
  const [text, setText] = useState('')
  const [pictureInPicture, setPictureInPicture] = useState(false)
  const active = useRef(selection.activeLanguage)
  const persist = useEffectEvent(onLanguageChange)
  const getLanguage = useEffectEvent(() => selection.activeLanguage)

  useEffect(() => {
    const stage = stageRef.current
    if (!video || !stage) return
    const controller = new AbortController()
    const { signal } = controller
    active.current = getLanguage()
    const elements = Array.from(video.querySelectorAll('track'))
    const tracks = new Set(elements.map((element) => element.track))
    const updateCues = () => {
      const showing = Array.from(video.textTracks).find((track) => track.mode === 'showing')
      setText(
        Array.from(showing?.activeCues ?? [])
          .map((cue) => (cue as VTTCue).getCueAsHTML().textContent || '')
          .join('\n'),
      )
    }
    const applySelection = () => {
      let selected = false
      for (const track of tracks) {
        const showing = !selected && track.language === active.current
        track.mode = showing ? 'showing' : 'disabled'
        if (showing) selected = true
      }
      updateCues()
    }
    const changed = () => {
      const language =
        Array.from(video.textTracks).find((track) => tracks.has(track) && track.mode === 'showing')
          ?.language ?? null
      if (language !== active.current) {
        active.current = language
        persist(language)
      }
      updateCues()
    }
    for (const element of elements) element.addEventListener('load', applySelection, { signal })
    for (const track of tracks) track.addEventListener('cuechange', updateCues, { signal })
    applySelection()
    video.textTracks.addEventListener('change', changed, { signal })
    video.addEventListener('timeupdate', updateCues, { signal })
    video.addEventListener('seeked', updateCues, { signal })
    video.addEventListener('enterpictureinpicture', () => setPictureInPicture(true), { signal })
    video.addEventListener('leavepictureinpicture', () => setPictureInPicture(false), { signal })
    const updateSize = () => {
      if (video.clientHeight > 0)
        stage.style.setProperty('--subtitle-size', `${video.clientHeight * 0.0458}px`)
    }
    updateSize()
    const observer = new ResizeObserver(updateSize)
    observer.observe(video)
    return () => {
      controller.abort()
      observer.disconnect()
    }
  }, [video, stageRef, selection.tracks])

  return { text, pictureInPicture }
}
