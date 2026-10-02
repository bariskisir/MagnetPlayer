import type { ReactNode } from 'react'
import { ChevronRight } from 'lucide-react'
import { formatBytes } from '../../shared/format'
import DownloadMap from './DownloadMap'
import type { TransferStats } from '../helper/helper-types'

export default function PlayerPanel({
  children,
  stats,
  length,
  message,
  subtitleNote,
}: {
  children?: ReactNode
  stats?: TransferStats
  length?: number
  message?: string
  subtitleNote?: string
}) {
  return (
    <aside className="player-side" aria-label="Player panel">
      {subtitleNote && (
        <span className="subtitle-note" role="status">
          {subtitleNote}
        </span>
      )}
      {stats && length !== undefined && (
        <details className="transfer-panel">
          <summary aria-label="Download details">
            <span className="transfer-heading">{message || 'Downloading'}</span>
            <DownloadMap
              ranges={stats.ranges}
              length={length}
              progress={stats.progress}
              cursor={stats.cursor}
            />
            <span>↓ {formatBytes(stats.speed)}/s</span>
            <strong>{Math.round(stats.progress * 100)}%</strong>
            <ChevronRight size={14} className="transfer-toggle" aria-hidden="true" />
          </summary>
          <div className="transfer-details">
            <dl className="stream-stats">
              <div>
                <dt>Download</dt>
                <dd>↓ {formatBytes(stats.speed)}/s</dd>
              </div>
              <div>
                <dt>Upload</dt>
                <dd>↑ {formatBytes(stats.upload)}/s</dd>
              </div>
              <div>
                <dt>Peers</dt>
                <dd>{stats.peers}</dd>
              </div>
            </dl>
            <p className="transfer-total">
              {formatBytes(stats.downloaded)} / {formatBytes(length)}
            </p>
          </div>
        </details>
      )}
      {children}
    </aside>
  )
}
