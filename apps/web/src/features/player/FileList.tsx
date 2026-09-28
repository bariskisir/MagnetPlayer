import { Download, FileVideo } from 'lucide-react'
import { formatBytes, formatDuration } from '../../shared/format'
import { isVideoFile } from '../../shared/media'
import type { LibraryEntry } from '../library/types'
import type { MediaFile } from '../helper/types'

type Props = {
  files: MediaFile[]
  selected: MediaFile | null
  entry?: LibraryEntry
  onSelect: (file: MediaFile) => void
}

export default function FileList({ files: allFiles, selected, entry, onSelect }: Props) {
  const files = allFiles.filter((file) => isVideoFile(file.name))
  if (!files.length) return null
  return (
    <section className="files-panel" aria-label="Videos in this torrent">
      <div className="file-list">
        {files.map((file) => {
          const progress = entry?.progress?.[file.path]
          return (
            <div key={file.path} className={`file-row ${selected === file ? 'selected' : ''}`}>
              <button
                className="file-select"
                onClick={() => onSelect(file)}
                aria-current={selected === file ? 'true' : undefined}
              >
                <FileVideo size={17} />
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
    </section>
  )
}
