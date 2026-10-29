/**
 * Generator: builds the "advantages-flaws" pack source (src/advantages-flaws/)
 * mirroring the Vampire 5e compendium layout — `feature` items tagged
 * system.featuretype = background | merit | flaw, foldered by category
 * (Backgrounds / Merits / Flaws).
 *
 * TEXT SOURCES (local, on this machine — nothing is fetched):
 *   - M5 rulebook text extracted to a local txt file (M5_TEXT below)
 *   - Vampire 5e compendium items unpacked to a local dir (VAMP_DIR below),
 *     used ONLY for entries the M5 book defers to the Vampire/V5 version
 *     (shared Storyteller license).
 *
 * The M5 detail section is pages ~62-69. Entry names come from the index
 * listing near the "ADVANTAGES AND FLAWS" marker, which also tags each entry's
 * source as (V5 page N)=Vampire, (M5 page N)=Mage, (H5 page N)=Hunter.
 *
 * Deterministic 16-char ids keep items stable across rebuilds.
 * Run: node gen-advantages.mjs
 */
import { readFileSync, writeFileSync, readdirSync, rmSync, mkdirSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'

const root = dirname(fileURLToPath(import.meta.url))
const srcDir = join(root, 'src', 'advantages-flaws')

// --- LOCAL SOURCE PATHS (edit if your scratch dir differs) ---
const M5_TEXT = process.env.M5_TEXT || 'C:/Users/jenni/.kiro/crew/scratch/runtime-b2c1f94e/m5-text.txt'
const VAMP_DIR = process.env.VAMP_DIR || 'C:/Users/jenni/.kiro/crew/scratch/runtime-b2c1f94e/vamp-af'

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

// Un-hyphenate OCR line breaks ("unusu­\nally" -> "unusually") and join wrapped lines
// into paragraphs. We keep • dot markers. Each returned block is one entry's raw text.
function cleanText (raw) {
  return raw
    .replace(/\u00ad\s*\n\s*/g, '')   // soft hyphen + newline -> join
    .replace(/-\s*\n\s*/g, '')         // hard hyphen at EOL -> join
    .replace(/\s*\n\s*/g, ' ')          // remaining newlines -> space
    .replace(/\s{2,}/g, ' ')
    .trim()
}

// ---- Parse the M5 detail section into { name -> rawBlock } ----
// The detail section runs from the "Advantages\nMerits" heading through the
// Backgrounds entries. Entry headers are lines that are a bare Title Case name
// (no leading •, not a "Flaw:" line). We slice between the Merits heading and
// the end of the Backgrounds block.
// Known M5 entry headers (as printed in the book) — always treated as headers,
// which lets prose-first backgrounds (Demesne, Familiar/Companion, ...) parse.
const M5_HEADER_NAMES = new Set([
  'Avatar Capacity', 'Avatar/Genius Resonance', 'Avatar/Genius Strength',
  'Bard’s Tongue', "Bard's Tongue", 'Beast Affinity', 'Combat Tools', 'Curiosity',
  'Cursed', 'Echoes', 'Enemy', 'Faith', 'Folklore Bane', 'Haunted', 'Health',
  'Lifesaver', 'Love', 'Memory', 'Pain and Suffering', 'Paradox Merits',
  'Phylactery', 'Quickening', 'Sect Paradigms', 'Sight', 'Substance Use',
  'Territorial', 'Will', 'Demesne', 'Enhancement', 'Familiar/Companion',
  'Requisitions', 'Safe House', 'Wonders'
])

function parseM5Blocks (rawText) {
  const text = rawText.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  // Grab pages 62-69 region: from the first "Advantages\nMerits" to "Wonders" end.
  const startIdx = text.indexOf('Advantages\nMerits')
  const afterWonders = text.indexOf('Wonders', startIdx)
  const endIdx = text.indexOf('===PAGE 70===', afterWonders > 0 ? afterWonders : startIdx)
  const section = text.slice(startIdx, endIdx > 0 ? endIdx : startIdx + 20000)

  const lines = section.split('\n')
  const blocks = {}
  let current = null
  let buf = []

  const nextNonEmpty = (idx) => {
    for (let j = idx + 1; j < lines.length; j++) {
      if (lines[j].trim()) return lines[j].trim()
    }
    return ''
  }

  const isHeader = (ln, idx) => {
    const t = ln.trim()
    if (!t) return false
    if (/^[●•]/.test(t)) return false
    if (/^Flaw:/i.test(t)) return false
    if (/^===PAGE/.test(t)) return false
    if (/^M A G E|^\d+\s*$|^Characters$/.test(t)) return false
    if (t.length > 40) return false
    if (t.split(' ').length > 6) return false
    if (!/^[A-Z][A-Za-z]/.test(t) || /[.:,]$/.test(t)) return false
    // A known M5 entry name is always a header (handles prose-first backgrounds).
    if (M5_HEADER_NAMES.has(t)) return true
    // Otherwise a real entry header is immediately followed by a dot-rating or Flaw: line.
    const nxt = nextNonEmpty(idx)
    return /^[●•]/.test(nxt) || /^Flaw:/i.test(nxt)
  }

  const flush = () => {
    if (current && buf.length) blocks[current] = buf.join('\n').trim()
    buf = []
  }

  for (let i = 0; i < lines.length; i++) {
    const ln = lines[i]
    if (isHeader(ln, i)) {
      flush()
      current = ln.trim()
    } else if (current) {
      buf.push(ln)
    }
  }
  flush()
  return blocks
}

// Split a raw block into HTML <p> paragraphs: one per dot-rated line or Flaw line,
// a lead paragraph for any intro prose.
function blockToHtml (raw) {
  let cleaned = raw.replace(/\u00ad\s*\n\s*/g, '').replace(/-\s*\n\s*/g, '')
  // M5 prints the dot rating on its own line, then the ability name + text on the
  // next line(s). Join a dots-only line to what follows so the rating stays with its text.
  cleaned = cleaned.replace(/^([●•]+)\s*\n/gm, '$1\t')
  // Drop a leading "Flaw:" block here — flaws are emitted separately.
  // Break before each ● rating run or "Flaw:"
  const parts = cleaned.split(/\n(?=[●•]|Flaw:)/)
  const paras = []
  for (let p of parts) {
    p = p.replace(/\s*\n\s*/g, ' ').replace(/\s{2,}/g, ' ').trim()
    if (p && !/^Flaw:/i.test(p)) paras.push(`<p>${p}</p>`)
  }
  return paras.join('')
}

// Extract interleaved "Flaw: (●●) Name: text" entries from a raw block.
function extractFlaws (raw) {
  const cleaned = raw.replace(/\u00ad\s*\n\s*/g, '').replace(/-\s*\n\s*/g, '')
  const flaws = []
  const re = /Flaw:\s*\(([●•\s/]+)\)\s*([^:]+?):\s*([\s\S]*?)(?=\nFlaw:|\n[●•]|\n[A-Z][a-z]+(?:\s[A-Z]?[a-z]+){0,4}\n|$)/g
  let m
  while ((m = re.exec(cleaned)) !== null) {
    const dots = m[1].replace(/\s/g, '')
    const name = m[2].trim()
    const body = m[3].replace(/\s*\n\s*/g, ' ').replace(/\s{2,}/g, ' ').trim()
    flaws.push({ name, dots, description: `<p>(${dots}) ${body}</p>` })
  }
  return flaws
}

// ---- Vampire fallback: build folder tree, then collect an entry's text ----
function loadVampire () {
  const files = readdirSync(VAMP_DIR).filter((f) => f.endsWith('.json'))
  const docs = files.map((f) => JSON.parse(readFileSync(join(VAMP_DIR, f), 'utf8')))
  const folders = {}        // id -> {name, folder}
  const itemsByFolder = {}  // folderId -> [items]
  const folderByName = {}   // lowercased name -> id
  for (const d of docs) {
    if (d._key && d._key.startsWith('!folders!')) {
      folders[d._id] = { name: d.name, folder: d.folder }
      folderByName[d.name.toLowerCase()] = d._id
    }
  }
  for (const d of docs) {
    if (d.type === 'feature') {
      const fid = d.folder || '__root'
      ;(itemsByFolder[fid] = itemsByFolder[fid] || []).push(d)
    }
  }
  return { folders, itemsByFolder, folderByName }
}

// Get the verbatim V5 description for a named background/merit/flaw.
function vampDescription (vamp, name) {
  const key = name.toLowerCase()
  // Case 1: name is itself a folder (e.g. "Allies", "Contacts") — merge its leaf items.
  const fid = vamp.folderByName[key]
  if (fid && vamp.itemsByFolder[fid]) {
    const paras = vamp.itemsByFolder[fid]
      .map((it) => (it.system?.description || '').trim())
      .filter(Boolean)
    if (paras.length) return paras.join('')
  }
  // Case 2: a leaf feature item named exactly this.
  for (const list of Object.values(vamp.itemsByFolder)) {
    for (const it of list) {
      if ((it.name || '').toLowerCase() === key) {
        const d = (it.system?.description || '').trim()
        if (d) return d
      }
    }
  }
  return null
}

// ---- Entry plan from the index listing (name, category, source tag) ----
// V5 = pull from vampire; M5 = parse from M5 blocks; H5 = note reference.
const PLAN = {
  backgrounds: [
    { name: 'Allies', src: 'V5' },
    { name: 'Contacts', src: 'V5' },
    { name: 'Fame', src: 'V5' },
    { name: 'Influence', src: 'V5' },
    { name: 'Resources', src: 'V5' },
    { name: 'Retainers', src: 'V5', alias: 'Retainer' },
    { name: 'Status', src: 'V5' },
    { name: 'Mentor', src: 'H5' },
    { name: 'Mask', src: 'H5' },
    { name: 'Demesne', src: 'M5' },
    { name: 'Enhancement', src: 'M5' },
    { name: 'Familiar/Companion', src: 'M5' },
    { name: 'Requisitions', src: 'M5' },
    { name: 'Safe House', src: 'M5' },
    { name: 'Wonders', src: 'M5' }
  ],
  merits: [
    { name: 'Avatar Capacity', src: 'M5' },
    { name: 'Avatar/Genius Resonance', src: 'M5', m5key: 'Avatar/Genius Resonance' },
    { name: 'Avatar/Genius Strength', src: 'M5' },
    { name: 'Beast Affinity', src: 'M5' },
    { name: 'Combat Tools', src: 'M5' },
    { name: 'Faith', src: 'M5' },
    { name: 'Health', src: 'M5' },
    { name: 'Memory', src: 'M5' },
    { name: 'Paradox Merits', src: 'M5' },
    { name: 'Quickening', src: 'M5' },
    { name: 'Sect Paradigms', src: 'M5' },
    { name: 'Sight', src: 'M5' },
    { name: 'Substance Use', src: 'M5' },
    { name: 'Territorial', src: 'M5' },
    { name: 'Will', src: 'M5' },
    { name: 'Linguistics', src: 'V5' },
    { name: 'Looks', src: 'V5' },
    { name: 'Archaic', src: 'V5' }
  ]
}

// ---- Build ----
const m5text = readFileSync(M5_TEXT, 'utf8')
const m5blocks = parseM5Blocks(m5text)
const vamp = loadVampire()

const folders = []
const items = []
const unresolved = []

const CATS = [
  { key: 'backgrounds', label: 'Backgrounds', featuretype: 'background', sort: 100000 },
  { key: 'merits', label: 'Merits', featuretype: 'merit', sort: 200000 },
  { key: 'flaws', label: 'Flaws', featuretype: 'flaw', sort: 300000 }
]
const catFolderId = {}
for (const c of CATS) {
  const id = detId(`folder/af/${c.key}`)
  catFolderId[c.key] = id
  folders.push({ name: c.label, type: 'Item', folder: null, sorting: 'a', sort: c.sort, _id: id, _key: `!folders!${id}` })
}

function pushItem (name, featuretype, description, source, page, folderId) {
  const id = detId(`af/${featuretype}/${name}`)
  items.push({
    name,
    type: 'feature',
    img: 'icons/svg/book.svg',
    folder: folderId,
    system: { description, featuretype, bonuses: [], uses: { max: 0, current: 0, enabled: false }, points: 0, macroid: '' },
    _id: id,
    _key: `!items!${id}`,
    _file: `${featuretype}-${slug(name)}.json`,
    _source: source,
    _page: page
  })
}

const flawEntries = []  // collected from M5 merit/background blocks

function resolveM5 (name, key) {
  // Try exact, then a few normalizations
  const tryNames = [key || name, name.replace('/Genius', ''), name.split('/')[0]]
  for (const t of tryNames) {
    if (m5blocks[t]) return m5blocks[t]
  }
  return null
}

for (const cat of CATS.filter((c) => c.key !== 'flaws')) {
  for (const entry of PLAN[cat.key]) {
    let description = null
    let source = ''
    let page = ''
    if (entry.src === 'V5') {
      description = vampDescription(vamp, entry.alias || entry.name)
      source = 'Vampire 5e compendium (shared Storyteller license)'
      if (!description) { unresolved.push(`V5 fallback missing in vampire pack: ${entry.name}`); description = '<p>Uses the Vampire 5e version. See the Vampire compendium.</p>'; source = 'V5 (referenced)' }
    } else if (entry.src === 'H5') {
      description = '<p>Uses the Hunter 5e version (H5). See the Hunter rules.</p>'
      source = 'H5 (referenced)'
    } else { // M5
      const raw = resolveM5(entry.name, entry.m5key)
      source = 'M5 Mage the Ascension'
      if (raw) {
        description = blockToHtml(raw)
        for (const fl of extractFlaws(raw)) flawEntries.push({ ...fl, source })
      } else {
        unresolved.push(`M5 block not parsed: ${entry.name}`)
        description = '<p>See M5 Mage the Ascension.</p>'
      }
    }
    pushItem(entry.name, cat.featuretype, description, source, page, catFolderId[cat.key])
  }
}

// Emit collected flaws (dedup by name). First, sweep EVERY M5 block for
// interleaved "Flaw:" entries (many live under their own headers like
// "Bard's Tongue", "Curiosity", "Cursed" that aren't in the merit plan).
for (const raw of Object.values(m5blocks)) {
  for (const fl of extractFlaws(raw)) flawEntries.push({ ...fl, source: 'M5 Mage the Ascension' })
}

const seenFlaw = new Set()
for (const fl of flawEntries) {
  const k = fl.name.toLowerCase()
  if (seenFlaw.has(k)) continue
  seenFlaw.add(k)
  pushItem(fl.name, 'flaw', fl.description, fl.source, '', catFolderId.flaws)
}

// ---- Write source files ----
if (!existsSync(srcDir)) mkdirSync(srcDir, { recursive: true })
for (const f of readdirSync(srcDir)) { if (f.endsWith('.json')) rmSync(join(srcDir, f)) }
for (const fol of folders) {
  writeFileSync(join(srcDir, `_folder-${slug(fol.name)}-${fol._id}.json`), JSON.stringify(fol, null, 2))
}
for (const it of items) {
  const file = it._file
  delete it._file; delete it._source; delete it._page
  writeFileSync(join(srcDir, file), JSON.stringify(it, null, 2))
}

console.log(`advantages-flaws: ${folders.length} folders, ${items.length} items`)
const byType = items.reduce((a, it) => { a[it.system.featuretype] = (a[it.system.featuretype] || 0) + 1; return a }, {})
console.log('by featuretype:', JSON.stringify(byType))
if (unresolved.length) { console.log('UNRESOLVED (' + unresolved.length + '):'); unresolved.forEach((u) => console.log('  - ' + u)) }
