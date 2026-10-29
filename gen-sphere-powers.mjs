/**
 * Generator: expands each sphere's source JSON (src/spheres/<sphere>.json) into
 *   - one folder per Sphere (top level)
 *   - one subfolder per Level (1-5) under that Sphere
 *   - one `rote` item per NAMED ABILITY within each level
 *
 * Output is written to src/spheres/ as:
 *   - _folders.json            (array of folder docs for the spheres pack)
 *   - <sphere>-<slug>.json      (one per ability)
 * The original all-in-one <sphere>.json files are REPLACED by the sphere anchor item
 * (intro text only), kept at level 0 and filed in the sphere's top folder.
 *
 * Folder docs use Foundry's pack-folder shape; items reference their folder via `folder`.
 * Deterministic 16-char ids (same alphabet as build.mjs) keep ids stable across rebuilds.
 *
 * Run: node gen-sphere-powers.mjs
 */
import { readFileSync, writeFileSync, readdirSync, rmSync } from 'node:fs'
import { join, dirname, basename } from 'node:path'
import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'

const root = dirname(fileURLToPath(import.meta.url))
const srcSpheres = join(root, 'src', 'spheres')

const ID_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
function detId (seed) {
  const hash = createHash('sha256').update(seed).digest()
  let id = ''
  for (let i = 0; i < 16; i++) id += ID_ALPHABET[hash[i] % ID_ALPHABET.length]
  return id
}
function slug (s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

const SPHERES = [
  'correspondence', 'entropy', 'forces', 'life',
  'matter', 'mind', 'prime', 'spirit', 'time'
]

// Split a description HTML into { intro, levels: {1:[{name,html}], ...} }
function parseDescription (html) {
  // Everything before the first <h3>Level is the intro (keep the <h3>Effects</h3> block)
  const firstLevel = html.search(/<h3>Level\s*\d<\/h3>/i)
  const intro = firstLevel === -1 ? html : html.slice(0, firstLevel)
  const rest = firstLevel === -1 ? '' : html.slice(firstLevel)

  const levels = {}
  // Split into level chunks
  const chunks = rest.split(/<h3>Level\s*(\d)<\/h3>/i)
  // chunks[0] is '' ; then alternating [levelNum, body, levelNum, body, ...]
  for (let i = 1; i < chunks.length; i += 2) {
    const lvl = parseInt(chunks[i])
    const body = chunks[i + 1] || ''
    // Each ability is a <p><strong>Name:</strong> text</p>
    const abilities = []
    const pRegex = /<p><strong>([^<:]+):<\/strong>\s*([\s\S]*?)<\/p>/g
    let m
    while ((m = pRegex.exec(body)) !== null) {
      abilities.push({ name: m[1].trim(), text: m[2].trim() })
    }
    // Fallback: a level with no <strong> name paragraphs — keep whole body as one ability
    if (abilities.length === 0) {
      const plain = body.replace(/<\/?p>/g, '').trim()
      if (plain) abilities.push({ name: `Level ${lvl}`, text: plain })
    }
    levels[lvl] = abilities
  }
  return { intro, levels }
}

const folders = []
const items = []

for (const sphere of SPHERES) {
  const srcFile = join(srcSpheres, `${sphere}.json`)
  const doc = JSON.parse(readFileSync(srcFile, 'utf8'))
  const sphereName = doc.name
  const img = doc.system.img || doc.img
  const source = doc.system.source

  // Top-level folder for the sphere
  const sphereFolderId = detId(`folder/sphere/${sphere}`)
  folders.push({
    name: sphereName,
    type: 'Item',
    folder: null,
    sorting: 'm',
    sort: (SPHERES.indexOf(sphere) + 1) * 100000,
    _id: sphereFolderId,
    _key: `!folders!${sphereFolderId}`
  })

  const { intro, levels } = parseDescription(doc.system.description)

  // Sphere anchor item (intro text) at level 0, filed in the sphere folder
  const anchorId = detId(`spheres/${sphere}-overview`)
  items.push({
    name: `${sphereName} (Overview)`,
    type: 'rote',
    img,
    folder: sphereFolderId,
    system: {
      description: intro || `<p>${sphereName}</p>`,
      level: 0,
      sphere,
      isRote: false,
      source
    },
    _id: anchorId,
    _key: `!items!${anchorId}`,
    _file: `${sphere}-overview.json`
  })

  // One subfolder per level, one item per named ability
  for (let lvl = 1; lvl <= 5; lvl++) {
    const abilities = levels[lvl] || []
    if (abilities.length === 0) continue

    const levelFolderId = detId(`folder/sphere/${sphere}/level-${lvl}`)
    folders.push({
      name: `Level ${lvl}`,
      type: 'Item',
      folder: sphereFolderId,
      sorting: 'm',
      sort: lvl * 100000,
      _id: levelFolderId,
      _key: `!folders!${levelFolderId}`
    })

    for (const ab of abilities) {
      const abId = detId(`spheres/${sphere}/${lvl}/${ab.name}`)
      items.push({
        name: ab.name,
        type: 'rote',
        img,
        folder: levelFolderId,
        system: {
          description: `<p>${ab.text}</p>`,
          level: lvl,
          sphere,
          isRote: false,
          source
        },
        _id: abId,
        _key: `!items!${abId}`,
        _file: `${sphere}-${lvl}-${slug(ab.name)}.json`
      })
    }
  }
}

// Clear old per-sphere source files, then write new source set
for (const f of readdirSync(srcSpheres)) {
  if (f.endsWith('.json')) rmSync(join(srcSpheres, f))
}

// Write each folder to its own file (one doc per file, as compilePack expects)
for (const fol of folders) {
  writeFileSync(join(srcSpheres, `_folder-${slug(fol.name)}-${fol._id}.json`), JSON.stringify(fol, null, 2))
}

// Write each item to its own file (strip the _file helper key)
for (const it of items) {
  const file = it._file
  delete it._file
  writeFileSync(join(srcSpheres, file), JSON.stringify(it, null, 2))
}

console.log(`Generated ${folders.length} folders and ${items.length} items across ${SPHERES.length} spheres.`)
