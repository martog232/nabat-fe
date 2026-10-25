#!/usr/bin/env node
/**
 * Fails when this repository's copy of the API contract differs from nabat-app's.
 *
 * The types in src/types/api.d.ts are generated from contracts/openapi.json, and that file is
 * a copy of one owned by nabat-app. A copy is a thing that goes stale: the point of this check
 * is that it goes stale loudly, in a build, rather than quietly in a screen that renders a
 * field the server stopped sending.
 *
 * Reads the source from the sibling checkout when there is one — the usual case on a
 * developer's machine, and it works offline — and from GitHub otherwise, which is the case in
 * CI, where only this repository is checked out.
 */
import { readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'

const LOCAL_COPY = 'contracts/openapi.json'
const SIBLING_SOURCE = '../nabat-app/contracts/openapi.json'
const REMOTE_SOURCE =
  'https://raw.githubusercontent.com/martog232/nabat/main/contracts/openapi.json'

async function readSource() {
  if (existsSync(SIBLING_SOURCE)) {
    return { where: SIBLING_SOURCE, text: await readFile(SIBLING_SOURCE, 'utf8') }
  }

  const response = await fetch(REMOTE_SOURCE)
  if (!response.ok) {
    throw new Error(`${REMOTE_SOURCE} answered ${response.status}`)
  }
  return { where: REMOTE_SOURCE, text: await response.text() }
}

const local = await readFile(LOCAL_COPY, 'utf8').catch(() => null)
if (local === null) {
  console.error(`${LOCAL_COPY} is missing. Copy it from nabat-app and run npm run contract:types.`)
  process.exit(1)
}

const source = await readSource()

// Parsed, not text: nabat-app writes this file from springdoc's output, which has no reason to
// keep key order stable, and a reordered key is not a contract change.
const same = JSON.stringify(sorted(JSON.parse(local))) === JSON.stringify(sorted(JSON.parse(source.text)))

if (!same) {
  console.error(
    `${LOCAL_COPY} differs from ${source.where}.\n\n` +
      `The API changed. Copy the newer file over and regenerate the types:\n` +
      `  cp ${SIBLING_SOURCE} ${LOCAL_COPY} && npm run contract:types\n\n` +
      `Then fix whatever stops compiling — that is the drift this check exists to surface.`,
  )
  process.exit(1)
}

console.log(`${LOCAL_COPY} matches ${source.where}`)

/** Key order is not part of the contract, so it is removed before comparing. */
function sorted(value) {
  if (Array.isArray(value)) return value.map(sorted)
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, sorted(value[key])]),
    )
  }
  return value
}
