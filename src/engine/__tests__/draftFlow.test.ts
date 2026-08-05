import { describe, expect, it } from 'vitest'
import { simulateDraft } from './testHelpers'

describe('full draft simulation', () => {
  it('completes with the correct pick count and no duplicate players', async () => {
    const state = await simulateDraft(777)
    expect(state.draft.status).toBe('complete')
    expect(state.phase).toBe('regularSeason')
    expect(state.draft.picks).toHaveLength(8 * 15)
    const playerIds = state.draft.picks.map((p) => p.playerId)
    expect(new Set(playerIds).size).toBe(playerIds.length)
  })

  it('gives every team a full 15-player roster', async () => {
    const state = await simulateDraft(778)
    for (const team of state.teams) {
      expect(team.roster).toHaveLength(15)
    }
  })

  it('alternates snake order between round 1 and round 2', async () => {
    const state = await simulateDraft(779)
    const teamCount = state.draft.order.length
    const round1 = state.draft.picks.slice(0, teamCount).map((p) => p.teamId)
    const round2 = state.draft.picks.slice(teamCount, teamCount * 2).map((p) => p.teamId)
    expect(round2).toEqual([...round1].reverse())
  })

  it('is fully deterministic for a given seed', async () => {
    const [stateA, stateB] = await Promise.all([simulateDraft(2026), simulateDraft(2026)])
    expect(stateA.draft.picks.map((p) => p.playerId)).toEqual(stateB.draft.picks.map((p) => p.playerId))
    expect(stateA.rngCursor).toBe(stateB.rngCursor)
  })

  it('produces a different draft for a different seed', async () => {
    const [stateA, stateB] = await Promise.all([simulateDraft(1), simulateDraft(2)])
    expect(stateA.draft.picks.map((p) => p.playerId)).not.toEqual(stateB.draft.picks.map((p) => p.playerId))
  })

  it('has the WR-biased persona (Ace Delgado) draft relatively more WRs than the RB-biased persona (Gramps Renwick)', async () => {
    const state = await simulateDraft(42)
    const countByPosition = (managerName: string, position: string) => {
      const team = state.teams.find((t) => t.name === managerName)
      if (!team) throw new Error(`no team for ${managerName}`)
      return team.roster.filter((id) => state.players[id].positions.includes(position)).length
    }
    expect(countByPosition('Ace Delgado', 'WR')).toBeGreaterThan(countByPosition('Gramps Renwick', 'WR'))
    expect(countByPosition('Gramps Renwick', 'RB')).toBeGreaterThan(countByPosition('Ace Delgado', 'RB'))
  })
})
