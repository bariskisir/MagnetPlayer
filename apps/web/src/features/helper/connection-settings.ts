import type { HelperConnectionSettings as Connection } from './helper-types'

const KEY = 'magnet-player-helper-connection'
export const HELPER_COMMAND = 'npx magnet-player-helper'
export const HELPER_SETUP_COMMAND =
  'npx --allow-scripts=node-datachannel,ffmpeg-static,utp-native,bufferutil,utf-8-validate magnet-player-helper'

const defaultConnection: Connection = { token: '', port: 45891, host: '127.0.0.1' }
let connection: Connection = { ...defaultConnection }
try {
  const saved: Partial<Connection> | null = JSON.parse(sessionStorage.getItem(KEY) || 'null')
  if (saved && typeof saved.token === 'string' && typeof saved.port === 'number') {
    configureHelper(
      saved.token,
      String(saved.port),
      typeof saved.host === 'string' ? saved.host : '127.0.0.1',
    )
  }
} catch {
  connection = { ...defaultConnection }
}
try {
  const fragment = new URLSearchParams(window.location.hash.slice(1))
  if (fragment.has('helperToken') || fragment.get('helperNoAuth') === '1') {
    configureHelper(
      fragment.get('helperToken') || '',
      fragment.get('helperPort') || '45891',
      fragment.get('helperHost') || '127.0.0.1',
    )
    window.history.replaceState(null, '', window.location.pathname + window.location.search)
  }
} catch {
  connection = { ...defaultConnection }
}

export function configureHelper(token: string, port = '45891', host = '127.0.0.1') {
  if (token && !/^[a-f0-9]{64}$/i.test(token))
    throw new Error(
      'Paste the 64-character connection key from the helper terminal, or leave it empty for keyless mode.',
    )
  const number = Number(port)
  if (!Number.isInteger(number) || number < 1024 || number > 65535)
    throw new Error('Enter a port between 1024 and 65535.')
  const address = String(host).trim().toLowerCase()
  if (!/^[a-z0-9.:-]{1,253}$/.test(address) || address.includes('..'))
    throw new Error('Enter a valid host name or IP address.')
  connection = { token, port: number, host: address }
  try {
    sessionStorage.setItem(KEY, JSON.stringify(connection))
  } catch {
    // Keep the active connection usable without optional persistence.
  }
  window.dispatchEvent(new Event('helper-connection-change'))
}

export function helperConnection() {
  return connection
}

export function mediaUrl(id: string, index: number, mode = 'raw') {
  const url = new URL(`/media/${id}/${index}/${mode}`, helperBaseUrl())
  if (connection.token) url.searchParams.set('token', connection.token)
  return url.href
}

export function helperBaseUrl(settings = connection): string {
  const host = settings.host.includes(':') ? `[${settings.host}]` : settings.host
  return `http://${host}:${settings.port}`
}
