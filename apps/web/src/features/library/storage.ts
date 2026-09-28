import { transaction } from '../../shared/storage/database'
import type { LibraryEntry } from './types'

export function readLibrary() {
  return transaction<LibraryEntry[]>(['library'], 'readonly', (tx) =>
    tx.objectStore('library').getAll(),
  )
}

export function saveEntry(entry: LibraryEntry) {
  return transaction<IDBValidKey>(['library'], 'readwrite', (tx) =>
    tx.objectStore('library').put(entry),
  )
}

export function saveEntries(entries: LibraryEntry[]) {
  return transaction(['library'], 'readwrite', (tx) => {
    const store = tx.objectStore('library')
    for (const entry of entries) store.put(entry)
  })
}

export function deleteEntry(id: string) {
  return transaction(['library', 'subtitles'], 'readwrite', (tx) => {
    tx.objectStore('library').delete(id)
    tx.objectStore('subtitles').delete(IDBKeyRange.bound(`${id}/`, `${id}0`, false, true))
  })
}

export function clearLibrary() {
  return transaction(['library', 'subtitles'], 'readwrite', (tx) => {
    tx.objectStore('library').clear()
    tx.objectStore('subtitles').clear()
  })
}
