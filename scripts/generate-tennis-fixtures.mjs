// Build-time fixture generator — not shipped runtime code. Produces
// src/fixtures/tennis/players.ts: a tiered field of real ATP/WTA pros with
// per-event projections and DFS-style salaries, mirroring pga.ts. Player
// names are real (2026 rankings, researched — see
// scripts/data/tennis-real-players.json, tiered by ranking). "team" is a
// neutral "TENNIS" tag rather than a nationality guess. Falls back to a
// generated fictional name for any tier slot the roster data doesn't cover.
import { writeFileSync, readFileSync } from 'node:fs'

const realPlayers = JSON.parse(
  readFileSync(new URL('./data/tennis-real-players.json', import.meta.url), 'utf8'),
)
const realPlayerQueues = {
  elite: [...realPlayers.elite],
  contender: [...realPlayers.contender],
  journeyman: [...realPlayers.journeyman],
  longshot: [...realPlayers.longshot],
}

function mulberry32(seed) {
  let a = seed >>> 0
  return function () {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const rng = mulberry32(20260824)
const rand = (min, max) => min + rng() * (max - min)

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

// per-event base { mean, floor, ceiling } per stat category, per tier, plus a salary range (cap is 50000 for a 6-player field)
const TIERS = {
  elite: {
    stats: {
      setsWon: [11, 3, 20], acesServed: [24, 4, 55], doubleFaults: [7, 1, 16],
      matchesWon: [3.5, 0, 7], semifinalReached: [0.35, 0, 1], title: [0.12, 0, 1],
    },
    salary: [10000, 11500],
  },
  contender: {
    stats: {
      setsWon: [8, 2, 16], acesServed: [16, 2, 40], doubleFaults: [8, 2, 18],
      matchesWon: [2.2, 0, 6], semifinalReached: [0.15, 0, 1], title: [0.03, 0, 1],
    },
    salary: [8000, 9500],
  },
  journeyman: {
    stats: {
      setsWon: [5, 1, 11], acesServed: [10, 1, 28], doubleFaults: [8, 2, 18],
      matchesWon: [1.2, 0, 4], semifinalReached: [0.05, 0, 1], title: [0.005, 0, 1],
    },
    salary: [6000, 7500],
  },
  longshot: {
    stats: {
      setsWon: [3, 0, 7], acesServed: [6, 0, 18], doubleFaults: [7, 1, 16],
      matchesWon: [0.5, 0, 2], semifinalReached: [0.01, 0, 1], title: [0.001, 0, 1],
    },
    salary: [4000, 5500],
  },
}

function buildProjection(tierKey) {
  const jitter = rand(0.85, 1.15)
  const tier = TIERS[tierKey].stats
  const projection = {}
  for (const [stat, [mean, floor, ceiling]] of Object.entries(tier)) {
    projection[stat] = { mean: round2(mean * jitter), floor: round2(floor * jitter), ceiling: round2(ceiling * jitter) }
  }
  return projection
}
const round2 = (n) => Math.round(n * 100) / 100
const round100 = (n) => Math.round(n / 100) * 100

let idCounter = 0
const players = []

function addPlayer(tierKey) {
  idCounter += 1
  const [salaryMin, salaryMax] = TIERS[tierKey].salary
  const name = realPlayerQueues[tierKey].shift() ?? generateName()
  players.push({
    id: `tennis-${String(idCounter).padStart(4, '0')}`,
    sport: 'tennis',
    name,
    positions: ['PLAYER'],
    team: 'TENNIS',
    projection: buildProjection(tierKey),
    salary: round100(rand(salaryMin, salaryMax)),
    status: 'active',
  })
}

for (let i = 0; i < 15; i++) addPlayer('elite')
for (let i = 0; i < 20; i++) addPlayer('contender')
for (let i = 0; i < 25; i++) addPlayer('journeyman')
for (let i = 0; i < 20; i++) addPlayer('longshot')

const header = `// GENERATED FILE — do not edit by hand.
// Regenerate with: node scripts/generate-tennis-fixtures.mjs
import type { Player } from '../../types'
import { registerFixtures } from '../../data/SeedDataProvider'

export const tennisPlayers: Player[] = ${JSON.stringify(players, null, 2)}

registerFixtures('tennis', { players: tennisPlayers })
`

writeFileSync(new URL('../src/fixtures/tennis/players.ts', import.meta.url), header)
console.log(`Generated ${players.length} tennis players.`)
