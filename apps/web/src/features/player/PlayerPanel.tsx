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
        <span>Player</span>
      </div>
      {subtitleNote && (
        <span className="subtitle-note" role="status">
          {subtitleNote}
        </span>
      )}
      {stats && length !== undefined && (
        <>
          <DownloadMap
            ranges={stats.ranges}
            length={length}
            progress={stats.progress}
            cursor={stats.cursor}
          />
          <div className="stream-stats">
            <span>{message}</span>
            <span>↓ {formatBytes(stats.speed)}/s</span>
            <span>↑ {formatBytes(stats.upload)}/s</span>
            <span>{stats.peers} peers</span>
            <span>
              {formatBytes(stats.downloaded)} / {formatBytes(length)}
            </span>
          </div>
        </>
      )}
      {children}
    </aside>
  )
}
