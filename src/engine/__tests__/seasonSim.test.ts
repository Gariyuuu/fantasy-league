import { describe, expect, it } from 'vitest'
import { simulateDraft, simulateWeek } from './testHelpers'
import { scoreStatLine } from '../scoring'

describe('season simulation', () => {
  it('gives every AI team a full lineup immediately after the draft (week-1 default)', async () => {
    // AI managers are need-aware (see unmetPositionNeeds in valuation.ts),
    // so they're guaranteed to leave the draft with at least the minimum
    // required count at every exclusive-eligibility position. The human
    // seat isn't included here: this test harness drafts pure
    // best-available-by-value for the human with no position awareness,
    // which can legitimately leave required slots unfillable — see the
    // "gracefully handles a roster missing a required position" test below
    // for that case.
    const state = await simulateDraft(101)
    const nonBenchSlots = state.config.roster.filter((s) => !s.isBench).reduce((sum, s) => sum + s.count, 0)
    for (const team of state.teams.filter((t) => !t.isHuman)) {
      const lineup = team.lineups[1]
      expect(lineup).toBeDefined()
      const starterCount = lineup!.entries.filter((e) => e.slot !== 'BN').length
      expect(starterCount).toBe(nonBenchSlots)
    }
  })

  it('gracefully handles a roster missing a required position by leaving that slot unfilled, not crashing', async () => {
    const state = await simulateDraft(101)
    const humanTeam = state.teams.find((t) => t.isHuman)!
    // Confirmed by the draft above: this naive human strategy ends up with
    // no TE, K, or DST — exactly the degenerate case buildOptimalLineup
    // must handle without throwing.
    const missingPositions = ['TE', 'K', 'DST'].filter(
      (pos) => !humanTeam.roster.some((id) => state.players[id].positions.includes(pos)),
    )
    expect(missingPositions.length).toBeGreaterThan(0)

    const lineup = humanTeam.lineups[1]!
    const filledSlots = new Set(lineup.entries.filter((e) => e.slot !== 'BN').map((e) => e.slot))
    for (const pos of missingPositions) {
      expect(filledSlots.has(pos)).toBe(false)
    }
    // every entry that IS present must be a real, distinct rostered player
    const playerIds = lineup.entries.map((e) => e.playerId)
    expect(new Set(playerIds).size).toBe(playerIds.length)
    for (const id of playerIds) {
      expect(humanTeam.roster).toContain(id)
    }
  })

  it('produces a valid weekly schedule: every team plays exactly once, nobody plays itself', async () => {
    const drafted = await simulateDraft(102)
    const played = await simulateWeek(drafted)
    const weekMatchups = played.matchups.filter((m) => m.period === 1)

    expect(weekMatchups).toHaveLength(drafted.teams.length / 2)
    const teamsInMatchups = weekMatchups.flatMap((m) => [m.homeTeamId, m.awayTeamId])
    expect(new Set(teamsInMatchups).size).toBe(drafted.teams.length)
    for (const m of weekMatchups) {
      expect(m.homeTeamId).not.toBe(m.awayTeamId)
    }
  })

  it('scores a matchup as the sum of scoreStatLine over starters only, excluding bench', async () => {
    const drafted = await simulateDraft(103)
    const played = await simulateWeek(drafted)
    const weights = played.config.scoringPresets[played.scoringPreset].weights
    const statLinesByPlayer = new Map(played.statLines.filter((s) => s.period === 1).map((s) => [s.playerId, s]))

    const matchup = played.matchups[0]
    const homeTeam = played.teams.find((t) => t.id === matchup.homeTeamId)!
    const lineup = homeTeam.lineups[1]!
    const expected = lineup.entries
      .filter((e) => e.slot !== 'BN')
      .reduce((sum, e) => {
        const line = statLinesByPlayer.get(e.playerId)
        return sum + (line ? scoreStatLine(line, weights) : 0)
      }, 0)

    expect(Math.round(expected * 100) / 100).toBe(matchup.homeScore)
  })

  it('recomputes standings so total wins across the league equals total games played', async () => {
    const drafted = await simulateDraft(104)
    const played = await simulateWeek(drafted)
    const totalWins = played.standings.reduce((sum, s) => sum + (s.wins ?? 0), 0)
    const totalTies = played.standings.reduce((sum, s) => sum + (s.ties ?? 0), 0)
    // each game is either a decisive result (1 win credited) or a tie (2 ties credited, 0 wins)
    expect(totalWins + totalTies / 2).toBe(played.matchups.length)
  })

  it('carries forward the prior week lineup when a team never sets one for the new period', async () => {
    const drafted = await simulateDraft(105)
    const week1 = await simulateWeek(drafted)
    const skipTeamId = week1.teams[0].id
    const week2 = await simulateWeek(week1, [skipTeamId])

    const team = week2.teams.find((t) => t.id === skipTeamId)!
    expect(team.lineups[2]).toBeUndefined() // never explicitly set for period 2
    const period2Matchup = week2.matchups.find(
      (m) => m.period === 2 && (m.homeTeamId === skipTeamId || m.awayTeamId === skipTeamId),
    )
    expect(period2Matchup).toBeDefined()
    // carried-forward lineup should still produce a real (nonzero) score, not a blank lineup
    const score = period2Matchup!.homeTeamId === skipTeamId ? period2Matchup!.homeScore : period2Matchup!.awayScore
    expect(score).toBeGreaterThan(0)
  })

  it('is fully deterministic across two identical-seed multi-week runs', async () => {
    async function runTwoWeeks(seed: number) {
      let state = await simulateDraft(seed)
      state = await simulateWeek(state)
      state = await simulateWeek(state)
      return state
    }
    const [a, b] = await Promise.all([runTwoWeeks(9001), runTwoWeeks(9001)])
    expect(a.matchups).toEqual(b.matchups)
    expect(a.standings).toEqual(b.standings)
    expect(a.rngCursor).toBe(b.rngCursor)
  })
})
