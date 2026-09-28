import type { Lockfile } from './release.js'
import { readFileSync } from 'node:fs'
import { documentationFiles, readJson, repositoryRoot, validateTag } from './release.js'

const manifest = readJson('packages/helper/package.json')
validateTag(process.env.GITHUB_REF_NAME || `v${manifest.version}`, manifest.version)
const lock = readJson<Lockfile>('package-lock.json')
if (lock.packages['packages/helper'].version !== manifest.version) {
  throw new Error('The workspace lockfile version must match the helper.')
}
for (const path of documentationFiles) {
  const source = readFileSync(new URL(path, repositoryRoot), 'utf8')
  const markdownLinks = [
    ...source.matchAll(
      /https:\/\/github\.com\/bariskisir\/MagnetPlayer\/blob\/([^/\s)]+)\/([^\s)]+\.md)(?:#[^\s)]*)?/g,
    ),
  ]
  const rawMarkdownLinks = source.match(
    /https:\/\/raw\.githubusercontent\.com\/bariskisir\/MagnetPlayer\/[^\s)]+\.md(?:#[^\s)]*)?/g,
  )
  if (
    !markdownLinks.length ||
    markdownLinks.some((match) => match[1] !== 'master') ||
    rawMarkdownLinks
  ) {
    throw new Error(`Use absolute GitHub blob URLs on master for Markdown links in ${path}.`)
  }
}
console.log(`Release v${manifest.version} is consistent.`)
