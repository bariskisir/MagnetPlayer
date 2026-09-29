# magnet-player-helper

Requires Node.js 22.22.2+, 24.15+ or 26+. The package declares npm 12.1+; npm 11 can also run it but may report an engine warning.

Check your npm version with `npm --version`, then run the matching command.

**npm 11:**

```sh
npx magnet-player-helper
```

**npm 12 and later:**

```sh
npx --allow-scripts=node-datachannel,ffmpeg-static,utp-native,bufferutil,utf-8-validate magnet-player-helper
```

npm 12 blocks dependency install scripts by default; the longer command permits the required components to install. After setup, the short command works while the installed package remains in the npx cache. See [setup details](https://github.com/bariskisir/MagnetPlayer/blob/master/docs/helper.md#first-install-with-npm-12).

Keep the terminal open while watching. The helper opens the website automatically.
Downloaded pieces stay on your computer. Compatibility playback uses optional local FFmpeg.

By default, the helper stores its cache in `magnet-player-helper` under the system temporary directory on Windows, macOS and Linux. The operating system may clean up temporary files. Use `--data-dir /path/to/cache` to choose a persistent location.

```sh
npx magnet-player-helper --help
```

- [Options, data locations, API and licensing](https://github.com/bariskisir/MagnetPlayer/blob/master/docs/helper.md)
- [Playback guide](https://github.com/bariskisir/MagnetPlayer/blob/master/docs/usage.md)
- [Source and release instructions](https://github.com/bariskisir/MagnetPlayer/blob/master/docs/releases.md)

MIT. Dependency and FFmpeg licenses are separate; see the licensing notes above.
