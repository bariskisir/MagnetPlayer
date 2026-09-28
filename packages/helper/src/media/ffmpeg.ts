import { spawn, type ChildProcess } from 'node:child_process'
import { access } from 'node:fs/promises'
import { createRequire } from 'node:module'

type ProcessOutput = { data: Buffer; stderr: string }
const require = createRequire(import.meta.url)
const MAX_OUTPUT_BYTES = 32 * 1024 * 1024
const PROCESS_TIMEOUT_MS = 90000
const MAX_PROCESSES = 3

export class Ffmpeg {
  private children = new Set<ChildProcess>()
  private operations = new Set<Promise<ProcessOutput>>()
  private generation = 0

  constructor(private executable?: string) {}

  private async resolveBinary() {
    let path = this.executable || process.env.MAGNET_PLAYER_FFMPEG
    if (!path) {
      try {
        path = require('ffmpeg-static') as string | undefined
      } catch {
        /* Optional dependency. */
      }
    }
    if (!path)
      throw new Error(
        'FFmpeg is unavailable. Restart the helper with --ffmpeg /path/to/ffmpeg for compatibility playback.',
      )
    try {
      await access(path)
    } catch {
      throw new Error(
        'FFmpeg could not be found. Restart the helper with --ffmpeg /path/to/ffmpeg.',
      )
    }
    return path
  }

  run(args: string[]): Promise<ProcessOutput> {
    const generation = this.generation
    const operation = this.execute(args, generation).finally(() =>
      this.operations.delete(operation),
    )
    this.operations.add(operation)
    return operation
  }

  private async execute(args: string[], generation: number): Promise<ProcessOutput> {
    const binary = await this.resolveBinary()
    if (generation !== this.generation) throw new Error('Video conversion stopped.')
    if (this.children.size >= MAX_PROCESSES)
      throw Object.assign(new Error('Video conversion is busy. Retry in a moment.'), {
        status: 503,
      })
    return new Promise((resolve, reject) => {
      const child = spawn(binary, args, { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] })
      this.children.add(child)
      const output: Buffer[] = []
      let size = 0
      let stderr = ''
      let failure: Error | undefined
      const timeout = setTimeout(() => {
        failure = new Error(
          'Video conversion timed out. The source may be unavailable or this device may be too slow.',
        )
        child.kill()
      }, PROCESS_TIMEOUT_MS)
      child.stdout.on('data', (chunk: Buffer) => {
        size += chunk.length
        if (size > MAX_OUTPUT_BYTES) {
          failure = new Error('Converted video segment is too large.')
          child.kill()
        } else output.push(chunk)
      })
      child.stderr.on('data', (chunk: Buffer) => {
        stderr = (stderr + chunk.toString()).slice(-16000)
      })
      const cleanup = () => {
        clearTimeout(timeout)
        this.children.delete(child)
      }
      child.once('error', (error) => {
        cleanup()
        reject(error)
      })
      child.once('close', (code) => {
        cleanup()
        if (generation !== this.generation) reject(new Error('Video conversion stopped.'))
        else if (failure) reject(failure)
        else if (code !== 0)
          reject(new Error('FFmpeg could not decode this video or its pieces are unavailable.'))
        else resolve({ data: Buffer.concat(output), stderr })
      })
    })
  }

  async stop() {
    this.generation++
    for (const child of this.children) child.kill()
    await Promise.allSettled(this.operations)
  }
}
