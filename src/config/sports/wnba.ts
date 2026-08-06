import type { SportConfig } from '../../types'

export const wnbaConfig: SportConfig = {
  id: 'wnba',
  label: 'WNBA',
  engine: 'rollingPoints',
  season: {
    startDate: '2026-05-15',
    periodLabel: 'Day',
    totalPeriods: 30,
  },
  realSeasonWindow: { start: '2026-05-15', end: '2026-10-20' },
  positions: ['G', 'F', 'C'],
  roster: [
    { slot: 'G', eligiblePositions: ['G'], count: 2 },
    { slot: 'F', eligiblePositions: ['F'], count: 2 },
    { slot: 'C', eligiblePositions: ['C'], count: 1 },
    { slot: 'UTIL', eligiblePositions: ['G', 'F', 'C'], count: 1 },
    {
      slot: 'BN',
      eligiblePositions: ['G', 'F', 'C'],
      count: 4,
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
  draft: { type: 'snake', rounds: 10, pickTimeSeconds: 60 },
  lineupLock: 'periodStart',
  // No bracket: a rolling-points league is a pure cumulative leaderboard.
}
