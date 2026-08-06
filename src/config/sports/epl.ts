import type { SportConfig } from '../../types'

// Soccer stat vocabulary shared with MLS (goals, assists, cleanSheets,
// saves, cards) — see mls.ts. Season length is compressed from the real
// 38-gameweek EPL calendar to a playable ~18-week fantasy season, the same
// compression MLB already applies to its 162-game slate.
export const eplConfig: SportConfig = {
  id: 'epl',
  label: 'Soccer (EPL)',
  engine: 'headToHead',
  season: {
    startDate: '2026-08-15',
    periodLabel: 'Week',
    totalPeriods: 18,
  },
  realSeasonWindow: { start: '2026-08-15', end: '2027-05-24' },
  positions: ['GK', 'DEF', 'MID', 'FWD'],
  roster: [
    { slot: 'GK', eligiblePositions: ['GK'], count: 1 },
    { slot: 'DEF', eligiblePositions: ['DEF'], count: 3 },
    { slot: 'MID', eligiblePositions: ['MID'], count: 3 },
    { slot: 'FWD', eligiblePositions: ['FWD'], count: 2 },
    { slot: 'FLEX', eligiblePositions: ['DEF', 'MID', 'FWD'], count: 1 },
    {
      slot: 'BN',
      eligiblePositions: ['GK', 'DEF', 'MID', 'FWD'],
      count: 4,
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
  draft: { type: 'snake', rounds: 14, pickTimeSeconds: 60 },
  lineupLock: 'perPlayerGameTime',
  // 16 regular-season weeks, then a 4-team single-elimination bracket over
  // the final 2 weeks.
  playoffs: { teamCount: 4, weeks: 2 },
}
