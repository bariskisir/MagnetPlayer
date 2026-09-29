import { errorMessage as describeError } from '../../shared/errors'
import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Check, Copy, Terminal, X } from 'lucide-react'
import {
  HELPER_COMMAND,
  HELPER_SETUP_COMMAND,
  configureHelper,
  helperConnection,
} from './connection-settings'

export default function HelperConnection({
  connected,
  checkConnection,
}: {
  connected: boolean
  checkConnection: () => Promise<boolean>
}) {
  const current = helperConnection()
  const [host, setHost] = useState(String(current?.host || '127.0.0.1'))
  const [port, setPort] = useState(String(current?.port || 45891))
  const [key, setKey] = useState('')
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState('')
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const panel = useRef<HTMLDivElement | null>(null)
  useEffect(() => () => clearTimeout(timer.current ?? undefined), [])

  const copy = async (command = HELPER_COMMAND) => {
    try {
      await navigator.clipboard.writeText(command)
      setCopied(command)
      clearTimeout(timer.current ?? undefined)
      timer.current = setTimeout(() => setCopied(null), 1600)
    } catch {
      setMessage('Copy failed. Select the command and copy it manually.')
    }
  }
  useEffect(() => {
    if (!open) return

    const dismiss = (event: PointerEvent) => {
      if (panel.current && !panel.current.contains(event.target as Node)) setOpen(false)
    }

    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', dismiss)
    window.addEventListener('keydown', escape)

    return () => {
      document.removeEventListener('pointerdown', dismiss)
      window.removeEventListener('keydown', escape)
    }
  }, [open])
  return (
    <div className="helper-panel" ref={panel}>
      <button
        className="badge"
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((current) => !current)}
      >
        <span className={`live-dot ${connected ? '' : 'off'}`} />
        {connected ? 'Connected' : 'Offline'}
      </button>
      {open && (
        <div className="helper-body" role="dialog" aria-label="Helper connection">
          <div className="helper-heading">
            <h2>Helper connection</h2>
            <button
              className="icon-button"
              aria-label="Close connection settings"
              onClick={() => setOpen(false)}
            >
              <X size={16} />
            </button>
          </div>
          <p className="subtle">
            Run the helper on your device and keep its terminal open while watching.
          </p>
          <div className="helper-command">
            <p>
              <Terminal size={15} /> {HELPER_COMMAND}
            </p>
            <button
              className={`copy-button ${copied === HELPER_COMMAND ? 'copied' : ''}`}
              onClick={() => void copy()}
              aria-label={copied === HELPER_COMMAND ? 'Copied' : 'Copy the helper command'}
            >
              {copied === HELPER_COMMAND ? <Check size={15} /> : <Copy size={15} />}
              <span role="status">{copied === HELPER_COMMAND ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
          <details className="helper-setup">
            <summary>First install with npm 12?</summary>
            <p className="subtle">
              Run this command to install required components. Use the short command afterward. New
              package versions or clearing the npx cache may require setup again.
            </p>
            <div className="helper-command">
              <p>{HELPER_SETUP_COMMAND}</p>
              <button
                className={`copy-button ${copied === HELPER_SETUP_COMMAND ? 'copied' : ''}`}
                onClick={() => void copy(HELPER_SETUP_COMMAND)}
                aria-label={
                  copied === HELPER_SETUP_COMMAND
                    ? 'Setup command copied'
                    : 'Copy the setup command'
                }
              >
                {copied === HELPER_SETUP_COMMAND ? <Check size={15} /> : <Copy size={15} />}
                <span role="status">{copied === HELPER_SETUP_COMMAND ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </details>
          <form
            onSubmit={async (event: FormEvent) => {
              event.preventDefault()
              setBusy(true)
              setMessage('')
              try {
                configureHelper(key.trim(), port, host)
                if (!(await checkConnection()))
                  throw new Error(
                    'Could not connect to the helper. Keep its terminal open and check the host and port.',
                  )
                setKey('')
              } catch (error) {
                setMessage(describeError(error))
              } finally {
                setBusy(false)
              }
            }}
          >
            <label className="helper-host">
              Host
              <input
                type="text"
                value={host}
                onChange={(event) => setHost(event.target.value)}
                placeholder="127.0.0.1"
                aria-label="Helper host"
                autoComplete="off"
                spellCheck="false"
              />
            </label>
            <label className="helper-port">
              Port
              <input
                type="number"
                min="1024"
                max="65535"
                value={port}
                onChange={(event) => setPort(event.target.value)}
                aria-label="Helper port"
                required
              />
            </label>
            <label className="helper-key">
              Connection key <span className="subtle">(optional)</span>
              <input
                type="password"
                value={key}
                onChange={(event) => setKey(event.target.value)}
                placeholder="Key"
                aria-label="Connection key"
                autoComplete="off"
              />
            </label>
            <button className="primary" disabled={busy}>
              Connect
            </button>
          </form>
          {message && <p className="subtle">{message}</p>}
        </div>
      )}
    </div>
  )
}
