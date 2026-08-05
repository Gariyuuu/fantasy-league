import type { Matchup, PlayoffBracket, SportConfig, StandingsEntry } from '../types'

export function regularSeasonWeeks(config: SportConfig): number {
  return config.season.totalPeriods - (config.playoffs?.weeks ?? 0)
}

/** Standard bracket seeding from final regular-season standings: 1 vs N, 2 vs N-1, etc. teamCount must be a power of 2. */
export function seedPlayoffBracket(standings: StandingsEntry[], teamCount: number): [string, string][] {
  const seeds = standings.slice(0, teamCount).map((s) => s.teamId)
  const pairings: [string, string][] = []
  for (let i = 0; i < seeds.length / 2; i++) {
    pairings.push([seeds[i], seeds[seeds.length - 1 - i]])
  }
  return pairings
}

/**
 * Higher score wins. A tie is astronomically unlikely with continuous
 * fantasy scoring — the home team winning on a tie is a documented
 * fallback, not a real tiebreak system.
 */
export function matchWinner(matchup: Matchup): string {
  return matchup.awayScore > matchup.homeScore ? matchup.awayTeamId : matchup.homeTeamId
}

/** Winners of adjacent matchups meet in the next round — standard single-elimination progression. */
export function nextRoundPairings(round: PlayoffBracket): [string, string][] {
  const winners = round.matchups.map(matchWinner)
  const pairings: [string, string][] = []
  for (let i = 0; i < winners.length / 2; i++) {
    pairings.push([winners[i * 2], winners[i * 2 + 1]])
  }
  return pairings
}

export function buildBracketRound(round: number, period: number, pairings: [string, string][]): PlayoffBracket {
  return {
    round,
    matchups: pairings.map(([homeTeamId, awayTeamId]) => ({
      period,
      homeTeamId,
      awayTeamId,
      homeScore: 0,
      awayScore: 0,
    })),
  }
}
