import { join } from 'node:path'
import { readOptionalFile, writeFileAtomically } from '../storage/files.js'
import { Ffmpeg } from './ffmpeg.js'
import { SEGMENT_SECONDS } from './hls.js'
import { parseMediaMetadata, type MediaMetadata } from './probe.js'

export type SegmentTrack = { kind: 'muxed' } | { kind: 'video' } | { kind: 'audio'; index: number }
type SegmentOptions = {
  id: string
  fileIndex: number
  segmentIndex: number
  source: string
  duration: number
  track: SegmentTrack
}
const VIDEO_ENCODING = [
  '-c:v',
  'libx264',
  '-preset',
  'veryfast',
  '-crf',
  '23',
  '-vf',
  "scale='min(1920,iw)':-2",
  '-pix_fmt',
  'yuv420p',
]
const AUDIO_ENCODING = ['-c:a', 'aac', '-ac', '2', '-b:a', '128k']

export class Transcoder {
  private ffmpeg: Ffmpeg
  private probes = new Map<string, Promise<MediaMetadata>>()
  private pending = new Map<string, Promise<Buffer>>()
  private generation = 0
  private stopping: Promise<void> | null = null

  constructor(
    private root: string,
    executable?: string,
  ) {
    this.ffmpeg = new Ffmpeg(executable)
  }

  probe(id: string, index: number, source: string): Promise<MediaMetadata> {
    if (this.stopping) return Promise.reject(new Error('Video conversion stopped.'))
    const key = `${id}/${index}`
    const cached = this.probes.get(key)
    if (cached) return cached
    const operation = this.ffmpeg
      .run(['-hide_banner', '-nostdin', '-i', source, '-t', '0', '-f', 'null', '-'])
      .then(({ stderr }) => parseMediaMetadata(stderr))
      .catch((error) => {
        this.probes.delete(key)
        throw error
      })
    this.probes.set(key, operation)
    return operation
  }

  segment(options: SegmentOptions): Promise<Buffer> {
    const { id, fileIndex, segmentIndex, source, duration, track } = options
    if (this.stopping) return Promise.reject(new Error('Video conversion stopped.'))
    if (
      !Number.isSafeInteger(segmentIndex) ||
      segmentIndex < 0 ||
      segmentIndex >= Math.ceil(duration / SEGMENT_SECONDS)
    )
      return Promise.reject(new Error('Invalid media segment.'))
    if (
      track.kind === 'audio' &&
      (!Number.isSafeInteger(track.index) || track.index < 0 || track.index > 31)
    )
      return Promise.reject(new Error('Invalid audio stream.'))
    const directory = join(
      this.root,
      id,
      'converted-v2',
      String(fileIndex),
      track.kind === 'muxed' ? '' : track.kind === 'video' ? 'video' : `audio-${track.index}`,
    )
    const target = join(directory, `${segmentIndex}.ts`)
    const pending = this.pending.get(target)
    if (pending) return pending
    const args = [
      '-hide_banner',
      '-loglevel',
      'error',
      '-nostdin',
      '-ss',
      String(segmentIndex * SEGMENT_SECONDS),
      '-i',
      source,
      '-t',
      String(Math.min(SEGMENT_SECONDS, duration - segmentIndex * SEGMENT_SECONDS)),
    ]
    if (track.kind !== 'audio') args.push('-map', '0:v:0', ...VIDEO_ENCODING)
    if (track.kind !== 'video')
      args.push('-map', track.kind === 'audio' ? `0:a:${track.index}` : '0:a:0?', ...AUDIO_ENCODING)
    args.push('-sn', '-f', 'mpegts', 'pipe:1')
    const operation = this.convert(target, args, this.generation).finally(() =>
      this.pending.delete(target),
    )
    this.pending.set(target, operation)
    return operation
  }

  private async convert(target: string, args: string[], generation: number) {
    const cached = await readOptionalFile(target)
    if (generation !== this.generation) throw new Error('Video conversion stopped.')
    if (cached) return cached
    const { data } = await this.ffmpeg.run(args)
    if (generation !== this.generation) throw new Error('Video conversion stopped.')
    await writeFileAtomically(target, data)
    return data
  }

  stop(): Promise<void> {
    if (this.stopping) return this.stopping
    this.generation++
    this.stopping = (async () => {
      await this.ffmpeg.stop()
      await Promise.allSettled([...this.pending.values(), ...this.probes.values()])
      this.probes.clear()
    })().finally(() => {
      this.stopping = null
    })
    return this.stopping
  }
}
