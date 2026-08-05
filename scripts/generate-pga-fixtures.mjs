// Build-time fixture generator — not shipped runtime code. Produces
// src/fixtures/pga/players.ts: a tiered field of golfers with per-event
// projections and DFS-style salaries. Player names are real (current PGA
// Tour players, researched — see scripts/data/pga-real-golfers.json,
// tiered by ranking). "team" is a neutral "PGA" tag rather than a
// nationality guess, since attaching a made-up country to a real,
// identifiable person isn't worth the flavor. Falls back to a generated
// fictional name for any tier slot the roster data doesn't cover.
import { writeFileSync, readFileSync } from 'node:fs'

const realGolfers = JSON.parse(
  readFileSync(new URL('./data/pga-real-golfers.json', import.meta.url), 'utf8'),
)
const realGolferQueues = {
  elite: [...realGolfers.elite],
  contender: [...realGolfers.contender],
  journeyman: [...realGolfers.journeyman],
  longshot: [...realGolfers.longshot],
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
const rng = mulberry32(20260807)
const rand = (min, max) => min + rng() * (max - min)

const FIRST_NAMES = [
  'Marcus', 'Deion', 'Jalen', 'Trevon', 'Kaden', 'Xavier', 'Malik', 'Cole', 'Bryce', 'Antoine',
  'Dez', 'Jaylen', 'Trey', 'Darius', 'Isaiah', 'Cameron', 'Ronnie', 'Elijah', 'Tyree', 'Gunnar',
  'Devonte', 'Colt', 'Marquis', 'Shane', 'Amari', 'Zion', 'Jaxon', 'Corey', 'Nate', 'Braylon',
  'Terrance', 'Sean', 'Kyree', 'Rashad', 'Beau', 'Jamal', 'Blaine', 'Deshaun', 'Wesley', 'Andre',
  'Kellen', 'Roman', 'Tobias', 'Dontae', 'Lucas', 'Emmitt', 'Grady', 'Chandler', 'Jermaine', 'Owen',
]
const LAST_NAMES = [
  'Whitfield', 'Boykin', 'Mercer', 'Castellanos', 'Draper', 'Sutton', 'Reyes', 'Ashford', 'Kellerman', 'Voss',
  'Prescott', 'Beaumont', 'Halloway', 'Nakamura', 'Bledsoe', 'Farrow', 'Okafor', 'Lindqvist', 'Marchetti', 'Torrence',
  'Duvall', 'Ekwueme', 'Sharpton', 'Callahan', 'Ridgeway', 'Steppe', 'Vance', 'Okonkwo', 'Blackmon', 'Delgado',
  'Winslow', 'Marchbanks', 'Odom', 'Castellan', 'Rourke', 'Tillery', 'Basile', 'Grissom', 'Whitaker', 'Deveraux',
  'Amankwah', 'Costanzo', 'Ledbetter', 'Pruitt', 'Sandoval', 'Kowalski', 'Renwick', 'Achebe', 'Dumont', 'Hargrove',
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

// per-event base { mean, floor, ceiling } per stat category, per tier, plus a salary range (DFS-style, cap is 50000 for a 6-golfer field)
const TIERS = {
  elite: {
    stats: {
      birdies: [16, 6, 26], eagles: [0.8, 0, 3], bogeys: [6, 2, 12],
      win: [0.08, 0, 1], top10: [0.4, 0, 1], madeCut: [0.85, 0, 1],
    },
    salary: [10000, 11500],
  },
  contender: {
    stats: {
      birdies: [13, 4, 22], eagles: [0.5, 0, 2.5], bogeys: [7, 2, 14],
      win: [0.03, 0, 1], top10: [0.22, 0, 1], madeCut: [0.75, 0, 1],
    },
    salary: [8000, 9500],
  },
  journeyman: {
    stats: {
      birdies: [10, 3, 18], eagles: [0.3, 0, 2], bogeys: [8, 3, 15],
      win: [0.01, 0, 1], top10: [0.1, 0, 1], madeCut: [0.6, 0, 1],
    },
    salary: [6000, 7500],
  },
  longshot: {
    stats: {
      birdies: [7, 2, 14], eagles: [0.15, 0, 1.5], bogeys: [9, 3, 16],
      win: [0.002, 0, 1], top10: [0.03, 0, 1], madeCut: [0.4, 0, 1],
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

function addGolfer(tierKey) {
  idCounter += 1
  const [salaryMin, salaryMax] = TIERS[tierKey].salary
  const name = realGolferQueues[tierKey].shift() ?? generateName()
  players.push({
    id: `pga-${String(idCounter).padStart(4, '0')}`,
    sport: 'pga',
    name,
    positions: ['GOLFER'],
    team: 'PGA',
    projection: buildProjection(tierKey),
    salary: round100(rand(salaryMin, salaryMax)),
    status: 'active',
  })
}

for (let i = 0; i < 15; i++) addGolfer('elite')
for (let i = 0; i < 20; i++) addGolfer('contender')
for (let i = 0; i < 25; i++) addGolfer('journeyman')
for (let i = 0; i < 20; i++) addGolfer('longshot')

const header = `// GENERATED FILE — do not edit by hand.
// Regenerate with: node scripts/generate-pga-fixtures.mjs
import type { Player } from '../../types'
import { registerFixtures } from '../../data/SeedDataProvider'

export const pgaPlayers: Player[] = ${JSON.stringify(players, null, 2)}

registerFixtures('pga', { players: pgaPlayers })
`

writeFileSync(new URL('../src/fixtures/pga/players.ts', import.meta.url), header)
console.log(`Generated ${players.length} PGA golfers.`)
