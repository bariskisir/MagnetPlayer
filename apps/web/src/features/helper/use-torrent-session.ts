import { useCallback, useEffect, useRef, useState } from 'react'
import { errorMessage } from '../../shared/errors'
import { helperRequest } from './helper-client'
import { openTorrentSession, type TorrentSession } from './torrent-session'
import type { MediaFile } from './helper-types'
import type { TransferStats } from './helper-types'

const EMPTY_STATS: TransferStats = {
  speed: 0,
  upload: 0,
  peers: 0,
  downloaded: 0,
  progress: 0,
  cursor: 0,
  ranges: [],
}

export function useTorrentSession(onError: (message: string) => void) {
  const [active, setActive] = useState<TorrentSession | null>(null)
  const [selected, setSelected] = useState<MediaFile | null>(null)
  const [stats, setStats] = useState(EMPTY_STATS)
  const sessionRef = useRef<TorrentSession | null>(null)
  const selectedRef = useRef<MediaFile | null>(null)
  const pending = useRef<AbortController | null>(null)

  const reset = useCallback(() => {
    pending.current?.abort()
    pending.current = null
    sessionRef.current?.dispose()
    sessionRef.current = null
    selectedRef.current = null
    setActive(null)
    setSelected(null)
    setStats(EMPTY_STATS)
  }, [])

  const stop = useCallback(async () => {
    reset()
    await helperRequest('/api/stop', { method: 'POST' })
  }, [reset])

  const open = useCallback(
    async (magnet: string) => {
      reset()
      const controller = new AbortController()
      pending.current = controller
      try {
        await helperRequest('/api/stop', { method: 'POST', signal: controller.signal })
        controller.signal.throwIfAborted()
        const session = await openTorrentSession(magnet, controller)
        if (controller.signal.aborted) {
          session.dispose()
          return null
        }
        sessionRef.current = session
        session.startPolling(
          () => {
            const file = selectedRef.current
            const snapshot = session.snapshot
            setStats({
              speed: snapshot.speed,
              upload: snapshot.upload,
              peers: snapshot.peers,
              downloaded: file?.downloaded ?? 0,
              progress: file?.progress ?? 0,
              cursor: snapshot.cursor,
              ranges: file?.downloadedRanges ?? [],
            })
          },
          (error) => onError(`Torrent could not continue: ${errorMessage(error)}`),
        )
        setActive(session)
        return session
      } catch (error) {
        controller.abort()
        throw error
      } finally {
        if (pending.current === controller) pending.current = null
      }
    },
    [reset, onError],
  )

  const select = useCallback((file: MediaFile | null) => {
    selectedRef.current = file
    setSelected(file)
    setStats(EMPTY_STATS)
  }, [])

  useEffect(() => {
    window.addEventListener('helper-connection-change', reset)
    return () => {
      window.removeEventListener('helper-connection-change', reset)
      pending.current?.abort()
      sessionRef.current?.dispose()
    }
  }, [reset])

  return { active, selected, stats, open, select, stop }
}
