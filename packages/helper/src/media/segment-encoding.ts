import { SEGMENT_SECONDS } from './hls.js'

export type SegmentTrack = { kind: 'muxed' } | { kind: 'video' } | { kind: 'audio'; index: number }
export type SegmentOptions = {
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

export function segmentArguments({
  segmentIndex,
  source,
  duration,
  track,
}: SegmentOptions): string[] {
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
  return args
}
