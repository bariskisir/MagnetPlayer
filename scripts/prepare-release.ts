import type { Lockfile } from './release.js'
import { writeFileSync } from 'node:fs'
import { readJson, repositoryRoot, validateVersion } from './release.js'

const version = validateVersion(process.argv[2])
const manifest = readJson('packages/helper/package.json')
const lock = readJson<Lockfile>('package-lock.json')
manifest.version = version
lock.packages['packages/helper'].version = version
const updates = new Map([
  ['packages/helper/package.json', JSON.stringify(manifest, null, 2) + '\n'],
  ['package-lock.json', JSON.stringify(lock, null, 2) + '\n'],
])
for (const [path, contents] of updates) writeFileSync(new URL(path, repositoryRoot), contents)
console.log(`Prepared v${version}. Format, review, commit, then push the matching tag.`)
