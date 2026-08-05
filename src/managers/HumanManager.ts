import type { LeagueState, Lineup, Manager, Period, Pick, TradeOffer, TradeResponse, WaiverClaim } from '../types'
import { roundForOverall } from '../engine/draft'

/**
 * Resolves from UI input via a pending promise the store fulfills when the
 * human acts. In v2, RemoteManager will resolve the same way from a
 * websocket message — this is the seam that makes that swap possible.
 *
 * In practice, the lineup editor UI dispatches LINEUP_SET directly through
 * the store rather than routing through setLineup()/submitLineup() below —
 * lineup edits aren't turn-based like a draft pick, so there's no "your
 * turn" moment to gate on. The pending-promise path still exists so the
 * Manager interface stays uniformly usable (e.g. tests or future
 * orchestration that treats all managers the same way).
 */
export class HumanManager implements Manager {
  readonly id: string
  private pendingDraftPick: { state: LeagueState; resolve: (pick: Pick) => void } | null = null
  private pendingLineup: { state: LeagueState; period: Period; resolve: (lineup: Lineup) => void } | null = null
  private pendingTradeResponse: Map<string, (response: TradeResponse) => void> = new Map()
  private pendingWaiverClaims: { state: LeagueState; resolve: (claims: WaiverClaim[]) => void } | null = null

  constructor(id: string) {
    this.id = id
  }

  makeDraftPick(state: LeagueState): Promise<Pick> {
    return new Promise((resolve) => {
      this.pendingDraftPick = { state, resolve }
    })
  }

  /** Called by the UI when the human clicks a player card. False if there's nothing pending (e.g. a stale click after a timeout autopick already fired). */
  submitDraftPick(playerId: string): boolean {
    if (!this.pendingDraftPick) return false
    const { state, resolve } = this.pendingDraftPick
    this.pendingDraftPick = null
    const team = state.teams.find((t) => t.managerId === this.id)
    if (!team) throw new Error(`HumanManager ${this.id}: no team found in league state`)
    resolve({
      round: roundForOverall(state.draft.currentOverall, state.draft.order.length),
      overall: state.draft.currentOverall,
      teamId: team.id,
      playerId,
      timestamp: Date.now(),
    })
    return true
  }

  /** Clears a pending pick without resolving it — used when a clock timeout preempts the human's turn. */
  cancelPendingDraftPick(): void {
    this.pendingDraftPick = null
  }

  setLineup(state: LeagueState, period: Period): Promise<Lineup> {
    return new Promise((resolve) => {
      this.pendingLineup = { state, period, resolve }
    })
  }

  /** Called when the human confirms a lineup via the pending-promise path (see class doc — the main UI bypasses this). */
  submitLineup(entries: Lineup['entries']): boolean {
    if (!this.pendingLineup) return false
    const { state, period, resolve } = this.pendingLineup
    this.pendingLineup = null
    const team = state.teams.find((t) => t.managerId === this.id)
    if (!team) throw new Error(`HumanManager ${this.id}: no team found in league state`)
    resolve({ teamId: team.id, period, entries })
    return true
  }

  /**
   * v1 never actually calls this: the spec has trades flow one direction
   * (human proposes, AI evaluates), so nothing in this build has an AI
   * propose a trade *to* the human. Implemented anyway, via the same
   * pending-promise pattern as everything else, so the Manager interface
   * stays uniformly correct — v2 AI-initiated trades or a generic
   * "ask every manager" orchestration would just work.
   */
  respondToTrade(offer: TradeOffer): Promise<TradeResponse> {
    return new Promise((resolve) => {
      this.pendingTradeResponse.set(offer.id, resolve)
    })
  }

  /** Called when the human responds via the pending-promise path (see respondToTrade doc — unused by v1's UI). */
  submitTradeResponse(response: TradeResponse): boolean {
    const resolve = this.pendingTradeResponse.get(response.tradeId)
    if (!resolve) return false
    this.pendingTradeResponse.delete(response.tradeId)
    resolve(response)
    return true
  }

  /** The waivers UI dispatches WAIVER_CLAIM_SUBMIT directly through the store (see class doc) — this path is unused by v1's UI but keeps the interface uniform. */
  submitWaiverClaims(state: LeagueState): Promise<WaiverClaim[]> {
    return new Promise((resolve) => {
      this.pendingWaiverClaims = { state, resolve }
    })
  }

  submitWaiverClaimsResponse(claims: WaiverClaim[]): boolean {
    if (!this.pendingWaiverClaims) return false
    const { resolve } = this.pendingWaiverClaims
    this.pendingWaiverClaims = null
    resolve(claims)
    return true
  }
}
