import { parseArgs } from 'node:util'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { DEFAULT_PORT, DEFAULT_SITE } from '../config.js'

export const HELP = `Magnet Player Helper — magnet-player-helper

Usage: magnet-player-helper [options]

  --site URL       Website to open and allow (default ${DEFAULT_SITE})
  --port NUMBER    Local port (default ${DEFAULT_PORT})
  --bind ADDRESS   Listen address (default 127.0.0.1; use 0.0.0.0 for other devices)
  --data-dir PATH  Data directory (default: magnet-player-helper in the system temp directory)
  --ffmpeg PATH    Override the optional bundled FFmpeg executable
  --no-open        Print the connection link without opening a browser
  --auth           Require a connection key (default: no key required)
  --help           Show this help
  --version        Print the version

Keep this terminal open while watching. Ctrl+C stops transfers and preserves data.
`

export function parseOptions(args = process.argv.slice(2)) {
  const { values } = parseArgs({
    args,
    options: {
      site: { type: 'string', default: DEFAULT_SITE },
      port: { type: 'string', default: String(DEFAULT_PORT) },
      bind: { type: 'string', default: '127.0.0.1' },
      'data-dir': { type: 'string' },
      ffmpeg: { type: 'string' },
      'no-open': { type: 'boolean' },
      auth: { type: 'boolean' },
      help: { type: 'boolean' },
      version: { type: 'boolean' },
    },
  })
  if (values.help) return { mode: 'help' } as const
  if (values.version) return { mode: 'version' } as const
  const site = new URL(values.site)
  if (!['https:', 'http:'].includes(site.protocol) || site.username || site.password)
    throw new Error('--site must be an HTTP(S) website URL.')
  const port = Number(values.port)
  if (!Number.isInteger(port) || port < 1024 || port > 65535)
    throw new Error('--port must be between 1024 and 65535.')
  const bind = values.bind.toLowerCase()
  if (!/^[a-z0-9.:-]{1,253}$/.test(bind) || bind.includes('..'))
    throw new Error('--bind must be a host name or IP address.')
  return {
    mode: 'run',
    site,
    port,
    bind,
    dataDirectory: resolve(values['data-dir'] || join(tmpdir(), 'magnet-player-helper')),
    ffmpeg: values.ffmpeg,
    openBrowser: !values['no-open'],
    noAuth: !values.auth,
  } as const
}
