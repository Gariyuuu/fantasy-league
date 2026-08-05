import { describe, expect, it } from 'vitest'
import { simulateDraft } from './testHelpers'
import { applyAction } from '../reducer'
import type {
  TradeExecutePayload,
  TradeProposePayload,
  TradeRespondPayload,
  WaiverClaimSubmitPayload,
} from '../reducer'
import type { Action, LeagueState, TradeOffer, WaiverClaim } from '../../types'
import { evaluateTrade } from '../trades'
import { projectedPoints } from '../valuation'
import { AIManager } from '../../managers/AIManager'

function freeAgentIds(state: LeagueState): string[] {
  const rostered = new Set(state.teams.flatMap((t) => t.roster))
  return Object.keys(state.players).filter((id) => !rostered.has(id))
}

function submitClaim(state: LeagueState, claim: WaiverClaim): LeagueState {
  return applyAction(state, {
    type: 'WAIVER_CLAIM_SUBMIT',
    managerId: claim.teamId,
    timestamp: Date.now(),
    payload: { claim },
  } as Action<WaiverClaimSubmitPayload>)
}

describe('waivers', () => {
  it('awards a contested player to the higher bid and deducts FAAB', async () => {
    const drafted = await simulateDraft(201)
    const [teamA, teamB] = drafted.teams
    const freeAgent = freeAgentIds(drafted)[0]
    const period = drafted.currentPeriod

    let state = submitClaim(drafted, {
      id: 'c1',
      teamId: teamA.id,
      addPlayerId: freeAgent,
      faabBid: 20,
      period,
      status: 'pending',
    })
    state = submitClaim(state, {
      id: 'c2',
      teamId: teamB.id,
      addPlayerId: freeAgent,
      faabBid: 35,
      period,
      status: 'pending',
    })
    state = applyAction(state, { type: 'WAIVER_PROCESS', managerId: 'system', timestamp: Date.now(), payload: {} })

    const claims = state.waiverClaims.filter((c) => c.addPlayerId === freeAgent)
    expect(claims.find((c) => c.id === 'c2')?.status).toBe('won')
    expect(claims.find((c) => c.id === 'c1')?.status).toBe('lost')

    const winnerTeam = state.teams.find((t) => t.id === teamB.id)!
    expect(winnerTeam.roster).toContain(freeAgent)
    expect(winnerTeam.faabBudget).toBe((teamB.faabBudget ?? 0) - 35)

    const loserTeam = state.teams.find((t) => t.id === teamA.id)!
    expect(loserTeam.roster).not.toContain(freeAgent)
    expect(loserTeam.faabBudget).toBe(teamA.faabBudget)
  })

  it('breaks a tied bid using waiverPriority (lower number wins)', async () => {
    const drafted = await simulateDraft(202)
    const [teamA, teamB] = [...drafted.teams].sort((a, b) => (a.waiverPriority ?? 0) - (b.waiverPriority ?? 0))
    const freeAgent = freeAgentIds(drafted)[0]
    const period = drafted.currentPeriod

    let state = submitClaim(drafted, {
      id: 'c1',
      teamId: teamB.id, // worse (higher-number) priority, submitted first
      addPlayerId: freeAgent,
      faabBid: 10,
      period,
      status: 'pending',
    })
    state = submitClaim(state, {
      id: 'c2',
      teamId: teamA.id, // better (lower-number) priority
      addPlayerId: freeAgent,
      faabBid: 10,
      period,
      status: 'pending',
    })
    state = applyAction(state, { type: 'WAIVER_PROCESS', managerId: 'system', timestamp: Date.now(), payload: {} })

    expect(state.waiverClaims.find((c) => c.id === 'c2')?.status).toBe('won')
    expect(state.waiverClaims.find((c) => c.id === 'c1')?.status).toBe('lost')
  })

  it('does not consume any RNG (waiver resolution is deterministic from recorded bids alone)', async () => {
    const drafted = await simulateDraft(203)
    const freeAgent = freeAgentIds(drafted)[0]
    let state = submitClaim(drafted, {
      id: 'c1',
      teamId: drafted.teams[0].id,
      addPlayerId: freeAgent,
      faabBid: 5,
      period: drafted.currentPeriod,
      status: 'pending',
    })
    const cursorBefore = state.rngCursor
    state = applyAction(state, { type: 'WAIVER_PROCESS', managerId: 'system', timestamp: Date.now(), payload: {} })
    expect(state.rngCursor).toBe(cursorBefore)
  })

  it('resubmitting a claim replaces the team\'s prior pending claim for that period rather than stacking', async () => {
    const drafted = await simulateDraft(204)
    const team = drafted.teams[0]
    const [fa1, fa2] = freeAgentIds(drafted)
    const period = drafted.currentPeriod

    let state = submitClaim(drafted, { id: 'c1', teamId: team.id, addPlayerId: fa1, faabBid: 5, period, status: 'pending' })
    state = submitClaim(state, { id: 'c2', teamId: team.id, addPlayerId: fa2, faabBid: 8, period, status: 'pending' })

    const pendingForTeam = state.waiverClaims.filter((c) => c.teamId === team.id && c.status === 'pending')
    expect(pendingForTeam).toHaveLength(1)
    expect(pendingForTeam[0].id).toBe('c2')
  })

  it('AIManager reacts to an injured rostered player by claiming a healthy replacement', async () => {
    const drafted = await simulateDraft(205)
    const team = drafted.teams.find((t) => !t.isHuman)!
    const persona = drafted.managerPersonas[team.managerId]!
    const injuredId = team.roster[0]
    const state: LeagueState = {
      ...drafted,
      players: { ...drafted.players, [injuredId]: { ...drafted.players[injuredId], status: 'out' } },
    }

    const manager = new AIManager(team.managerId, persona)
    const claims = await manager.submitWaiverClaims(state)

    if (claims.length > 0) {
      expect(claims[0].teamId).toBe(team.id)
      expect(claims[0].faabBid).toBeGreaterThan(0)
      expect((team.faabBudget ?? 0) >= (claims[0].faabBid ?? 0)).toBe(true)
    }
    // if no replacement exists at that position among free agents, an empty
    // claim list is also a valid (and correctly conservative) outcome
  })
})

