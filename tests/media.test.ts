import assert from 'node:assert/strict'
import test from 'node:test'
import {
  isAudioFile,
  isImageFile,
  isVideoFile,
  mediaContentType,
  supportsDirectPlayback,
} from '../packages/helper/src/contracts/media.js'
import { downloadedRanges, windowPieces } from '../packages/helper/src/torrent/piece-ranges.js'
import { parseByteRange } from '../packages/helper/src/http/protocol.js'
import { masterPlaylist, mediaPlaylist } from '../packages/helper/src/media/hls.js'
import { parseMediaMetadata } from '../packages/helper/src/media/media-metadata.js'
import { segmentArguments } from '../packages/helper/src/media/segment-encoding.js'

test('media classification and content types agree for supported files', () => {
  for (const extension of ['mp4', 'm4v', 'webm', 'ogv', 'mov', 'mkv', 'avi', 'mpeg', 'mpg', 'ts']) {
    assert.equal(isVideoFile(`Movie.${extension.toUpperCase()}`), true)
    assert.match(mediaContentType(`Movie.${extension}`), /^video\//)
  }
  for (const extension of ['mp3', 'm4a', 'aac', 'wav', 'flac', 'opus', 'ogg', 'oga']) {
    assert.equal(isAudioFile(`Track.${extension}`), true)
    assert.equal(supportsDirectPlayback(`Track.${extension}`), true)
    assert.match(mediaContentType(`Track.${extension}`), /^audio\//)
  }
  for (const extension of ['jpg', 'jpeg', 'png', 'gif', 'webp', 'avif', 'bmp', 'ico', 'svg']) {
    assert.equal(isImageFile(`Image.${extension}`), true)
    assert.match(mediaContentType(`Image.${extension}`), /^image\//)
  }
  for (const name of ['mp4', 'movie.mp4.txt', 'constructor', 'image.toString', 'folder.mp4/file']) {
    assert.equal(isVideoFile(name) || isAudioFile(name) || isImageFile(name), false)
    assert.equal(mediaContentType(name), 'application/octet-stream')
  }
  assert.equal(supportsDirectPlayback('Movie.mkv'), false)
})

test('HTTP ranges support complete, bounded, open and suffix reads', () => {
  assert.deepEqual(parseByteRange(undefined, 100), { start: 0, end: 99, partial: false })
  assert.deepEqual(parseByteRange('bytes=10-19', 100), { start: 10, end: 19, partial: true })
  assert.deepEqual(parseByteRange('bytes=90-', 100), { start: 90, end: 99, partial: true })
  assert.deepEqual(parseByteRange('bytes=-10', 100), { start: 90, end: 99, partial: true })
  assert.deepEqual(parseByteRange('bytes=90-999', 100), { start: 90, end: 99, partial: true })
  assert.deepEqual(parseByteRange('bytes=-999', 100), { start: 0, end: 99, partial: true })
  for (const header of [
    'bytes=-0',
    'bytes=100-',
    'bytes=20-10',
    'bytes=-',
    'bytes=0-1,4-5',
    'items=0-1',
  ])
    assert.equal(parseByteRange(header, 100), null)
  assert.equal(parseByteRange(undefined, 0), null)
})

test('verified byte ranges clip shared boundary pieces to the file', () => {
  const torrent = {
    pieceLength: 10,
    bitfield: { get: (index: number) => [0, 1, 3].includes(index) },
  }
  assert.deepEqual(downloadedRanges(torrent, { offset: 5, length: 30 }), [
    [0, 15],
    [25, 30],
  ])
  assert.deepEqual(downloadedRanges(torrent, { offset: 0, length: 0 }), [])
})

test('download windows select only missing pieces around the playback cursor', () => {
  const torrent = { pieceLength: 10, bitfield: { get: (index: number) => index === 2 } }
  const file = { offset: 5, length: 100 }
  assert.deepEqual(windowPieces(torrent, file, 20, { rewind: 10, lookahead: 20 }), [
    [1, 1],
    [3, 4],
  ])
  assert.deepEqual(windowPieces(torrent, file, 500, { rewind: 10, lookahead: 20 }), [[9, 10]])
})

test('HLS playlists include a short final segment and separate audio renditions', () => {
  const playlist = mediaPlaylist(9.5, (index) => `${index}.ts?token=secret`)
  assert.match(playlist, /#EXTINF:1\.500,\n2\.ts\?token=secret/)
  assert.equal((playlist.match(/#EXTINF/g) ?? []).length, 3)
  assert.ok(playlist.endsWith('#EXT-X-ENDLIST\n'))
  const master = masterPlaylist(
    [
      { index: 0, language: 'eng' },
      { index: 1, language: 'tur' },
    ],
    (name) => name,
  )
  assert.match(master, /LANGUAGE="en",DEFAULT=YES/)
  assert.match(master, /LANGUAGE="tr",DEFAULT=NO/)
  assert.match(master, /URI="audio-1.m3u8"/)
})

test('segment encoding preserves video, audio and optional muxed audio maps', () => {
  const options = {
    id: 'a'.repeat(40),
    fileIndex: 0,
    segmentIndex: 2,
    source: 'http://localhost/raw',
    duration: 9.5,
  }
  const video = segmentArguments({ ...options, track: { kind: 'video' } })
  assert.equal(video[video.indexOf('-ss') + 1], '8')
  assert.equal(video[video.indexOf('-t') + 1], '1.5')
  assert.ok(video.includes('0:v:0'))
  assert.ok(!video.includes('-c:a'))
  const audio = segmentArguments({ ...options, track: { kind: 'audio', index: 2 } })
  assert.ok(audio.includes('0:a:2'))
  assert.ok(!audio.includes('-c:v'))
  assert.ok(segmentArguments({ ...options, track: { kind: 'muxed' } }).includes('0:a:0?'))
})

test('metadata parser ignores output streams and rejects missing duration', () => {
  assert.deepEqual(
    parseMediaMetadata(
      'Duration: 01:02:03.50\nStream #0:1(eng): Audio: aac\nStream #0:2(tur): Audio: ac3\nOutput #0\nStream #0:0: Audio: aac',
    ),
    {
      duration: 3723.5,
      audio: [
        { index: 0, language: 'eng' },
        { index: 1, language: 'tur' },
      ],
    },
  )
  assert.throws(() => parseMediaMetadata('Duration: N/A'), /duration/)
})
