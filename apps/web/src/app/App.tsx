import { lazy, Suspense, useState } from 'react'
import { Magnet } from 'lucide-react'
import ClearLibraryDialog from '../features/library/ClearLibraryDialog'
import PlayerPanel from '../features/player/PlayerPanel'
import MagnetForm from '../features/library/MagnetForm'
import Sidebar from '../features/library/Sidebar'
import FileList from '../features/player/FileList'
import HelperConnection from '../features/helper/HelperConnection'
import useLibrary from '../features/library/useLibrary'
import { useHelperStatus } from '../features/helper/useHelperStatus'
import { isAudioFile } from '../shared/media'

const VideoPlayer = lazy(() => import('../features/player/VideoPlayer'))
const AudioPlayer = lazy(() => import('../features/player/AudioPlayer'))

export default function App() {
  const library = useLibrary()
  const helper = useHelperStatus()
  const [confirmClear, setConfirmClear] = useState(false)
  const entry = library.entries.find((item) => item.id === library.active?.infoHash)
  const started = library.entries.length > 0
  const MediaPlayer =
    library.selected && isAudioFile(library.selected.name) ? AudioPlayer : VideoPlayer
  return (
    <div className={`app-shell ${started ? 'started' : 'empty'}`}>
      <header className="site-header">
        <a href="/" className="brand" aria-label="Magnet Player home">
          <span className="brand-mark">
            <Magnet size={20} strokeWidth={2.5} />
          </span>
          magnet<span className="brand-light">player</span>
        </a>
        {(library.busy || library.active) && (
          <div className="session-status" role="status">
            <span className="live-dot" />
            <span className="session-label">{library.status || 'Idle'}</span>
          </div>
        )}
        <HelperConnection connected={helper.connected} checkConnection={helper.check} />
        {started && (
          <MagnetForm
            compact
            onAdd={library.open}
            onCancel={library.cancelOpen}
            canCancel={library.canCancel}
            busy={library.busy}
            connected={helper.connected}
            error={library.error}
            onDismiss={library.dismissError}
          />
        )}
      </header>
      {!started ? (
        <div className="empty-state">
          <MagnetForm
            onAdd={library.open}
            onCancel={library.cancelOpen}
            canCancel={library.canCancel}
            busy={library.busy}
            connected={helper.connected}
            error={library.error}
            onDismiss={library.dismissError}
          />
        </div>
      ) : (
        <div className="workspace">
          <Sidebar
            entries={library.entries}
            activeId={library.active?.infoHash}
            onOpen={library.open}
            onRemove={library.remove}
            onClear={() => setConfirmClear(true)}
            disabled={library.busy}
          />
          {!library.selected && (
            <main>
              <p className="empty-hint">
                {library.busy
                  ? 'Loading title…'
                  : library.active
                    ? 'No video or audio files in this torrent.'
                    : 'Pick a title or add a magnet.'}
              </p>
            </main>
          )}
          {library.active && library.selected && (
            <Suspense
              fallback={
                <div className="video-stage" role="status">
                  Loading player…
                </div>
              }
            >
              <MediaPlayer
                key={`${library.active.infoHash}/${library.selected.path}`}
                id={library.active.infoHash}
                file={library.selected}
                entry={entry}
                stats={library.stats}
                onProgress={library.saveProgress}
                onPrefs={library.saveMediaPrefs}
                autoPlay
              >
                <FileList
                  key={library.active.infoHash}
                  files={library.active.files}
                  selected={library.selected}
                  entry={entry}
                  onSelect={library.select}
                />
              </MediaPlayer>
            </Suspense>
          )}
          {library.active && !library.selected && (
            <PlayerPanel>
              <FileList
                key={library.active.infoHash}
                files={library.active.files}
                selected={library.selected}
                entry={entry}
                onSelect={library.select}
              />
            </PlayerPanel>
          )}
        </div>
      )}
      {confirmClear && (
        <ClearLibraryDialog
          busy={library.busy}
          onConfirm={library.clear}
          onClose={() => setConfirmClear(false)}
        />
      )}
    </div>
  )
}
