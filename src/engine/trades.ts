import type { AIPersona, LeagueState, Player, TradeOffer, TradeResponse } from '../types'
import { exclusivePositionMinimums, projectedPoints, unmetPositionNeeds } from './valuation'

function sideValue(playerIds: string[], players: Record<string, Player>, weights: Record<string, number>): number {
  return playerIds.reduce((sum, id) => sum + (players[id] ? projectedPoints(players[id].projection, weights) : 0), 0)
}

function namesOf(playerIds: string[], players: Record<string, Player>): string {
  return playerIds.map((id) => players[id]?.name ?? 'that player').join(' and ')
}

/** Positions where this roster carries at least 2 more than its hard minimum — genuine bench surplus, not just "enough". */
function surplusPositions(roster: string[], players: Record<string, Player>, minimums: Record<string, number>): Set<string> {
  const counts: Record<string, number> = {}
  for (const id of roster) {
    for (const pos of players[id]?.positions ?? []) counts[pos] = (counts[pos] ?? 0) + 1
  }
  const surplus = new Set<string>()
  for (const [pos, min] of Object.entries(minimums)) {
    if ((counts[pos] ?? 0) >= min + 2) surplus.add(pos)
  }
  return surplus
}

/**
 * "Evaluates surplus vs. need, applies tradeGreed as a required value
 * premium" (spec). Value is neutral projected points; a team's own need
 * for a position boosts what it's willing to pay, and its own surplus at
 * a position discounts how much it minds giving pieces of it up. If the
 * gap is close, tries one sweetener (the other side's lowest-value
 * remaining player) before declining outright.
 */
export function evaluateTrade(offer: TradeOffer, state: LeagueState, persona: AIPersona): TradeResponse {
  const aiTeam = state.teams.find((t) => t.id === offer.toTeamId)
  const otherTeam = state.teams.find((t) => t.id === offer.fromTeamId)
  if (!aiTeam || !otherTeam) throw new Error('evaluateTrade: missing team for offer')

  const weights = state.config.scoringPresets[state.scoringPreset].weights
  const minimums = exclusivePositionMinimums(state.config)
  const needs = new Set(unmetPositionNeeds(aiTeam.roster, state.players, state.config))
  const surplus = surplusPositions(aiTeam.roster, state.players, minimums)

  // From the AI's (toTeam's) perspective: it receives `give`, gives up `receive`.
  const rawGetValue = sideValue(offer.give, state.players, weights)
  const rawGiveValue = sideValue(offer.receive, state.players, weights)

  const fillsNeed = offer.give.some((id) => state.players[id]?.positions.some((p) => needs.has(p)))
  const partingWithSurplus = offer.receive.every((id) => state.players[id]?.positions.some((p) => surplus.has(p)))

  const adjustedGetValue = rawGetValue * (fillsNeed ? 1.15 : 1)
  const adjustedGiveValue = rawGiveValue * (partingWithSurplus ? 0.9 : 1)
  const requiredValue = adjustedGiveValue * (1 + persona.tradeGreed)

  if (adjustedGetValue >= requiredValue) {
    return {
      tradeId: offer.id,
      decision: 'accept',
      reason: fillsNeed
        ? `Deal — ${namesOf(offer.give, state.players)} fills a real need for me.`
        : `Deal, I like the value on ${namesOf(offer.give, state.players)}.`,
    }
  }

  const gap = requiredValue - adjustedGetValue
  const sweetenerCandidates = otherTeam.roster
    .filter((id) => !offer.give.includes(id))
    .map((id) => ({ id, value: sideValue([id], state.players, weights) }))
    .filter((p) => p.value > 0)
    .sort((a, b) => a.value - b.value)
  const sweetener = sweetenerCandidates.find((p) => p.value <= gap * 1.5)

  if (sweetener && gap < adjustedGiveValue * 0.6) {
    return {
      tradeId: offer.id,
      decision: 'counter',
      reason: `Close, but I need more. Add ${state.players[sweetener.id]?.name ?? 'another piece'} and we have a deal.`,
      // Same give/receive convention as TradeOffer itself (give = from
      // fromTeam, receive = from toTeam): human gives the original
      // players plus the sweetener; the AI's side is unchanged.
      counterOffer: { give: [...offer.give, sweetener.id], receive: offer.receive },
    }
  }

  return {
    tradeId: offer.id,
    decision: 'decline',
    reason: `Pass — not enough coming back for ${namesOf(offer.receive, state.players)}.`,
  }
}
