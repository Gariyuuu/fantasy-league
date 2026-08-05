import { describe, expect, it } from 'vitest'
import { createLeagueOnly, simulateSeasonToCompletion, simulateWeek } from './testHelpers'
import { getSportConfig } from '../../config/sports'

describe('PGA (salaryCapField engine)', () => {
  it('skips the draft entirely — league creation opens straight to event 1', async () => {
    const state = await createLeagueOnly(501, 'pga')
    expect(state.phase).toBe('regularSeason')
    expect(state.currentPeriod).toBe(1)
    expect(state.draft.status).toBe('notStarted')
    for (const team of state.teams) {
      expect(team.roster).toHaveLength(0)
    }
  })

  it('every AI team picks exactly a full field under the salary cap for event 1', async () => {
    const created = await createLeagueOnly(502, 'pga')
    const played = await simulateWeek(created)
    const config = getSportConfig('pga')
    const fieldSize = config.fieldSize ?? 0

    for (const team of played.teams) {
      if (team.isHuman) continue
      const lineup = team.lineups[1]
      expect(lineup).toBeDefined()
      expect(lineup!.entries).toHaveLength(fieldSize)
      expect(new Set(lineup!.entries.map((e) => e.playerId)).size).toBe(fieldSize)

      const totalSalary = lineup!.entries.reduce((sum, e) => sum + (played.players[e.playerId]?.salary ?? 0), 0)
      expect(totalSalary).toBeLessThanOrEqual(config.salaryCap!)

      // roster never accumulates — engine C has no persistent roster
      expect(team.roster).toHaveLength(0)
    }
  })

  it('creates no head-to-head matchups — pure event-by-event leaderboard', async () => {
    const created = await createLeagueOnly(503, 'pga')
    let state = created
    for (let i = 0; i < 2; i++) state = await simulateWeek(state)
    expect(state.matchups).toHaveLength(0)
  })

  it('plays through every event and crowns the cumulative points leader champion, with no bracket', async () => {
    const config = getSportConfig('pga')
    expect(config.playoffs).toBeUndefined()

    const created = await createLeagueOnly(504, 'pga')
    const finished = await simulateSeasonToCompletion(created)

    expect(finished.phase).toBe('complete')
    expect(finished.playoffs).toBeUndefined()
    expect(finished.currentPeriod).toBe(config.season.totalPeriods + 1)
    const leader = [...finished.teams].sort((a, b) => b.points - a.points)[0]
    expect(finished.championTeamId).toBe(leader.id)
  })

  it('is fully deterministic across two identical-seed full-season runs', async () => {
    async function runFullSeason(seed: number) {
      const created = await createLeagueOnly(seed, 'pga')
      return simulateSeasonToCompletion(created)
    }
    const [a, b] = await Promise.all([runFullSeason(9004), runFullSeason(9004)])
    expect(a.championTeamId).toBe(b.championTeamId)
    expect(a.teams.map((t) => t.points)).toEqual(b.teams.map((t) => t.points))
    expect(a.rngCursor).toBe(b.rngCursor)
  })
})
