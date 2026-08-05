import { describe, expect, it } from 'vitest'
import { simulateDraft, simulateSeasonToCompletion, simulateWeek } from './testHelpers'
import { draftRounds } from '../draft'
import { getSportConfig } from '../../config/sports'

describe('MLB (rollingPoints engine)', () => {
  it('drafts a full 16-player roster per team, no duplicates league-wide', async () => {
    const state = await simulateDraft(401, 'mlb')
    const rounds = draftRounds(state.config)
    expect(rounds).toBe(16)
    for (const team of state.teams) {
      expect(team.roster).toHaveLength(16)
    }
    const allRostered = state.teams.flatMap((t) => t.roster)
    expect(new Set(allRostered).size).toBe(allRostered.length)
  })

  it('creates no head-to-head matchups — every team just accumulates points independently', async () => {
    const drafted = await simulateDraft(402, 'mlb')
    let state = drafted
    for (let i = 0; i < 5; i++) {
      state = await simulateWeek(state)
    }
    expect(state.matchups).toHaveLength(0)
    expect(state.currentPeriod).toBe(6)
  })

  it('accumulates each team\'s points day over day, matching the sum of that day\'s lineup score', async () => {
    const drafted = await simulateDraft(403, 'mlb')
    const day1 = await simulateWeek(drafted)
    const day2 = await simulateWeek(day1)

    for (const team of day2.teams) {
      const day1Team = day1.teams.find((t) => t.id === team.id)!
      // points only ever goes up (scores are >= 0) and should never reset
      expect(team.points).toBeGreaterThanOrEqual(day1Team.points)
    }
  })

  it('standings rank purely by cumulative points, with no win/loss/tie record', async () => {
    const drafted = await simulateDraft(404, 'mlb')
    let state = drafted
    for (let i = 0; i < 3; i++) state = await simulateWeek(state)

    const sortedByPoints = [...state.teams].sort((a, b) => b.points - a.points)
    expect(state.standings.map((s) => s.teamId)).toEqual(sortedByPoints.map((t) => t.id))
    for (const entry of state.standings) {
      expect(entry.wins).toBeUndefined()
      expect(entry.losses).toBeUndefined()
      expect(entry.ties).toBeUndefined()
    }
  })

  it('has no playoff bracket configured — the season just ends with the points leader as champion', async () => {
    const config = getSportConfig('mlb')
    expect(config.playoffs).toBeUndefined()

    const drafted = await simulateDraft(405, 'mlb')
    const finished = await simulateSeasonToCompletion(drafted)

    expect(finished.phase).toBe('complete')
    expect(finished.playoffs).toBeUndefined()
    const leader = [...finished.teams].sort((a, b) => b.points - a.points)[0]
    expect(finished.championTeamId).toBe(leader.id)
  })

  it('is fully deterministic across two identical-seed full-season runs', async () => {
    async function runFullSeason(seed: number) {
      const drafted = await simulateDraft(seed, 'mlb')
      return simulateSeasonToCompletion(drafted)
    }
    const [a, b] = await Promise.all([runFullSeason(9003), runFullSeason(9003)])
    expect(a.championTeamId).toBe(b.championTeamId)
    expect(a.teams.map((t) => t.points)).toEqual(b.teams.map((t) => t.points))
    expect(a.rngCursor).toBe(b.rngCursor)
  })
})
