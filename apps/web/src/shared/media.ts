export const isVideoFile = (name: string) =>
  /\.(mp4|m4v|webm|ogv|mov|mkv|avi|mpeg|mpg|ts)$/i.test(name)

export const isAudioFile = (name: string) => /\.(mp3|m4a|aac|wav|flac|opus|ogg|oga)$/i.test(name)

export const isImageFile = (name: string) => /\.(jpe?g|png|gif|webp|avif|bmp|ico|svg)$/i.test(name)

export const supportsDirectPlayback = (name: string) =>
  /\.(mp4|m4v|webm|ogv)$/i.test(name) || isAudioFile(name)
