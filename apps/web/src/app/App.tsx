import { lazy, Suspense, useEffect, useState } from 'react'
import { AlertCircle, ExternalLink, Magnet, Play, Search, X } from 'lucide-react'
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
        <div className="header-actions">
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
          <HelperConnection connected={helper.connected} checkConnection={helper.check} />
        </div>
      </header>
      {!started ? (
        <main className="empty-state">
          <div className="welcome-heading">
            <span className="eyebrow">Your media. Your space.</span>
            <h1>
              Your next watch.
              <br />
              <span>One link away.</span>
            </h1>
            <p>
              Stream a title as it downloads. Keep your library, save your place, and come back for
              more.
            </p>
            <ol className="welcome-steps">
              <li>
                <span>01</span>Connect your helper
              </li>
              <li>
                <span>02</span>Add a magnet or search
              </li>
              <li>
                <span>03</span>Make yourself comfortable
              </li>
            </ol>
          </div>
          <section className="start-panel" aria-label="Start watching">
            <div className="start-panel-heading">
              <span className="start-icon" aria-hidden="true">
                <Play size={22} />
              </span>
              <h2>Let’s press play.</h2>
              <p>Paste a magnet link to add it to your library.</p>
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
              or find something to watch
              <span />
            </div>
            <button
              className="badge home-search-button"
              onClick={() => setSearchOnline(true)}
              disabled={!helper.connected}
              title={helper.connected ? undefined : 'Connect the helper to search torrents.'}
            >
              <Search size={16} /> Search torrents
            </button>
            <p className="connection-note" role="status">
              <span className={`live-dot ${helper.connected ? '' : 'off'}`} />
              {helper.connected
                ? 'Helper connected. Ready when you are.'
                : 'Connect the helper using the Offline button above to get started.'}
            </p>
          </section>
          <div className="home-footer">
            <span>Video · Audio · Images</span>
            <nav className="project-links" aria-label="Project links">
              <a
                href="https://github.com/bariskisir/MagnetPlayer"
                target="_blank"
                rel="noopener noreferrer"
              >
                GitHub <ExternalLink size={12} aria-hidden="true" />
              </a>
              <a
                href="https://www.npmjs.com/package/magnet-player-helper"
                target="_blank"
                rel="noopener noreferrer"
              >
                npm <ExternalLink size={12} aria-hidden="true" />
              </a>
            </nav>
            <span>Your library stays on this device.</span>
          </div>
        </main>
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
            <main className="workspace-empty">
              <div className="empty-hint">
                <span className="welcome-icon" aria-hidden="true">
                  <Play size={24} />
                </span>
                <h1>
                  {library.busy
                    ? 'Getting things ready'
                    : library.active
                      ? 'Explore your files'
                      : 'Ready when you are'}
                </h1>
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
