import type { SportConfig } from '../../types'

/**
 * Engine C: no draft, no persistent roster. Each event, every manager
 * picks a fresh 6-golfer field under a salary cap — the "roster" is
 * whatever was picked for the current event only. See engine/salaryCap.ts.
 */
export const pgaConfig: SportConfig = {
  id: 'pga',
  label: 'PGA Tour',
  engine: 'salaryCapField',
  season: {
    startDate: '2026-08-06',
    periodLabel: 'Event',
    totalPeriods: 4,
  },
  realSeasonWindow: { start: '2026-01-08', end: '2026-09-01' },
  positions: ['GOLFER'],
  roster: [{ slot: 'FIELD', eligiblePositions: ['GOLFER'], count: 6 }],
  fieldSize: 6,
  salaryCap: 50000,
  scoringPresets: {
    standard: {
      id: 'standard',
      label: 'Standard',
      weights: { birdies: 1, eagles: 2, bogeys: -1, win: 30, top10: 10, madeCut: 5 },
    },
    ppr: {
      id: 'ppr',
      label: 'Aggressive (birdies/eagles-leaning)',
      weights: { birdies: 1.5, eagles: 3, bogeys: -1, win: 30, top10: 10, madeCut: 5 },
    },
    custom: {
      id: 'custom',
      label: 'Custom',
      weights: { birdies: 1, eagles: 2, bogeys: -1, win: 30, top10: 10, madeCut: 5 },
    },
  },
  draft: { type: 'none' },
  lineupLock: 'periodStart',
  // No bracket: a salary-cap field game is a per-event leaderboard —
  // cumulative points across events decide the season, no playoff round.
}
