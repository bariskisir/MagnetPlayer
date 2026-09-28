import { useCallback, useEffect, useRef, useState } from 'react'
import { helperRequest } from './transport'

export function useHelperStatus() {
  const [connected, setConnected] = useState(false)
  const pending = useRef<AbortController | null>(null)

  const check = useCallback(async (): Promise<boolean> => {
    pending.current?.abort()
    const controller = new AbortController()
    pending.current = controller
    try {
      await helperRequest('/api/pair', { signal: controller.signal, timeout: 2500 })
      if (!controller.signal.aborted) setConnected(true)
      return !controller.signal.aborted
    } catch {
      if (!controller.signal.aborted) setConnected(false)
      return false
    } finally {
      if (pending.current === controller) pending.current = null
    }
  }, [])

  useEffect(() => {
    const changed = () => {
      setConnected(false)
      void check()
    }
    void check()
    const timer = setInterval(() => {
      if (!pending.current) void check()
    }, 3000)
    window.addEventListener('helper-connection-change', changed)

    return () => {
      pending.current?.abort()
      clearInterval(timer)
      window.removeEventListener('helper-connection-change', changed)
    }
  }, [check])

  return { connected, check }
}
