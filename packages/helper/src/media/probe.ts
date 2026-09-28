export type AudioStream = { index: number; language: string }
export type MediaMetadata = { duration: number; audio: AudioStream[] }

export function parseMediaMetadata(stderr: string): MediaMetadata {
  const input = stderr.split('Output #')[0]
  const duration = /Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/.exec(input)
  if (!duration) throw new Error('Could not determine video duration for compatibility playback.')
  const seconds = Number(duration[1]) * 3600 + Number(duration[2]) * 60 + Number(duration[3])
  if (!(seconds > 0 && seconds < 7 * 86400)) throw new Error('Unsupported video duration.')
  const audio = [...input.matchAll(/Stream #\d+:\d+(?:\[[^\]]+\])?(?:\(([^)]+)\))?: Audio:/g)].map(
    (stream, index) => ({ index, language: (stream[1] || 'und').toLowerCase() }),
  )
  return { duration: seconds, audio }
}
