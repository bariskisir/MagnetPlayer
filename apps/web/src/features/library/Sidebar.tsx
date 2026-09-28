import { Trash2 } from 'lucide-react'
import { formatDuration } from '../../shared/format'
import type { LibraryEntry } from './types'

type Props = {
  entries: LibraryEntry[]
  activeId?: string
  onOpen: (magnet: string, entry: LibraryEntry) => void
  onRemove: (id: string) => void
  onClear: () => void
  disabled: boolean
}

export default function Sidebar({ entries, activeId, onOpen, onRemove, onClear, disabled }: Props) {
  return (
    <aside className="sidebar" aria-label="Library">
      <div className="sidebar-head">
        <span>Library</span>
        <button
          onClick={onClear}
          disabled={disabled || !entries.length}
          aria-label="Clear library"
          title="Clear library"
        >
          <Trash2 size={15} />
        </button>
      </div>
      <div className="sidebar-list">
        {entries.map((entry) => {
          const progress = entry.progress[entry.lastFile || '']
          const percent = progress?.duration
            ? Math.min(100, (progress.time / progress.duration) * 100)
            : 0
          return (
            <div className={`side-item ${entry.id === activeId ? 'active' : ''}`} key={entry.id}>
              <button
                className="side-open"
                onClick={() => onOpen(entry.magnet, entry)}
                disabled={disabled || entry.id === activeId}
                aria-current={entry.id === activeId ? 'true' : undefined}
              >
                <span className="side-name">{entry.name}</span>
                <span className="side-meta">
                  {progress
                    ? percent >= 99
                      ? 'Watched'
                      : formatDuration(progress.time)
                    : 'Not started'}
                </span>
                <progress
                  className="watch-progress"
                  value={percent}
                  max="100"
                  aria-label={`${entry.name} watch progress`}
                />
              </button>
              <button
                className="side-remove"
                onClick={() => onRemove(entry.id)}
                disabled={disabled}
                aria-label={`Remove ${entry.name}`}
                title="Remove"
              >
                <Trash2 size={13} />
              </button>
            </div>
          )
        })}
      </div>
    </aside>
  )
}
