import { useState } from 'react'
import type { FormEvent } from 'react'
import { AlertCircle, ArrowRight, Link2, LoaderCircle, X } from 'lucide-react'

import { isMagnetLink } from '../../shared/magnet'

type Props = {
  onAdd: (magnet: string) => Promise<boolean>
  onCancel: () => void
  canCancel: boolean
  busy: boolean
  connected: boolean
  compact?: boolean
  error?: string
  onDismiss?: () => void
}

export default function MagnetForm({
  onAdd,
  onCancel,
  canCancel,
  busy,
  connected,
  compact = false,
  error,
  onDismiss,
}: Props) {
  const [value, setValue] = useState('')
  const valid = isMagnetLink(value)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!valid || busy || !connected) return
    const magnet = value
    if (await onAdd(magnet)) setValue((current) => (current === magnet ? '' : current))
  }
  return (
    <div className={`magnet-form ${compact ? 'compact' : ''}`}>
      <form onSubmit={submit}>
        <label htmlFor="magnet">Magnet link</label>
        <div className="magnet-input">
          <Link2 size={18} />
          <input
            id="magnet"
            type="text"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder="magnet:?xt=urn:btih:…"
            autoComplete="off"
            spellCheck="false"
            required
            disabled={busy}
          />
          <button
            className="primary"
            type={canCancel ? 'button' : 'submit'}
            onClick={canCancel ? onCancel : undefined}
            disabled={!canCancel && (busy || !valid || !connected)}
            title={canCancel || connected ? undefined : 'Connect the helper to add a magnet.'}
          >
            {canCancel ? (
              <>
                Cancel <X size={16} />
              </>
            ) : busy ? (
              <LoaderCircle className="spin" size={17} />
            ) : (
              <>
                Add <ArrowRight size={16} />
              </>
            )}
          </button>
        </div>
      </form>
      {error && (
        <p className="error-banner" role="alert">
          <AlertCircle size={16} />
          <span>{error}</span>
          {onDismiss && (
            <button onClick={onDismiss} aria-label="Dismiss error">
              <X size={15} />
            </button>
          )}
        </p>
      )}
    </div>
  )
}
