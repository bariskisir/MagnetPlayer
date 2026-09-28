import { helperRequest } from './transport'
import { mediaUrl } from './connection'
import type { FileSnapshot, MediaFile, TorrentSnapshot } from './types'

class RemoteMediaFile implements MediaFile {
  index: number
  name: string
  path: string
  length: number
  downloaded: number
  downloadedRanges: FileSnapshot['downloadedRanges']
  progress: number
  done: boolean

  constructor(
    private session: TorrentSession,
    file: FileSnapshot,
  ) {
    this.index = file.index
    this.name = file.name
    this.path = file.path
    this.length = file.length
    this.downloaded = file.downloaded
    this.downloadedRanges = file.downloadedRanges
    this.progress = file.progress
    this.done = file.done
  }

  update(file: FileSnapshot) {
    this.downloaded = file.downloaded
    this.downloadedRanges = file.downloadedRanges
    this.progress = file.progress
    this.done = file.done
  }

  get streamURL() {
    return mediaUrl(this.session.infoHash, this.index)
  }
  get compatibilityURL() {
    return mediaUrl(this.session.infoHash, this.index, 'playlist.m3u8')
  }
  get downloadURL() {
    const url = new URL(this.streamURL)
    url.searchParams.set('download', '1')
    return url.href
  }

  select(offset?: number) {
    return this.session.selectFile(this.index, offset)
  }
  cursor(offset: number) {
    return this.session.updateCursor(this.index, offset)
  }
}

export class TorrentSession {
  readonly infoHash: string
  readonly name: string
  readonly files: RemoteMediaFile[]
  snapshot: TorrentSnapshot
  private controller: AbortController
  private timer?: ReturnType<typeof setInterval>
  private polling = false
  private revision = 0
  private selection: { index: number; promise: Promise<void> } | null = null
  private onUpdate: () => void = () => {}

  constructor(snapshot: TorrentSnapshot, controller: AbortController) {
    if (snapshot.error) throw new Error(snapshot.error)
    this.infoHash = snapshot.infoHash
    this.name = snapshot.name
    this.snapshot = snapshot
    this.controller = controller
    this.files = snapshot.files.map((file) => new RemoteMediaFile(this, file))
  }

  private apply(snapshot: TorrentSnapshot) {
    if (this.controller.signal.aborted) return
    if (snapshot.error) throw new Error(snapshot.error)
    this.snapshot = snapshot
    for (const file of snapshot.files) this.files[file.index]?.update(file)
    this.onUpdate()
  }

  startPolling(onUpdate: () => void, onError: (error: unknown) => void) {
    this.onUpdate = onUpdate
    this.timer = setInterval(async () => {
      if (this.polling || this.controller.signal.aborted) return
      this.polling = true
      const revision = this.revision
      try {
        const snapshot = await helperRequest<TorrentSnapshot>(`/api/torrents/${this.infoHash}`, {
          signal: this.controller.signal,
        })
        if (revision === this.revision) this.apply(snapshot)
      } catch (error) {
        if (!this.controller.signal.aborted) {
          clearInterval(this.timer)
          onError(error)
        }
      } finally {
        this.polling = false
      }
    }, 1000)
  }

  selectFile(index: number, offset?: number): Promise<void> {
    if (this.controller.signal.aborted) return Promise.resolve()
    if (this.selection?.index === index) return this.selection.promise
    if (this.snapshot.selected === index) {
      return offset === undefined ? Promise.resolve() : this.updateCursor(index, offset)
    }
    this.revision++
    const promise = helperRequest<TorrentSnapshot>(`/api/torrents/${this.infoHash}/select`, {
      method: 'POST',
      data: { index, ...(Number.isFinite(offset) ? { offset } : {}) },
      signal: this.controller.signal,
    })
      .then((snapshot) => this.apply(snapshot))
      .finally(() => {
        if (this.selection?.promise === promise) this.selection = null
      })
    this.selection = { index, promise }
    return promise
  }

  async updateCursor(index: number, offset: number): Promise<void> {
    if (this.controller.signal.aborted || !Number.isFinite(offset)) return
    if (this.snapshot.selected !== index) return
    if (this.snapshot.cursor === offset) return
    if (this.selection && this.selection.index !== index) return
    this.revision++
    this.snapshot.cursor = offset
    try {
      const result = await helperRequest<{ cursor: number }>(
        `/api/torrents/${this.infoHash}/cursor`,
        {
          method: 'POST',
          data: { index, offset },
          signal: this.controller.signal,
        },
      )
      if (this.snapshot.cursor === offset) this.snapshot.cursor = result.cursor
    } catch {
      // A failed cursor update is retried by the next playback tick.
      if (this.snapshot.cursor === offset) this.snapshot.cursor = Number.NaN
    }
  }

  dispose() {
    clearInterval(this.timer)
    this.controller.abort()
    this.onUpdate = () => {}
  }
}

export async function openTorrentSession(magnet: string, controller: AbortController) {
  const snapshot = await helperRequest<TorrentSnapshot>('/api/torrents', {
    method: 'POST',
    data: { magnet },
    signal: controller.signal,
  })
  return new TorrentSession(snapshot, controller)
}
