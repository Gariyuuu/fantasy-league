// Build-time fixture generator — not shipped runtime code. Produces
// src/fixtures/nfl/players.ts: a realistic, tiered depth chart across all
// 32 teams with per-stat-category weekly projections. Player names are
// real (2026 rosters, researched — see scripts/data/nfl-real-rosters.json);
// team abbreviations are the real, factual NFL teams. Falls back to a
// generated fictional name for any slot the roster data doesn't cover.
import { writeFileSync, readFileSync } from 'node:fs'

const realRosters = JSON.parse(
  readFileSync(new URL('./data/nfl-real-rosters.json', import.meta.url), 'utf8'),
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
const rng = mulberry32(20260805)
const rand = (min, max) => min + rng() * (max - min)

// [abbr, full team name] — full names (not just city) so shared-metro teams
// (NYJ/NYG, LAC/LAR) still produce unique "<Team> Defense" fixture names.
const TEAMS = [
  ['BUF', 'Buffalo Bills'], ['MIA', 'Miami Dolphins'], ['NE', 'New England Patriots'], ['NYJ', 'New York Jets'],
  ['BAL', 'Baltimore Ravens'], ['CIN', 'Cincinnati Bengals'], ['CLE', 'Cleveland Browns'], ['PIT', 'Pittsburgh Steelers'],
  ['HOU', 'Houston Texans'], ['IND', 'Indianapolis Colts'], ['JAX', 'Jacksonville Jaguars'], ['TEN', 'Tennessee Titans'],
  ['DEN', 'Denver Broncos'], ['KC', 'Kansas City Chiefs'], ['LAC', 'Los Angeles Chargers'], ['LV', 'Las Vegas Raiders'],
  ['DAL', 'Dallas Cowboys'], ['NYG', 'New York Giants'], ['PHI', 'Philadelphia Eagles'], ['WAS', 'Washington Commanders'],
  ['CHI', 'Chicago Bears'], ['DET', 'Detroit Lions'], ['GB', 'Green Bay Packers'], ['MIN', 'Minnesota Vikings'],
  ['ATL', 'Atlanta Falcons'], ['CAR', 'Carolina Panthers'], ['NO', 'New Orleans Saints'], ['TB', 'Tampa Bay Buccaneers'],
  ['ARI', 'Arizona Cardinals'], ['LAR', 'Los Angeles Rams'], ['SF', 'San Francisco 49ers'], ['SEA', 'Seattle Seahawks'],
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

// base { mean, floor, ceiling } per stat category, per position tier
const TIERS = {
  QB1: {
    passingYards: [260, 150, 380], passingTDs: [1.8, 0, 4], interceptionsThrown: [0.7, 0, 3],
    rushingYards: [15, 0, 60], rushingTDs: [0.15, 0, 1],
  },
  RB1: {
    rushingYards: [80, 30, 150], rushingTDs: [0.6, 0, 2], receptions: [3.5, 0, 8],
    receivingYards: [28, 0, 70], receivingTDs: [0.15, 0, 1], fumblesLost: [0.1, 0, 1],
  },
  RB2: {
    rushingYards: [50, 15, 100], rushingTDs: [0.35, 0, 2], receptions: [2.5, 0, 6],
    receivingYards: [18, 0, 50], receivingTDs: [0.08, 0, 1], fumblesLost: [0.08, 0, 1],
  },
  RB3: {
    rushingYards: [25, 5, 60], rushingTDs: [0.15, 0, 1], receptions: [1.5, 0, 4],
    receivingYards: [10, 0, 30], receivingTDs: [0.04, 0, 1], fumblesLost: [0.05, 0, 1],
  },
  WR1: {
    receptions: [6.5, 2, 12], receivingYards: [85, 25, 160], receivingTDs: [0.55, 0, 2], rushingYards: [3, 0, 20], fumblesLost: [0.05, 0, 1],
  },
  WR2: {
    receptions: [5, 1, 10], receivingYards: [62, 15, 120], receivingTDs: [0.35, 0, 2], rushingYards: [1, 0, 10], fumblesLost: [0.04, 0, 1],
  },
  WR3: {
    receptions: [3.5, 0, 8], receivingYards: [42, 5, 90], receivingTDs: [0.22, 0, 1], rushingYards: [0.5, 0, 5], fumblesLost: [0.03, 0, 1],
  },
  WR4: {
    receptions: [2, 0, 6], receivingYards: [22, 0, 60], receivingTDs: [0.1, 0, 1], rushingYards: [0, 0, 3], fumblesLost: [0.02, 0, 1],
  },
  TE1: {
    receptions: [4.5, 1, 9], receivingYards: [50, 10, 100], receivingTDs: [0.32, 0, 2],
  },
  TE2: {
    receptions: [1.8, 0, 5], receivingYards: [18, 0, 45], receivingTDs: [0.1, 0, 1],
  },
  K: {
    fieldGoalsMade: [1.6, 0, 4], extraPointsMade: [2.6, 0, 6],
  },
  DST: {
    sacks: [2.4, 0, 7], defInterceptions: [0.8, 0, 3], fumbleRecoveries: [0.6, 0, 3],
    defensiveTDs: [0.12, 0, 1], safeties: [0.03, 0, 1], pointsAllowed: [21, 6, 38],
  },
}

function buildProjection(tierKey) {
  const jitter = rand(0.85, 1.15)
  const tier = TIERS[tierKey]
  const projection = {}
  for (const [stat, [mean, floor, ceiling]] of Object.entries(tier)) {
    projection[stat] = {
      mean: round1(mean * jitter),
      floor: round1(floor * jitter),
      ceiling: round1(ceiling * jitter),
    }
  }
  return projection
}
const round1 = (n) => Math.round(n * 10) / 10

let idCounter = 0
const players = []

function addPlayer({ positions, team, tierKey, name, status = 'active' }) {
  idCounter += 1
  players.push({
    id: `nfl-${String(idCounter).padStart(4, '0')}`,
    sport: 'nfl',
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
  addPlayer({ positions: ['RB'], team: abbr, tierKey: 'RB3', name: realName(abbr, 'RB3') })
  addPlayer({ positions: ['WR'], team: abbr, tierKey: 'WR1', name: realName(abbr, 'WR1') })
  addPlayer({ positions: ['WR'], team: abbr, tierKey: 'WR2', name: realName(abbr, 'WR2') })
  addPlayer({ positions: ['WR'], team: abbr, tierKey: 'WR3', name: realName(abbr, 'WR3') })
  addPlayer({ positions: ['WR'], team: abbr, tierKey: 'WR4', name: realName(abbr, 'WR4') })
  addPlayer({ positions: ['TE'], team: abbr, tierKey: 'TE1', name: realName(abbr, 'TE1') })
  addPlayer({ positions: ['TE'], team: abbr, tierKey: 'TE2', name: realName(abbr, 'TE2') })
  addPlayer({ positions: ['K'], team: abbr, tierKey: 'K', name: realName(abbr, 'K') })
  addPlayer({ positions: ['DST'], team: abbr, tierKey: 'DST', name: `${teamName} Defense` })
}

// A handful of questionable/out statuses so injury-reactive waiver logic
// (step 5) has something to react to out of the gate.
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
// Regenerate with: node scripts/generate-nfl-fixtures.mjs
import type { Player } from '../../types'
import { registerFixtures } from '../../data/SeedDataProvider'

export const nflPlayers: Player[] = ${JSON.stringify(players, null, 2)}

registerFixtures('nfl', { players: nflPlayers })
`

writeFileSync(new URL('../src/fixtures/nfl/players.ts', import.meta.url), header)
console.log(`Generated ${players.length} NFL players.`)
