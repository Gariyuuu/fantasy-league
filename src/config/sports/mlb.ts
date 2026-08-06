import type { SportConfig } from '../../types'

// Batting and pitching stat keys are already distinct by name (hits vs.
// pitchingStrikeouts, etc.) so — unlike NFL's interceptions — there's no
// collision risk here needing deliberate disambiguation.
export const mlbConfig: SportConfig = {
  id: 'mlb',
  label: 'MLB',
  engine: 'rollingPoints',
  season: {
    startDate: '2026-08-05',
    periodLabel: 'Day',
    totalPeriods: 45,
  },
  realSeasonWindow: { start: '2026-03-26', end: '2026-11-01' },
  positions: ['C', '1B', '2B', '3B', 'SS', 'OF', 'SP', 'RP'],
  roster: [
    { slot: 'C', eligiblePositions: ['C'], count: 1 },
    { slot: '1B', eligiblePositions: ['1B'], count: 1 },
    { slot: '2B', eligiblePositions: ['2B'], count: 1 },
    { slot: '3B', eligiblePositions: ['3B'], count: 1 },
    { slot: 'SS', eligiblePositions: ['SS'], count: 1 },
    { slot: 'OF', eligiblePositions: ['OF'], count: 3 },
    { slot: 'UTIL', eligiblePositions: ['C', '1B', '2B', '3B', 'SS', 'OF'], count: 1 },
    { slot: 'SP', eligiblePositions: ['SP'], count: 2 },
    { slot: 'RP', eligiblePositions: ['RP'], count: 1 },
    {
      slot: 'BN',
      eligiblePositions: ['C', '1B', '2B', '3B', 'SS', 'OF', 'SP', 'RP'],
      count: 4,
      isBench: true,
    },
  ],
  scoringPresets: {
    standard: {
      id: 'standard',
      label: 'Standard',
      weights: {
        hits: 1,
        homeRuns: 3,
        runs: 1,
        rbis: 1,
        stolenBases: 2,
        walksBatting: 1,
        inningsPitched: 3,
        pitchingStrikeouts: 1,
        earnedRunsAllowed: -2,
        pitchingWins: 4,
        saves: 4,
      },
    },
    ppr: {
      id: 'ppr',
      label: 'On-Base (OBP-leaning)',
      weights: {
        hits: 1,
        homeRuns: 3,
        runs: 1,
        rbis: 1,
        stolenBases: 2,
        walksBatting: 2,
        inningsPitched: 3,
        pitchingStrikeouts: 1,
        earnedRunsAllowed: -2,
        pitchingWins: 4,
        saves: 4,
      },
    },
    custom: {
      id: 'custom',
      label: 'Custom',
      weights: {
        hits: 1,
        homeRuns: 3,
        runs: 1,
        rbis: 1,
        stolenBases: 2,
        walksBatting: 1,
        inningsPitched: 3,
        pitchingStrikeouts: 1,
        earnedRunsAllowed: -2,
        pitchingWins: 4,
        saves: 4,
      },
    },
  },
  draft: { type: 'snake', rounds: 16, pickTimeSeconds: 60 },
  lineupLock: 'periodStart',
  // No bracket: a rolling-points league is a pure cumulative leaderboard —
  // the season just ends and the points leader is champion.
}
