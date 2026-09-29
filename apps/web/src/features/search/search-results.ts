import { parseMagnetLink } from '../../shared/magnet'
import type { SearchResponse, SearchResult } from '../../shared/search-providers'

export const SEARCH_COLUMNS = [
  { key: 'name', label: 'Name' },
  { key: 'sources', label: 'Source' },
  { key: 'seeders', label: 'Seeders' },
  { key: 'leechers', label: 'Leechers' },
  { key: 'size', label: 'Size' },
  { key: 'files', label: 'Files' },
  { key: 'added', label: 'Added' },
  { key: 'username', label: 'Uploader' },
] as const

export type SearchSortKey = (typeof SEARCH_COLUMNS)[number]['key']

export function decodeSearchName(value: string): string {
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

export function sortSearchResults(
  results: SearchResult[],
  key: SearchSortKey,
  descending: boolean,
): SearchResult[] {
  return [...results].sort((a, b) => {
    const left = key === 'sources' ? a.sources?.join(', ') || 'Pirate Bay' : a[key]
    const right = key === 'sources' ? b.sources?.join(', ') || 'Pirate Bay' : b[key]
    if (left == null || right == null)
      return left == null ? (right == null ? a.infoHash.localeCompare(b.infoHash) : 1) : -1
    const comparison =
      typeof left === 'number' && typeof right === 'number'
        ? left - right
        : String(left).localeCompare(String(right), undefined, { numeric: true })
    return (descending ? -comparison : comparison) || a.infoHash.localeCompare(b.infoHash)
  })
}

export function searchNotice(response: SearchResponse): string {
  if (response.warnings?.length) return response.warnings.join(' ')
  if (response.partial) return 'Some results could not be loaded. Try searching again.'
  if (response.limited) return 'More results may be available. Refine your search to find them.'
  return ''
}
