import { useContext, useState } from 'react'
import { ChevronRight, Image } from 'lucide-react'
import PlayableFileSection from './PlayableFileSection'
import { isAudioFile, isImageFile, isVideoFile } from '../../../shared/media'
import ImageGallery from '../gallery/ImageGallery'
import { PausePlaybackContext } from '../playback-context'
import type { LibraryEntry } from '../../library/library-types'
import type { MediaFile } from '../../helper/helper-types'

type Props = {
  files: MediaFile[]
  selected: MediaFile | null
  entry?: LibraryEntry
  onSelect: (file: MediaFile) => void
}

export default function MediaFileList({ files: allFiles, selected, entry, onSelect }: Props) {
  const pausePlayback = useContext(PausePlaybackContext)
  const files = allFiles.filter((file) => isVideoFile(file.name))
  const images = allFiles.filter((file) => isImageFile(file.name))
  const audio = allFiles.filter((file) => isAudioFile(file.name))
  const [imagePath, setImagePath] = useState<string | null>(null)
  const [imagesOpen, setImagesOpen] = useState(false)
  if (!files.length && !audio.length && !images.length) return null
  return (
    <section className="files-panel" aria-label="Files in this torrent">
      <PlayableFileSection
        kind="video"
        files={files}
        selected={selected}
        entry={entry}
        onSelect={onSelect}
      />
      <PlayableFileSection kind="audio" files={audio} selected={selected} onSelect={onSelect} />
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