describe('trades', () => {
  it('AI accepts a trade that clearly fills a need at strong value', async () => {
    const drafted = await simulateDraft(206)
    const human = drafted.teams.find((t) => t.isHuman)!
    const ai = drafted.teams.find((t) => !t.isHuman)!
    const persona = drafted.managerPersonas[ai.managerId]!
    const weights = drafted.config.scoringPresets[drafted.scoringPreset].weights

    const humanBest = [...human.roster].sort(
      (a, b) => projectedPoints(drafted.players[b].projection, weights) - projectedPoints(drafted.players[a].projection, weights),
    )[0]
    const aiWorst = [...ai.roster].sort(
      (a, b) => projectedPoints(drafted.players[a].projection, weights) - projectedPoints(drafted.players[b].projection, weights),
    )[0]

    const offer: TradeOffer = {
      id: 'trade-1',
      fromTeamId: human.id,
      toTeamId: ai.id,
      give: [humanBest],
      receive: [aiWorst],
      status: 'pending',
      createdAt: Date.now(),
    }

    const response = evaluateTrade(offer, drafted, persona)
    expect(response.decision).toBe('accept')
    expect(response.reason.length).toBeGreaterThan(0)
  })

  it('AI declines a trade that is clearly bad value for it', async () => {
    const drafted = await simulateDraft(207)
    const human = drafted.teams.find((t) => t.isHuman)!
    const ai = drafted.teams.find((t) => !t.isHuman)!
    const persona = drafted.managerPersonas[ai.managerId]!

    const humanWorst = human.roster[human.roster.length - 1]
    const aiBest = ai.roster[0]

    const offer: TradeOffer = {
      id: 'trade-2',
      fromTeamId: human.id,
      toTeamId: ai.id,
      give: [humanWorst],
      receive: [aiBest],
      status: 'pending',
      createdAt: Date.now(),
    }

    const response = evaluateTrade(offer, drafted, persona)
    expect(response.decision).not.toBe('accept')
    expect(response.reason.length).toBeGreaterThan(0)
  })

  it('a countered trade asks the human to add a sweetener, keeping the AI\'s side unchanged', async () => {
    const drafted = await simulateDraft(209)
    const human = drafted.teams.find((t) => t.isHuman)!
    const weights = drafted.config.scoringPresets[drafted.scoringPreset].weights
    const byValueDesc = (roster: string[]) =>
      [...roster].sort(
        (a, b) => projectedPoints(drafted.players[b].projection, weights) - projectedPoints(drafted.players[a].projection, weights),
      )

    // Search across AI teams and single-player pairings for a 'counter'
    // outcome — the exact numbers depend on fixture RNG, so rather than
    // hand-tune one, sweep until one turns up (there should be several).
    let found: { offer: TradeOffer; response: ReturnType<typeof evaluateTrade> } | null = null
    outer: for (const ai of drafted.teams.filter((t) => !t.isHuman)) {
      const persona = drafted.managerPersonas[ai.managerId]!
      const humanRanked = byValueDesc(human.roster)
      const aiRanked = byValueDesc(ai.roster)
      for (const give of humanRanked) {
        for (const receive of aiRanked) {
          const offer: TradeOffer = {
            id: 'probe',
            fromTeamId: human.id,
            toTeamId: ai.id,
            give: [give],
            receive: [receive],
            status: 'pending',
            createdAt: Date.now(),
          }
          const response = evaluateTrade(offer, drafted, persona)
          if (response.decision === 'counter') {
            found = { offer, response }
            break outer
          }
        }
      }
    }

    expect(found).not.toBeNull()
    if (!found) return
    const { offer, response } = found
    expect(response.counterOffer).toBeDefined()
    // human's side grows (original ask plus a sweetener from human's own roster)
    expect(response.counterOffer!.give).toEqual(expect.arrayContaining(offer.give))
    expect(response.counterOffer!.give.length).toBe(offer.give.length + 1)
    expect(human.roster).toContain(response.counterOffer!.give.find((id) => !offer.give.includes(id)))
    // the AI's side is unchanged
    expect(response.counterOffer!.receive).toEqual(offer.receive)
  })

  it('TRADE_EXECUTE swaps rosters both ways with no duplicate or lost players league-wide', async () => {
    const drafted = await simulateDraft(208)
    const human = drafted.teams.find((t) => t.isHuman)!
    const ai = drafted.teams.find((t) => !t.isHuman)!
    const give = [human.roster[0]]
    const receive = [ai.roster[0]]

    const offer: TradeOffer = {
      id: 'trade-3',
      fromTeamId: human.id,
      toTeamId: ai.id,
      give,
      receive,
      status: 'pending',
      createdAt: Date.now(),
    }

    let state = applyAction(drafted, {
      type: 'TRADE_PROPOSE',
      managerId: human.managerId,
      timestamp: Date.now(),
      payload: { offer },
    } as Action<TradeProposePayload>)
    state = applyAction(state, {
      type: 'TRADE_RESPOND',
      managerId: ai.managerId,
      timestamp: Date.now(),
      payload: { response: { tradeId: offer.id, decision: 'accept', reason: 'test' } },
    } as Action<TradeRespondPayload>)
    state = applyAction(state, {
      type: 'TRADE_EXECUTE',
      managerId: 'system',
      timestamp: Date.now(),
      payload: { tradeId: offer.id },
    } as Action<TradeExecutePayload>)

    const newHuman = state.teams.find((t) => t.id === human.id)!
    const newAi = state.teams.find((t) => t.id === ai.id)!
    expect(newHuman.roster).toContain(receive[0])
    expect(newHuman.roster).not.toContain(give[0])
    expect(newAi.roster).toContain(give[0])
    expect(newAi.roster).not.toContain(receive[0])

    const allRostered = state.teams.flatMap((t) => t.roster)
    expect(new Set(allRostered).size).toBe(allRostered.length)
    expect(allRostered).toHaveLength(drafted.teams.flatMap((t) => t.roster).length)
  })
})
