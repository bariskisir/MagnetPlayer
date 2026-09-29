import { parseMagnetLink } from '../../shared/magnet'
import type { LibraryEntry } from './library-types'

export interface LibraryAddition {
  id: string
  name: string
  magnet: string
}

export function createLibraryEntries(
  items: LibraryAddition[],
  entries: LibraryEntry[],
  now = Date.now(),
): LibraryEntry[] {
  const known = new Set(entries.map((entry) => entry.id))
  const added: LibraryEntry[] = []
  for (const item of items) {
    const id = item.id.toLowerCase()
    if (known.has(id)) continue
    const magnet = parseMagnetLink(item.magnet)
    if (
      !/^[a-f0-9]{40}$/.test(id) ||
      new URL(magnet).searchParams.get('xt')?.toLowerCase() !== `urn:btih:${id}`
    )
      throw new Error('Invalid torrent in search results.')
    known.add(id)
    added.push({
      id,
      name: item.name,
      magnet,
      videos: [],
      progress: {},
      addedAt: now,
      updatedAt: now,
    })
  }
  return added
}

export function upsertLibraryEntry(
  entries: LibraryEntry[],
  entry: LibraryEntry,
): { entry: LibraryEntry; entries: LibraryEntry[] } {
  const existing = entries.find((item) => item.id === entry.id)
  const next = { ...entry, addedAt: existing?.addedAt ?? existing?.updatedAt ?? entry.updatedAt }
  return {
    entry: next,
    entries: existing
      ? entries.map((item) => (item.id === entry.id ? next : item))
      : [next, ...entries],
  }
}
