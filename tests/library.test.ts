import assert from 'node:assert/strict'
import test from 'node:test'
import {
  createLibraryEntries,
  upsertLibraryEntry,
} from '../apps/web/src/features/library/library-entries.js'
import {
  identifyTitle,
  pickLocaleSubtitle,
  toWebVtt,
} from '../apps/web/src/features/subtitles/subtitle-format.js'
import { parseMagnetLink } from '../apps/web/src/shared/magnet.js'

const id = 'a'.repeat(40)
const magnet = `magnet:?xt=urn:btih:${id}`

test('batch additions deduplicate saved and repeated results with canonical magnets', () => {
  const items = [
    { id: id.toUpperCase(), name: 'Title', magnet },
    { id, name: 'Duplicate', magnet },
  ]
  const added = createLibraryEntries(items, [], 100)
  assert.equal(added.length, 1)
  assert.equal(added[0].id, id)
  assert.equal(added[0].addedAt, 100)
  assert.ok(new URL(added[0].magnet).searchParams.getAll('tr').length > 0)
  assert.deepEqual(createLibraryEntries(items, added), [])
})

test('batch additions reject a hash that does not match its magnet', () => {
  assert.throws(
    () => createLibraryEntries([{ id: 'b'.repeat(40), name: 'Wrong hash', magnet }], []),
    /Invalid torrent/,
  )
})

test('updating a library entry preserves its original order and added date', () => {
  const entries = createLibraryEntries([{ id, name: 'Title', magnet }], [], 100)
  const changed = {
    ...entries[0],
    updatedAt: 500,
    progress: { 'movie.mp4': { time: 42, duration: 100 } },
  }
  const updated = upsertLibraryEntry(entries, changed)
  assert.equal(updated.entry.addedAt, 100)
  assert.equal(updated.entry.updatedAt, 500)
  assert.equal(updated.entries.length, 1)
  assert.deepEqual(entries[0].progress, {})
  assert.equal(updated.entry.progress['movie.mp4'].time, 42)
})

test('legacy library entries retain their initial timestamp when updated', () => {
  const entry = createLibraryEntries([{ id, name: 'Title', magnet }], [], 100)[0]
  delete entry.addedAt
  const updated = upsertLibraryEntry([entry], { ...entry, updatedAt: 500 })
  assert.equal(updated.entry.addedAt, 100)
})

test('magnet normalization repairs encoded hashes and respects custom trackers', () => {
  const custom = `magnet:?xt=urn%3Abtih%3A${id}&tr=udp%3A%2F%2Fcustom.example%3A80`
  const parsed = parseMagnetLink(custom)
  assert.ok(parsed.startsWith(magnet))
  assert.deepEqual(new URL(parsed).searchParams.getAll('tr'), ['udp://custom.example:80'])
  assert.throws(() => parseMagnetLink('https://example.com'), /magnet/)
})

test('subtitle formatting converts SRT timestamps and preserves existing WebVTT', () => {
  assert.equal(
    toWebVtt('\uFEFF1\r\n00:00:01,000 --> 00:00:02,500\r\nHello'),
    'WEBVTT\n\n1\n00:00:01.000 --> 00:00:02.500\nHello',
  )
  assert.equal(
    toWebVtt('WEBVTT\n\n00:00:01.000 --> 00:00:02.000\nHello'),
    'WEBVTT\n\n00:00:01.000 --> 00:00:02.000\nHello',
  )
})

test('subtitle locale matching prefers exact matches before language fallbacks', () => {
  const tracks = [{ language: 'pt-BR' }, { language: 'en' }, { language: 'tr' }]
  assert.equal(pickLocaleSubtitle(tracks, ['pt-PT', 'tr']), tracks[2])
  assert.equal(pickLocaleSubtitle(tracks, ['PT_br']), tracks[0])
  assert.equal(pickLocaleSubtitle(tracks, ['en-US']), tracks[1])
  assert.equal(pickLocaleSubtitle(tracks, ['ja']), null)
})

test('subtitle title identification handles episode filenames and paths', () => {
  assert.deepEqual(identifyTitle('folder/Example.Show.S02E03.1080p.mkv'), {
    query: 'Example Show',
    type: 'series',
    season: 2,
    episode: 3,
  })
})
