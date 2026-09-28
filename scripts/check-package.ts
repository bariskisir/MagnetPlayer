import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { readJson, repositoryRoot, validatePackage } from './release.js'
import type { PackageArchive } from './release.js'

if (!process.env.npm_execpath) throw new Error('Run this check with npm run helper:check.')
const output = execFileSync(
  process.execPath,
  [
    process.env.npm_execpath,
    'pack',
    '--workspace',
    'magnet-player-helper',
    '--dry-run',
    '--json',
    '--ignore-scripts',
  ],
  {
    cwd: fileURLToPath(repositoryRoot),
    encoding: 'utf8',
    windowsHide: true,
  },
)
const manifest = readJson('packages/helper/package.json')
const report = JSON.parse(output) as Record<string, PackageArchive>
const pack = report[manifest.name]
if (!pack) throw new Error('npm did not return the helper package report. Use npm 12.1 or newer.')
validatePackage(pack, manifest)
console.log(`Verified ${pack.files.length} helper-only files (${pack.size} bytes packed).`)
