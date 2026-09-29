import assert from 'node:assert/strict'
import test from 'node:test'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { parseOptions } from '../packages/helper/src/cli/options.js'

test('the default data directory is inside the operating system temporary directory', () => {
  const options = parseOptions([])
  assert.equal(options.mode, 'run')
  if (options.mode !== 'run') throw new Error('Expected runtime options')
  assert.equal(options.dataDirectory, resolve(tmpdir(), 'magnet-player-helper'))
})

test('an explicit data directory overrides the temporary default', () => {
  const directory = join('custom cache', 'media')
  const options = parseOptions(['--data-dir', directory, '--no-open'])
  assert.equal(options.mode, 'run')
  if (options.mode !== 'run') throw new Error('Expected runtime options')
  assert.equal(options.dataDirectory, resolve(directory))
  assert.equal(options.openBrowser, false)
})

test('help and version remain available without starting the helper', () => {
  assert.deepEqual(parseOptions(['--help']), { mode: 'help' })
  assert.deepEqual(parseOptions(['--version']), { mode: 'version' })
})
