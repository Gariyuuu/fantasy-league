import type { LeagueState } from '../../types'

interface Props {
  state: LeagueState
}

export function PlayoffBracketView({ state }: Props) {
  const rounds = state.playoffs ?? []
  if (rounds.length === 0) return null

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">Playoff Bracket</p>

      {state.phase === 'complete' && state.championTeamId && (
        <div className="mb-4 rounded-md border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-center">
          <p className="text-xs uppercase tracking-wide text-amber-400">🏆 Champion</p>
          <p className="text-lg font-bold text-amber-200">
            {(() => {
              const champ = state.teams.find((t) => t.id === state.championTeamId)
              return champ?.isHuman ? `${champ.name} (you)` : champ?.name
            })()}
          </p>
        </div>
      )}

      <div className="flex gap-6 overflow-x-auto">
        {rounds.map((round, roundIndex) => {
          const played = roundIndex < rounds.length - 1 || state.phase === 'complete'
          return (
            <div key={round.round} className="flex min-w-[220px] flex-col justify-center gap-4">
              <p className="text-center text-[11px] uppercase tracking-wide text-zinc-600">
                {round.matchups.length === 1 ? 'Championship' : `Round ${round.round}`}
              </p>
              {round.matchups.map((m, i) => {
                const home = state.teams.find((t) => t.id === m.homeTeamId)
                const away = state.teams.find((t) => t.id === m.awayTeamId)
                const homeWon = played && m.homeScore >= m.awayScore
                const awayWon = played && m.awayScore > m.homeScore
                return (
                  <div key={i} className="rounded-md border border-zinc-800 bg-zinc-950 p-2 text-sm">
                    <div
                      className={`flex justify-between px-1 py-1 ${homeWon ? 'font-semibold text-emerald-300' : 'text-zinc-400'}`}
                    >
                      <span>{home?.isHuman ? `${home.name} (you)` : home?.name}</span>
                      <span className="font-mono">{played ? m.homeScore.toFixed(1) : '–'}</span>
                    </div>
                    <div
                      className={`flex justify-between px-1 py-1 ${awayWon ? 'font-semibold text-emerald-300' : 'text-zinc-400'}`}
                    >
                      <span>{away?.isHuman ? `${away.name} (you)` : away?.name}</span>
                      <span className="font-mono">{played ? m.awayScore.toFixed(1) : '–'}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}
