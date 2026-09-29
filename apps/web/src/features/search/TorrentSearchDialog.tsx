import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Search, X } from 'lucide-react'
import { errorMessage } from '../../shared/errors'
import { sortSearchResults, type SearchSortKey } from './search-results'
import { useTorrentSearch } from './use-torrent-search'
import SearchResultsTable from './SearchResultsTable'

import {
  SEARCH_PROVIDERS,
  type SearchProvider,
  type SearchResult,
} from '../../shared/search-providers'

const PAGE_SIZE = 100

export default function TorrentSearchDialog({
  entries,
  busy,
  onAdd,
  onClose,
}: {
  entries: { id: string }[]
  busy: boolean
  onAdd: (results: SearchResult[]) => Promise<void>
  onClose: () => void
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const resultsPanel = useRef<HTMLDivElement>(null)
  const {
    query,
    setQuery,
    provider,
    setProvider,
    results,
    searching,
    searched,
    error,
    setError,
    notice,
    search: runSearch,
    cancelSearch,
  } = useTorrentSearch()
  const providerName = SEARCH_PROVIDERS.find((item) => item.id === provider)!.name
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [adding, setAdding] = useState(false)
  const [sort, setSort] = useState<SearchSortKey>('seeders')
  const [descending, setDescending] = useState(true)
  const [page, setPage] = useState(1)
  const known = new Set(entries.map((entry) => entry.id))
  const chosen = results.filter(
    (result) => selected.has(result.infoHash) && !known.has(result.infoHash),
  )
  const sorted = sortSearchResults(results, sort, descending)
  const pages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE))
  const visible = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const available = visible.filter((result) => !known.has(result.infoHash))

  useEffect(() => {
    dialog.current?.showModal()
  }, [])

  useEffect(() => {
    if (resultsPanel.current) resultsPanel.current.scrollTop = 0
  }, [page, sort, descending])

  const changeSort = (key: SearchSortKey) => {
    setPage(1)
    setDescending(sort === key ? !descending : key !== 'name' && key !== 'username')
    setSort(key)
  }

  const search = async () => {
    if (adding) return
    setSelected(new Set())
    setPage(1)
    await runSearch()
  }

  const add = async () => {
    if (!chosen.length || adding || busy) return
    setAdding(true)
    setError('')
    try {
      await onAdd(chosen)
    } catch (error) {
      setError(errorMessage(error))
      setAdding(false)
    }
  }

  return (
    <dialog
      ref={dialog}
      className="dialog online-search"
      aria-labelledby="online-search-heading"
      onCancel={(event) => {
        event.preventDefault()
        if (adding) return
        if (searching) cancelSearch()
        else onClose()
      }}
    >
      <div className="search-heading">
        <div>
          <h2 id="online-search-heading">Find your next watch</h2>
          <p>Search providers and add titles to your library.</p>
        </div>
        <button
          className="icon-button"
          onClick={onClose}
          disabled={adding}
          aria-label="Close search"
        >
          <X size={18} />
        </button>
      </div>
      <form
        className="online-search-form"
        onSubmit={(event) => {
          event.preventDefault()
          void search()
        }}
      >
        <input
          autoFocus
          type="search"
          value={query}
          maxLength={200}
          placeholder="Search for a movie, series or title…"
          aria-label="Search torrents"
          disabled={adding || searching}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            // Search inputs clear natively on Escape; abort the search instead
            // so the query stays and can be searched again.
            if (event.key === 'Escape' && searching) {
              event.preventDefault()
              cancelSearch()
            }
          }}
        />
        <label className="search-provider">
          <select
            aria-label="Search provider"
            value={provider}
            disabled={adding || searching}
            onChange={(event) => {
              setProvider(event.target.value as SearchProvider)
            }}
          >
            {SEARCH_PROVIDERS.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        <button
          type={searching ? 'button' : 'submit'}
          className="primary"
          disabled={(!searching && !query.trim()) || adding}
          onClick={(event) => {
            if (!searching) return
            // Cancelling changes this button to submit before the click's default action.
            event.preventDefault()
            cancelSearch()
          }}
        >
          {searching ? (
            <>
              <X size={15} /> Cancel
            </>
          ) : (
            <>
              <Search size={15} /> Search
            </>
          )}
        </button>
      </form>
      <div className="search-toolbar">
        <span role="status">
          {searching
            ? `Searching ${provider === 'all' ? 'all providers' : providerName}…`
            : searched
              ? `${results.length} results`
              : 'Search for torrents, then select titles to add.'}
        </span>
      </div>
      {error && (
        <div className="error-banner" role="alert">
          {error}
        </div>
      )}
      {notice && (
        <span className="subtle" role="status">
          {notice}
        </span>
      )}
      <div ref={resultsPanel} className="search-results" aria-busy={searching}>
        {results.length > 0 ? (
          <SearchResultsTable
            visible={visible}
            available={available}
            known={known}
            selected={selected}
            setSelected={setSelected}
            adding={adding}
            sort={sort}
            descending={descending}
            changeSort={changeSort}
          />
        ) : (
          <div className="search-empty" role="status">
            <Search size={28} aria-hidden="true" />
            <p>
              {searching
                ? 'Searching…'
                : searched
                  ? 'No torrents found.'
                  : 'Results will appear here.'}
            </p>
            {!searching && (
              <span className="subtle">
                {searched
                  ? 'Try a different title or search provider.'
                  : 'Choose a provider or search them all at once.'}
              </span>
            )}
          </div>
        )}
      </div>
      {results.length > 0 && (
        <nav className="search-pagination" aria-label="Search result pages">
          <span>
            {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, results.length)} of{' '}
            {results.length}
          </span>
          <button
            disabled={page <= 1 || adding}
            onClick={() => setPage(page - 1)}
            aria-label="Previous results page"
          >
            <ChevronLeft size={16} />
          </button>
          <label>
            Page{' '}
            <select
              aria-label="Results page"
              value={page}
              disabled={adding}
              onChange={(event) => setPage(Number(event.target.value))}
            >
              {Array.from({ length: pages }, (_, index) => (
                <option key={index} value={index + 1}>
                  {index + 1}
                </option>
              ))}
            </select>{' '}
            of {pages}
          </label>
          <button
            disabled={page >= pages || adding}
            onClick={() => setPage(page + 1)}
            aria-label="Next results page"
          >
            <ChevronRight size={16} />
          </button>
        </nav>
      )}
      <div className="search-footer">
        <span>{chosen.length} selected</span>
        <button onClick={onClose} disabled={adding}>
          Cancel
        </button>
        <button
          className="primary"
          disabled={!chosen.length || adding || busy || searching}
          onClick={() => void add()}
        >
          {adding ? 'Adding…' : 'Add'}
          {!adding && chosen.length > 0 ? ` (${chosen.length})` : ''}
        </button>
      </div>
    </dialog>
  )
}
