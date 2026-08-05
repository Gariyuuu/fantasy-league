import type { LeagueState } from '../../types'

interface Props {
  state: LeagueState
  period: number
}

export function MatchupResults({ state, period }: Props) {
  const matchups = state.matchups.filter((m) => m.period === period)

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900">
      <div className="border-b border-zinc-800 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
        Week {period} results
      </div>
      <div className="divide-y divide-zinc-800/50">
        {matchups.length === 0 && <p className="p-3 text-xs text-zinc-600">Not played yet.</p>}
        {matchups.map((m, i) => {
          const home = state.teams.find((t) => t.id === m.homeTeamId)
          const away = state.teams.find((t) => t.id === m.awayTeamId)
          const homeWon = m.homeScore > m.awayScore
          const awayWon = m.awayScore > m.homeScore
          return (
            <div key={i} className="flex items-center justify-between px-3 py-2 text-sm">
              <span className={`flex-1 truncate ${homeWon ? 'font-semibold text-zinc-100' : 'text-zinc-400'}`}>
                {home?.isHuman ? `${home.name} (you)` : home?.name}
              </span>
              <span className={`w-14 text-right font-mono ${homeWon ? 'text-emerald-400' : 'text-zinc-400'}`}>
                {m.homeScore.toFixed(1)}
              </span>
              <span className="mx-2 text-zinc-700">–</span>
              <span className={`w-14 font-mono ${awayWon ? 'text-emerald-400' : 'text-zinc-400'}`}>
                {m.awayScore.toFixed(1)}
              </span>
              <span className={`flex-1 truncate text-right ${awayWon ? 'font-semibold text-zinc-100' : 'text-zinc-400'}`}>
                {away?.isHuman ? `${away.name} (you)` : away?.name}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
