export type CachedSubtitleTrack = { language: string; label: string; vtt: string }
export type SubtitleCache = { id: string; tracks: CachedSubtitleTrack[] }
export type SubtitleTrack = { language: string; label: string; url: string }
export type SubtitleSelection = { tracks: SubtitleTrack[]; activeLanguage: string | null }
