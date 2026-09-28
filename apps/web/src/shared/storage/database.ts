const DATABASE_NAME = 'magnet-player-v1'
const DATABASE_VERSION = 3
let connection: Promise<IDBDatabase> | null = null

function openDatabase(): Promise<IDBDatabase> {
  if (connection) return connection
  connection = new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains('library'))
        db.createObjectStore('library', { keyPath: 'id' })
      if (!db.objectStoreNames.contains('subtitles'))
        db.createObjectStore('subtitles', { keyPath: 'id' })
      if (db.objectStoreNames.contains('pieces')) db.deleteObjectStore('pieces')
    }
    request.onsuccess = () => {
      const db = request.result
      db.onversionchange = () => {
        db.close()
        connection = null
      }
      resolve(db)
    }
    request.onerror = () => {
      connection = null
      reject(request.error ?? new Error('Browser storage is unavailable.'))
    }
    request.onblocked = () => {
      connection = null
      reject(new Error('Close other player tabs to update browser storage.'))
    }
  })
  return connection
}

export async function transaction<T = void>(
  stores: string[],
  mode: IDBTransactionMode,
  operation: (transaction: IDBTransaction) => IDBRequest<T> | void,
): Promise<T> {
  const db = await openDatabase()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(stores, mode)
    const request = operation(tx)
    tx.oncomplete = () => resolve(request?.result as T)
    tx.onerror = () => reject(tx.error ?? new Error('Browser storage is unavailable.'))
    tx.onabort = () => reject(tx.error ?? new Error('Browser storage operation was interrupted.'))
  })
}
