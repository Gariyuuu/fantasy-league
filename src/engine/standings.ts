import type { Matchup, StandingsEntry, Team } from '../types'

const round1 = (n: number) => Math.round(n * 10) / 10

/** Recomputed fresh from the full matchup history each time — never stored incrementally, so there's nothing to drift out of sync. */
export function computeStandings(teams: Team[], matchups: Matchup[]): StandingsEntry[] {
  const records = new Map(
    teams.map((team) => [team.id, { wins: 0, losses: 0, ties: 0, pointsFor: 0, pointsAgainst: 0 }]),
  )

  for (const m of matchups) {
    const home = records.get(m.homeTeamId)
    const away = records.get(m.awayTeamId)
    if (!home || !away) continue

    home.pointsFor += m.homeScore
    home.pointsAgainst += m.awayScore
    away.pointsFor += m.awayScore
    away.pointsAgainst += m.homeScore

    if (m.homeScore > m.awayScore) {
      home.wins += 1
      away.losses += 1
    } else if (m.homeScore < m.awayScore) {
      away.wins += 1
      home.losses += 1
    } else {
      home.ties += 1
      away.ties += 1
    }
  }

  const entries: StandingsEntry[] = teams.map((team) => {
    const r = records.get(team.id)
    if (!r) throw new Error(`computeStandings: no record for team "${team.id}"`)
    return {
      teamId: team.id,
      rank: 0,
      wins: r.wins,
      losses: r.losses,
      ties: r.ties,
      pointsFor: round1(r.pointsFor),
      pointsAgainst: round1(r.pointsAgainst),
    }
  })

  entries.sort((a, b) => (b.wins ?? 0) - (a.wins ?? 0) || b.pointsFor - a.pointsFor)
  entries.forEach((entry, i) => {
    entry.rank = i + 1
  })
  return entries
}

/**
 * Engines B and C have no opponent, so there's no win/loss/tie or
 * points-against to compute — just a pure leaderboard on each team's
 * cumulative `points` (daily rolling total, or event-by-event total).
 */
export function computeCumulativeStandings(teams: Team[]): StandingsEntry[] {
  const entries: StandingsEntry[] = teams.map((team) => ({
    teamId: team.id,
    rank: 0,
    pointsFor: round1(team.points),
  }))
  entries.sort((a, b) => b.pointsFor - a.pointsFor)
  entries.forEach((entry, i) => {
    entry.rank = i + 1
  })
  return entries
}
