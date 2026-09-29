import { errorMessage } from '../errors.js'
import WebTorrent from 'webtorrent'
import type { TorrentFile, TorrentOptions } from 'webtorrent'
import type { RuntimeTorrent, PieceRange } from './torrent-types.js'
import { isTorrentId, type TorrentSnapshot } from '../contracts/torrent.js'
import { isVideoFile, isAudioFile, isImageFile } from '../contracts/media.js'
import parseTorrent from 'parse-torrent'
import { mkdir, rm, readdir } from 'node:fs/promises'
import { join } from 'node:path'
import { readOptionalFile, writeFileAtomically } from '../storage/atomic-files.js'
import { DiskPieceStore } from '../storage/piece-store.js'

import { windowPieces, samePieces, downloadedRanges } from './piece-ranges.js'
import { VERSION } from '../config.js'

export class TorrentEngine {
  readonly root: string
  private readonly client: WebTorrent
  private active: RuntimeTorrent | null
  private selected: number | null
  private position: number
  private window: PieceRange[]
  private error: string
  private pending: boolean
  private epoch: number
  private operation?: Promise<TorrentSnapshot>

  constructor(root: string) {
    this.root = root
    this.client = new WebTorrent({
      natUpnp: false,
      natPmp: false,
      lsd: false,
      userAgent: `MagnetPlayerHelper/${VERSION}`,
    })
    this.client.on('error', (error) => {
      this.error = errorMessage(error)
    })
    this.active = null
    this.selected = null
    this.position = 0
    this.window = []
    this.error = ''
    this.pending = false
    this.epoch = 0
  }

  open(magnet: string): Promise<TorrentSnapshot> {
    if (this.pending)
      return Promise.reject(
        Object.assign(new Error('Another torrent is opening. Try again shortly.'), { status: 409 }),
      )
    this.pending = true
    const epoch = ++this.epoch
    this.operation = this.openTorrent(magnet, epoch).finally(() => {
      this.pending = false
    })
    return this.operation
  }

  private async openTorrent(magnet: string, epoch: number): Promise<TorrentSnapshot> {
    const check = () => {
      if (epoch !== this.epoch) throw new Error('Torrent session stopped.')
    }
    let torrent: RuntimeTorrent | undefined
    try {
      if (typeof magnet !== 'string' || magnet.length > 16384 || !magnet.startsWith('magnet:?'))
        throw new Error('A valid magnet link is required.')
      const parsed = await parseTorrent(magnet)
      check()
      if (!isTorrentId(parsed.infoHash)) throw new Error('A BitTorrent v1 hash is required.')
      if (this.active?.infoHash === parsed.infoHash && this.active.ready) return this.snapshot()
      await this.stopActive()
      check()
      this.error = ''
      const directory = join(this.root, parsed.infoHash)
      await mkdir(directory, { recursive: true })
      const metadata = await readOptionalFile(join(directory, 'metadata.torrent'))
      check()
      torrent = this.client.add(metadata || magnet, {
        // Upstream types describe a factory; WebTorrent constructs chunk stores with new.
        store: DiskPieceStore as unknown as TorrentOptions['store'],
        storeOpts: { root: this.root },
        announce: parsed.announce,
        urlList: parsed.urlList,
        destroyStoreOnDestroy: false,
        deselect: true,
        strategy: 'sequential',
      }) as RuntimeTorrent
      this.active = torrent
      torrent.on('error', (error) => {
        this.error = errorMessage(error)
      })
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          cleanup()
          reject(
            new Error(
              'No torrent metadata arrived within 30 seconds. Check seed availability and try again.',
            ),
          )
        }, 30000)

        const cleanup = () => {
          clearTimeout(timeout)
          torrent!.removeListener('ready', ready)
          torrent!.removeListener('error', failed)
          torrent!.removeListener('close', closed)
        }

        const ready = () => {
          cleanup()
          resolve()
        }

        const failed = (error: Error | string) => {
          cleanup()
          reject(error)
        }

