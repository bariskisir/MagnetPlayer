# Using Magnet Player

## Visitor setup

After the helper has been published to npm, visitors install Node.js and run:

```sh
npx magnet-player-helper
```

For a fresh npm 12 install, run the [setup command](https://github.com/bariskisir/MagnetPlayer/blob/master/docs/helper.md#first-install-with-npm-12) first. After setup, use the short command above.

The first run downloads the npm package and, where supported, an optional FFmpeg binary. The helper opens the website and connects **without a key by default**. Keep the terminal open while watching. No browser extension or global npm installation is required. Browsers may ask for local network access; allow it for the site. The npm package must actually be published before this public npx command works.

The helper targets Windows, macOS and Linux with supported Node.js installations. The UI fits mobile screens, but ordinary Android/iOS browsers cannot run Node.js or this helper. The helper listens on `127.0.0.1` by default. Start it with `--bind 0.0.0.0` and point the connection popup at the host's IP to watch from another device on the same network.

## How it works

1. **Paste a magnet link.** The empty library is one field, and the Add button stays disabled until the input is a valid BitTorrent v1 magnet.
2. **Your computer does the work.** The helper runs on your machine, talks to real peers and keeps verified pieces on disk. The website itself is only the player.
3. **Video downloads follow playback.** The download window follows the playhead. Images in the active torrent download completely in the background.

After the first title the app switches to the workspace: a library on the left, the video in the center, file and transfer controls on the right, and a compact magnet field in the header. New magnets from the header join the same sidebar. The status next to the brand reports the current session state, and the helper badge opens a popup with the helper command (with a copy button) and the host/port/key fields. Titles that are already selected are no longer clickable; removing the active title stops its session.

## Playback and storage

- **Search Online** searches Pirate Bay by default. The provider selector also offers Torrents-csv, Knaben and YTS. **All** searches these providers concurrently, merges matching torrent hashes, and lists their sources without adding their seeder counts together. Search collects up to 500 distinct results and shows 100 per page; selection survives page changes and sorting. Sort using the column headings, select titles and press **Add** to save all selected magnets before opening the first title. Existing library titles are skipped.
- Changing the provider reruns the current query. Requests use the local helper, with a 20-second search budget. Collected results survive later request failures; a notice identifies unavailable providers or incomplete results. Unknown statistics appear as a dash.
- Provider magnets keep their trackers and web seeds. Hash-only results receive public discovery trackers. Search seeder counts are reported by the providers and can differ from connected peers. Provider endpoints may become unavailable independently of torrent seed availability.

- Adding a magnet automatically selects its first video and attempts playback. Opening a saved title restores its last video and position. If the browser blocks autoplay, press Play once.
- **Only the window around the playhead downloads.** The helper follows the player: a short rewind buffer plus a lookahead in front of the current byte, never the whole file. Starting a file at 90% and watching to the end downloads that tail, not the start. Pausing playback keeps filling the current window, and replaying a cached section needs no peers.
- The download map marks verified torrent pieces at their actual positions in file order, including gaps, with a playhead marker.
- Only the selected video downloads, alongside all supported images in the active torrent. A shared boundary piece can contain a small amount of neighboring-file data. Selecting another video deselects the previous one and keeps image downloads running.
- The right panel lists Videos, Audios, then Images. Videos starts expanded; Audios and Images start collapsed. Click a heading to toggle its list. Selecting an audio file starts playback with native audio controls and saves its position. MP3, M4A, AAC, WAV, FLAC, Opus and Ogg audio are supported when the browser can decode them.
- Images show previews when fully downloaded. Click an image to open the gallery; use the left/right arrows or buttons to browse, the mouse wheel or +/− keys to zoom, drag to pan, and Escape to close. The gallery supports fullscreen and a slideshow with 0.01, 0.05, 0.1, 0.25, 0.5, 1, 2, 5 or 10 seconds between images (default 0.5 seconds). The previous image stays visible until the next one is loaded and decoded, and the slideshow delay counts from when the new image appears. JPEG, PNG, GIF, WebP, AVIF, BMP, ICO and SVG are supported. The left and right lists scroll independently without extending the page.
- Direct playback uses browser codecs and byte ranges for seeking. The player provides pause, volume, seeking, speed, subtitles, picture-in-picture and fullscreen. Playback speed lives in the player's settings menu. Subtitles found for the video are listed in the player's captions menu, and a matching browser-language track is selected once per file. Captions start off; enabling them restores the preferred language. Subtitle selection, audio selection, volume, mute and playback speed are saved per file.
- Compatibility playback uses **local FFmpeg** to convert on-demand four-second HLS segments into H.264/AAC, including audio. MKV and similar containers default to this mode, and the player switches over on its own when direct playback fails. It supports seeking and caches converted segments. HEVC/10-bit video can require significant CPU; successful playback also depends on FFmpeg, the source format and available pieces.
- The browser's IndexedDB holds magnets, library entries and a separate watch position for each file. The helper stores metadata, verified pieces and converted segments on disk, outside npm/npx's package cache. Restarting the helper re-verifies and reuses cached pieces. A completed video can be saved using **Save**.
- Closing the web page alone leaves the helper running. Ctrl+C stops the helper and its transfers. Downloaded pieces may be uploaded to peers during a session.
- **Remove title** and **Clear library** delete both browser entries and corresponding helper caches while the helper is connected. Only managed torrent-hash folders are removed; separately saved Downloads files are not touched.
- Clearing browser **site data** removes the library and positions, but cannot remove helper files on disk. Clearing browsing history alone may leave site data intact. To remove both, use the app's Clear library action while connected, or remove the helper's data folder after stopping it.
- Use one active streaming tab per helper. There is no account, synchronization or offline app-shell installation. Cached content can be reused without peers after loading the website. Site history is specific to a browser profile and origin.

See [the helper README](https://github.com/bariskisir/MagnetPlayer/blob/master/docs/helper.md) for data locations, CLI options and local API details, and [the web README](https://github.com/bariskisir/MagnetPlayer/blob/master/docs/development.md) for frontend development.
