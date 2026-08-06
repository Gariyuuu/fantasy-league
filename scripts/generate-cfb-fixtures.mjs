// Build-time fixture generator — not shipped runtime code. Produces
// src/fixtures/cfb/players.ts: a tiered depth chart across 24 major college
// football programs, reusing NFL's stat schema (same categories score the
// same way in both sports). Player names are real (2026 rosters, researched
// — see scripts/data/cfb-real-rosters.json). Falls back to a generated
// fictional name for any slot the roster data doesn't cover.
import { writeFileSync, readFileSync } from 'node:fs'

const realRosters = JSON.parse(
  readFileSync(new URL('./data/cfb-real-rosters.json', import.meta.url), 'utf8'),
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
const rng = mulberry32(20260829)
const rand = (min, max) => min + rng() * (max - min)

// [abbr, full school name] — full names so the DST fixture name ("<School>
// Defense") is unambiguous even for schools sharing a mascot elsewhere.
const TEAMS = [
  ['BAMA', 'Alabama Crimson Tide'], ['UGA', 'Georgia Bulldogs'], ['OSU', 'Ohio State Buckeyes'], ['MICH', 'Michigan Wolverines'],
  ['TEX', 'Texas Longhorns'], ['OU', 'Oklahoma Sooners'], ['LSU', 'LSU Tigers'], ['CLEM', 'Clemson Tigers'],
  ['ORE', 'Oregon Ducks'], ['PSU', 'Penn State Nittany Lions'], ['ND', 'Notre Dame Fighting Irish'], ['FSU', 'Florida State Seminoles'],
  ['USC', 'USC Trojans'], ['FLA', 'Florida Gators'], ['AUB', 'Auburn Tigers'], ['TENN', 'Tennessee Volunteers'],
  ['WIS', 'Wisconsin Badgers'], ['MIA', 'Miami Hurricanes'], ['TAMU', 'Texas A&M Aggies'], ['OLE', 'Ole Miss Rebels'],
  ['UTAH', 'Utah Utes'], ['IOWA', 'Iowa Hawkeyes'], ['MIZ', 'Missouri Tigers'], ['OKST', 'Oklahoma State Cowboys'],
]

const FIRST_NAMES = [
  'Marcus', 'Deion', 'Jalen', 'Trevon', 'Kaden', 'Xavier', 'Malik', 'Cole', 'Bryce', 'Antoine',
  'Dez', 'Jaylen', 'Trey', 'Darius', 'Isaiah', 'Cameron', 'Ronnie', 'Elijah', 'Tyree', 'Gunnar',
  'Devonte', 'Colt', 'Marquis', 'Shane', 'Amari', 'Zion', 'Jaxon', 'Corey', 'Nate', 'Braylon',
]
const LAST_NAMES = [
  'Whitfield', 'Boykin', 'Mercer', 'Castellanos', 'Draper', 'Sutton', 'Reyes', 'Ashford', 'Kellerman', 'Voss',
  'Prescott', 'Beaumont', 'Halloway', 'Nakamura', 'Bledsoe', 'Farrow', 'Okafor', 'Lindqvist', 'Marchetti', 'Torrence',
  'Duvall', 'Ekwueme', 'Sharpton', 'Callahan', 'Ridgeway', 'Steppe', 'Vance', 'Okonkwo', 'Blackmon', 'Delgado',
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
  QB1: {
    passingYards: [250, 140, 370], passingTDs: [1.9, 0, 4], interceptionsThrown: [0.7, 0, 3],
    rushingYards: [25, 0, 90], rushingTDs: [0.25, 0, 2],
  },
  RB1: {
    rushingYards: [90, 30, 160], rushingTDs: [0.7, 0, 2], receptions: [2.5, 0, 6],
    receivingYards: [18, 0, 50], receivingTDs: [0.1, 0, 1], fumblesLost: [0.1, 0, 1],
  },
  RB2: {
    rushingYards: [45, 10, 90], rushingTDs: [0.3, 0, 2], receptions: [1.5, 0, 4],
    receivingYards: [10, 0, 30], receivingTDs: [0.05, 0, 1], fumblesLost: [0.06, 0, 1],
  },
  WR1: {
    receptions: [6, 2, 11], receivingYards: [80, 20, 150], receivingTDs: [0.5, 0, 2], rushingYards: [2, 0, 15], fumblesLost: [0.04, 0, 1],
  },
  WR2: {
    receptions: [4, 1, 9], receivingYards: [55, 10, 105], receivingTDs: [0.3, 0, 2], rushingYards: [1, 0, 8], fumblesLost: [0.03, 0, 1],
  },
  WR3: {
    receptions: [2.5, 0, 7], receivingYards: [32, 0, 75], receivingTDs: [0.15, 0, 1], rushingYards: [0, 0, 4], fumblesLost: [0.02, 0, 1],
  },
  TE1: {
    receptions: [3, 0, 7], receivingYards: [35, 5, 80], receivingTDs: [0.2, 0, 1],
  },
  K: {
    fieldGoalsMade: [1.5, 0, 4], extraPointsMade: [3.2, 0, 7],
  },
  DST: {
    sacks: [2.2, 0, 6], defInterceptions: [0.8, 0, 3], fumbleRecoveries: [0.6, 0, 3],
    defensiveTDs: [0.12, 0, 1], safeties: [0.03, 0, 1], pointsAllowed: [20, 5, 38],
  },
}

function buildProjection(tierKey) {
  const jitter = rand(0.85, 1.15)
  const tier = TIERS[tierKey]
  const projection = {}
  for (const [stat, [mean, floor, ceiling]] of Object.entries(tier)) {
    projection[stat] = { mean: round1(mean * jitter), floor: round1(floor * jitter), ceiling: round1(ceiling * jitter) }
  }
  return projection
}
const round1 = (n) => Math.round(n * 10) / 10

let idCounter = 0
const players = []

function addPlayer({ positions, team, tierKey, name, status = 'active' }) {
  idCounter += 1
  players.push({
    id: `cfb-${String(idCounter).padStart(4, '0')}`,
    sport: 'cfb',
    name,
    positions,
    team,
    projection: buildProjection(tierKey),
    status,
  })
}

function realName(abbr, slot) {
  return realRosters[abbr]?.[slot] ?? generateName()
}

for (const [abbr, teamName] of TEAMS) {
  addPlayer({ positions: ['QB'], team: abbr, tierKey: 'QB1', name: realName(abbr, 'QB1') })
  addPlayer({ positions: ['RB'], team: abbr, tierKey: 'RB1', name: realName(abbr, 'RB1') })
  addPlayer({ positions: ['RB'], team: abbr, tierKey: 'RB2', name: realName(abbr, 'RB2') })
  addPlayer({ positions: ['WR'], team: abbr, tierKey: 'WR1', name: realName(abbr, 'WR1') })
  addPlayer({ positions: ['WR'], team: abbr, tierKey: 'WR2', name: realName(abbr, 'WR2') })
  addPlayer({ positions: ['WR'], team: abbr, tierKey: 'WR3', name: realName(abbr, 'WR3') })
  addPlayer({ positions: ['TE'], team: abbr, tierKey: 'TE1', name: realName(abbr, 'TE1') })
  addPlayer({ positions: ['K'], team: abbr, tierKey: 'K', name: realName(abbr, 'K') })
  addPlayer({ positions: ['DST'], team: abbr, tierKey: 'DST', name: `${teamName} Defense` })
}

const injuryIndices = new Set()
while (injuryIndices.size < 8) {
  injuryIndices.add(Math.floor(rand(0, players.length)))
}
let i = 0
for (const idx of injuryIndices) {
  players[idx].status = i % 3 === 0 ? 'out' : 'questionable'
  i += 1
}

const header = `// GENERATED FILE — do not edit by hand.
// Regenerate with: node scripts/generate-cfb-fixtures.mjs
import type { Player } from '../../types'
import { registerFixtures } from '../../data/SeedDataProvider'

export const cfbPlayers: Player[] = ${JSON.stringify(players, null, 2)}

registerFixtures('cfb', { players: cfbPlayers })
`

writeFileSync(new URL('../src/fixtures/cfb/players.ts', import.meta.url), header)
console.log(`Generated ${players.length} CFB players.`)
