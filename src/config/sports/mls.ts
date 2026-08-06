import type { SportConfig } from '../../types'

// Same soccer stat vocabulary as epl.ts, on the daily rolling-points
// engine since MLS (like MLB) plays near-daily rather than one match/week.
export const mlsConfig: SportConfig = {
  id: 'mls',
  label: 'MLS',
  engine: 'rollingPoints',
  season: {
    startDate: '2026-02-21',
    periodLabel: 'Day',
    totalPeriods: 34,
  },
  realSeasonWindow: { start: '2026-02-21', end: '2026-12-06' },
  positions: ['GK', 'DEF', 'MID', 'FWD'],
  roster: [
    { slot: 'GK', eligiblePositions: ['GK'], count: 1 },
    { slot: 'DEF', eligiblePositions: ['DEF'], count: 2 },
    { slot: 'MID', eligiblePositions: ['MID'], count: 2 },
    { slot: 'FWD', eligiblePositions: ['FWD'], count: 1 },
    { slot: 'UTIL', eligiblePositions: ['DEF', 'MID', 'FWD'], count: 1 },
    {
      slot: 'BN',
      eligiblePositions: ['GK', 'DEF', 'MID', 'FWD'],
      count: 3,
      isBench: true,
    },
  ],
  scoringPresets: {
    standard: {
      id: 'standard',
      label: 'Standard',
      weights: {
        goals: 5,
        assists: 3,
        cleanSheets: 4,
        saves: 0.5,
        yellowCards: -1,
        redCards: -3,
        goalsConceded: -0.5,
      },
    },
    ppr: {
      id: 'ppr',
      label: 'Attacking (goal-leaning)',
      weights: {
        goals: 6,
        assists: 4,
        cleanSheets: 3,
        saves: 0.3,
        yellowCards: -1,
        redCards: -3,
        goalsConceded: -0.3,
      },
    },
    custom: {
      id: 'custom',
      label: 'Custom',
      weights: {
        goals: 5,
        assists: 3,
        cleanSheets: 4,
        saves: 0.5,
        yellowCards: -1,
        redCards: -3,
        goalsConceded: -0.5,
      },
    },
  },
  draft: { type: 'snake', rounds: 10, pickTimeSeconds: 60 },
  lineupLock: 'periodStart',
  // No bracket: a rolling-points league is a pure cumulative leaderboard.
}
