import { useState } from 'react'
import { ChevronRight, Download, FileVideo, Music } from 'lucide-react'
import { formatBytes, formatDuration } from '../../../shared/format'
import type { MediaFile } from '../../helper/helper-types'
import type { LibraryEntry } from '../../library/library-types'

interface PlayableFileSectionProps {
  kind: 'video' | 'audio'
  files: MediaFile[]
  selected: MediaFile | null
  entry?: LibraryEntry
  onSelect: (file: MediaFile) => void
}

export default function PlayableFileSection({
  kind,
  files,
  selected,
  entry,
  onSelect,
}: PlayableFileSectionProps) {
  const [open, setOpen] = useState(kind === 'video')
  const Icon = kind === 'video' ? FileVideo : Music
  if (!files.length) return null
  return (
    <details
      className={`file-section${kind === 'audio' ? ' audio-list' : ''}`}
      open={open}
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary>
        {kind === 'video' ? 'Videos' : 'Audios'} <span>{files.length}</span>
        <ChevronRight size={15} />
      </summary>
      <div className="file-list">
        {files.map((file) => {
          const progress = kind === 'video' ? entry?.progress[file.path] : undefined
          return (
            <div key={file.path} className={`file-row${selected === file ? ' selected' : ''}`}>
              <button
                className="file-select"
                onClick={() => onSelect(file)}
                aria-current={selected === file ? 'true' : undefined}
              >
                <Icon size={17} />
                <span className="file-name">{file.name}</span>
                <span className="file-meta">
                  {progress ? `${formatDuration(progress.time)} · ` : ''}
                  {formatBytes(file.length)}
                </span>
              </button>
              {file.done ? (
                <a
                  className="file-save"
                  href={file.downloadURL}
                  download={file.name}
                  aria-label={`Save ${file.name}`}
                  title={`Save ${file.name}`}
                >
                  <Download size={14} />
                </a>
              ) : (
                <progress
                  className="watch-progress"
                  value={file.downloaded || 0}
                  max={file.length || 1}
                  aria-label={`${file.name} downloaded`}
                />
              )}
            </div>
          )
        })}
      </div>
    </details>
  )
}