        const closed = () => {
          cleanup()
          reject(new Error('Torrent session stopped.'))
        }
        torrent!.once('ready', ready)
        torrent!.once('error', failed)
        torrent!.once('close', closed)
      })
      check()
      this.clearWindow()
      await writeFileAtomically(join(directory, 'metadata.torrent'), torrent.torrentFile)
      check()
      return this.snapshot()
    } catch (error) {
      if (torrent && this.active === torrent) await this.stopActive()
      throw error
    }
  }

  snapshot(): TorrentSnapshot {
    if (!this.active?.ready || this.active.destroyed)
      throw new Error(this.error || 'No active torrent. Open a title first.')
    const torrent = this.active
    return {
      infoHash: torrent.infoHash,
      name: torrent.name,
      error: this.error,
      files: torrent.files.map((file, index) => {
        const ranges = downloadedRanges(torrent, file)
        const downloaded = ranges.reduce((total, [start, end]) => total + end - start, 0)
        return {
          index,
          name: file.name,
          path: file.path,
          length: file.length,
          downloaded,
          downloadedRanges: ranges,
          progress: file.length ? downloaded / file.length : 0,
          done: downloaded === file.length,
        }
      }),
      selected: this.selected,
      cursor: this.position,
      speed: torrent.downloadSpeed,
      upload: torrent.uploadSpeed,
      peers: torrent.numPeers,
    }
  }

  file(id: string, index: number, requireSelected = true): TorrentFile {
    if (
      !isTorrentId(id) ||
      this.active?.infoHash !== id ||
      !this.active.ready ||
      this.active.destroyed
    )
      throw new Error('Open this torrent before requesting a file.')
    const file = Number.isSafeInteger(index) && this.active.files[index]
    if (!file || (!isVideoFile(file.name) && !isAudioFile(file.name) && !isImageFile(file.name)))
      throw new Error('Media file not found.')
    if (requireSelected && !isImageFile(file.name) && this.selected !== index)
      throw Object.assign(new Error('Select this video first.'), { status: 409 })
    return file
  }

  select(id: string, index: number, offset: number | null = null) {
    const file = this.file(id, index, false)
    if (!isVideoFile(file.name) && !isAudioFile(file.name))
      throw new Error('Select a video or audio file for playback.')
    if (this.selected !== index) {
      this.clearWindow()
      this.selected = index
      this.position = 0
    }
    if (typeof offset === 'number' && Number.isFinite(offset))
      this.position = this.clamp(file, offset)
    this.applyWindow(file)
    return this.snapshot()
  }
  // Moves the download window to the byte the player is currently reading. Re-selecting
  // the same file without an offset keeps the playhead where it is.
  cursor(id: string, index: number, offset?: number) {
    if (typeof offset !== 'number' || !Number.isFinite(offset))
      throw new Error('A byte offset is required.')
    const file = this.file(id, index)
    if (!isVideoFile(file.name) && !isAudioFile(file.name))
      throw new Error('A playback cursor requires a video or audio file.')
    this.position = this.clamp(file, offset)
    this.applyWindow(file)
    return { cursor: this.position }
  }

  private clamp(file: TorrentFile, offset: number) {
    return Math.max(0, Math.min(file.length, Math.floor(offset)))
  }

  private clearWindow() {
    if (this.active && !this.active.destroyed) {
      for (const file of this.active.files) file.deselect()
      // File boundaries can share pieces. Restore full image selections after
      // clearing the video window so seeking never interrupts their downloads.
      for (const file of this.active.files) if (isImageFile(file.name) && file.length) file.select()
    }
    this.window = []
  }

  private applyWindow(file: TorrentFile) {
    if (!this.active) return
    const next = windowPieces(this.active, file, this.position)
    if (samePieces(this.window, next)) return
    this.clearWindow()
    for (const [from, to] of next) this.active.select(from, to)
    this.window = next
  }

  async stop() {
    this.epoch++
    await this.stopActive()
    if (this.pending) await this.operation?.catch(() => {})
  }

  private async stopActive() {
    const torrent = this.active
    this.active = null
    this.selected = null
    this.position = 0
    this.window = []
    if (torrent && !torrent.destroyed)
      await new Promise<void>((resolve) =>
        torrent.destroy({ destroyStore: false }, () => resolve()),
      )
  }

  async remove(id: string) {
    if (!isTorrentId(id)) throw new Error('Invalid torrent id.')
    if (this.active?.infoHash === id) await this.stop()
    await rm(join(this.root, id), { recursive: true, force: true })
  }

  async clear() {
    await this.stop()
    const ids = await readdir(this.root).catch((error) => {
      if (error.code === 'ENOENT') return []
      throw error
    })
    for (const id of ids.filter(isTorrentId)) await this.remove(id)
  }

  async close() {
    await this.stop()
    await new Promise<void>((resolve) => this.client.destroy(() => resolve()))
  }
}
