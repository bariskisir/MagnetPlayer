import { useContext, useState } from 'react'
import { ChevronRight, Download, FileVideo, Image, Music } from 'lucide-react'
import { formatBytes, formatDuration } from '../../shared/format'
import { isAudioFile, isImageFile, isVideoFile } from '../../shared/media'
import ImageGallery from './ImageGallery'
import { PausePlaybackContext } from './PlaybackContext'
import type { LibraryEntry } from '../library/types'
import type { MediaFile } from '../helper/types'

type Props = {
  files: MediaFile[]
  selected: MediaFile | null
  entry?: LibraryEntry
  onSelect: (file: MediaFile) => void
}

export default function FileList({ files: allFiles, selected, entry, onSelect }: Props) {
  const pausePlayback = useContext(PausePlaybackContext)
  const files = allFiles.filter((file) => isVideoFile(file.name))
  const images = allFiles.filter((file) => isImageFile(file.name))
  const audio = allFiles.filter((file) => isAudioFile(file.name))
  const [imagePath, setImagePath] = useState<string | null>(null)
  const [videosOpen, setVideosOpen] = useState(true)
  const [imagesOpen, setImagesOpen] = useState(false)
  const [audioOpen, setAudioOpen] = useState(false)
  if (!files.length && !audio.length && !images.length) return null
  return (
    <section className="files-panel" aria-label="Files in this torrent">
      {files.length > 0 && (
        <details
          className="file-section"
          open={videosOpen}
          onToggle={(event) => setVideosOpen(event.currentTarget.open)}
        >
          <summary>
            Videos <span>{files.length}</span>
            <ChevronRight size={15} />
          </summary>
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
        </details>
      )}
      {audio.length > 0 && (
        <details
          className="file-section audio-list"
          open={audioOpen}
          onToggle={(event) => setAudioOpen(event.currentTarget.open)}
        >
          <summary>
            Audios <span>{audio.length}</span>
            <ChevronRight size={15} />
          </summary>
          <div className="file-list">
            {audio.map((file) => (
              <div key={file.path} className={`file-row${selected === file ? ' selected' : ''}`}>
                <button
                  className="file-select"
                  onClick={() => onSelect(file)}
                  aria-current={selected === file ? 'true' : undefined}
                >
                  <Music size={17} />
                  <span className="file-name">{file.name}</span>
                  <span className="file-meta">{formatBytes(file.length)}</span>
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
            ))}
          </div>
        </details>
      )}
      {images.length > 0 && (
        <details
          className="image-list"
          open={imagesOpen}
          onToggle={(event) => setImagesOpen(event.currentTarget.open)}
        >
          <summary>
            Images <span>{images.length}</span>
            <ChevronRight size={15} />
          </summary>
          <div className="image-grid">
            {images.map((file) => (
              <button
                key={file.path}
                className="image-file"
                onClick={() => {
                  pausePlayback?.()
                  setImagePath(file.path)
                }}
                title={file.name}
                aria-label={`View ${file.name}`}
              >
                <span className="image-thumbnail">
                  {file.done ? (
                    <img src={file.streamURL} alt="" loading="lazy" />
                  ) : (
                    <Image size={28} />
                  )}
                  {!file.done && (
                    <span className="image-download">{Math.round(file.progress * 100)}%</span>
                  )}
                </span>
                <span className="image-file-name">{file.name}</span>
                {!file.done && (
                  <progress
                    className="watch-progress"
                    value={file.downloaded}
                    max={file.length || 1}
                    aria-label={`${file.name} downloaded`}
                  />
                )}
              </button>
            ))}
          </div>
        </details>
      )}
      {imagePath && images.some((file) => file.path === imagePath) && (
        <ImageGallery files={images} initialPath={imagePath} onClose={() => setImagePath(null)} />
      )}
    </section>
  )
}
