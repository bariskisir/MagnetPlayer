import { useCallback, useEffect, useEffectEvent, useRef, useState } from 'react'
import { isAudioFile, supportsDirectPlayback } from '../../shared/media'
import { errorMessage } from '../../shared/errors'
import type { MediaFile } from '../helper/helper-types'
import type { LibraryEntry } from '../library/library-types'
import type { SavePreferences, SaveProgress } from './player-types'

type PlaybackOptions = {
  id: string
  file: MediaFile
  entry?: LibraryEntry
  autoPlay: boolean
  onProgress: SaveProgress
  onPrefs: SavePreferences
}

export function usePlayback<T extends HTMLMediaElement = HTMLVideoElement>({
  id,
  file,
  entry,
  autoPlay,
  onProgress,
  onPrefs,
}: PlaybackOptions) {
  const mediaRef = useRef<T | null>(null)
  const autoplayCancelled = useRef(false)
  const pause = useCallback(() => {
    autoplayCancelled.current = true
    mediaRef.current?.pause()
  }, [])
  const [media, setMedia] = useState<T | null>(null)
  const attachMedia = useCallback((element: T | null) => {
    mediaRef.current = element
    setMedia(element)
  }, [])
  const initial = useRef({
    progress: entry?.progress[file.path],
    preferences: entry?.mediaPrefs?.[file.path],
  })
  const startAt = useRef(initial.current.progress?.time ?? 0)
  const [source, setSource] = useState<string | null>(null)
  const [compatibility, setCompatibility] = useState(!supportsDirectPlayback(file.name))
  const [message, setMessage] = useState('Buffering…')
  const [failure, setFailure] = useState('')
  const saveProgress = useEffectEvent((time: number, duration: number) =>
    onProgress(id, file.path, time, duration),
  )
  const savePreferences = useEffectEvent(onPrefs)

  useEffect(() => {
    let cancelled = false
    setSource(null)
    const progress = initial.current.progress
    const offset = progress?.duration ? (startAt.current / progress.duration) * file.length : 0
    file
      .select(offset)
      .then(() => {
        if (!cancelled) setSource(compatibility ? file.compatibilityURL : file.streamURL)
      })
      .catch((error) => {
        if (!cancelled) setFailure(errorMessage(error))
      })
    return () => {
      cancelled = true
    }
  }, [file, compatibility])

  useEffect(() => {
    if (!media || !source) return
    const controller = new AbortController()
    const { signal } = controller
    let restored = false
    let lastSaved = 0
    let lastSent = 0
    const preferences = initial.current.preferences
    if (typeof preferences?.volume === 'number' && Number.isFinite(preferences.volume))
      media.volume = Math.max(0, Math.min(1, preferences.volume))
    if (preferences?.muted !== undefined) media.muted = preferences.muted
    if (preferences?.rate && preferences.rate > 0) media.playbackRate = preferences.rate
    const save = () => {
      if (!restored) return
      startAt.current = media.currentTime
      saveProgress(media.currentTime, media.duration)
    }
    const syncCursor = (force = false) => {
      if (!restored || !Number.isFinite(media.duration) || media.duration <= 0) return
      const now = Date.now()
      if (!force && now - lastSent < 1000) return
      lastSent = now
      void file.cursor(
        Math.max(
          0,
          Math.min(file.length, Math.round((media.currentTime / media.duration) * file.length)),
        ),
      )
    }
    const loaded = () => {
      if (restored) return
      restored = true
      if (startAt.current > 0 && startAt.current < media.duration - 5)
        media.currentTime = startAt.current
      syncCursor(true)
      setMessage('Ready')
      if (autoPlay && !autoplayCancelled.current)
        void media
          .play()
          .catch(() => setMessage('Press play to start; your browser blocked autoplay.'))
    }
    const changedPreferences = () => {
      const patch = { volume: media.volume, muted: media.muted, rate: media.playbackRate }
      initial.current.preferences = { ...initial.current.preferences, ...patch }
      savePreferences(id, file.path, patch)
    }
    media.addEventListener('loadedmetadata', loaded, { signal })
    media.addEventListener(
      'timeupdate',
      () => {
        if (Date.now() - lastSaved >= 4000) {
          save()
          lastSaved = Date.now()
        }
        syncCursor()
      },
      { signal },
    )
    media.addEventListener('seeked', () => syncCursor(true), { signal })
    for (const event of ['pause', 'ended'])
      media.addEventListener(
        event,
        () => {
          save()
          syncCursor(true)
        },
        { signal },
      )
    media.addEventListener('volumechange', changedPreferences, { signal })
    media.addEventListener('ratechange', changedPreferences, { signal })
    window.addEventListener('pagehide', save, { signal })
    document.addEventListener(
      'visibilitychange',
      () => {
        if (document.hidden) save()
      },
      { signal },
    )
    if (media.readyState >= HTMLMediaElement.HAVE_METADATA) loaded()
    return () => {
      save()
      controller.abort()
      media.pause()
    }
  }, [id, file, source, autoPlay, media])

  const handleError = () => {
    if (isAudioFile(file.name)) {
      setFailure('This audio file could not be played.')
      return
    }
    if (compatibility) {
      setFailure('This video could not be played.')
      return
    }
    startAt.current = mediaRef.current?.currentTime || startAt.current
    setFailure('')
    setMessage('Buffering…')
    setCompatibility(true)
  }

  return {
    pause,
    media,
    attachMedia,
    source,
    compatibility,
    message,
    failure,
    mediaEvents: {
      onWaiting: () => setMessage('Buffering…'),
      onPlaying: () => {
        setMessage('Playing')
        setFailure('')
      },
      onPause: () => setMessage('Paused'),
      onError: handleError,
    },
  }
}
