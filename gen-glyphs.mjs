/**
 * Generates ORIGINAL placeholder glyphs (SVG) for each Sphere and faction, in the Mage palette.
 * These are simple geometric marks of my own design, NOT the official White Wolf symbols.
 * Output: packs/assets/sphere-*.svg and packs/assets/faction-*.svg
 *
 * Run: node gen-glyphs.mjs
 */
import { writeFileSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(fileURLToPath(import.meta.url))
const out = join(root, 'packs', 'assets')
mkdirSync(out, { recursive: true })

// Mage palette
const PURPLE = '#4A154B'
const PURPLE_DEEP = '#2D0031'
const ICE = '#8FE2FF'
const MAGENTA = '#D8005A'
const GOLD = '#D4AF37'

// Each sphere gets a distinct geometric motif + accent colour.
const spheres = {
  correspondence: { accent: ICE, motif: 'grid' },
  entropy: { accent: MAGENTA, motif: 'hourglass' },
  forces: { accent: GOLD, motif: 'bolt' },
  life: { accent: ICE, motif: 'leaf' },
  matter: { accent: GOLD, motif: 'cube' },
  mind: { accent: ICE, motif: 'rings' },
  prime: { accent: GOLD, motif: 'star' },
  spirit: { accent: ICE, motif: 'veil' },
  time: { accent: MAGENTA, motif: 'clock' }
}

// Factions: Traditions (gold accent), Technocracy (ice accent). Each gets a rune index for a unique rotation.
const factions = {
  'akashayana': GOLD,
  'celestial-chorus': GOLD,
  'cult-of-ecstasy': GOLD,
  'dreamspeakers': GOLD,
  'euthanatos': GOLD,
  'order-of-hermes': GOLD,
  'society-of-ether': GOLD,
  'verbena': GOLD,
  'virtual-adepts': GOLD,
  'iteration-x': ICE,
  'new-world-order': ICE,
  'progenitors': ICE,
  'syndicate': ICE,
  'void-engineers': ICE
}

function frame (inner) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120">
  <defs>
    <radialGradient id="bg" cx="50%" cy="45%" r="70%">
      <stop offset="0%" stop-color="${PURPLE}"/>
      <stop offset="100%" stop-color="${PURPLE_DEEP}"/>
    </radialGradient>
  </defs>
  <circle cx="60" cy="60" r="58" fill="url(#bg)" stroke="${GOLD}" stroke-width="2"/>
${inner}
</svg>
`
}

function sphereMotif (motif, accent) {
  const s = `stroke="${accent}" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"`
  switch (motif) {
    case 'grid': return `  <g ${s}><path d="M35 45h50M35 60h50M35 75h50M45 35v50M60 35v50M75 35v50"/></g>`
    case 'hourglass': return `  <g ${s}><path d="M42 38h36L42 82h36zM42 38L78 82"/></g>`
    case 'bolt': return `  <polygon points="64,32 46,64 58,64 54,88 76,56 62,56" fill="${accent}" stroke="none"/>`
    case 'leaf': return `  <g ${s}><path d="M60 34c-18 14-18 44 0 54 18-10 18-40 0-54zM60 36v50"/></g>`
    case 'cube': return `  <g ${s}><path d="M60 34l24 14v24L60 86 36 72V48zM60 34v26M60 60l24-12M60 60L36 48"/></g>`
    case 'rings': return `  <g ${s}><circle cx="60" cy="52" r="16"/><circle cx="50" cy="72" r="14"/><circle cx="70" cy="72" r="14"/></g>`
    case 'star': return `  <polygon points="60,30 67,52 90,52 71,66 78,88 60,74 42,88 49,66 30,52 53,52" fill="${accent}" stroke="none"/>`
    case 'veil': return `  <g ${s}><path d="M36 48c12 10 36 10 48 0M36 62c12 10 36 10 48 0M36 76c12 10 36 10 48 0"/></g>`
    case 'clock': return `  <g ${s}><circle cx="60" cy="60" r="26"/><path d="M60 60V42M60 60l16 10"/></g>`
    default: return ''
  }
}

for (const [name, { accent, motif }] of Object.entries(spheres)) {
  writeFileSync(join(out, `sphere-${name}.svg`), frame(sphereMotif(motif, accent)))
}

// Faction glyph: a sigil ring with N points, derived deterministically from the name.
let fi = 0
for (const [name, accent] of Object.entries(factions)) {
  const points = 3 + (fi % 6) // 3..8 pointed sigil
  const rot = (fi * 23) % 360
  let d = ''
  for (let k = 0; k < points; k++) {
    const a = (rot + (k * 360) / points) * Math.PI / 180
    const x = 60 + 26 * Math.cos(a)
    const y = 60 + 26 * Math.sin(a)
    d += `${k === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)} `
  }
  d += 'Z'
  const inner = `  <g stroke="${accent}" stroke-width="3" fill="none" stroke-linejoin="round"><circle cx="60" cy="60" r="30"/><path d="${d}"/></g>`
  writeFileSync(join(out, `faction-${name}.svg`), frame(inner))
  fi++
}

console.log(`Generated ${Object.keys(spheres).length} sphere + ${Object.keys(factions).length} faction glyphs in packs/assets/`)
