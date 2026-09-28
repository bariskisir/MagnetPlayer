import type { Lockfile } from './release.js'
import { readFileSync } from 'node:fs'
import { documentationFiles, readJson, repositoryRoot, validateTag } from './release.js'

const manifest = readJson('packages/helper/package.json')
validateTag(process.env.GITHUB_REF_NAME || `v${manifest.version}`, manifest.version)
const lock = readJson<Lockfile>('package-lock.json')
if (lock.packages['packages/helper'].version !== manifest.version) {
  throw new Error('The workspace lockfile version must match the helper.')
}
for (const path of documentationFiles) {
  const source = readFileSync(new URL(path, repositoryRoot), 'utf8')
  const links = [
    ...source.matchAll(
      /https:\/\/raw\.githubusercontent\.com\/bariskisir\/MagnetPlayer\/([^/\s)]+)\//g,
    ),
  ]
  if (!links.length || links.some((match) => match[1] !== 'master')) {
    throw new Error(`Use version-free raw GitHub URLs on master in ${path}.`)
  }
}
console.log(`Release v${manifest.version} is consistent.`)
