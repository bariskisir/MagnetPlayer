import { mkdir, readFile, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { writeFileAtomically } from './atomic-files.js'

type StoreOptions = { root: string; length: number; torrent: { infoHash: string } }
type StoreCallback = (error: Error | null) => void
type ReadCallback = (error: Error | null, data?: Buffer) => void
type ReadOptions = { offset?: number; length?: number }

export class DiskPieceStore {
  readonly chunkLength: number
  readonly length: number
  private readonly directory: string
  private readonly ready: Promise<string | undefined>
  private readonly pending: Set<Promise<void>>

  constructor(chunkLength: number, options: StoreOptions) {
    this.chunkLength = chunkLength
    this.length = options.length
    this.directory = join(options.root, options.torrent.infoHash, 'pieces')
    this.ready = mkdir(this.directory, { recursive: true })
    this.pending = new Set()
  }

  private path(index: number) {
    if (
      !Number.isSafeInteger(index) ||
      index < 0 ||
      index >= Math.ceil(this.length / this.chunkLength)
    )
      throw new Error('Invalid piece index')
    return join(this.directory, `${index}.piece`)
  }

  put(index: number, data: Buffer, callback: StoreCallback = () => {}) {
    const operation = (async () => {
      await this.ready
      await writeFileAtomically(this.path(index), data)
    })()
    this.pending.add(operation)
    operation.then(
      () => {
        this.pending.delete(operation)
        callback(null)
      },
      (error) => {
        this.pending.delete(operation)
        callback(error)
      },
    )
  }

  get(index: number, options: ReadOptions | ReadCallback, callback?: ReadCallback) {
    if (typeof options === 'function') {
      callback = options
      options = {}
    }
    const done = callback
    if (!done) throw new Error('A piece read callback is required.')
    const readOptions = options as ReadOptions
    ;(async () => {
      await this.ready
      const data = await readFile(this.path(index))
      const offset = readOptions.offset || 0
      return data.subarray(
        offset,
        readOptions.length == null ? undefined : offset + readOptions.length,
      )
    })().then(
      (data) => done(null, data),
      (error) => {
        if (error.code === 'ENOENT') error.notFound = true
        done(error)
      },
    )
  }

  close(callback: StoreCallback = () => {}) {
    Promise.allSettled([...this.pending]).then(() => callback(null))
  }

  destroy(callback: StoreCallback = () => {}) {
    Promise.allSettled([...this.pending])
      .then(() => rm(this.directory, { recursive: true, force: true }))
      .then(() => callback(null), callback)
  }
}
