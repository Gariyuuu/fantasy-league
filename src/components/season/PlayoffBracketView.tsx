import type { LeagueState } from '../../types'

interface Props {
  state: LeagueState
}

export function PlayoffBracketView({ state }: Props) {
  const rounds = state.playoffs ?? []
  if (rounds.length === 0) return null

  return (
    <div className="app-card p-4">
      <p className="mb-3 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-zinc-500">
        <span>🏆</span> Playoff Bracket
      </p>

      {state.phase === 'complete' && state.championTeamId && (
        <div className="mb-4 overflow-hidden rounded-xl border border-amber-400/40 bg-gradient-to-r from-amber-500/15 via-amber-400/10 to-amber-500/15 px-4 py-4 text-center shadow-lg shadow-amber-500/10">
          <p className="text-xs font-bold uppercase tracking-widest text-amber-400">🏆 Champion</p>
          <p className="mt-1 text-2xl font-black text-amber-200">
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
              <p className="text-center text-[11px] font-bold uppercase tracking-wide text-zinc-500">
                {round.matchups.length === 1 ? '🏆 Championship' : `Round ${round.round}`}
              </p>
              {round.matchups.map((m, i) => {
                const home = state.teams.find((t) => t.id === m.homeTeamId)
                const away = state.teams.find((t) => t.id === m.awayTeamId)
                const homeWon = played && m.homeScore >= m.awayScore
                const awayWon = played && m.awayScore > m.homeScore
                return (
                  <div key={i} className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-2.5 text-sm shadow-md">
                    <div
                      className={`flex justify-between rounded-md px-1.5 py-1 ${homeWon ? 'bg-emerald-500/10 font-bold text-emerald-300' : 'text-zinc-400'}`}
                    >
                      <span>{home?.isHuman ? `${home.name} (you)` : home?.name}</span>
                      <span className="font-mono">{played ? m.homeScore.toFixed(1) : '–'}</span>
                    </div>
                    <div
                      className={`flex justify-between rounded-md px-1.5 py-1 ${awayWon ? 'bg-emerald-500/10 font-bold text-emerald-300' : 'text-zinc-400'}`}
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
