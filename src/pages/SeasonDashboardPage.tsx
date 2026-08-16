import { useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useLeagueStore } from '../store/useLeagueStore'
import { LeagueNav } from '../components/LeagueNav'
import { StandingsTable } from '../components/season/StandingsTable'
import { MatchupResults } from '../components/season/MatchupResults'
import { PlayoffBracketView } from '../components/season/PlayoffBracketView'
import { draftRounds } from '../engine/draft'
import { LeagueBackdrop } from '../components/LeagueBackdrop'
import { LiveScoresTicker } from '../components/LiveScoresTicker'
import { LoadingLeague } from '../components/LoadingLeague'
import { ThinkingOrb } from 'thinking-orbs'

export function SeasonDashboardPage() {
  const { leagueId } = useParams<{ leagueId: string }>()
  const state = useLeagueStore((s) => s.state)
  const loadLeague = useLeagueStore((s) => s.loadLeague)
  const advanceWeek = useLeagueStore((s) => s.advanceWeek)
  const isAdvancingWeek = useLeagueStore((s) => s.isAdvancingWeek)

  useEffect(() => {
    if (leagueId && state?.id !== leagueId) {
      void loadLeague(leagueId)
    }
  }, [leagueId, state?.id, loadLeague])

  if (!state || state.id !== leagueId) {
    return <LoadingLeague />
  }

  const humanTeam = state.teams.find((t) => t.isHuman)
  const isPlayoffs = state.phase === 'playoffs'
  const isComplete = state.phase === 'complete'
  const isCumulative = state.config.engine !== 'headToHead'
  const lastPlayedPeriod = state.currentPeriod - 1

  const currentBracketRound = state.playoffs?.[state.playoffs.length - 1]
  const humanIsAlive =
    !isPlayoffs || !currentBracketRound || !humanTeam
      ? true
      : currentBracketRound.matchups.some((m) => m.homeTeamId === humanTeam.id || m.awayTeamId === humanTeam.id)

  const statusLabel = isComplete
    ? 'Season complete.'
    : isPlayoffs
      ? `Playoffs — Round ${currentBracketRound?.round ?? 1}${humanTeam && !humanIsAlive ? '. Your season is over — follow the bracket below.' : ''}`
      : `Set your lineup, then advance the ${state.config.season.periodLabel.toLowerCase()} to see how it plays out.`

  return (
    <LeagueBackdrop sport={state.sport} className="p-6">
      <div className="mx-auto max-w-5xl space-y-4">
        <LeagueNav state={state} />

        <LiveScoresTicker sport={state.sport} />

        <div className="app-card flex items-center justify-between px-6 py-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-zinc-500">
              {isPlayoffs || isComplete
                ? `${state.config.season.periodLabel} ${Math.min(state.currentPeriod, state.config.season.totalPeriods)}`
                : `${state.config.season.periodLabel} ${state.currentPeriod} of ${state.config.season.totalPeriods}`}
            </p>
            <p className="mt-1 text-zinc-300">{statusLabel}</p>
          </div>
          <div className="flex gap-2">
            {humanTeam && !isComplete && humanIsAlive && (
              <Link
                to={`/league/${state.id}/${state.config.engine === 'salaryCapField' ? 'event' : 'lineup'}`}
                className="btn-secondary text-sm"
              >
                {state.config.engine === 'salaryCapField' ? 'Set Field' : 'Edit Lineup'}
              </Link>
            )}
            {!isComplete && (
              <button
                type="button"
                disabled={isAdvancingWeek}
                onClick={() => void advanceWeek()}
                className="btn-primary flex items-center gap-2 text-sm"
              >
                {isAdvancingWeek && <ThinkingOrb state="solving" size={20} aria-label="Simulating" />}
                {isAdvancingWeek ? 'Simulating…' : isPlayoffs ? 'Play Round' : `Advance ${state.config.season.periodLabel} ${state.currentPeriod}`}
              </button>
            )}
          </div>
        </div>

        {(isPlayoffs || isComplete) && <PlayoffBracketView state={state} />}

        {isCumulative ? (
          <StandingsTable state={state} />
        ) : (
          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-7">
              <StandingsTable state={state} />
            </div>
            <div className="col-span-5">
              {lastPlayedPeriod >= 1 ? (
                <MatchupResults state={state} period={lastPlayedPeriod} />
              ) : (
                <div className="app-card p-4 text-xs text-zinc-600">
                  No {state.config.season.periodLabel.toLowerCase()}s played yet.
                </div>
              )}
            </div>
          </div>
        )}

        <p className="text-xs text-zinc-600">
          {isCumulative
            ? `Cumulative leaderboard — every ${state.config.season.periodLabel.toLowerCase()}'s score adds to your season total, no opponents.`
            : `${draftRounds(state.config)}-player rosters · lineups lock when you advance the ${state.config.season.periodLabel.toLowerCase()} (per-player game-time locks aren't modeled — fixtures don't carry individual kickoff times).`}
          {state.config.playoffs &&
            ` Top ${state.config.playoffs.teamCount} make the playoffs; standings freeze once the bracket starts.`}
        </p>
      </div>
    </LeagueBackdrop>
  )
}
