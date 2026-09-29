import { useEffect, useRef, useState } from 'react'
import { helperRequest } from '../helper/helper-client'
import { errorMessage } from '../../shared/errors'
import type { SearchProvider, SearchResponse, SearchResult } from '../../shared/search-providers'
import { decodeSearchName, searchNotice } from './search-results'

export function useTorrentSearch() {
  const request = useRef<AbortController | null>(null)
  const [query, setQuery] = useState('')
  const [provider, setProvider] = useState<SearchProvider>('all')
  const [results, setResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [searched, setSearched] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => () => request.current?.abort(), [])

  const cancelSearch = () => {
    const controller = request.current
    request.current = null
    controller?.abort()
    setSearching(false)
  }

  const search = async () => {
    cancelSearch()
    setResults([])
    setSearched(false)
    setError('')
    setNotice('')
    const term = query.trim()
    if (!term) return
    const controller = new AbortController()
    request.current = controller
    setSearching(true)
    try {
      const response = await helperRequest<SearchResponse>(
        `/api/search?q=${encodeURIComponent(term)}&provider=${provider}`,
        { signal: controller.signal, timeout: 25000 },
      )
      if (controller.signal.aborted) return
      setResults(
        response.results.map((result) => ({ ...result, name: decodeSearchName(result.name) })),
      )
      setSearched(true)
      setNotice(searchNotice(response))
    } catch (error) {
      if (!controller.signal.aborted) setError(errorMessage(error))
    } finally {
      if (request.current === controller) {
        request.current = null
        setSearching(false)
      }
    }
  }

  return {
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
    search,
    cancelSearch,
  }
}
