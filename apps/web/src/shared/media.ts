export const isVideoFile = (name: string) =>
  /\.(mp4|m4v|webm|ogv|ogg|mov|mkv|avi|mpeg|mpg|ts)$/i.test(name)

export const supportsDirectPlayback = (name: string) => /\.(mp4|m4v|webm|ogv)$/i.test(name)
