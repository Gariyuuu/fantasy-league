import type { LeagueState, Team, WaiverClaim } from '../types'

export interface WaiverProcessResult {
  teams: Team[]
  claims: WaiverClaim[]
}

/**
 * Resolves every pending claim tagged for `state.currentPeriod` in one
 * batch (the standard FAAB model: claims accumulate through the week,
 * then get processed together). Highest bid wins a contested player;
 * waiverPriority (lower = higher priority) breaks ties. Purely a function
 * of already-recorded claims — no RNG, so nothing to charge against
 * rngCursor.
 */
export function processWaivers(state: LeagueState): WaiverProcessResult {
  const pending = state.waiverClaims.filter((c) => c.status === 'pending' && c.period === state.currentPeriod)
  if (pending.length === 0) return { teams: state.teams, claims: state.waiverClaims }

  const priorityByTeam = new Map(state.teams.map((t) => [t.id, t.waiverPriority ?? Number.MAX_SAFE_INTEGER]))
  const byPlayer = new Map<string, WaiverClaim[]>()
  for (const claim of pending) {
    const list = byPlayer.get(claim.addPlayerId) ?? []
    list.push(claim)
    byPlayer.set(claim.addPlayerId, list)
  }

  const resolved = new Map<string, WaiverClaim['status']>()
  const winners: WaiverClaim[] = []

  for (const claims of byPlayer.values()) {
    const sorted = [...claims].sort((a, b) => {
      const bidDiff = (b.faabBid ?? 0) - (a.faabBid ?? 0)
      if (bidDiff !== 0) return bidDiff
      return (priorityByTeam.get(a.teamId) ?? 0) - (priorityByTeam.get(b.teamId) ?? 0)
    })
    const [winner, ...losers] = sorted
    resolved.set(winner.id, 'won')
    winners.push(winner)
    for (const loser of losers) resolved.set(loser.id, 'lost')
  }

  let teams = state.teams
  for (const winner of winners) {
    teams = teams.map((team) => {
      if (team.id !== winner.teamId) return team
      const roster = team.roster.filter((id) => id !== winner.dropPlayerId).concat(winner.addPlayerId)
      const faabBudget = Math.max(0, (team.faabBudget ?? 0) - (winner.faabBid ?? 0))
      return { ...team, roster, faabBudget }
    })
  }

  const claims = state.waiverClaims.map((claim) => {
    const status = resolved.get(claim.id)
    return status ? { ...claim, status } : claim
  })

  return { teams, claims }
}
