import type { SportConfig } from '../../types'

/**
 * Engine C: no draft, no persistent roster — mirrors pga.ts. Each event,
 * every manager picks a fresh 6-player field under a salary cap. The
 * "season" here represents the four Grand Slams.
 */
export const tennisConfig: SportConfig = {
  id: 'tennis',
  label: 'Tennis',
  engine: 'salaryCapField',
  season: {
    startDate: '2026-08-24',
    periodLabel: 'Event',
    totalPeriods: 4,
  },
  realSeasonWindow: { start: '2026-01-05', end: '2026-11-16' },
  positions: ['PLAYER'],
  roster: [{ slot: 'FIELD', eligiblePositions: ['PLAYER'], count: 6 }],
  fieldSize: 6,
  salaryCap: 50000,
  scoringPresets: {
    standard: {
      id: 'standard',
      label: 'Standard',
      weights: { setsWon: 2, acesServed: 0.3, doubleFaults: -0.5, matchesWon: 6, semifinalReached: 8, title: 25 },
    },
    ppr: {
      id: 'ppr',
      label: 'Aggressive (aces-leaning)',
      weights: { setsWon: 2, acesServed: 0.5, doubleFaults: -0.5, matchesWon: 6, semifinalReached: 8, title: 25 },
    },
    custom: {
      id: 'custom',
      label: 'Custom',
      weights: { setsWon: 2, acesServed: 0.3, doubleFaults: -0.5, matchesWon: 6, semifinalReached: 8, title: 25 },
    },
  },
  draft: { type: 'none' },
  lineupLock: 'periodStart',
  // No bracket: a salary-cap field game is a per-event leaderboard —
  // cumulative points across events decide the season.
}
