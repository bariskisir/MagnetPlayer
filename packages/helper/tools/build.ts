import { rm } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const require = createRequire(import.meta.url)
const packageRoot = new URL('../', import.meta.url)
await rm(new URL('dist/', packageRoot), { recursive: true, force: true })
const compiler = join(dirname(require.resolve('typescript/package.json')), 'bin', 'tsc')
execFileSync(process.execPath, [compiler, '-p', 'tsconfig.json'], {
  cwd: fileURLToPath(packageRoot),
  stdio: 'inherit',
  windowsHide: true,
})
