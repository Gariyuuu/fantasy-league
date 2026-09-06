import type { LeagueState } from '../../types'

interface Props {
  state: LeagueState
}

const RANK_MEDALS = ['🥇', '🥈', '🥉']

export function StandingsTable({ state }: Props) {
  const isCumulative = state.config.engine !== 'headToHead'
  const colSpan = isCumulative ? 3 : 7

  return (
    <div className="app-card overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-800/80 text-left text-xs font-bold uppercase tracking-wide text-zinc-500">
            <th scope="col" className="px-3 py-2.5">#</th>
            <th scope="col" className="px-3 py-2.5">Team</th>
            {isCumulative ? (
              <th scope="col" className="num-col px-3 py-2.5">Points</th>
            ) : (
              <>
                {/* Single-letter headings are unreadable to a screen reader on
                    their own; the abbreviation carries the expansion. */}
                <th scope="col" className="num-col px-3 py-2.5"><abbr title="Wins">W</abbr></th>
                <th scope="col" className="num-col px-3 py-2.5"><abbr title="Losses">L</abbr></th>
                <th scope="col" className="num-col px-3 py-2.5"><abbr title="Ties">T</abbr></th>
                <th scope="col" className="num-col px-3 py-2.5"><abbr title="Points for">PF</abbr></th>
                <th scope="col" className="num-col px-3 py-2.5"><abbr title="Points against">PA</abbr></th>
              </>
            )}
          </tr>
        </thead>
        <tbody>
          {state.standings.map((entry) => {
            const team = state.teams.find((t) => t.id === entry.teamId)
            if (!team) return null
            const medal = RANK_MEDALS[entry.rank - 1]
            return (
              <tr
                key={entry.teamId}
                className={`border-b border-zinc-800/50 transition-colors ${team.isHuman ? 'bg-emerald-500/[0.05]' : ''}`}
              >
                <td className="px-3 py-2.5 font-bold text-zinc-400">{medal ?? entry.rank}</td>
                <td className={`px-3 py-2.5 font-bold ${team.isHuman ? 'text-emerald-300' : 'text-zinc-200'}`}>
                  {team.isHuman ? `${team.name} (you)` : team.name}
                </td>
                {isCumulative ? (
                  <td className="stat-number num-col px-3 py-2.5 text-base text-zinc-200">{entry.pointsFor.toFixed(1)}</td>
                ) : (
                  <>
                    {/* W and L are already labelled by their column heading, so
                        the colour here is reinforcement rather than the sole
                        signal -- no ▲/▼ needed, but they do need to be tabular
                        so the columns stop jittering between 9 and 10. */}
                    <td className="num-col px-3 py-2.5 font-semibold text-emerald-400">{entry.wins}</td>
                    <td className="num-col px-3 py-2.5 font-semibold text-rose-400">{entry.losses}</td>
                    <td className="num-col px-3 py-2.5 text-zinc-400">{entry.ties}</td>
                    <td className="stat-number num-col px-3 py-2.5 text-zinc-200">{entry.pointsFor.toFixed(1)}</td>
                    <td className="stat-number num-col px-3 py-2.5 text-zinc-500">{entry.pointsAgainst?.toFixed(1)}</td>
                  </>
                )}
              </tr>
            )
          })}
          {state.standings.length === 0 && (
            <tr>
              <td colSpan={colSpan} className="px-3 py-6 text-center text-zinc-600">
                No {state.config.season.periodLabel.toLowerCase()}s played yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
