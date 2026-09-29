import { lazy, Suspense, useEffect, useState } from 'react'
import { AlertCircle, Magnet, Search, X } from 'lucide-react'
import TorrentSearchDialog from '../features/search/TorrentSearchDialog'
import { searchMagnet } from '../features/search/search-results'
import ClearLibraryDialog from '../features/library/ClearLibraryDialog'
import PlayerPanel from '../features/player/PlayerPanel'
import MagnetForm from '../features/library/MagnetForm'
import LibrarySidebar from '../features/library/LibrarySidebar'
import MediaFileList from '../features/player/files/MediaFileList'
import HelperConnection from '../features/helper/HelperConnection'
import useLibrary from '../features/library/use-library'
import { useHelperStatus } from '../features/helper/use-helper-status'
import { isAudioFile } from '../shared/media'

const VideoPlayer = lazy(() => import('../features/player/VideoPlayer'))
const AudioPlayer = lazy(() => import('../features/player/AudioPlayer'))

export default function App() {
  const library = useLibrary()
  const helper = useHelperStatus()
  const [confirmClear, setConfirmClear] = useState(false)
  const [searchOnline, setSearchOnline] = useState(false)
  const entry = library.entries.find((item) => item.id === library.active?.infoHash)
  const started = library.entries.length > 0
  const MediaPlayer =
    library.selected && isAudioFile(library.selected.name) ? AudioPlayer : VideoPlayer

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && library.opening) library.cancelOpen()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [library.opening, library.cancelOpen])

  return (
    <div className={`app-shell ${started ? 'started' : 'empty'}`}>
      {library.error && (
        <div className="global-error" role="alert">
          <AlertCircle size={16} />
          <span>{library.error}</span>
          <button onClick={library.dismissError} aria-label="Dismiss error">
            <X size={15} />
          </button>
        </div>
      )}
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
        {started && (
          <>
            <button
              className="badge search-online-button"
              onClick={() => setSearchOnline(true)}
              disabled={!helper.connected}
              title={helper.connected ? undefined : 'Connect the helper to search torrents.'}
            >
              <Search size={14} /> Search Torrents
            </button>
            <HelperConnection connected={helper.connected} checkConnection={helper.check} />
            <MagnetForm
              compact
              onAdd={library.open}
              onCancel={library.cancelOpen}
              canCancel={library.canCancel}
              busy={library.busy}
              connected={helper.connected}
            />
          </>
        )}
      </header>
      {!started ? (
        <div className="empty-state">
          <div className="home-connection">
            <HelperConnection connected={helper.connected} checkConnection={helper.check} />
          </div>
          <MagnetForm
            onAdd={library.open}
            onCancel={library.cancelOpen}
            canCancel={library.canCancel}
            busy={library.busy}
            connected={helper.connected}
          />
          <div className="home-or" aria-hidden="true">
            <span />
            or
            <span />
          </div>
          <button
            className="badge home-search-button"
            onClick={() => setSearchOnline(true)}
            disabled={!helper.connected}
            title={helper.connected ? undefined : 'Connect the helper to search torrents.'}
          >
            <Search size={14} /> Search Torrents
          </button>
        </div>
      ) : (
        <div className="workspace">
          <LibrarySidebar
            entries={library.entries}
            activeId={library.active?.infoHash}
            onOpen={library.open}
            onRemove={library.remove}
            onClear={() => setConfirmClear(true)}
            disabled={library.busy}
            removeDisabled={library.busy && !library.opening}
          />
          {!library.selected && (
            <main>
              <div className="empty-hint">
                <p>
                  {library.busy
                    ? 'Connecting to peers and fetching torrent metadata…'
                    : library.active
                      ? 'No video or audio files in this torrent.'
                      : 'Pick a title or add a magnet.'}
                </p>
                {library.opening && (
                  <button className="badge" onClick={library.cancelOpen}>
                    <X size={14} /> Cancel
                  </button>
                )}
              </div>
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
                <MediaFileList
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
              <MediaFileList
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
      {searchOnline && (
        <TorrentSearchDialog
          entries={library.entries}
          busy={library.busy}
          onClose={() => setSearchOnline(false)}
          onAdd={async (results) => {
            await library.addMany(
              results.map((result) => ({
                id: result.infoHash,
                name: result.name,
                magnet: searchMagnet(result),
              })),
            )
            setSearchOnline(false)
            if (results[0]) void library.open(searchMagnet(results[0]))
          }}
        />
      )}
    </div>
  )
}
