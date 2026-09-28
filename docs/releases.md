# Releases and deployment

## npm helper release

Only `magnet-player-helper` is published. The root and web manifests are private. The helper's `files` allowlist contains `dist/`, README and LICENSE. Website assets, source tools, workflows and runtime caches are excluded.

1. Add an npm publishing token as the GitHub Actions secret `NPM_TOKEN`. It must have publishing access to `magnet-player-helper` and be usable for unattended publication.
2. Prepare the version from the repository root:

   ```sh
   npm run release:version -- 1.0.0
   npm run format
   ```

   This updates the helper manifest and workspace lock metadata. Use a new version for each release. Documentation links use explicit GitHub `blob/master` URLs so they work from npm and GitHub.

3. Review and commit the changes, then push the matching tag:

   ```sh
   git add .
   git commit -m "Prepare helper v1.0.0"
   git tag v1.0.0
   git push origin HEAD
   git push origin v1.0.0
   ```

Pushing a `v*` tag triggers `publish-helper.yml`. The workflow rejects invalid or mismatched versions, checks documentation URLs and workspace lock metadata, runs the reusable cross-platform type, build, formatting and package checks, verifies the npm package contents, and publishes only the helper workspace. Stable releases use npm's `latest` tag; prereleases such as `v1.1.0-beta.1` use `next`.

`NPM_TOKEN` is injected into the publication step's environment and mapped to `NODE_AUTH_TOKEN`, which is the variable used by setup-node's generated npm registry configuration. Tokens are never written to repository files. See [GitHub's npm publishing guide](https://docs.github.com/en/actions/tutorials/publish-packages/publish-nodejs-packages).

A local tag alone does not run GitHub Actions. Existing npm versions cannot be overwritten. GitHub documentation links follow `master` and become available once those files are pushed to the public repository.

## Inspect the package locally

```sh
npm run helper:check
npm run helper:pack
npm exec --yes --package ./magnet-player-helper-1.0.0.tgz -- magnet-player-helper --help
```

`npm run helper:publish` is an explicit manual publication command; it builds the TypeScript helper before publication. The helper has no runtime import from the rest of this repository.

The helper's direct runtime dependencies use exact versions. The repository lockfile records development installations; dependency folders are excluded from the distribution. npm 12 does not support published shrinkwrap files.

## Vercel

Use `apps/web` as the Vercel Root Directory with the Vite framework preset. Its `vercel.json` sets `npm run build:web` as the build command and `dist` as the output directory. Enable access to files outside the Root Directory so npm can use the repository workspace lockfile.

For a project configured at the repository root, the root `vercel.json` builds the web workspace and uses `apps/web/dist`. Both configurations apply the same static response headers. The web workspace provides `build:web` so existing build command overrides remain valid.

The manifests explicitly allow the install scripts needed by the build dependencies. The repository also allows the optional FFmpeg installation script used by the helper.

Vercel deployment and npm publication are configured independently. The npm workflow publishes the helper; it does not deploy the website.
