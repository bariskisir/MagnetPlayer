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
  src/features/search/      Torrent search requests, sorting and result selection
  src/features/player/      Media lifecycle, player presentation and transfer display
    files/                  Media file sections and download controls
    gallery/                Image navigation, zoom and image loading
  src/features/subtitles/   Title lookup, subtitle caching and cue rendering
  src/shared/               Formatting, magnet validation and IndexedDB transactions
  src/styles/               Theme tokens, layout and component styles
packages/helper/
  src/cli.ts                Executable entry point
  src/cli/                  Arguments, browser launch and process lifecycle
  src/contracts/            Browser-safe HTTP types and media classification
  src/http/                 Request policy, API routing and media responses
  src/search/               Search aggregation, normalization and provider adapters
  src/media/                FFmpeg processes, metadata probes and HLS conversion
  src/storage/              Directory locking and atomic disk storage
  src/torrent/              Torrent lifecycle and playhead piece selection
  tools/                    Clean TypeScript build
scripts/                    Package inspection and release preparation
tests/                      HTTP, media, search and library regression tests
docs/                       User, development and release guides
.github/workflows/          Cross-platform checks and npm publication
```

The browser communicates with the helper through an HTTP transport. A torrent session owns polling and request cancellation; React hooks manage its lifetime and selected file. Library entries and per-file preferences are stored in IndexedDB. Subtitle lookup reuses cached WebVTT tracks before contacting the public catalog and subtitle services.

Components use PascalCase filenames; hooks and other TypeScript modules use kebab-case. Feature-specific types and persistence modules include their domain in the filename. The helper owns the shared wire contracts in `src/contracts/`; these modules have no Node.js dependencies, and the web app imports them through its shared media/search modules and helper types. Keep server implementations out of browser imports. Byte ranges have an exclusive end, while torrent piece ranges include both endpoints.

Search request cancellation lives in `use-torrent-search.ts`, result sorting and magnet creation in `search-results.ts`, and table rendering in `SearchResultsTable.tsx`. Library entry transformations and subtitle formatting are pure functions. The audio and video players share media props and playback lifecycle, and their file sections share the same presentation component.

The helper stores torrent metadata, verified pieces and converted segments in its data directory. Direct playback serves byte ranges. Compatibility playback probes each source once and converts bounded H.264/AAC segments, with separate audio renditions for multi-track sources. Conversion requests share pending work and stop with the active session.

## Commands

```sh
npm run typecheck
npm test
npm run build
npm run format:check
npm run helper:check
npm run release:check
```

TypeScript settings shared by the web app, helper, tools and tests live in `tsconfig.base.json`. Vite bundles the browser app; the helper build removes previous output before compiling. Tests run through Node's test runner with `tsx`; provider responses are mocked and HTTP routing is exercised on a temporary loopback port. Package inspection checks npm's actual distribution file list without publishing. Release validation checks versions, lock metadata and documentation links.

Use `npm run dev:web` and `npm run dev:helper` to start services separately. `npm run preview` serves the built browser app. Both workspaces have a `build` script; `build:web` also works from the repository root or web workspace for deployment overrides.

## Dependencies

`package-lock.json` records the workspace installation. Update dependencies from the repository root and commit the lockfile with their manifest changes. The helper's direct runtime dependencies use exact versions; its npm distribution contains compiled code and documentation.

The manifests list allowed dependency install scripts explicitly. The package-manager restriction script in `ip-set` is disabled; that package needs no build step. Generated output, dependency folders and runtime caches are excluded from Git.

The subtitle font is a separately licensed asset. Its license is independent of the source code's MIT license.

See [releases and deployment](https://github.com/bariskisir/MagnetPlayer/blob/master/docs/releases.md) for npm and Vercel configuration.
