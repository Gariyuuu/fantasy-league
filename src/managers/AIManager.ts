import type { AIPersona, LeagueState, Lineup, Manager, Period, Pick, TradeOffer, TradeResponse, WaiverClaim } from '../types'
import { draftRounds, roundForOverall } from '../engine/draft'
import { buildOptimalLineup, requiredLineupDraws } from '../engine/lineup'
import { buildSalaryCapLineup, requiredSalaryCapDraws } from '../engine/salaryCap'
import { drawUniform } from '../engine/rng'
import { evaluateTrade } from '../engine/trades'
import {
  choosePersonaPick,
  detectPositionRuns,
  projectedPoints,
  rankAvailablePlayers,
  shortlistDrawCount,
  unmetPositionNeeds,
} from '../engine/valuation'

/**
 * Value-based drafting distorted by this manager's persona. All randomness
 * is drawn from the league's seeded RNG at its current cursor — a pure
 * read, never mutated here — so the same seed/action-log replay always
 * reproduces the same pick.
 */
export class AIManager implements Manager {
  readonly id: string
  private readonly persona: AIPersona

  constructor(id: string, persona: AIPersona) {
    this.id = id
    this.persona = persona
  }

  async makeDraftPick(state: LeagueState): Promise<Pick> {
    const team = state.teams.find((t) => t.managerId === this.id)
    if (!team) throw new Error(`AIManager ${this.id}: no team found in league state`)

    const weights = state.config.scoringPresets[state.scoringPreset].weights
    const draftedIds = new Set(state.draft.picks.map((p) => p.playerId))
    const ranked = rankAvailablePlayers(Object.values(state.players), draftedIds, weights)
    if (ranked.length === 0) throw new Error(`AIManager ${this.id}: no players left to draft`)

    // Draw count is always sized off the full pool, regardless of the
    // need-filter below, so the caller's independent rngCursor accounting
    // (shortlistDrawCount off the same unfiltered pool) never drifts out
    // of sync with what this call actually consumes.
    const draws = shortlistDrawCount(ranked.length)
    const { values } = drawUniform(state.seed, state.rngCursor, draws)

    const rounds = draftRounds(state.config)
    const roundsRemaining = rounds - team.roster.length
    const needs = unmetPositionNeeds(team.roster, state.players, state.config)
    const mustFillNow = needs.length > 0 && needs.length >= roundsRemaining
    const pool = mustFillNow ? ranked.filter((r) => r.player.positions.some((pos) => needs.includes(pos))) : ranked

    const runIntensity = detectPositionRuns(state.draft.picks, state.players)
    const { player } = choosePersonaPick(
      pool.length > 0 ? pool : ranked,
      this.persona,
      state.difficulty,
      runIntensity,
      weights,
      values,
    )

    return {
      round: roundForOverall(state.draft.currentOverall, state.draft.order.length),
      overall: state.draft.currentOverall,
      teamId: team.id,
      playerId: player.id,
      timestamp: Date.now(),
    }
  }

  async setLineup(state: LeagueState, period: Period): Promise<Lineup> {
    const team = state.teams.find((t) => t.managerId === this.id)
    if (!team) throw new Error(`AIManager ${this.id}: no team found in league state`)

    const weights = state.config.scoringPresets[state.scoringPreset].weights

    if (state.config.engine === 'salaryCapField') {
      // No pre-existing roster to pick from — the field is selected fresh
      // from the whole player pool each event, under the salary cap.
      const pool = Object.values(state.players)
      const draws = requiredSalaryCapDraws(pool.length)
      const { values } = drawUniform(state.seed, state.rngCursor, draws)
      return buildSalaryCapLineup(pool, state.config, weights, period, team.id, state.difficulty, values)
    }

    const draws = requiredLineupDraws(state.config)
    const { values } = drawUniform(state.seed, state.rngCursor, draws)
    return buildOptimalLineup(team, state.players, state.config, weights, period, state.difficulty, values)
  }

  async respondToTrade(offer: TradeOffer, state: LeagueState): Promise<TradeResponse> {
    return evaluateTrade(offer, state, this.persona)
  }

  /**
   * "Reacts to injuries and hot streaks, bids proportional to
   * waiverActivity" (spec). Injury reaction is direct — Player.status
   * drives it. Fixtures don't carry in-season performance trends for
   * currently-unrostered players (they only accumulate stat lines once
   * rostered), so "hot streak" is approximated by best-projected
   * available replacement rather than actual recent form — an honest
   * simplification given what the data supports.
   */
  async submitWaiverClaims(state: LeagueState): Promise<WaiverClaim[]> {
    const team = state.teams.find((t) => t.managerId === this.id)
    if (!team) throw new Error(`AIManager ${this.id}: no team found in league state`)

    const weights = state.config.scoringPresets[state.scoringPreset].weights
    const rosteredIds = new Set(state.teams.flatMap((t) => t.roster))
    const freeAgents = Object.values(state.players).filter((p) => !rosteredIds.has(p.id))

    const weakest = team.roster
      .map((id) => state.players[id])
      .filter((p) => p !== undefined)
      .sort((a, b) => {
        const aInactive = a.status && a.status !== 'active' ? 1 : 0
        const bInactive = b.status && b.status !== 'active' ? 1 : 0
        if (aInactive !== bInactive) return bInactive - aInactive
        return projectedPoints(a.projection, weights) - projectedPoints(b.projection, weights)
      })[0]
    if (!weakest) return []

    const replacement = freeAgents
      .filter((p) => p.positions.some((pos) => weakest.positions.includes(pos)))
      .sort((a, b) => projectedPoints(b.projection, weights) - projectedPoints(a.projection, weights))[0]
    if (!replacement) return []

    const weakestValue = projectedPoints(weakest.projection, weights)
    const replacementValue = projectedPoints(replacement.projection, weights)
    const isWorthClaiming = weakest.status !== 'active' || replacementValue > weakestValue * 1.1
    if (!isWorthClaiming) return []

    const budget = team.faabBudget ?? 0
    const upside = Math.min(1, (replacementValue - weakestValue) / 10)
    const bid = Math.min(budget, Math.max(1, Math.round(budget * this.persona.waiverActivity * (0.3 + upside))))
    if (bid <= 0) return []

    return [
      {
        id: `waiver-${team.id}-${state.currentPeriod}`,
        teamId: team.id,
        addPlayerId: replacement.id,
        dropPlayerId: weakest.id,
        faabBid: bid,
        period: state.currentPeriod,
        status: 'pending',
      },
    ]
  }
}
