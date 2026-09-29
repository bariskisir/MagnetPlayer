import type { ByteRange } from '../helper/helper-types'

type Props = {
  ranges?: ByteRange[]
  length: number
  progress?: number
  cursor?: number
}

export default function DownloadMap({ ranges = [], length, progress = 0, cursor = 0 }: Props) {
  const percent = Math.round(progress * 100)

  const at = (value: number) => (Math.max(0, Math.min(1, value / (length || 1))) * 1000).toFixed(1)
  return (
    <div className="download-map">
      <svg
        className="download-progress"
        viewBox="0 0 1000 6"
        preserveAspectRatio="none"
        role="img"
        aria-label={`Video download map: ${percent}% verified, in file order`}
      >
        <rect className="download-map-track" width="1000" height="6" />
        {length > 0 &&
          ranges.map(([start, end]) => (
            <rect
              key={start}
              className="downloaded-piece"
              x={at(start)}
              width={((end - start) / length) * 1000}
              height="6"
            />
          ))}
        {length > 0 && cursor > 0 && (
          <rect className="playhead" x={at(cursor)} width="2" height="6" />
        )}
      </svg>
    </div>
  )
}
