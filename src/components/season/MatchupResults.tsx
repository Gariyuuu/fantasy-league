import type { LeagueState } from '../../types'

interface Props {
  state: LeagueState
  period: number
}

export function MatchupResults({ state, period }: Props) {
  const matchups = state.matchups.filter((m) => m.period === period)

  return (
    <div className="app-card">
      <div className="border-b border-zinc-800/80 px-3.5 py-2.5 text-xs font-bold uppercase tracking-wide text-zinc-500">
        {state.config.season.periodLabel} {period} results
      </div>
      <div className="divide-y divide-zinc-800/50">
        {matchups.length === 0 && <p className="p-3 text-xs text-zinc-600">Not played yet.</p>}
        {matchups.map((m, i) => {
          const home = state.teams.find((t) => t.id === m.homeTeamId)
          const away = state.teams.find((t) => t.id === m.awayTeamId)
          const homeWon = m.homeScore > m.awayScore
          const awayWon = m.awayScore > m.homeScore
          return (
            <div
              key={i}
              className={`flex items-center justify-between px-3.5 py-2.5 text-sm ${(home?.isHuman || away?.isHuman) ? 'bg-emerald-500/[0.04]' : ''}`}
            >
              <span className={`flex-1 truncate ${homeWon ? 'font-bold text-zinc-100' : 'text-zinc-400'}`}>
                {home?.isHuman ? `${home.name} (you)` : home?.name}
              </span>
              {/* The winning score was emerald and the losing one zinc, which is
                  a hue difference doing the whole job. The ▲ marker from the
                  numerics layer says the same thing without colour, and the
                  screen-reader text says it in words. */}
              <span
                className={`delta stat-number w-16 justify-end text-right ${homeWon ? 'text-emerald-400' : 'text-zinc-500'}`}
                data-dir={homeWon ? 'up' : awayWon ? 'flat' : 'flat'}
                data-cue={homeWon ? undefined : 'none'}
              >
                <span aria-hidden="true">{m.homeScore.toFixed(1)}</span>
                <span className="sr-only">
                  {home?.name} scored {m.homeScore.toFixed(1)}
                  {homeWon ? ', winner' : ''}
                </span>
              </span>
              <span className="mx-2 text-zinc-700" aria-hidden="true">–</span>
              <span
                className={`delta stat-number w-16 ${awayWon ? 'text-emerald-400' : 'text-zinc-500'}`}
                data-dir={awayWon ? 'up' : 'flat'}
                data-cue={awayWon ? undefined : 'none'}
              >
                <span aria-hidden="true">{m.awayScore.toFixed(1)}</span>
                <span className="sr-only">
                  {away?.name} scored {m.awayScore.toFixed(1)}
                  {awayWon ? ', winner' : ''}
                </span>
              </span>
              <span className={`flex-1 truncate text-right ${awayWon ? 'font-bold text-zinc-100' : 'text-zinc-400'}`}>
                {away?.isHuman ? `${away.name} (you)` : away?.name}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
