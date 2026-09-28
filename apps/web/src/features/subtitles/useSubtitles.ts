import { useEffect, useRef, useState } from 'react'
import { errorMessage } from '../../shared/errors'
import { findSubtitles, pickLocaleSubtitle } from './lookup'
import { readSubtitleCache, saveSubtitleCache } from './storage'
import type { SubtitleSelection } from './types'

export function useSubtitles(id: string, name: string, initialLanguage: string | null | undefined) {
  const [selection, setSelection] = useState<SubtitleSelection>({
    tracks: [],
    activeLanguage: null,
  })
  const [note, setNote] = useState('')
  const initial = useRef(initialLanguage)

  useEffect(() => {
    const controller = new AbortController()
    const { signal } = controller
    const urls: string[] = []
    const status = (message: string) => {
      if (!signal.aborted) setNote(message)
    }
    async function load() {
      try {
        const cached = await readSubtitleCache(id).catch(() => undefined)
        signal.throwIfAborted()
        const items = cached?.tracks.length
          ? cached.tracks
          : await findSubtitles(name, signal, status)
        signal.throwIfAborted()
        if (!cached?.tracks.length && items.length)
          await saveSubtitleCache({ id, tracks: items }).catch(() => {})
        signal.throwIfAborted()
        const tracks = items.map((item) => {
          const url = URL.createObjectURL(new Blob([item.vtt], { type: 'text/vtt' }))
          urls.push(url)
          return { url, language: item.language, label: item.label }
        })
        const language = tracks.some((track) => track.language === initial.current)
          ? (initial.current ?? null)
          : (pickLocaleSubtitle(
              tracks,
              navigator.languages.length ? navigator.languages : [navigator.language],
            )?.language ?? null)
        setSelection({ tracks, activeLanguage: language })
        status(tracks.length ? '' : 'No subtitles found for this title.')
      } catch (error) {
        if (!signal.aborted) status(errorMessage(error))
      }
    }
    void load()
    return () => {
      controller.abort()
      for (const url of urls) URL.revokeObjectURL(url)
    }
  }, [id, name])

  return {
    ...selection,
    note,
    selectLanguage: (activeLanguage: string | null) =>
      setSelection((current) => ({ ...current, activeLanguage })),
  }
}
