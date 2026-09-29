import { readFileSync } from 'node:fs'

export interface PackageManifest {
  name: string
  version: string
}
export interface Lockfile {
  version: string
  packages: Record<string, { version: string }>
}
export interface PackageArchive {
  name: string
  version: string
  files: { path: string }[]
  size: number
}

export const repositoryRoot = new URL('../', import.meta.url)
export const documentationFiles = [
  'README.md',
  'packages/helper/README.md',
  'apps/web/README.md',
  'docs/usage.md',
]

export function readJson<T = PackageManifest>(path: string): T {
  return JSON.parse(readFileSync(new URL(path, repositoryRoot), 'utf8'))
}

export function validateVersion(version: unknown): string {
  const integer = '(0|[1-9][0-9]*)'
  const identifier = '(?:0|[1-9][0-9]*|[0-9]*[a-zA-Z-][0-9a-zA-Z-]*)'
  const pattern = new RegExp(
    `^${integer}\\.${integer}\\.${integer}(?:-${identifier}(?:\\.${identifier})*)?$`,
  )
  if (typeof version !== 'string' || !pattern.test(version)) {
    throw new Error('Use a canonical version such as 1.0.0 or 1.1.0-beta.1.')
  }
  return version
}

export function validateTag(tag: string, version: string) {
  validateVersion(version)
  if (tag !== `v${version}`) throw new Error(`Expected tag v${version}; received ${tag}.`)
}

export function validatePackage(pack: PackageArchive, manifest: PackageManifest) {
  if (pack.name !== manifest.name || pack.version !== manifest.version) {
    throw new Error('The tarball does not match the helper manifest.')
  }
  const required = [
    'package.json',
    'README.md',
    'LICENSE',
    'dist/cli.js',
    'dist/cli/run.js',
    'dist/config.js',
  ]
  const paths = pack.files.map((file) => file.path)
  for (const path of required) {
    if (!paths.includes(path)) throw new Error(`Missing package file: ${path}`)
  }
  for (const path of paths) {
    if (
      !/^(?:package\.json|README\.md|LICENSE|dist\/(?:[a-zA-Z0-9_-]+\/)*[a-zA-Z0-9_-]+\.js)$/.test(
        path,
      )
    ) {
      throw new Error(`Unexpected package file: ${path}`)
    }
  }
}
