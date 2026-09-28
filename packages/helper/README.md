# magnet-player-helper

Requires Node.js 22.22.2+, 24.15+ or 26+ and npm 12.1+.

```sh
npx --allow-scripts=node-datachannel,ffmpeg-static,utp-native,bufferutil,utf-8-validate magnet-player-helper
```

Keep the terminal open while watching. The helper opens the website automatically.
Downloaded pieces stay on your computer. Compatibility playback uses optional local FFmpeg.

```sh
npx --allow-scripts=node-datachannel,ffmpeg-static,utp-native,bufferutil,utf-8-validate magnet-player-helper --help
```

- [Options, data locations, API and licensing](https://raw.githubusercontent.com/bariskisir/MagnetPlayer/master/docs/helper.md)
- [Playback guide](https://raw.githubusercontent.com/bariskisir/MagnetPlayer/master/docs/usage.md)
- [Source and release instructions](https://raw.githubusercontent.com/bariskisir/MagnetPlayer/master/docs/releases.md)

MIT. Dependency and FFmpeg licenses are separate; see the licensing notes above.
