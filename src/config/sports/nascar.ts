import type { SportConfig } from '../../types'

/** Engine C: no draft, no persistent roster — mirrors pga.ts and tennis.ts. */
export const nascarConfig: SportConfig = {
  id: 'nascar',
  label: 'NASCAR Cup',
  engine: 'salaryCapField',
  season: {
    startDate: '2026-08-08',
    periodLabel: 'Race',
    totalPeriods: 8,
  },
  realSeasonWindow: { start: '2026-02-15', end: '2026-11-08' },
  positions: ['DRIVER'],
  roster: [{ slot: 'FIELD', eligiblePositions: ['DRIVER'], count: 6 }],
  fieldSize: 6,
  salaryCap: 50000,
  scoringPresets: {
    standard: {
      id: 'standard',
      label: 'Standard',
      weights: { lapsLed: 0.5, stageWins: 3, top5: 5, top10: 2, win: 25, dnf: -5 },
    },
    ppr: {
      id: 'ppr',
      label: 'Dominator (laps-led-leaning)',
      weights: { lapsLed: 0.8, stageWins: 3, top5: 5, top10: 2, win: 25, dnf: -5 },
    },
    custom: {
      id: 'custom',
      label: 'Custom',
      weights: { lapsLed: 0.5, stageWins: 3, top5: 5, top10: 2, win: 25, dnf: -5 },
    },
  },
  draft: { type: 'none' },
  lineupLock: 'periodStart',
  // No bracket: a salary-cap field game is a per-event leaderboard —
  // cumulative points across races decide the season.
}
