import { readFileSync } from 'node:fs'

const manifest: { version: string } = JSON.parse(
  readFileSync(new URL('../package.json', import.meta.url), 'utf8'),
)

export const VERSION = manifest.version

export const DEFAULT_PORT = 45891

export const DEFAULT_SITE = 'https://web-magnet-player.vercel.app/'
