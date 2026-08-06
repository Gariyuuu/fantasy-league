// Build-time fixture generator — not shipped runtime code. Produces
// src/fixtures/nba/players.ts: a tiered roster across all 30 NBA teams
// with per-game projections. Player names are real (2026-27 rosters,
// researched — see scripts/data/nba-real-rosters.json). Falls back to a
// generated fictional name for any slot the roster data doesn't cover.
import { writeFileSync, readFileSync } from 'node:fs'

const realRosters = JSON.parse(
  readFileSync(new URL('./data/nba-real-rosters.json', import.meta.url), 'utf8'),
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
const rng = mulberry32(20261021)
const rand = (min, max) => min + rng() * (max - min)

const TEAMS = Object.keys(realRosters)

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
  G1: { points: [22, 6, 40], rebounds: [4, 0, 11], assists: [6, 0, 14], steals: [1.3, 0, 5], blocks: [0.4, 0, 2], turnovers: [3, 0, 7], threePointersMade: [2.8, 0, 8] },
  G2: { points: [14, 3, 26], rebounds: [3, 0, 8], assists: [3.5, 0, 9], steals: [0.9, 0, 4], blocks: [0.25, 0, 2], turnovers: [2, 0, 5], threePointersMade: [1.8, 0, 6] },
  G3: { points: [8, 0, 18], rebounds: [2.2, 0, 6], assists: [2, 0, 6], steals: [0.6, 0, 3], blocks: [0.15, 0, 1], turnovers: [1.3, 0, 4], threePointersMade: [1, 0, 4] },
  F1: { points: [21, 5, 38], rebounds: [8.5, 1, 17], assists: [3, 0, 8], steals: [1, 0, 4], blocks: [0.9, 0, 3], turnovers: [2.6, 0, 6], threePointersMade: [1.6, 0, 6] },
  F2: { points: [13, 2, 25], rebounds: [6, 0, 13], assists: [1.8, 0, 5], steals: [0.7, 0, 3], blocks: [0.55, 0, 2], turnovers: [1.8, 0, 5], threePointersMade: [0.9, 0, 4] },
  F3: { points: [7, 0, 16], rebounds: [3.8, 0, 10], assists: [1, 0, 4], steals: [0.4, 0, 2], blocks: [0.3, 0, 2], turnovers: [1.1, 0, 3], threePointersMade: [0.5, 0, 3] },
  C1: { points: [17, 3, 32], rebounds: [10.5, 2, 19], assists: [1.8, 0, 6], steals: [0.6, 0, 3], blocks: [1.6, 0, 5], turnovers: [2.2, 0, 5], threePointersMade: [0.2, 0, 2] },
  C2: { points: [8, 0, 18], rebounds: [6.5, 0, 14], assists: [1, 0, 3], steals: [0.35, 0, 2], blocks: [1, 0, 3], turnovers: [1.3, 0, 4], threePointersMade: [0.05, 0, 1] },
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

const SLOT_POSITION = { G1: 'G', G2: 'G', G3: 'G', F1: 'F', F2: 'F', F3: 'F', C1: 'C', C2: 'C' }

let idCounter = 0
const players = []

function addPlayer(team, slot) {
  idCounter += 1
  const name = realRosters[team]?.[slot] ?? generateName()
  players.push({
    id: `nba-${String(idCounter).padStart(4, '0')}`,
    sport: 'nba',
    name,
    positions: [SLOT_POSITION[slot]],
    team,
    projection: buildProjection(slot),
    status: 'active',
  })
}

for (const team of TEAMS) {
  for (const slot of Object.keys(SLOT_POSITION)) {
    addPlayer(team, slot)
  }
}

const injuryIndices = new Set()
while (injuryIndices.size < 10) {
  injuryIndices.add(Math.floor(rand(0, players.length)))
}
let i = 0
for (const idx of injuryIndices) {
  players[idx].status = i % 3 === 0 ? 'out' : 'questionable'
  i += 1
}

const header = `// GENERATED FILE — do not edit by hand.
// Regenerate with: node scripts/generate-nba-fixtures.mjs
import type { Player } from '../../types'
import { registerFixtures } from '../../data/SeedDataProvider'

export const nbaPlayers: Player[] = ${JSON.stringify(players, null, 2)}

registerFixtures('nba', { players: nbaPlayers })
`

writeFileSync(new URL('../src/fixtures/nba/players.ts', import.meta.url), header)
console.log(`Generated ${players.length} NBA players across ${TEAMS.length} teams.`)
