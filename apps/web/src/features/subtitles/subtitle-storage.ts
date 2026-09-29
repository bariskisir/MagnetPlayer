import { transaction } from '../../shared/storage/database'
import type { SubtitleCache } from './subtitle-types'

export function readSubtitleCache(id: string) {
  return transaction<SubtitleCache | undefined>(['subtitles'], 'readonly', (tx) =>
    tx.objectStore('subtitles').get(id),
  )
}

export function saveSubtitleCache(cache: SubtitleCache) {
  return transaction<IDBValidKey>(['subtitles'], 'readwrite', (tx) =>
    tx.objectStore('subtitles').put(cache),
  )
}
