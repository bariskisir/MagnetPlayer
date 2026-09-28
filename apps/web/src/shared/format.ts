export function formatBytes(value = 0): string {
  if (!Number.isFinite(value) || value <= 0) return '0 B'
  const unit = Math.max(0, Math.min(Math.floor(Math.log(value) / Math.log(1024)), 3))
  return `${(value / 1024 ** unit).toFixed(unit ? 1 : 0)} ${['B', 'KB', 'MB', 'GB'][unit]}`
}

export function formatDuration(value = 0): string {
  const seconds = Math.max(0, Math.floor(Number.isFinite(value) ? value : 0))
  const hours = Math.floor(seconds / 3600)
  const minutes = String(Math.floor(seconds / 60) % 60).padStart(2, '0')
  return `${hours ? `${hours}:` : ''}${minutes}:${String(seconds % 60).padStart(2, '0')}`
}
