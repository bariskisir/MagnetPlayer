import { useEffect, useRef, useState } from 'react'
import { LoaderCircle } from 'lucide-react'
import type { MediaFile } from '../../helper/helper-types'

export default function GalleryImage({
  file,
  slideshow,
  onReady,
}: {
  file: MediaFile
  slideshow: boolean
  onReady: (path: string) => void
}) {
  const [displayed, setDisplayed] = useState<MediaFile | null>(null)
  const [failed, setFailed] = useState(false)
  const requestedPath = useRef(file.path)
  requestedPath.current = file.path
  const frames = displayed && displayed.path !== file.path ? [displayed, file] : [file]

  useEffect(() => setFailed(false), [file.path])
  useEffect(() => {
    if (displayed?.path === file.path) onReady(file.path)
  }, [file.path, displayed?.path, onReady])

  return (
    <>
      {frames.map(
        (frame) =>
          frame.done && (
            <img
              key={frame.path}
              src={frame.streamURL}
              alt={frame.name}
              draggable={false}
              hidden={displayed?.path !== frame.path}
              onLoad={async (event) => {
                const image = event.currentTarget
                try {
                  await image.decode()
                  if (requestedPath.current !== frame.path) return
                  setDisplayed(frame)
                  setFailed(false)
                  onReady(frame.path)
                } catch {
                  if (requestedPath.current === frame.path) setFailed(true)
                }
              }}
              onError={() => {
                if (requestedPath.current === frame.path) setFailed(true)
              }}
            />
          ),
      )}
      {(failed || (!slideshow && displayed?.path !== file.path)) && (
        <div className={`image-gallery-status${displayed ? ' waiting' : ''}`} role="status">
          {!failed && <LoaderCircle className="spin" size={24} />}
          <span>
            {failed
              ? 'This image could not be displayed.'
              : file.done
                ? 'Loading image…'
                : `Downloading image… ${Math.round(file.progress * 100)}%`}
          </span>
        </div>
      )}
    </>
  )
}
