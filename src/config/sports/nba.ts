import type { SportConfig } from '../../types'

// Same stat vocabulary as wnba.ts — basketball is basketball. Bigger
// bench slot than WNBA since NBA rosters run deeper (15-man vs 12-man).
export const nbaConfig: SportConfig = {
  id: 'nba',
  label: 'NBA',
  engine: 'rollingPoints',
  season: {
    startDate: '2026-10-21',
    periodLabel: 'Day',
    totalPeriods: 45,
  },
  realSeasonWindow: { start: '2026-10-21', end: '2027-06-22' },
  positions: ['G', 'F', 'C'],
  roster: [
    { slot: 'G', eligiblePositions: ['G'], count: 2 },
    { slot: 'F', eligiblePositions: ['F'], count: 2 },
    { slot: 'C', eligiblePositions: ['C'], count: 1 },
    { slot: 'UTIL', eligiblePositions: ['G', 'F', 'C'], count: 1 },
    {
      slot: 'BN',
      eligiblePositions: ['G', 'F', 'C'],
      count: 5,
      isBench: true,
    },
  ],
  scoringPresets: {
    standard: {
      id: 'standard',
      label: 'Standard',
      weights: {
        points: 1,
        rebounds: 1.2,
        assists: 1.5,
        steals: 3,
        blocks: 3,
        turnovers: -1,
        threePointersMade: 0.5,
      },
    },
    ppr: {
      id: 'ppr',
      label: 'Playmaker (assist-leaning)',
      weights: {
        points: 1,
        rebounds: 1.2,
        assists: 2,
        steals: 3,
        blocks: 3,
        turnovers: -1,
        threePointersMade: 0.5,
      },
    },
    custom: {
      id: 'custom',
      label: 'Custom',
      weights: {
        points: 1,
        rebounds: 1.2,
        assists: 1.5,
        steals: 3,
        blocks: 3,
        turnovers: -1,
        threePointersMade: 0.5,
      },
    },
  },
  draft: { type: 'snake', rounds: 11, pickTimeSeconds: 60 },
  lineupLock: 'periodStart',
  // No bracket: a rolling-points league is a pure cumulative leaderboard.
}
