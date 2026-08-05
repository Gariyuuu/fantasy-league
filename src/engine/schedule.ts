/**
 * Circle-method round robin, derived purely from team order + period —
 * nothing to store or replay. Pairings repeat every (teamCount - 1) weeks,
 * which comfortably covers a season without ever double-booking a team or
 * pairing it with itself. Fantasy scoring has no real home/away effect, so
 * pairing order stays fixed across repeats rather than alternating sides.
 */
export function roundRobinRounds(teamIds: string[]): [string, string][][] {
  const teams = teamIds.length % 2 === 0 ? [...teamIds] : [...teamIds, '__BYE__']
  const n = teams.length
  const rounds: [string, string][][] = []
  const arr = teams.slice()

  for (let r = 0; r < n - 1; r++) {
    const pairs: [string, string][] = []
    for (let i = 0; i < n / 2; i++) {
      const a = arr[i]
      const b = arr[n - 1 - i]
      if (a !== '__BYE__' && b !== '__BYE__') pairs.push([a, b])
    }
    rounds.push(pairs)
    const fixed = arr[0]
    const rest = arr.slice(1)
    rest.unshift(rest.pop() as string)
    arr.splice(0, arr.length, fixed, ...rest)
  }

  return rounds
}

/** 1-indexed period -> that week's [homeTeamId, awayTeamId] pairings. */
export function matchupsForPeriod(teamIds: string[], period: number): [string, string][] {
  const rounds = roundRobinRounds(teamIds)
  if (rounds.length === 0) return []
  return rounds[(period - 1) % rounds.length]
}
