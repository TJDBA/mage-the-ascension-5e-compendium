/**
 * Generator: builds the "rotes" pack source (src/rotes/) from a fixed list of
 * sample rotes, foldered Sphere -> Level. Each rote is a `rote` item carrying its
 * sphere + level so it drops onto a Mage sheet under the right sphere, and rolls
 * Sphere + Attribute/Skill + 1 die via the sheet's roll button.
 *
 * Deterministic ids (same alphabet as build.mjs) keep ids stable across rebuilds.
 * Run: node gen-rotes.mjs
 */
import { writeFileSync, readdirSync, rmSync, mkdirSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'

const root = dirname(fileURLToPath(import.meta.url))
const srcRotes = join(root, 'src', 'rotes')

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
function cap (s) { return s.charAt(0).toUpperCase() + s.slice(1) }

const SPHERE_ORDER = ['correspondence', 'entropy', 'forces', 'life', 'matter', 'mind', 'prime', 'spirit', 'time']

// Researched sample rotes (M20/Revised adapted to M5; Storytellers Vault paraphrase).
const ROTES = [
  { name: 'The Spirit\u2019s Touch', sphere: 'correspondence', level: 2, dicepool: 'Perception + Awareness', description: 'The mage perceives and senses locations at a distance, viewing a remote space as though standing there. By attuning to a known or sympathetically linked place, the caster opens a sensory window to observe events happening elsewhere. Higher successes extend range and clarity of the remote viewing.', source: 'Adapted to M5 from M20 Correspondence sense effects; mechanics paraphrased.' },
  { name: 'Step Sideways', sphere: 'correspondence', level: 3, dicepool: 'Dexterity + Athletics', description: 'The mage folds the distance between two points and steps instantly from one to the other. The caster must have perceived or be sympathetically connected to the destination. In play this is a short teleport; coincidental casting favors unseen departures and arrivals.', source: 'Adapted to M5 from M20 Correspondence 3; mechanics paraphrased.' },
  { name: 'Hand of Ruin', sphere: 'entropy', level: 2, dicepool: 'Wits + Occult', description: 'The mage accelerates decay in an object, causing rope to fray, metal to rust, or a lock mechanism to seize and crumble. The effect targets non-living matter, hastening natural entropy to a chosen failure point. Successes determine how quickly and completely the target degrades.', source: 'Adapted to M5 from M20 Entropy 2; mechanics paraphrased.' },
  { name: 'Fortune\u2019s Favor', sphere: 'entropy', level: 1, dicepool: 'Manipulation + Occult', description: 'The mage reads and subtly nudges the flow of probability, granting a stroke of good luck or inflicting bad luck on a target. In play the Storyteller applies a modifier to a single chance-based roll, such as a gamble, a trick shot, or an enemy\u2019s fumble. It works best when framed as plausible coincidence.', source: 'Adapted to M5 from M20 Entropy 1; mechanics paraphrased.' },
  { name: 'Call the Flame', sphere: 'forces', level: 3, dicepool: 'Intelligence + Science', description: 'The mage gathers and ignites ambient energy into controllable fire, kindling a flame, hurling a bolt of heat, or flashing an object alight. Forces 2 lets the caster perceive and steer existing energy; rank 3 creates and projects it outright. Coincidental casting looks for a spark, a pilot light, or a plausible ignition source.', source: 'Adapted to M5 from M20 Forces 3; mechanics paraphrased.' },
  { name: 'Ride the Lightning', sphere: 'forces', level: 2, dicepool: 'Wits + Technology', description: 'The mage senses and redirects electrical and electromagnetic currents, rerouting power, overloading a circuit, or dimming and brightening lights. At rank 2 the caster perceives and manipulates existing energy flows rather than creating them. Useful for disabling cameras, cutting alarms, or powering a dead device.', source: 'Adapted to M5 from M20 Forces 2; mechanics paraphrased.' },
  { name: 'Knit the Flesh', sphere: 'life', level: 3, dicepool: 'Intelligence + Medicine', description: 'The mage accelerates a living body\u2019s healing, closing wounds, mending bone, and purging toxins. Healing the self requires Life 3; healing another\u2019s complex pattern requires Life 4. Each success repairs a measure of injury, framed coincidentally as a patient\u2019s remarkable recovery.', source: 'Adapted to M5 from M20 Life 3/4; mechanics paraphrased.' },
  { name: 'Better Body', sphere: 'life', level: 2, dicepool: 'Stamina + Athletics', description: 'The mage optimizes their own living pattern, temporarily sharpening reflexes, boosting strength, or shrugging off fatigue. At rank 2 the caster adjusts simple life functions in their own body. In play this grants a bonus to a Physical Attribute or resistance roll for the scene\u2019s duration.', source: 'Adapted to M5 from M20 Life 2; mechanics paraphrased.' },
  { name: 'Transmute the Base', sphere: 'matter', level: 3, dicepool: 'Intelligence + Crafts', description: 'The mage reshapes inanimate matter, changing an object\u2019s form, density, or composition, such as softening a steel bar or turning a key blank into a working key. Rank 2 alters properties; rank 3 transmutes one material into another. Successes govern how drastic and lasting the change is.', source: 'Adapted to M5 from M20 Matter 3; mechanics paraphrased.' },
  { name: 'The Locksmith\u2019s Secret', sphere: 'matter', level: 2, dicepool: 'Dexterity + Larceny', description: 'The mage feels the inner structure of a mechanism and coaxes its parts to move, slipping tumblers, easing bolts, or freeing a stuck latch. At rank 2 the caster manipulates the shape and state of worked matter without force. It reads coincidentally as a skilled hand with picks or a lucky jiggle of the handle.', source: 'Adapted to M5 from M20 Matter 2; mechanics paraphrased.' },
  { name: 'Read the Surface Thoughts', sphere: 'mind', level: 2, dicepool: 'Perception + Empathy', description: 'The mage skims the immediate, surface thoughts and emotions of a nearby target, sensing mood, intent, and whatever occupies their mind right now. Rank 1 reads emotions; rank 2 reaches conscious thoughts. Deeper memories or implanting ideas require higher ranks. The subject may resist with a contested roll.', source: 'Adapted to M5 from M20 Mind 2; mechanics paraphrased.' },
  { name: 'The Subtle Suggestion', sphere: 'mind', level: 3, dicepool: 'Manipulation + Subterfuge', description: 'The mage plants a plausible impulse or minor belief in a target\u2019s mind, nudging them toward a choice they could believably have made themselves. Rank 3 influences another\u2019s thoughts and emotions directly. Overt or implausible commands strain belief and risk Paradox or resistance.', source: 'Adapted to M5 from M20 Mind 3; mechanics paraphrased.' },
  { name: 'Gather the Quintessence', sphere: 'prime', level: 2, dicepool: 'Perception + Occult', description: 'The mage perceives the flows of raw magical energy and draws Quintessence from a Node, Tass, or resonant place into their own pattern. Rank 1 senses Prime energy; rank 2 channels and stores it. The gathered Quintessence fuels later magick and can push effects beyond ordinary limits.', source: 'Adapted to M5 from M20 Prime 2; mechanics paraphrased.' },
  { name: 'Weave the Pattern Whole', sphere: 'prime', level: 3, dicepool: 'Intelligence + Occult', description: 'The mage invests raw Prime energy into another sphere\u2019s effect, letting magick create lasting or \u2018real\u2019 things rather than mere illusions, and fortify conjured patterns against unraveling. Rank 3 channels Quintessence into effects and can empower objects. It is the connective tissue that makes other spheres\u2019 creations endure.', source: 'Adapted to M5 from M20 Prime 3; mechanics paraphrased.' },
  { name: 'Open the Veil', sphere: 'spirit', level: 3, dicepool: 'Perception + Awareness', description: 'The mage perceives the spirit world and thins or opens a passage through the Gauntlet between the material and the Umbra. Rank 1 senses spirits; rank 3 reaches across or steps through the barrier. In play this lets the caster peer into, communicate with, or step sideways into the spirit realm.', source: 'Adapted to M5 from M20 Spirit 3; mechanics paraphrased.' },
  { name: 'Bind the Spirit', sphere: 'spirit', level: 4, dicepool: 'Manipulation + Occult', description: 'The mage commands, bargains with, or binds a spirit to a task, place, or object. Rank 2 contacts and affects spirits; rank 4 binds and compels them into service. The spirit may resist with a contested roll, and mistreated spirits often seek revenge once freed.', source: 'Adapted to M5 from M20 Spirit 4; mechanics paraphrased.' },
  { name: 'Postcognition', sphere: 'time', level: 2, dicepool: 'Perception + Investigation', description: 'The mage reads the temporal echoes of a place or object, witnessing events that happened there in the past. At rank 1 the caster senses the flow of time; rank 2 perceives past moments tied to the location. Clarity and how far back the vision reaches scale with successes.', source: 'Adapted to M5 from M20 Time 2; mechanics paraphrased.' },
  { name: 'Seize the Moment', sphere: 'time', level: 3, dicepool: 'Wits + Athletics', description: 'The mage accelerates their own perception and action within time, gaining extra speed or an additional action as the world seems to slow around them. Rank 3 lets the caster alter the local flow of time for themselves. In play this grants bonus actions or initiative for a short burst.', source: 'Adapted to M5 from M20 Time 3; mechanics paraphrased.' }
]

const folders = []
const items = []
const sphereFolderIds = {}
const levelFolderIds = {}

for (const r of ROTES) {
  // Sphere folder (one per sphere present)
  if (!sphereFolderIds[r.sphere]) {
    const id = detId(`folder/rote/${r.sphere}`)
    sphereFolderIds[r.sphere] = id
    folders.push({ name: cap(r.sphere), type: 'Item', folder: null, sorting: 'm', sort: (SPHERE_ORDER.indexOf(r.sphere) + 1) * 100000, _id: id, _key: `!folders!${id}` })
  }
  // Level subfolder (one per sphere+level present)
  const lvlKey = `${r.sphere}-${r.level}`
  if (!levelFolderIds[lvlKey]) {
    const id = detId(`folder/rote/${r.sphere}/level-${r.level}`)
    levelFolderIds[lvlKey] = id
    folders.push({ name: `Level ${r.level}`, type: 'Item', folder: sphereFolderIds[r.sphere], sorting: 'm', sort: r.level * 100000, _id: id, _key: `!folders!${id}` })
  }

  const id = detId(`rotes/${r.sphere}/${r.level}/${r.name}`)
  const desc = `<p>${r.description}</p><p><strong>Dice Pool:</strong> ${r.dicepool} (+1 die as a rote)</p><p><em>${r.source}</em></p>`
  items.push({
    name: r.name,
    type: 'rote',
    img: `modules/mage-the-ascension-5e-compendium/packs/assets/sphere-${r.sphere}.svg`,
    folder: levelFolderIds[lvlKey],
    system: {
      description: desc,
      level: r.level,
      sphere: r.sphere,
      isRote: true,
      source: { book: 'M5 (adapted from M20)', page: '' }
    },
    _id: id,
    _key: `!items!${id}`,
    _file: `${r.sphere}-${r.level}-${slug(r.name)}.json`
  })
}

if (!existsSync(srcRotes)) mkdirSync(srcRotes, { recursive: true })
for (const f of readdirSync(srcRotes)) {
  if (f.endsWith('.json')) rmSync(join(srcRotes, f))
}
for (const fol of folders) {
  writeFileSync(join(srcRotes, `_folder-${slug(fol.name)}-${fol._id}.json`), JSON.stringify(fol, null, 2))
}
for (const it of items) {
  const file = it._file
  delete it._file
  writeFileSync(join(srcRotes, file), JSON.stringify(it, null, 2))
}

console.log(`Generated ${folders.length} folders and ${items.length} rote items.`)
