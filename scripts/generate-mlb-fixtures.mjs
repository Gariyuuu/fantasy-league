// Build-time fixture generator — not shipped runtime code. Produces
// src/fixtures/mlb/players.ts: tiered per-day projections across all 30
// MLB teams. Player names are real (2026 rosters, researched — see
// scripts/data/mlb-real-rosters.json); team abbreviations are real,
// factual MLB teams. Falls back to a generated fictional name for any
// slot the roster data doesn't cover.
import { writeFileSync, readFileSync } from 'node:fs'

const realRosters = JSON.parse(
  readFileSync(new URL('./data/mlb-real-rosters.json', import.meta.url), 'utf8'),
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
const rng = mulberry32(20260806)
const rand = (min, max) => min + rng() * (max - min)

const TEAMS = [
  ['ARI', 'Arizona Diamondbacks'], ['ATL', 'Atlanta Braves'], ['BAL', 'Baltimore Orioles'], ['BOS', 'Boston Red Sox'],
  ['CHC', 'Chicago Cubs'], ['CWS', 'Chicago White Sox'], ['CIN', 'Cincinnati Reds'], ['CLE', 'Cleveland Guardians'],
  ['COL', 'Colorado Rockies'], ['DET', 'Detroit Tigers'], ['HOU', 'Houston Astros'], ['KC', 'Kansas City Royals'],
  ['LAA', 'Los Angeles Angels'], ['LAD', 'Los Angeles Dodgers'], ['MIA', 'Miami Marlins'], ['MIL', 'Milwaukee Brewers'],
  ['MIN', 'Minnesota Twins'], ['NYM', 'New York Mets'], ['NYY', 'New York Yankees'], ['OAK', 'Athletics'],
  ['PHI', 'Philadelphia Phillies'], ['PIT', 'Pittsburgh Pirates'], ['SD', 'San Diego Padres'], ['SF', 'San Francisco Giants'],
  ['SEA', 'Seattle Mariners'], ['STL', 'St. Louis Cardinals'], ['TB', 'Tampa Bay Rays'], ['TEX', 'Texas Rangers'],
  ['TOR', 'Toronto Blue Jays'], ['WAS', 'Washington Nationals'],
]

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

// per-day base { mean, floor, ceiling } per stat category, per position tier
const TIERS = {
  C: { hits: [0.7, 0.1, 1.8], homeRuns: [0.15, 0, 1], runs: [0.4, 0, 1.5], rbis: [0.4, 0, 1.5], stolenBases: [0.03, 0, 1], walksBatting: [0.3, 0, 1.2] },
  '1B': { hits: [0.9, 0.1, 2], homeRuns: [0.25, 0, 1.2], runs: [0.5, 0, 1.8], rbis: [0.55, 0, 1.8], stolenBases: [0.04, 0, 1], walksBatting: [0.35, 0, 1.3] },
  '2B': { hits: [0.85, 0.1, 1.9], homeRuns: [0.15, 0, 1], runs: [0.5, 0, 1.7], rbis: [0.4, 0, 1.5], stolenBases: [0.12, 0, 1.5], walksBatting: [0.3, 0, 1.2] },
  '3B': { hits: [0.85, 0.1, 1.9], homeRuns: [0.2, 0, 1.1], runs: [0.5, 0, 1.7], rbis: [0.45, 0, 1.6], stolenBases: [0.06, 0, 1], walksBatting: [0.32, 0, 1.2] },
  SS: { hits: [0.8, 0.1, 1.9], homeRuns: [0.15, 0, 1], runs: [0.48, 0, 1.6], rbis: [0.38, 0, 1.4], stolenBases: [0.15, 0, 1.6], walksBatting: [0.28, 0, 1.1] },
  OF1: { hits: [1.0, 0.1, 2.2], homeRuns: [0.28, 0, 1.3], runs: [0.6, 0, 2], rbis: [0.55, 0, 1.8], stolenBases: [0.12, 0, 1.5], walksBatting: [0.4, 0, 1.4] },
  OF2: { hits: [0.85, 0.1, 1.9], homeRuns: [0.18, 0, 1.1], runs: [0.5, 0, 1.7], rbis: [0.42, 0, 1.5], stolenBases: [0.08, 0, 1.2], walksBatting: [0.32, 0, 1.2] },
  OF3: { hits: [0.7, 0.05, 1.7], homeRuns: [0.12, 0, 0.9], runs: [0.4, 0, 1.4], rbis: [0.32, 0, 1.3], stolenBases: [0.06, 0, 1], walksBatting: [0.25, 0, 1] },
  SP1: { inningsPitched: [1.2, 0, 2.2], pitchingStrikeouts: [1.3, 0, 2.8], earnedRunsAllowed: [0.5, 0, 2], pitchingWins: [0.15, 0, 1], saves: [0, 0, 0] },
  SP2: { inningsPitched: [1.0, 0, 2], pitchingStrikeouts: [1.0, 0, 2.4], earnedRunsAllowed: [0.55, 0, 2.1], pitchingWins: [0.12, 0, 1], saves: [0, 0, 0] },
  SP3: { inningsPitched: [0.8, 0, 1.7], pitchingStrikeouts: [0.75, 0, 2], earnedRunsAllowed: [0.6, 0, 2.2], pitchingWins: [0.09, 0, 1], saves: [0, 0, 0] },
  RP1: { inningsPitched: [0.35, 0, 1], pitchingStrikeouts: [0.4, 0, 1.3], earnedRunsAllowed: [0.15, 0, 1], pitchingWins: [0.03, 0, 1], saves: [0.18, 0, 1] },
  RP2: { inningsPitched: [0.3, 0, 0.9], pitchingStrikeouts: [0.32, 0, 1.1], earnedRunsAllowed: [0.14, 0, 0.9], pitchingWins: [0.02, 0, 1], saves: [0.03, 0, 1] },
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

let idCounter = 0
const players = []

function addPlayer({ positions, team, tierKey, name }) {
  idCounter += 1
  players.push({
    id: `mlb-${String(idCounter).padStart(4, '0')}`,
    sport: 'mlb',
    name,
    positions,
    team,
    projection: buildProjection(tierKey),
    status: 'active',
  })
}

function realName(abbr, slot) {
  return realRosters[abbr]?.[slot] ?? generateName()
}

for (const [abbr] of TEAMS) {
  addPlayer({ positions: ['C'], team: abbr, tierKey: 'C', name: realName(abbr, 'C') })
  addPlayer({ positions: ['1B'], team: abbr, tierKey: '1B', name: realName(abbr, '1B') })
  addPlayer({ positions: ['2B'], team: abbr, tierKey: '2B', name: realName(abbr, '2B') })
  addPlayer({ positions: ['3B'], team: abbr, tierKey: '3B', name: realName(abbr, '3B') })
  addPlayer({ positions: ['SS'], team: abbr, tierKey: 'SS', name: realName(abbr, 'SS') })
  addPlayer({ positions: ['OF'], team: abbr, tierKey: 'OF1', name: realName(abbr, 'OF1') })
  addPlayer({ positions: ['OF'], team: abbr, tierKey: 'OF2', name: realName(abbr, 'OF2') })
  addPlayer({ positions: ['OF'], team: abbr, tierKey: 'OF3', name: realName(abbr, 'OF3') })
  addPlayer({ positions: ['SP'], team: abbr, tierKey: 'SP1', name: realName(abbr, 'SP1') })
  addPlayer({ positions: ['SP'], team: abbr, tierKey: 'SP2', name: realName(abbr, 'SP2') })
  addPlayer({ positions: ['SP'], team: abbr, tierKey: 'SP3', name: realName(abbr, 'SP3') })
  addPlayer({ positions: ['RP'], team: abbr, tierKey: 'RP1', name: realName(abbr, 'RP1') })
  addPlayer({ positions: ['RP'], team: abbr, tierKey: 'RP2', name: realName(abbr, 'RP2') })
}

// A handful of day-to-day/IL statuses so injury-reactive waiver logic has
// something to react to out of the gate, same as the NFL fixtures.
const injuryIndices = new Set()
while (injuryIndices.size < 12) {
  injuryIndices.add(Math.floor(rand(0, players.length)))
}
let i = 0
for (const idx of injuryIndices) {
  players[idx].status = i % 3 === 0 ? 'out' : 'questionable'
  i += 1
}

const header = `// GENERATED FILE — do not edit by hand.
// Regenerate with: node scripts/generate-mlb-fixtures.mjs
import type { Player } from '../../types'
import { registerFixtures } from '../../data/SeedDataProvider'

export const mlbPlayers: Player[] = ${JSON.stringify(players, null, 2)}

registerFixtures('mlb', { players: mlbPlayers })
`

writeFileSync(new URL('../src/fixtures/mlb/players.ts', import.meta.url), header)
console.log(`Generated ${players.length} MLB players.`)
