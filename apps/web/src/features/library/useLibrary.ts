import { useCallback, useEffect, useRef, useState } from 'react'
import { errorMessage } from '../../shared/errors'
import { isVideoFile } from '../../shared/media'
import { parseMagnetLink } from '../../shared/magnet'
import { helperRequest } from '../helper/transport'
import { useTorrentSession } from '../helper/useTorrentSession'
import { clearLibrary, deleteEntry, readLibrary, saveEntry } from './storage'
import type { LibraryEntry, MediaPreferences } from './types'
import type { MediaFile } from '../helper/types'

const STORAGE_ERROR =
  'Could not save to browser storage. Check available space and site storage permissions.'

export default function useLibrary() {
  const [entries, setEntries] = useState<LibraryEntry[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [opening, setOpening] = useState(false)
  const records = useRef<LibraryEntry[]>([])
  const initialized = useRef(false)
  const locked = useRef(false)
  const session = useTorrentSession(setError)
  const { open: openSession, stop, select, active, selected } = session

  const updateEntries = useCallback((next: LibraryEntry[]) => {
    records.current = next
    setEntries(next)
  }, [])

  const persist = useCallback(
    (entry: LibraryEntry) => {
      updateEntries(
        [entry, ...records.current.filter((item) => item.id !== entry.id)].sort(
          (a, b) => b.updatedAt - a.updatedAt,
        ),
      )
      void saveEntry(entry).catch(() => setError(STORAGE_ERROR))
    },
    [updateEntries],
  )

  useEffect(() => {
    let cancelled = false
    readLibrary()
      .then((data) => {
        if (cancelled) return
        updateEntries(data.sort((a, b) => b.updatedAt - a.updatedAt))
        initialized.current = true
      })
      .catch(() => {
        if (!cancelled)
          setError('Browser storage is unavailable. Enable site storage, then reload.')
      })
    return () => {
      cancelled = true
    }
  }, [updateEntries])

  const open = useCallback(
    async (input: string, saved?: LibraryEntry): Promise<boolean> => {
      if (locked.current) return false
      locked.current = true
      setBusy(true)
      setOpening(true)
      setError('')
      try {
        if (!initialized.current)
          throw new Error('Browser storage is still loading. Please try again.')
        const magnet = parseMagnetLink(input)
        const torrent = await openSession(magnet)
        if (!torrent) return false
        const existing = records.current.find((entry) => entry.id === torrent.infoHash)
        const videos = torrent.files.filter((file) => isVideoFile(file.name))
        persist({
          id: torrent.infoHash,
          name: torrent.name,
          magnet,
          videos: videos.map(({ name, path, length }) => ({ name, path, length })),
          lastFile: existing?.lastFile,
          progress: existing?.progress ?? {},
          mediaPrefs: existing?.mediaPrefs,
          updatedAt: Date.now(),
        })
        const lastFile = saved?.lastFile ?? existing?.lastFile
        select(
          videos.length === 1 ? videos[0] : (videos.find((file) => file.path === lastFile) ?? null),
        )
        return true
      } catch (error) {
        if (!(error instanceof DOMException && error.name === 'AbortError'))
          setError(errorMessage(error))
        return false
      } finally {
        locked.current = false
        setOpening(false)
        setBusy(false)
      }
    },
    [openSession, persist, select],
  )

  const saveProgress = useCallback(
    (id: string, path: string, time: number, duration: number) => {
      const entry = records.current.find((item) => item.id === id)
      if (!entry || !Number.isFinite(time) || !Number.isFinite(duration) || duration <= 0) return
      persist({
        ...entry,
        lastFile: path,
        updatedAt: Date.now(),
        progress: { ...entry.progress, [path]: { time, duration } },
      })
    },
    [persist],
  )

  const saveMediaPrefs = useCallback(
    (id: string, path: string, patch: MediaPreferences) => {
      const entry = records.current.find((item) => item.id === id)
      if (!entry) return
      persist({
        ...entry,
        mediaPrefs: {
          ...entry.mediaPrefs,
          [path]: { ...entry.mediaPrefs?.[path], ...patch },
        },
      })
    },
    [persist],
  )

  const selectFile = useCallback(
    (file: MediaFile) => {
      if (locked.current || !active) return
      select(file)
      const entry = records.current.find((item) => item.id === active.infoHash)
      if (entry) persist({ ...entry, lastFile: file.path, updatedAt: Date.now() })
    },
    [active, select, persist],
  )

  const remove = useCallback(
    async (id: string) => {
      if (locked.current) return
      locked.current = true
      setBusy(true)
      try {
        if (active?.infoHash === id) await stop()
        await helperRequest(`/api/torrents/${id}`, { method: 'DELETE' })
        await deleteEntry(id)
        updateEntries(records.current.filter((item) => item.id !== id))
      } catch (error) {
        setError(`Could not remove this title: ${errorMessage(error)}`)
      } finally {
        locked.current = false
        setBusy(false)
      }
    },
    [active, stop, updateEntries],
  )

  const clear = useCallback(async () => {
    if (locked.current) return
    locked.current = true
    setBusy(true)
    try {
      await stop()
      await helperRequest('/api/library', { method: 'DELETE' })
      await clearLibrary()
      updateEntries([])
      setError('')
    } catch (error) {
      setError(`Could not clear history and downloads: ${errorMessage(error)}`)
    } finally {
      locked.current = false
      setBusy(false)
    }
  }, [stop, updateEntries])

  const status = opening
    ? 'Connecting to sources…'
    : selected
      ? 'Fetching video pieces…'
      : active
        ? active.files.some((file) => isVideoFile(file.name))
          ? 'Pick a video'
          : 'No video files in this torrent'
        : ''

  return {
    entries,
    active,
    selected,
    stats: session.stats,
    busy,
    status,
    error,
    open,
    select: selectFile,
    saveProgress,
    saveMediaPrefs,
    remove,
    clear,
    dismissError: () => setError(''),
  }
}
