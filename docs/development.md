# Development

Use Node.js 24.15+ and npm 12.1+. Node.js 22.22.2+ is also supported. From the repository root:

```sh
npm ci
npm run dev
```

Open http://localhost:5173. The helper listens at http://127.0.0.1:45891 and keeps its development cache in `.helper-data/`. On PowerShell installations with restricted script execution, use `npm.cmd`.

## Structure

```text
apps/web/
  src/app/                  Application composition
  src/features/helper/      Connection settings, HTTP transport and torrent sessions
  src/features/library/     Saved titles, watch history and library controls
  src/features/player/      Media lifecycle, player presentation and transfer display
  src/features/subtitles/   Title lookup, subtitle caching and cue rendering
  src/shared/               Formatting, magnet validation and IndexedDB transactions
  src/styles/               Theme tokens, layout and component styles
packages/helper/
  src/cli.ts                Executable entry point
  src/cli/                  Arguments, browser launch and process lifecycle
  src/http/                 Request policy, API routing and media responses
  src/media/                FFmpeg processes, metadata probes and HLS conversion
  src/storage/              Directory locking and atomic disk storage
  src/torrent/              Torrent lifecycle and playhead piece selection
  tools/                    Clean TypeScript build
scripts/                    Package inspection and release preparation
docs/                       User, development and release guides
.github/workflows/          Cross-platform checks and npm publication
```

The browser communicates with the helper through an HTTP transport. A torrent session owns polling and request cancellation; React hooks manage its lifetime and selected file. Library entries and per-file preferences are stored in IndexedDB. Subtitle lookup reuses cached WebVTT tracks before contacting the public catalog and subtitle services.

The helper stores torrent metadata, verified pieces and converted segments in its data directory. Direct playback serves byte ranges. Compatibility playback probes each source once and converts bounded H.264/AAC segments, with separate audio renditions for multi-track sources. Conversion requests share pending work and stop with the active session.

## Commands

```sh
npm run typecheck
npm run build
npm run format:check
npm run helper:check
npm run release:check
```

TypeScript settings shared by the web app, helper and tools live in `tsconfig.base.json`. Vite bundles the browser app; the helper build removes previous output before compiling. Package inspection checks npm's actual distribution file list without publishing. Release validation checks versions, lock metadata and documentation links.

Use `npm run dev:web` and `npm run dev:helper` to start services separately. `npm run preview` serves the built browser app. Both workspaces have a `build` script; `build:web` also works from the repository root or web workspace for deployment overrides.

## Dependencies

`package-lock.json` records the workspace installation. Update dependencies from the repository root and commit the lockfile with their manifest changes. The helper's direct runtime dependencies use exact versions; its npm distribution contains compiled code and documentation.

The manifests list allowed dependency install scripts explicitly. The package-manager restriction script in `ip-set` is disabled; that package needs no build step. Generated output, dependency folders and runtime caches are excluded from Git.

The subtitle font is a separately licensed asset. Its license is independent of the source code's MIT license.

See [releases and deployment](https://github.com/bariskisir/MagnetPlayer/blob/master/docs/releases.md) for npm and Vercel configuration.
