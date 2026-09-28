import { useEffect, useRef, useState } from 'react'
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, Search, X } from 'lucide-react'
import { helperRequest } from '../helper/transport'
import { errorMessage } from '../../shared/errors'
import { formatBytes } from '../../shared/format'
import { parseMagnetLink } from '../../shared/magnet'

import {
  SEARCH_PROVIDERS,
  type SearchProvider,
  type SearchResult,
} from '../../shared/search-providers'
export type { SearchResult } from '../../shared/search-providers'

type SortKey = keyof SearchResult
const PAGE_SIZE = 100
const columns: { key: SortKey; label: string }[] = [
  { key: 'name', label: 'Name' },
  { key: 'sources', label: 'Source' },
  { key: 'seeders', label: 'Seeders' },
  { key: 'leechers', label: 'Leechers' },
  { key: 'size', label: 'Size' },
  { key: 'files', label: 'Files' },
  { key: 'added', label: 'Added' },
  { key: 'username', label: 'Uploader' },
  { key: 'status', label: 'Status' },
  { key: 'id', label: 'ID' },
  { key: 'imdb', label: 'IMDb' },
]

function decodeName(value: string): string {
  // Decode provider HTML entities without inserting upstream markup into the page.
  const text = document.createElement('textarea')
  text.innerHTML = value.replace(/</g, '&lt;').replace(/>/g, '&gt;')
  return text.value
}

export function searchMagnet(result: SearchResult): string {
  return parseMagnetLink(
    result.magnet || `magnet:?xt=urn:btih:${result.infoHash}&dn=${encodeURIComponent(result.name)}`,
  )
}

