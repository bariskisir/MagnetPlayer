import type { Dispatch, SetStateAction } from 'react'
import { ArrowDown, ArrowUp } from 'lucide-react'
import { formatBytes } from '../../shared/format'
import type { SearchResult } from '../../shared/search-providers'
import { SEARCH_COLUMNS, type SearchSortKey } from './search-results'

interface SearchResultsTableProps {
  visible: SearchResult[]
  available: SearchResult[]
  known: Set<string>
  selected: Set<string>
  setSelected: Dispatch<SetStateAction<Set<string>>>
  adding: boolean
  sort: SearchSortKey
  descending: boolean
  changeSort: (key: SearchSortKey) => void
}

export default function SearchResultsTable({
  visible,
  available,
  known,
  selected,
  setSelected,
  adding,
  sort,
  descending,
  changeSort,
}: SearchResultsTableProps) {
  return (
    <table>
      <thead>
        <tr>
          <th>
            <input
              type="checkbox"
              aria-label="Select all results on this page"
              disabled={!available.length || adding}
              checked={
                available.length > 0 && available.every((result) => selected.has(result.infoHash))
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
          {SEARCH_COLUMNS.map((column) => (
            <th
              key={column.key}
              aria-sort={sort === column.key ? (descending ? 'descending' : 'ascending') : 'none'}
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
          <tr key={result.infoHash} className={selected.has(result.infoHash) ? 'selected' : ''}>
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
              {known.has(result.infoHash) && <span className="subtle">Already in library</span>}
            </td>
            <td>{result.sources?.join(', ') || 'Pirate Bay'}</td>
            <td className="search-seeders">{result.seeders?.toLocaleString() ?? '—'}</td>
            <td>{result.leechers?.toLocaleString() ?? '—'}</td>
            <td>{result.size === null ? '—' : formatBytes(result.size)}</td>
            <td>{result.files?.toLocaleString() ?? '—'}</td>
            <td>{result.added > 0 ? new Date(result.added * 1000).toLocaleDateString() : '—'}</td>
            <td>{result.username || '—'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
