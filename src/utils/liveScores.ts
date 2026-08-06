import type { SportId } from '../types'

/**
 * ESPN's unofficial site API (site.api.espn.com) — free, no signup, CORS-enabled.
 * Undocumented and unsupported by ESPN, so every call is defensive: a bad
 * response just means "no live scores right now," never a broken page.
 */
const ESPN_PATH: Record<SportId, string> = {
  nfl: 'football/nfl',
  cfb: 'football/college-football',
  epl: 'soccer/eng.1',
  mlb: 'baseball/mlb',
  wnba: 'basketball/wnba',
  nba: 'basketball/nba',
  mls: 'soccer/usa.1',
  pga: 'golf/pga',
  tennis: 'tennis/atp',
  nascar: 'racing/nascar-premier',
}

/** Team-vs-team sports render a matchup list; individual sports render a leaderboard. */
const LEADERBOARD_SPORTS = new Set<SportId>(['pga', 'tennis', 'nascar'])

export interface LiveMatchup {
  id: string
  statusDetail: string
  isLive: boolean
  homeTeam: string
  awayTeam: string
  homeScore: string
  awayScore: string
}

export interface LiveLeaderboardEvent {
  id: string
  name: string
  statusDetail: string
  isLive: boolean
  topCompetitors: { name: string; score: string }[]
}

export type LiveScoresResult =
  | { kind: 'matchups'; events: LiveMatchup[] }
  | { kind: 'leaderboard'; events: LiveLeaderboardEvent[] }

export async function fetchLiveScores(sport: SportId): Promise<LiveScoresResult> {
  const path = ESPN_PATH[sport]
  const res = await fetch(`https://site.api.espn.com/apis/site/v2/sports/${path}/scoreboard`)
  if (!res.ok) throw new Error(`ESPN scoreboard request failed: ${res.status}`)
  const data = await res.json()
  const rawEvents: unknown[] = Array.isArray(data.events) ? data.events : []

  if (LEADERBOARD_SPORTS.has(sport)) {
    const events: LiveLeaderboardEvent[] = rawEvents.map((raw) => {
      const ev = raw as Record<string, any>
      const status = ev.status?.type ?? {}
      const competitors = ev.competitions?.[0]?.competitors ?? []
      const topCompetitors = competitors
        .slice(0, 3)
        .map((c: any) => ({ name: c.athlete?.displayName ?? 'Unknown', score: c.score ?? '—' }))
      return {
        id: String(ev.id ?? ev.name),
        name: ev.name ?? 'Event',
        statusDetail: status.shortDetail ?? status.description ?? '',
        isLive: status.state === 'in',
        topCompetitors,
      }
    })
    return { kind: 'leaderboard', events }
  }

  const events: LiveMatchup[] = rawEvents.map((raw) => {
    const ev = raw as Record<string, any>
    const status = ev.status?.type ?? {}
    const competitors = ev.competitions?.[0]?.competitors ?? []
    const home = competitors.find((c: any) => c.homeAway === 'home')
    const away = competitors.find((c: any) => c.homeAway === 'away')
    return {
      id: String(ev.id ?? ev.name),
      statusDetail: status.shortDetail ?? status.description ?? '',
      isLive: status.state === 'in',
      homeTeam: home?.team?.shortDisplayName ?? home?.team?.displayName ?? '—',
      awayTeam: away?.team?.shortDisplayName ?? away?.team?.displayName ?? '—',
      homeScore: home?.score ?? '',
      awayScore: away?.score ?? '',
    }
  })
  return { kind: 'matchups', events }
}