export default function OnlineSearchDialog({
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
  const request = useRef<AbortController | null>(null)
  const resultsPanel = useRef<HTMLDivElement>(null)
  const [query, setQuery] = useState('')
  const [provider, setProvider] = useState<SearchProvider>('piratebay')
  const providerName = SEARCH_PROVIDERS.find((item) => item.id === provider)!.name
  const [results, setResults] = useState<SearchResult[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [searching, setSearching] = useState(false)
  const [searched, setSearched] = useState(false)
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState('')
  const [sort, setSort] = useState<SortKey>('seeders')
  const [descending, setDescending] = useState(true)
  const [page, setPage] = useState(1)
  const [notice, setNotice] = useState('')
  const known = new Set(entries.map((entry) => entry.id))
  const chosen = results.filter(
    (result) => selected.has(result.infoHash) && !known.has(result.infoHash),
  )
  const sorted = [...results].sort((a, b) => {
    const left = sort === 'sources' ? a.sources?.join(', ') || 'Pirate Bay' : a[sort]
    const right = sort === 'sources' ? b.sources?.join(', ') || 'Pirate Bay' : b[sort]
    if (left == null || right == null)
      return left == null ? (right == null ? a.infoHash.localeCompare(b.infoHash) : 1) : -1
    const comparison =
      typeof left === 'number' && typeof right === 'number'
        ? left - right
        : String(left).localeCompare(String(right), undefined, { numeric: true })
    return (descending ? -comparison : comparison) || a.infoHash.localeCompare(b.infoHash)
  })
  const pages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE))
  const visible = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const available = visible.filter((result) => !known.has(result.infoHash))

  useEffect(() => {
    dialog.current?.showModal()
    return () => request.current?.abort()
  }, [])

  useEffect(() => {
    if (resultsPanel.current) resultsPanel.current.scrollTop = 0
  }, [page, sort, descending])

  const changeSort = (key: SortKey) => {
    setPage(1)
    setDescending(sort === key ? !descending : key !== 'name' && key !== 'username')
    setSort(key)
  }

  const search = async (providerId = provider) => {
    const q = query.trim()
    if (adding) return
    request.current?.abort()
    if (!q) {
      setSearching(false)
      setResults([])
      setSelected(new Set())
      setSearched(false)
      setPage(1)
      setError('')
      setNotice('')
      return
    }
    const controller = new AbortController()
    request.current = controller
    setSearching(true)
    setError('')
    setResults([])
    setSelected(new Set())
    setSearched(false)
    setPage(1)
    setNotice('')
    try {
      const response = await helperRequest<{
        results: SearchResult[]
        limited?: boolean
        partial?: boolean
        warnings?: string[]
      }>(`/api/search?q=${encodeURIComponent(q)}&provider=${providerId}`, {
        signal: controller.signal,
        timeout: 25000,
      })
      if (controller.signal.aborted) return
      setResults(response.results.map((result) => ({ ...result, name: decodeName(result.name) })))
      setSearched(true)
      setNotice(
        response.warnings?.length
          ? response.warnings.join(' ')
          : response.partial
            ? 'Some results could not be loaded. Try searching again.'
            : response.limited
              ? 'More results may be available. Refine your search to find them.'
              : '',
      )
    } catch (error) {
      if (!controller.signal.aborted) setError(errorMessage(error))
    } finally {
      if (request.current === controller) setSearching(false)
    }
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
        if (!adding) onClose()
      }}
    >
      <div className="search-heading">
        <h2 id="online-search-heading">Search Online</h2>
        <button onClick={onClose} disabled={adding} aria-label="Close search">
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
          placeholder="Search"
          aria-label="Search torrents"
          disabled={adding}
          onChange={(event) => setQuery(event.target.value)}
        />
        <label className="search-provider">
          <select
            aria-label="Search provider"
            value={provider}
            disabled={adding}
            onChange={(event) => {
              const next = event.target.value as SearchProvider
              setProvider(next)
              void search(next)
            }}
          >
            {SEARCH_PROVIDERS.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className="primary" disabled={!query.trim() || adding}>
          <Search size={15} /> {searching ? 'Search again' : 'Search'}
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
          <table>
            <thead>
              <tr>
                <th>
                  <input
                    type="checkbox"
                    aria-label="Select all results on this page"
                    disabled={!available.length || adding}
                    checked={
                      available.length > 0 &&
                      available.every((result) => selected.has(result.infoHash))
                    }
                    onChange={(event) => {
                      const checked = event.target.checked
                      setSelected((current) => {
                        const next = new Set(current)
                        for (const result of available) {
                          if (checked) next.add(result.infoHash)
                          else next.delete(result.infoHash)
                        }
                        return next
                      })
                    }}
                  />
                </th>
                {columns.map((column) => (
                  <th
                    key={column.key}
                    aria-sort={
                      sort === column.key ? (descending ? 'descending' : 'ascending') : 'none'
                    }
                  >
                    <button onClick={() => changeSort(column.key)}>
                      {column.label}
                      {sort === column.key &&
                        (descending ? <ArrowDown size={12} /> : <ArrowUp size={12} />)}
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visible.map((result) => (
                <tr
                  key={result.infoHash}
                  className={selected.has(result.infoHash) ? 'selected' : ''}
                >
                  <td>
                    <input
                      type="checkbox"
                      aria-label={`Select ${result.name}`}
                      disabled={known.has(result.infoHash) || adding}
                      checked={known.has(result.infoHash) || selected.has(result.infoHash)}
                      onChange={(event) =>
                        setSelected((current) => {
                          const next = new Set(current)
                          if (event.target.checked) next.add(result.infoHash)
                          else next.delete(result.infoHash)
                          return next
                        })
                      }
                    />
                  </td>
                  <td className="search-name">
                    {result.name}
                    {known.has(result.infoHash) && (
                      <span className="subtle">Already in library</span>
                    )}
                  </td>
                  <td>{result.sources?.join(', ') || 'Pirate Bay'}</td>
                  <td className="search-seeders">{result.seeders?.toLocaleString() ?? '—'}</td>
                  <td>{result.leechers?.toLocaleString() ?? '—'}</td>
                  <td>{result.size === null ? '—' : formatBytes(result.size)}</td>
                  <td>{result.files?.toLocaleString() ?? '—'}</td>
                  <td>
                    {result.added > 0 ? new Date(result.added * 1000).toLocaleDateString() : '—'}
                  </td>
                  <td>{result.username || '—'}</td>
                  <td>{result.status || '—'}</td>
                  <td>{result.id}</td>
                  <td>{result.imdb || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p>
            {searching
              ? 'Searching…'
              : searched
                ? 'No torrents found.'
                : 'Results will appear here.'}
          </p>
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
