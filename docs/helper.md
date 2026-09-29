# magnet-player-helper

Local BitTorrent streaming companion for **https://web-magnet-player.vercel.app**.

## Run

Requires Node.js **22.22.2+, 24.15+ or 26+** and **npm 12.1+** on Windows, macOS or Linux:

```sh
npx magnet-player-helper
```

For a fresh npm 12 installation, run the setup command below first. The short command works afterward while the installed package remains in the npx cache.

No connection key is required by default. The helper opens the website and the website connects automatically. Allow local network access if the browser prompts. Keep the terminal running while watching. Ctrl+C stops transfers and preserves downloaded pieces. This package must be published to npm before the public npx command is available.

npx downloads the package on first use. A global install and Chrome extension are unnecessary. Node.js must already be installed. The optional `ffmpeg-static` dependency downloads an FFmpeg executable where a supported binary is available. Direct playback can work without FFmpeg; compatibility playback needs it. Mobile browsers cannot run this helper. Platforms without an available bundled binary can supply their own FFmpeg path.

## First install with npm 12

npm 12 blocks unapproved dependency install scripts by default. This setup command permits installation of WebRTC, FFmpeg and optional native transport components:

```sh
npx --allow-scripts=node-datachannel,ffmpeg-static,utp-native,bufferutil,utf-8-validate magnet-player-helper
```

