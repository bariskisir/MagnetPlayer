export type SearchResult = {
  id: string
  name: string
  infoHash: string
  seeders: number | null
  leechers: number | null
  size: number | null
  files: number | null
  added: number
  username: string
  status: string
  imdb: string
  magnet?: string
  sources?: string[]
}

export const SEARCH_PROVIDERS = [
  { id: 'all', name: 'All' },
  { id: 'piratebay', name: 'Pirate Bay' },
  { id: 'torrents-csv', name: 'Torrents-csv' },
  { id: 'knaben', name: 'Knaben' },
  { id: 'yts', name: 'YTS' },
] as const

export type SearchProvider = (typeof SEARCH_PROVIDERS)[number]['id']
