import type { ReactNode } from 'react'
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
      <div className="player-side-head">
        <h2>Now playing</h2>
      </div>
      {subtitleNote && (
        <span className="subtitle-note" role="status">
          {subtitleNote}
        </span>
      )}
      {stats && length !== undefined && (
        <>
          <div className="transfer-panel">
            <div className="transfer-heading">
              <span>{message || 'Downloading'}</span>
              <strong>{Math.round(stats.progress * 100)}%</strong>
            </div>
            <DownloadMap
              ranges={stats.ranges}
              length={length}
              progress={stats.progress}
              cursor={stats.cursor}
            />
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
        </>
      )}
      {children}
    </aside>
  )
}