Use `npx magnet-player-helper` for subsequent runs. Installing a new version or clearing the npx cache may require the setup command again. npm 11 normally runs dependency install scripts without this flag, unless scripts were disabled in your npm configuration. See [npm's install-script configuration](https://docs.npmjs.com/cli/v12/using-npm/config/#allow-scripts).

## Options

```sh
npx magnet-player-helper --help
npx magnet-player-helper --site http://localhost:5173 --no-open
npx magnet-player-helper --port 45892
npx magnet-player-helper --bind 0.0.0.0
npx magnet-player-helper --data-dir /path/to/cache
npx magnet-player-helper --ffmpeg /path/to/ffmpeg
npx magnet-player-helper --auth
```

| Option                | Behavior                                                                                           |
| --------------------- | -------------------------------------------------------------------------------------------------- |
| `--site URL`          | Website to open and allow; defaults to `https://web-magnet-player.vercel.app/`.                    |
| `--port NUMBER`       | Port, default `45891`; accepted range `1024–65535`.                                                |
| `--bind ADDRESS`      | Address to listen on, default `127.0.0.1`. `0.0.0.0` exposes it to the local network.              |
| `--data-dir PATH`     | Override the default system temporary directory with a custom cache location.                      |
| `--ffmpeg PATH`       | Override the optional FFmpeg executable; also supports `MAGNET_PLAYER_FFMPEG`.                     |
| `--no-open`           | Print the connection link without launching a browser.                                             |
| `--auth`              | Enable an optional random connection key for this run. The connection link fills it automatically. |
| `--help`, `--version` | Show help or the package version without starting transfers.                                       |

Use `--site` for local development or a self-hosted player. It sets both the website opened by the helper and the single browser origin allowed to connect. The repository's helper development command uses `http://localhost:5173`.

The service binds to `127.0.0.1` by default. It accepts the loopback names and its own bind address in the Host header, and rejects browser requests from origins other than `--site`. In default keyless mode, programs running locally can also call the API without credentials. Use `--auth` if you want credentials. In that mode the key is sent to the website in a URL fragment, removed from the address bar, held in session storage, and passed as a bearer token or a media-request query parameter. A restart generates a new key.

To watch from another device on the same network, start the helper with `--bind 0.0.0.0`, then open the website on that device and set the helper host in the connection popup to the computer's IP address.

Use one active streaming tab at a time. One process may use a data folder; a lock prevents a second instance from racing its piece store.

## Data locations

The default is `path.join(os.tmpdir(), 'magnet-player-helper')`. Node.js chooses the temporary directory for the current operating system and environment. The helper prints the resolved data directory at startup.

| OS      | Typical location                                                   |
| ------- | ------------------------------------------------------------------ |
| Windows | `%TEMP%\magnet-player-helper`                                      |
| macOS   | `$TMPDIR/magnet-player-helper`                                     |
| Linux   | `/tmp/magnet-player-helper`, or the configured temporary directory |

The cache is reused across runs while those temporary files remain available. The operating system may clean up its temporary directory. Use `--data-dir /path/to/cache` for a persistent location; relative paths are resolved from the working directory. Previous application-data caches are not moved automatically. To reuse one, pass its old path with `--data-dir`. Browser library entries and watch positions remain in the browser.

Under `torrents/<v1-info-hash>/`, the helper stores `metadata.torrent`, numbered verified `.piece` files and converted HLS segments. Cache filenames are generated by the helper; paths supplied by torrent metadata are never used as disk destinations. Piece writes are atomic and cached pieces are verified when reopened.

The selected video downloads only the window around the playhead: a short rewind buffer plus a lookahead in front of the current byte. All supported images in the active torrent download completely, even when no video is selected. Seeking or changing videos keeps these image downloads active, including shared boundary pieces. A video watched from the middle is never fetched from the start. Uploading downloaded pieces to other peers is possible while the session is active. Ctrl+C stops transfers. Closing the website does not stop the helper.

The website's Remove title / Clear library actions delete managed caches while connected. Clearing browser data alone does not delete disk caches. To erase all helper data manually, stop the helper first and remove its data directory. Separately exported Downloads files remain independent.

## Local API

`http://127.0.0.1:45891` by default. There is no hosted backend.

| Method and path                         | Purpose                                                                                                                                                                                                                                                                                             |
| --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /health`                           | Name, version, API version; no key required.                                                                                                                                                                                                                                                        |
| `GET /api/pair`                         | Connection check.                                                                                                                                                                                                                                                                                   |
| `GET /api/search?q=ubuntu&provider=all` | Search through the helper without changing playback. `provider` defaults to `piratebay`; supported values: `all`, `piratebay`, `torrents-csv`, `yts`. Returns `{ "results": [...], "limited": false, "partial": false, "warnings": [] }`, with one request per provider and matching hashes merged. |
| `POST /api/torrents`                    | JSON `{ "magnet": "magnet:?…" }`; wait for metadata and start downloading images.                                                                                                                                                                                                                   |
| `GET /api/torrents/:hash`               | Active title, files, selection and transfer statistics.                                                                                                                                                                                                                                             |
| `POST /api/torrents/:hash/select`       | JSON `{ "index": 0, "offset": 0 }`; select a video or audio file at a byte offset.                                                                                                                                                                                                                  |
| `POST /api/torrents/:hash/cursor`       | JSON `{ "index": 0, "offset": 1234 }`; move the download window to the playhead.                                                                                                                                                                                                                    |
| `POST /api/stop`                        | Stop transfers, preserve data.                                                                                                                                                                                                                                                                      |
| `DELETE /api/torrents/:hash`            | Delete one managed title.                                                                                                                                                                                                                                                                           |
| `DELETE /api/library`                   | Delete managed torrent caches.                                                                                                                                                                                                                                                                      |
| `GET /media/:hash/:index/raw`           | Selected video/audio or any supported image; HEAD and byte ranges. Add `download=1` to save.                                                                                                                                                                                                        |
| `GET /media/:hash/:index/playlist.m3u8` | HLS VOD playlist for local compatibility conversion.                                                                                                                                                                                                                                                |
| `GET /media/:hash/:index/:segment.ts`   | Cached or on-demand four-second H.264/AAC segment.                                                                                                                                                                                                                                                  |

With `--auth`, include `Authorization: Bearer <key>` for API calls or `?token=<key>` for media. Otherwise omit credentials. Requests never accept arbitrary filesystem paths. Content stays on the visitor's machine; ordinary torrent discovery uses the magnet's trackers, DHT and peer exchange.

## Playback troubleshooting

- Metadata timeout: confirm the magnet has reachable seeders and working trackers. A valid URL alone cannot provide unavailable content.
- Connection failed: keep the helper open, allow local network access, and make sure `--site` matches the browser's exact origin. Loopback access depends on browser permission and platform support.
- Port in use: stop the existing helper, or use `--port` and open its printed connection link.
- Unsupported codec: choose Compatibility playback. FFmpeg converts segments locally; HEVC/10-bit or high resolution may take substantial CPU.
- FFmpeg unavailable: supply `--ffmpeg` or `MAGNET_PLAYER_FFMPEG` with the executable path. A package download blocked by network policy may leave the optional dependency unavailable.
- Interrupted downloads: start the helper again, reopen the saved title, and cached pieces will be verified and reused. Missing pieces still need peers.

## Known audit finding (accepted risk)

`npm audit` reports one high-severity advisory, [GHSA-2p57-rm9w-gvfp](https://github.com/advisories/GHSA-2p57-rm9w-gvfp) (`ip` SSRF miscategorization in `isPublic`), counted four times through the chain `webtorrent → torrent-discovery → bittorrent-tracker → ip`. All four packages are already at their latest published versions, including `ip@2.0.1`, and the advisory marks every published `ip` version as affected, so no upgrade can clear it. In this dependency tree the vulnerable function is never called with attacker-controlled input (only the machine's own interface addresses are ever categorized), and the helper binds to loopback by default, so this is recorded as an accepted risk. Do **not** run `npm audit fix --force`: it downgrades `webtorrent` to `0.7.3`, whose API is incompatible with the helper's torrent engine.

## Licensing

Helper source: MIT, included in LICENSE. WebTorrent and other dependencies have their own licenses. `ffmpeg-static` is a separately licensed optional package; its provided FFmpeg binaries have FFmpeg's applicable licensing, including GPL configurations. Binary download occurs through that dependency's installation process, rather than embedding FFmpeg inside this package's tarball. Review [ffmpeg-static](https://github.com/eugeneware/ffmpeg-static) and [FFmpeg licensing](https://ffmpeg.org/legal.html) when distributing binaries or modified builds.

Direct runtime dependencies use exact versions. The repository's `package-lock.json` records development installations; dependencies are resolved by npm when the published helper is installed.
