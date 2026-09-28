import { mkdir, open, readFile, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { errorCode } from '../errors.js'

function processExists(pid: number) {
  if (!Number.isSafeInteger(pid) || pid <= 0) return false
  try {
    process.kill(pid, 0)
    return true
  } catch (error) {
    return errorCode(error) !== 'ESRCH'
  }
}

export async function acquireDirectoryLock(directory: string) {
  await mkdir(directory, { recursive: true })
  const path = join(directory, 'helper.lock')
  let handle
  try {
    handle = await open(path, 'wx')
  } catch (error) {
    if (errorCode(error) !== 'EEXIST') throw error
    const pid = Number(await readFile(path, 'utf8'))
    if (processExists(pid))
      throw new Error('A helper already uses this data directory. Stop it before starting another.')
    await rm(path)
    handle = await open(path, 'wx')
  }
  try {
    await handle.writeFile(String(process.pid))
  } finally {
    await handle.close()
  }
  return () => rm(path, { force: true })
}
