import { join } from 'node:path'
import { VERSION } from '../config.js'
import { errorMessage } from '../errors.js'
import { acquireDirectoryLock } from '../storage/directory-lock.js'
import { openBrowser } from './browser.js'
import { HELP, parseOptions } from './options.js'

export async function runHelper() {
  try {
    const options = parseOptions()
    if (options.mode === 'help') {
      console.log(HELP)
      return
    }
    if (options.mode === 'version') {
      console.log(VERSION)
      return
    }
    const releaseLock = await acquireDirectoryLock(options.dataDirectory)
    let helper: Awaited<ReturnType<typeof import('../http/server.js').startHelper>>
    try {
      const { startHelper } = await import('../http/server.js')
      helper = await startHelper({
        root: join(options.dataDirectory, 'torrents'),
        port: options.port,
        bind: options.bind,
        site: options.site.origin,
        ffmpeg: options.ffmpeg,
        noAuth: options.noAuth,
      })
    } catch (error) {
      await releaseLock()
      throw error
    }
    options.site.hash = new URLSearchParams({
      ...(helper.token ? { helperToken: helper.token } : { helperNoAuth: '1' }),
      helperPort: String(options.port),
      ...(options.bind !== '127.0.0.1' && options.bind !== '0.0.0.0' && options.bind !== '::'
        ? { helperHost: options.bind }
        : {}),
    }).toString()
    console.log(
      `\nMagnet Player Helper is ready on ${helper.baseUrl}\nData directory: ${options.dataDirectory}\n\nOpen this connection link:\n${options.site.href}\n\n${helper.token ? `Connection key: ${helper.token}` : 'Keyless mode enabled.'}\nKeep the terminal open. Press Ctrl+C to stop.\n`,
    )
    if (options.openBrowser) openBrowser(options.site.href)
    let closing = false
    const close = async () => {
      if (closing) return
      closing = true
      console.log('\nStopping transfers…')
      try {
        await helper.close()
      } catch (error) {
        console.error(errorMessage(error))
        process.exitCode = 1
      } finally {
        await releaseLock()
      }
      process.exit(process.exitCode ?? 0)
    }
    process.once('SIGINT', () => void close())
    process.once('SIGTERM', () => void close())
  } catch (error) {
    console.error(`Magnet Player Helper: ${errorMessage(error)}`)
    process.exitCode = 1
  }
}
