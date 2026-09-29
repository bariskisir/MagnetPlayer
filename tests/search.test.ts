import assert from 'node:assert/strict'
import test from 'node:test'
import { normalizeSource } from '../packages/helper/src/search/normalize-results.js'
import { mergeResults } from '../packages/helper/src/search/merge-results.js'
import { searchProviders } from '../packages/helper/src/search/search-service.js'
import { sortSearchResults, searchNotice } from '../apps/web/src/features/search/search-results.js'
import type { SearchResult } from '../packages/helper/src/contracts/search.js'

const firstHash = 'a'.repeat(40)
const secondHash = 'b'.repeat(40)

test('normalization preserves discovery hints and rejects conflicting hashes', async () => {
  const magnet = `magnet:?xt=urn%3Abtih%3A${firstHash}&tr=udp%3A%2F%2Ftracker&ws=https%3A%2F%2Fseed`
  const result = await normalizeSource('Example', {
    infoHash: firstHash.toUpperCase(),
    magnet,
    name: 'Title',
    seeders: '12',
    size: -1,
  })
  assert.ok(result)
  assert.equal(result.infoHash, firstHash)
  assert.equal(result.seeders, 12)
  assert.equal(result.size, null)
  assert.deepEqual(result.sources, ['Example'])
  assert.equal(new URL(result.magnet!).searchParams.get('tr'), 'udp://tracker')
  assert.equal(new URL(result.magnet!).searchParams.get('ws'), 'https://seed')
  assert.equal(await normalizeSource('Example', { infoHash: secondHash, magnet }), null)
  assert.equal(await normalizeSource('Example', { infoHash: '0'.repeat(40) }), null)
})

test('merging deduplicates hashes and tracker hints without mutating source results', async () => {
  const first = (await normalizeSource('First', {
    infoHash: firstHash,
    name: 'Title',
    seeders: 2,
    magnet: `magnet:?xt=urn:btih:${firstHash}&tr=udp%3A%2F%2Fone`,
  }))!
  const second = (await normalizeSource('Second', {
    infoHash: firstHash,
    seeders: 8,
    magnet: `magnet:?xt=urn:btih:${firstHash}&tr=udp%3A%2F%2Ftwo&tr=udp%3A%2F%2Fone`,
  }))!
  const merged = mergeResults([first, second])
  assert.equal(merged.length, 1)
  assert.equal(merged[0].seeders, 8)
  assert.deepEqual(merged[0].sources, ['First', 'Second'])
  assert.deepEqual(new URL(merged[0].magnet!).searchParams.getAll('tr'), ['udp://one', 'udp://two'])
  assert.equal(first.seeders, 2)
  assert.deepEqual(first.sources, ['First'])
})

test('sorting keeps missing statistics last in both directions and leaves input unchanged', async () => {
  const first = (await normalizeSource('Test', { infoHash: firstHash, seeders: 5 }))!
  const second = (await normalizeSource('Test', { infoHash: secondHash }))!
  const input: SearchResult[] = [second, first]
  for (const descending of [true, false])
    assert.deepEqual(sortSearchResults(input, 'seeders', descending), [first, second])
  assert.deepEqual(input, [second, first])
  assert.equal(
    searchNotice({ results: [], warnings: ['Unavailable'], limited: true }),
    'Unavailable',
  )
})

test('provider aggregation keeps available results and reports partial failures', async (context) => {
  context.mock.method(globalThis, 'fetch', async (input: URL | string) => {
    const url = new URL(input)
    if (url.hostname === 'apibay.org')
      return Response.json([{ info_hash: firstHash, name: 'Title', seeders: '3' }])
    if (url.hostname === 'torrents-csv.com') throw new Error('offline')
    return Response.json({
      status: 'ok',
      data: {
        movie_count: 1,
        movies: [
          {
            title: 'Title',
            torrents: [{ hash: firstHash, seeds: 7, quality: '1080p', type: 'web' }],
          },
        ],
      },
    })
  })
  const response = await searchProviders('title', 'all')
  assert.equal(response.results.length, 1)
  assert.equal(response.results[0].seeders, 7)
  assert.deepEqual(response.results[0].sources, ['Pirate Bay', 'YTS'])
  assert.equal(response.partial, true)
  assert.match(response.warnings!.join(' '), /Torrents-csv/)
})

test('provider aggregation rejects invalid inputs and cancelled searches', async (context) => {
  await assert.rejects(searchProviders(''), /search term/)
  await assert.rejects(searchProviders('title', 'missing'), /provider/)
  context.mock.method(globalThis, 'fetch', async () => Response.json([]))
  const controller = new AbortController()
  controller.abort()
  await assert.rejects(searchProviders('title', 'piratebay', controller.signal), {
    name: 'AbortError',
  })
})
