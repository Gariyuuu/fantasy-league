// Build-time fixture generator — not shipped runtime code. Produces
// src/fixtures/nascar/players.ts: a tiered field of real Cup Series drivers
// with per-race projections and DFS-style salaries, mirroring pga.ts.
// Driver names are real (2026 standings, researched — see
// scripts/data/nascar-real-drivers.json, tiered by standings/caliber).
// "team" is a neutral "NASCAR" tag. Falls back to a generated fictional
// name for any tier slot the roster data doesn't cover.
import { writeFileSync, readFileSync } from 'node:fs'

const realDrivers = JSON.parse(
  readFileSync(new URL('./data/nascar-real-drivers.json', import.meta.url), 'utf8'),
)
const realDriverQueues = {
  elite: [...realDrivers.elite],
  contender: [...realDrivers.contender],
  journeyman: [...realDrivers.journeyman],
  longshot: [...realDrivers.longshot],
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
const rng = mulberry32(20260808)
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

// per-race base { mean, floor, ceiling } per stat category, per tier, plus a salary range (cap is 50000 for a 6-driver field)
const TIERS = {
  elite: {
    stats: {
      lapsLed: [35, 0, 120], stageWins: [0.4, 0, 2], top5: [0.35, 0, 1], top10: [0.55, 0, 1], win: [0.1, 0, 1], dnf: [0.08, 0, 1],
    },
    salary: [10000, 11500],
  },
  contender: {
    stats: {
      lapsLed: [15, 0, 60], stageWins: [0.15, 0, 1], top5: [0.15, 0, 1], top10: [0.35, 0, 1], win: [0.02, 0, 1], dnf: [0.1, 0, 1],
    },
    salary: [8000, 9500],
  },
  journeyman: {
    stats: {
      lapsLed: [5, 0, 30], stageWins: [0.05, 0, 1], top5: [0.05, 0, 1], top10: [0.18, 0, 1], win: [0.005, 0, 1], dnf: [0.12, 0, 1],
    },
    salary: [6000, 7500],
  },
  longshot: {
    stats: {
      lapsLed: [1, 0, 10], stageWins: [0.01, 0, 1], top5: [0.01, 0, 1], top10: [0.06, 0, 1], win: [0.001, 0, 1], dnf: [0.15, 0, 1],
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

function addDriver(tierKey) {
  idCounter += 1
  const [salaryMin, salaryMax] = TIERS[tierKey].salary
  const name = realDriverQueues[tierKey].shift() ?? generateName()
  players.push({
    id: `nascar-${String(idCounter).padStart(4, '0')}`,
    sport: 'nascar',
    name,
    positions: ['DRIVER'],
    team: 'NASCAR',
    projection: buildProjection(tierKey),
    salary: round100(rand(salaryMin, salaryMax)),
    status: 'active',
  })
}

for (let i = 0; i < 8; i++) addDriver('elite')
for (let i = 0; i < 10; i++) addDriver('contender')
for (let i = 0; i < 10; i++) addDriver('journeyman')
for (let i = 0; i < 8; i++) addDriver('longshot')

const header = `// GENERATED FILE — do not edit by hand.
// Regenerate with: node scripts/generate-nascar-fixtures.mjs
import type { Player } from '../../types'
import { registerFixtures } from '../../data/SeedDataProvider'

export const nascarPlayers: Player[] = ${JSON.stringify(players, null, 2)}

registerFixtures('nascar', { players: nascarPlayers })
`

writeFileSync(new URL('../src/fixtures/nascar/players.ts', import.meta.url), header)
console.log(`Generated ${players.length} NASCAR drivers.`)
