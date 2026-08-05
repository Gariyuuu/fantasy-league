import { describe, expect, it } from 'vitest'
import { simulateDraft, simulateSeasonToCompletion, simulateWeek } from './testHelpers'
import { regularSeasonWeeks, seedPlayoffBracket } from '../playoffs'

describe('playoffs', () => {
  it('seeds a 4-team bracket as 1v4 and 2v3 from final regular-season standings', () => {
    const standings = [
      { teamId: 't1', rank: 1, wins: 10, losses: 5, ties: 0, pointsFor: 100, pointsAgainst: 0 },
      { teamId: 't2', rank: 2, wins: 9, losses: 6, ties: 0, pointsFor: 90, pointsAgainst: 0 },
      { teamId: 't3', rank: 3, wins: 8, losses: 7, ties: 0, pointsFor: 80, pointsAgainst: 0 },
      { teamId: 't4', rank: 4, wins: 7, losses: 8, ties: 0, pointsFor: 70, pointsAgainst: 0 },
      { teamId: 't5', rank: 5, wins: 6, losses: 9, ties: 0, pointsFor: 60, pointsAgainst: 0 },
    ]
    const pairings = seedPlayoffBracket(standings, 4)
    expect(pairings).toEqual([
      ['t1', 't4'],
      ['t2', 't3'],
    ])
  })

  it('freezes standings once the bracket starts, but keeps advancing currentPeriod and recording playoff box scores', async () => {
    const drafted = await simulateDraft(301)
    let state = drafted
    const regSeasonWeeks = regularSeasonWeeks(state.config)

    while (state.phase === 'regularSeason') {
      state = await simulateWeek(state)
    }

    expect(state.phase).toBe('playoffs')
    expect(state.currentPeriod).toBe(regSeasonWeeks + 1)
    expect(state.playoffs).toHaveLength(1)
    expect(state.playoffs![0].round).toBe(1)
    expect(state.playoffs![0].matchups).toHaveLength(2) // 4-team bracket -> 2 round-1 games

    const frozenStandings = state.standings
    const bracketTeamIds = new Set(state.playoffs![0].matchups.flatMap((m) => [m.homeTeamId, m.awayTeamId]))
    // the 4 bracket teams should be exactly the top 4 of the frozen standings
    const top4 = frozenStandings.slice(0, 4).map((s) => s.teamId)
    expect(bracketTeamIds).toEqual(new Set(top4))

    // playing one playoff week must not touch standings (frozen) but must
    // still record a matchup box score and advance the period
    const afterRound1 = await simulateWeek(state)
    expect(afterRound1.standings).toEqual(frozenStandings)
    expect(afterRound1.currentPeriod).toBe(state.currentPeriod + 1)
    expect(afterRound1.matchups.some((m) => m.period === state.currentPeriod)).toBe(true)
  })

  it('eliminated (non-bracket) teams never appear in a playoff-period matchup', async () => {
    const drafted = await simulateDraft(302)
    let state = drafted
    while (state.phase === 'regularSeason') {
      state = await simulateWeek(state)
    }
    const bracketTeamIds = new Set(state.playoffs![0].matchups.flatMap((m) => [m.homeTeamId, m.awayTeamId]))
    const eliminatedTeamIds = state.teams.map((t) => t.id).filter((id) => !bracketTeamIds.has(id))
    expect(eliminatedTeamIds).toHaveLength(4) // 8-team league, 4-team bracket

    const played = await simulateWeek(state)
    const thisWeekMatchups = played.matchups.filter((m) => m.period === state.currentPeriod)
    for (const m of thisWeekMatchups) {
      expect(eliminatedTeamIds).not.toContain(m.homeTeamId)
      expect(eliminatedTeamIds).not.toContain(m.awayTeamId)
    }
  })

  it('plays through the full bracket to a single champion and marks the league complete', async () => {
    const drafted = await simulateDraft(303)
    const finished = await simulateSeasonToCompletion(drafted)

    expect(finished.phase).toBe('complete')
    expect(finished.championTeamId).toBeTruthy()
    expect(finished.teams.map((t) => t.id)).toContain(finished.championTeamId)

    // round 1 (2 games) -> round 2 / championship (1 game)
    expect(finished.playoffs).toHaveLength(2)
    expect(finished.playoffs![0].matchups).toHaveLength(2)
    expect(finished.playoffs![1].matchups).toHaveLength(1)

    // the champion must be a winner of both its round-1 and championship games
    const championship = finished.playoffs![1].matchups[0]
    expect([championship.homeTeamId, championship.awayTeamId]).toContain(finished.championTeamId)
    const winningScore = Math.max(championship.homeScore, championship.awayScore)
    const championScore = championship.homeTeamId === finished.championTeamId ? championship.homeScore : championship.awayScore
    expect(championScore).toBe(winningScore)
  })

  it('is fully deterministic across two identical-seed full-season runs, including the champion', async () => {
    async function runFullSeason(seed: number) {
      const drafted = await simulateDraft(seed)
      return simulateSeasonToCompletion(drafted)
    }
    const [a, b] = await Promise.all([runFullSeason(9002), runFullSeason(9002)])
    expect(a.championTeamId).toBe(b.championTeamId)
    expect(a.playoffs).toEqual(b.playoffs)
    expect(a.rngCursor).toBe(b.rngCursor)
  })
})
