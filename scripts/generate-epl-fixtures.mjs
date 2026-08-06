// Build-time fixture generator — not shipped runtime code. Produces
// src/fixtures/epl/players.ts: a tiered squad across 20 EPL clubs. Player
// names are real (2026-27 season, researched — see
// scripts/data/epl-real-rosters.json). Falls back to a generated fictional
// name for any slot the roster data doesn't cover.
import { writeFileSync, readFileSync } from 'node:fs'

const realRosters = JSON.parse(
  readFileSync(new URL('./data/epl-real-rosters.json', import.meta.url), 'utf8'),
)

function mulberry32(seed) {
  let a = seed >>> 0
  return function () {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const rng = mulberry32(20260815)
const rand = (min, max) => min + rng() * (max - min)

const CLUBS = Object.keys(realRosters)

const FIRST_NAMES = [
  'Marcus', 'Deion', 'Jalen', 'Trevon', 'Kaden', 'Xavier', 'Malik', 'Cole', 'Bryce', 'Antoine',
  'Dez', 'Jaylen', 'Trey', 'Darius', 'Isaiah', 'Cameron', 'Ronnie', 'Elijah', 'Tyree', 'Gunnar',
]
const LAST_NAMES = [
  'Whitfield', 'Boykin', 'Mercer', 'Castellanos', 'Draper', 'Sutton', 'Reyes', 'Ashford', 'Kellerman', 'Voss',
  'Prescott', 'Beaumont', 'Halloway', 'Nakamura', 'Bledsoe', 'Farrow', 'Okafor', 'Lindqvist', 'Marchetti', 'Torrence',
]

const usedNames = new Set()
function generateName() {
  let name
  do {
    const first = FIRST_NAMES[Math.floor(rand(0, FIRST_NAMES.length))]
    const last = LAST_NAMES[Math.floor(rand(0, LAST_NAMES.length))]
    name = `${first} ${last}`
  } while (usedNames.has(name))
  usedNames.add(name)
  return name
}

const TIERS = {
  GK1: { saves: [3.2, 0, 9], cleanSheets: [0.32, 0, 1], goalsConceded: [1.4, 0, 4], yellowCards: [0.05, 0, 1] },
  DEF1: { goals: [0.06, 0, 1], assists: [0.12, 0, 1], cleanSheets: [0.32, 0, 1], goalsConceded: [1.4, 0, 4], yellowCards: [0.15, 0, 1] },
  DEF2: { goals: [0.04, 0, 1], assists: [0.08, 0, 1], cleanSheets: [0.3, 0, 1], goalsConceded: [1.4, 0, 4], yellowCards: [0.15, 0, 1] },
  DEF3: { goals: [0.03, 0, 1], assists: [0.06, 0, 1], cleanSheets: [0.28, 0, 1], goalsConceded: [1.4, 0, 4], yellowCards: [0.15, 0, 1] },
  MID1: { goals: [0.35, 0, 2], assists: [0.3, 0, 2], yellowCards: [0.12, 0, 1] },
  MID2: { goals: [0.22, 0, 2], assists: [0.22, 0, 2], yellowCards: [0.12, 0, 1] },
  MID3: { goals: [0.15, 0, 1], assists: [0.15, 0, 1], yellowCards: [0.1, 0, 1] },
  FWD1: { goals: [0.55, 0, 3], assists: [0.2, 0, 2], yellowCards: [0.08, 0, 1] },
  FWD2: { goals: [0.4, 0, 2], assists: [0.15, 0, 2], yellowCards: [0.08, 0, 1] },
}

function buildProjection(tierKey) {
  const jitter = rand(0.85, 1.15)
  const tier = TIERS[tierKey]
  const projection = {}
  for (const [stat, [mean, floor, ceiling]] of Object.entries(tier)) {
    projection[stat] = { mean: round2(mean * jitter), floor: round2(floor * jitter), ceiling: round2(ceiling * jitter) }
  }
  return projection
}
const round2 = (n) => Math.round(n * 100) / 100

const SLOT_POSITION = {
  GK1: 'GK', DEF1: 'DEF', DEF2: 'DEF', DEF3: 'DEF', MID1: 'MID', MID2: 'MID', MID3: 'MID', FWD1: 'FWD', FWD2: 'FWD',
}

let idCounter = 0
const players = []

function addPlayer(club, slot) {
  idCounter += 1
  const name = realRosters[club]?.[slot] ?? generateName()
  players.push({
    id: `epl-${String(idCounter).padStart(4, '0')}`,
    sport: 'epl',
    name,
    positions: [SLOT_POSITION[slot]],
    team: club,
    projection: buildProjection(slot),
    status: 'active',
  })
}

for (const club of CLUBS) {
  for (const slot of Object.keys(SLOT_POSITION)) {
    addPlayer(club, slot)
  }
}

const injuryIndices = new Set()
while (injuryIndices.size < 6) {
  injuryIndices.add(Math.floor(rand(0, players.length)))
}
let i = 0
for (const idx of injuryIndices) {
  players[idx].status = i % 3 === 0 ? 'out' : 'questionable'
  i += 1
}

const header = `// GENERATED FILE — do not edit by hand.
// Regenerate with: node scripts/generate-epl-fixtures.mjs
import type { Player } from '../../types'
import { registerFixtures } from '../../data/SeedDataProvider'

export const eplPlayers: Player[] = ${JSON.stringify(players, null, 2)}

registerFixtures('epl', { players: eplPlayers })
`

writeFileSync(new URL('../src/fixtures/epl/players.ts', import.meta.url), header)
console.log(`Generated ${players.length} EPL players across ${CLUBS.length} clubs.`)
