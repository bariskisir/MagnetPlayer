import { useEffect, useRef } from 'react'
import { Trash2 } from 'lucide-react'

export default function ClearLibraryDialog({
  busy,
  onConfirm,
  onClose,
}: {
  busy: boolean
  onConfirm: () => Promise<void>
  onClose: () => void
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    dialog.current?.showModal()
  }, [])
  return (
    <dialog
      ref={dialog}
      className="dialog"
      aria-labelledby="clear-heading"
      onCancel={(event) => {
        event.preventDefault()
        if (!busy) onClose()
      }}
    >
      <h2 id="clear-heading">Clear library?</h2>
      <p>Deletes saved magnets, watch positions and cached video pieces.</p>
      <div className="dialog-actions">
        <button autoFocus disabled={busy} onClick={onClose}>
          Keep
        </button>
        <button
          className="danger"
          disabled={busy}
          onClick={async () => {
            await onConfirm()
            onClose()
          }}
        >
          <Trash2 size={15} /> Delete
        </button>
      </div>
    </dialog>
  )
}
