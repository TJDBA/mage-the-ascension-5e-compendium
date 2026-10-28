/**
 * Build script: compiles src/<pack>/*.json source items into Foundry LevelDB packs under packs/<pack>.
 *
 * Each source item is given a deterministic 16-char _id (derived from pack + filename) and the
 * _key the Foundry CLI (v3) requires (!items!<id>). Deterministic ids keep the same item stable
 * across rebuilds so world references don't break.
 *
 * Run with: node build.mjs
 */
import { compilePack } from '@foundryvtt/foundryvtt-cli'
import { readdirSync, statSync, readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs'
import { join, dirname, basename } from 'node:path'
import { tmpdir } from 'node:os'
import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'

const root = dirname(fileURLToPath(import.meta.url))
const srcRoot = join(root, 'src')

// Foundry ids are 16 chars from this alphabet.
const ID_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
function deterministicId (seed) {
  const hash = createHash('sha256').update(seed).digest()
  let id = ''
  for (let i = 0; i < 16; i++) id += ID_ALPHABET[hash[i] % ID_ALPHABET.length]
  return id
}

const packs = readdirSync(srcRoot).filter((name) => statSync(join(srcRoot, name)).isDirectory())

for (const pack of packs) {
  const src = join(srcRoot, pack)
  const dest = join(root, 'packs', pack)

  // Stage source files into a temp dir with _id/_key injected (keeps the committed src clean).
  const stage = mkdtempSync(join(tmpdir(), `mta-${pack}-`))
  const files = readdirSync(src).filter((f) => f.endsWith('.json'))
  for (const file of files) {
    const doc = JSON.parse(readFileSync(join(src, file), 'utf8'))
    const id = doc._id ?? deterministicId(`${pack}/${basename(file, '.json')}`)
    doc._id = id
    doc._key = `!items!${id}`
    writeFileSync(join(stage, file), JSON.stringify(doc, null, 2))
  }

  // eslint-disable-next-line no-await-in-loop
  await compilePack(stage, dest, { recursive: false, log: true })
  rmSync(stage, { recursive: true, force: true })
  console.log(`Compiled pack: ${pack} -> packs/${pack} (${files.length} items)`)
}

console.log('All packs compiled.')
