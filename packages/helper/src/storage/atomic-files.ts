import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { randomUUID } from 'node:crypto'
import { errorCode } from '../errors.js'

export async function readOptionalFile(path: string): Promise<Buffer | null> {
  try {
    return await readFile(path)
  } catch (error) {
    if (errorCode(error) === 'ENOENT') return null
    throw error
  }
}

export async function writeFileAtomically(path: string, data: Uint8Array) {
  await mkdir(dirname(path), { recursive: true })
  const temporary = `${path}.${randomUUID()}.tmp`
  try {
    await writeFile(temporary, data)
    await rename(temporary, path)
  } finally {
    await rm(temporary, { force: true })
  }
}
