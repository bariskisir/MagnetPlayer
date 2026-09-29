const VIDEO_TYPES: Record<string, string> = {
  mp4: 'video/mp4',
  m4v: 'video/mp4',
  webm: 'video/webm',
  ogv: 'video/ogg',
  mkv: 'video/x-matroska',
  mov: 'video/quicktime',
  avi: 'video/x-msvideo',
  mpeg: 'video/mpeg',
  mpg: 'video/mpeg',
  ts: 'video/mp2t',
}
const AUDIO_TYPES: Record<string, string> = {
  ogg: 'audio/ogg',
  oga: 'audio/ogg',
  mp3: 'audio/mpeg',
  m4a: 'audio/mp4',
  aac: 'audio/aac',
  wav: 'audio/wav',
  flac: 'audio/flac',
  opus: 'audio/ogg',
}
const IMAGE_TYPES: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  avif: 'image/avif',
  bmp: 'image/bmp',
  ico: 'image/x-icon',
  svg: 'image/svg+xml',
}

function extension(name: string): string {
  return /\.([^.\\/]+)$/.exec(name)?.[1].toLowerCase() ?? ''
}

export const isVideoFile = (name: string) => Object.hasOwn(VIDEO_TYPES, extension(name))
export const isAudioFile = (name: string) => Object.hasOwn(AUDIO_TYPES, extension(name))
export const isImageFile = (name: string) => Object.hasOwn(IMAGE_TYPES, extension(name))
export const supportsDirectPlayback = (name: string) =>
  /\.(mp4|m4v|webm|ogv)$/i.test(name) || isAudioFile(name)

export function mediaContentType(name: string): string {
  const suffix = extension(name)
  if (isVideoFile(name)) return VIDEO_TYPES[suffix]
  if (isAudioFile(name)) return AUDIO_TYPES[suffix]
  if (isImageFile(name)) return IMAGE_TYPES[suffix]
  return 'application/octet-stream'
}
