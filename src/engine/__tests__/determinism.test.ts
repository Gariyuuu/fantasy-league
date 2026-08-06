import { describe, expect, it } from 'vitest'
import { createSeededRng, drawUniform } from '../rng'
import { applyAction, createEmptyLeagueState } from '../reducer'
import type { LeagueCreatePayload } from '../reducer'
import type { Action, SportConfig } from '../../types'

describe('seeded RNG', () => {
  it('is deterministic for a given seed', () => {
    const a = createSeededRng(42)
    const b = createSeededRng(42)
    const seqA = Array.from({ length: 5 }, () => a())
    const seqB = Array.from({ length: 5 }, () => b())
    expect(seqA).toEqual(seqB)
  })

  it('produces values in [0, 1)', () => {
    const { values } = drawUniform(7, 0, 1000)
    for (const v of values) {
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
    }
  })

  it('fast-forwarding to a cursor matches continuing a running generator', () => {
    const gen = createSeededRng(99)
    for (let i = 0; i < 10; i++) gen()
    const next = gen()
    const resumed = createSeededRng(99, 10)
    expect(resumed()).toBe(next)
  })
})

const stubConfig: SportConfig = {
  id: 'nfl',
  label: 'NFL',
  engine: 'headToHead',
  season: { startDate: '2026-09-10', periodLabel: 'Week', totalPeriods: 17 },
  realSeasonWindow: { start: '2026-09-10', end: '2027-02-14' },
  positions: ['QB', 'RB', 'WR', 'TE'],
  roster: [{ slot: 'QB', eligiblePositions: ['QB'], count: 1 }],
  scoringPresets: {
    standard: { id: 'standard', label: 'Standard', weights: {} },
    ppr: { id: 'ppr', label: 'PPR', weights: {} },
    custom: { id: 'custom', label: 'Custom', weights: {} },
  },
  draft: { type: 'snake', rounds: 15, pickTimeSeconds: 60 },
  lineupLock: 'perPlayerGameTime',
}

describe('reducer', () => {
  it('LEAGUE_CREATE moves an empty state to predraft and logs the action', () => {
    const empty = createEmptyLeagueState('league-1', 1234)
    const action: Action<LeagueCreatePayload> = {
      type: 'LEAGUE_CREATE',
      managerId: 'system',
      timestamp: 1,
      payload: {
        name: 'Test League',
        config: stubConfig,
        scoringPreset: 'standard',
        difficulty: 'normal',
        teams: [],
        players: {},
        managerPersonas: {},
      },
    }

    const next = applyAction(empty, action)

    expect(next.phase).toBe('predraft')
    expect(next.name).toBe('Test League')
    expect(next.sport).toBe('nfl')
    expect(next.actionLog).toHaveLength(1)
    expect(empty.actionLog).toHaveLength(0) // input state untouched
  })

  it('replaying the same action log from the same seed yields identical state', () => {
    const action: Action<LeagueCreatePayload> = {
      type: 'LEAGUE_CREATE',
      managerId: 'system',
      timestamp: 1,
      payload: {
        name: 'Replay League',
        config: stubConfig,
        scoringPreset: 'standard',
        difficulty: 'normal',
        teams: [],
        players: {},
        managerPersonas: {},
      },
    }

    const runA = applyAction(createEmptyLeagueState('league-2', 55), action)
    const runB = applyAction(createEmptyLeagueState('league-2', 55), action)

    expect(runA).toEqual(runB)
  })

  it('throws for action types that have no handler yet', () => {
    const empty = createEmptyLeagueState('league-3', 1)
    expect(() =>
      applyAction(empty, {
        type: 'SCORING_EDIT',
        managerId: 'system',
        timestamp: 1,
        payload: {},
      }),
    ).toThrow(/no handler implemented yet/)
  })
})
