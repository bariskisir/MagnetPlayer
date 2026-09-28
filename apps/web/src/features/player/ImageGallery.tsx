import { useEffect, useEffectEvent, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  ChevronLeft,
  ChevronRight,
  Download,
  LoaderCircle,
  Maximize,
  Minimize,
  Pause,
  Play,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react'
import type { MediaFile } from '../helper/types'

const clampZoom = (value: number) => Math.max(1, Math.min(8, value))
const SLIDESHOW_INTERVALS = [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10]

function GalleryImage({
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

export default function ImageGallery({
  files,
  initialPath,
  onClose,
}: {
  files: MediaFile[]
  initialPath: string
  onClose: () => void
}) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const viewportRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const drag = useRef<{ x: number; y: number; left: number; top: number } | null>(null)
  const [path, setPath] = useState(initialPath)
  const [zoom, setZoom] = useState(1)
  const previousZoom = useRef(1)
  const [playing, setPlaying] = useState(false)
  const [readyPath, setReadyPath] = useState<string | null>(null)
  const [interval, setIntervalSeconds] = useState(0.5)
  const [fullscreen, setFullscreen] = useState(false)
  const [fullscreenError, setFullscreenError] = useState('')
  const index = Math.max(
    0,
    files.findIndex((file) => file.path === path),
  )
  const file = files[index]

  const navigate = (direction: number) => {
    const next = files[(index + direction + files.length) % files.length]
    if (!next) return
    setPath(next.path)
    setReadyPath(null)
    setZoom(1)
    drag.current = null
    viewportRef.current?.scrollTo(0, 0)
  }

  const changeZoom = useEffectEvent((value: number) => setZoom(clampZoom(value)))
  const advanceSlide = useEffectEvent(() => navigate(1))
  const wheelZoom = useEffectEvent((event: WheelEvent) => {
    if (!file?.done) return
    event.preventDefault()
    changeZoom(zoom * Math.exp(-event.deltaY * 0.002))
  })

  useEffect(() => {
    const dialog = dialogRef.current
    const viewport = viewportRef.current
    const previousOverflow = document.body.style.overflow
    dialog?.showModal()
    document.body.style.overflow = 'hidden'
    const wheel = (event: WheelEvent) => wheelZoom(event)
    viewport?.addEventListener('wheel', wheel, { passive: false })
    const fullscreenChanged = () => setFullscreen(document.fullscreenElement === contentRef.current)
    document.addEventListener('fullscreenchange', fullscreenChanged)
    return () => {
      viewport?.removeEventListener('wheel', wheel)
      dialog?.close()
      document.removeEventListener('fullscreenchange', fullscreenChanged)
      if (document.fullscreenElement === contentRef.current)
        void document.exitFullscreen().catch(() => {})
      document.body.style.overflow = previousOverflow
    }
  }, [])

  useEffect(() => {
    if (!playing || files.length < 2 || readyPath !== file?.path) return
    const timer = window.setTimeout(() => advanceSlide(), interval * 1000)
    return () => window.clearTimeout(timer)
  }, [playing, interval, files.length, readyPath, file?.path])

  const toggleFullscreen = async () => {
    setFullscreenError('')
    try {
      if (document.fullscreenElement === contentRef.current) await document.exitFullscreen()
      else await contentRef.current?.requestFullscreen()
    } catch {
      setFullscreenError('Fullscreen could not be enabled.')
    }
  }

  useEffect(() => {
    const viewport = viewportRef.current
    if (viewport) {
      const ratio = zoom / previousZoom.current
      viewport.scrollLeft =
        (viewport.scrollLeft + viewport.clientWidth / 2) * ratio - viewport.clientWidth / 2
      viewport.scrollTop =
        (viewport.scrollTop + viewport.clientHeight / 2) * ratio - viewport.clientHeight / 2
    }
    previousZoom.current = zoom
  }, [zoom])

  if (!file) return null

  return createPortal(
    <dialog
      ref={dialogRef}
      className="image-gallery"
      aria-labelledby="image-gallery-title"
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
      onKeyDown={(event) => {
        if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
          event.preventDefault()
          navigate(event.key === 'ArrowLeft' ? -1 : 1)
        } else if (file.done && ['+', '=', '-', '0'].includes(event.key)) {
          event.preventDefault()
          setZoom((current) =>
            event.key === '0' ? 1 : clampZoom(current + (event.key === '-' ? -0.25 : 0.25)),
          )
        }
      }}
    >
      <div ref={contentRef} className="image-gallery-content">
        <header className="image-gallery-toolbar">
          <div className="image-gallery-heading">
            <h2 id="image-gallery-title">{file.name}</h2>
            <span aria-live="polite">
              {index + 1} / {files.length}
            </span>
          </div>
          <div className="image-gallery-controls">
            <button
              aria-label={playing ? 'Pause slideshow' : 'Start slideshow'}
              aria-pressed={playing}
              disabled={files.length < 2}
              onClick={() => setPlaying((current) => !current)}
            >
              {playing ? <Pause size={20} /> : <Play size={20} />}
            </button>
            <select
              aria-label="Slideshow interval"
              value={interval}
              onChange={(event) => setIntervalSeconds(Number(event.target.value))}
            >
              {SLIDESHOW_INTERVALS.map((seconds) => (
                <option key={seconds} value={seconds}>
                  {seconds} s
                </option>
              ))}
            </select>
            <button
              aria-label="Zoom out"
              disabled={!file.done || zoom <= 1}
              onClick={() => setZoom((current) => clampZoom(current - 0.25))}
            >
              <ZoomOut size={20} />
            </button>
            <button disabled={!file.done} title="Fit image (0)" onClick={() => setZoom(1)}>
              {Math.round(zoom * 100)}%
            </button>
            <button
              aria-label="Zoom in"
              disabled={!file.done || zoom >= 8}
              onClick={() => setZoom((current) => clampZoom(current + 0.25))}
            >
              <ZoomIn size={20} />
            </button>
            {file.done && (
              <a href={file.downloadURL} download={file.name} aria-label="Save image">
                <Download size={20} />
              </a>
            )}
            <button
              aria-label={fullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
              disabled={!document.fullscreenEnabled}
              onClick={() => {
                void toggleFullscreen()
              }}
            >
              {fullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
            </button>
            <button autoFocus aria-label="Close image gallery" onClick={onClose}>
              <X size={22} />
            </button>
          </div>
        </header>
        <div className="image-gallery-view">
          <div
            ref={viewportRef}
            className={`image-gallery-viewport${zoom > 1 ? ' zoomed' : ''}`}
            onDoubleClick={() => {
              if (file.done) setZoom((current) => (current > 1 ? 1 : 2))
            }}
            onPointerDown={(event) => {
              if (zoom <= 1 || event.button !== 0) return
              const viewport = event.currentTarget
              drag.current = {
                x: event.clientX,
                y: event.clientY,
                left: viewport.scrollLeft,
                top: viewport.scrollTop,
              }
              viewport.setPointerCapture(event.pointerId)
            }}
            onPointerMove={(event) => {
              if (!drag.current) return
              event.currentTarget.scrollLeft = drag.current.left - (event.clientX - drag.current.x)
              event.currentTarget.scrollTop = drag.current.top - (event.clientY - drag.current.y)
            }}
            onPointerUp={() => {
              drag.current = null
            }}
            onPointerCancel={() => {
              drag.current = null
            }}
            onLostPointerCapture={() => {
              drag.current = null
            }}
          >
            <div
              className="image-gallery-canvas"
              style={{ width: `${zoom * 100}%`, height: `${zoom * 100}%` }}
            >
              <GalleryImage file={file} slideshow={playing} onReady={setReadyPath} />
            </div>
          </div>
          {files.length > 1 && (
            <>
              <button
                className="image-gallery-prev"
                aria-label="Previous image"
                onClick={() => navigate(-1)}
              >
                <ChevronLeft size={28} />
              </button>
              <button
                className="image-gallery-next"
                aria-label="Next image"
                onClick={() => navigate(1)}
              >
                <ChevronRight size={28} />
              </button>
            </>
          )}
        </div>
        <p className="image-gallery-hint">
          ← → Browse · Scroll or + − to zoom · Drag to pan · Esc to close
        </p>
        {fullscreenError && (
          <p className="image-gallery-error" role="alert">
            {fullscreenError}
          </p>
        )}
      </div>
    </dialog>,
    document.body,
  )
}
