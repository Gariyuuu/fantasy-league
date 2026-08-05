import type { LeagueState } from '../../types'

interface Props {
  state: LeagueState
}

export function StandingsTable({ state }: Props) {
  const isCumulative = state.config.engine !== 'headToHead'
  const colSpan = isCumulative ? 3 : 7

  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-800 bg-zinc-900">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-800 text-left text-xs uppercase tracking-wide text-zinc-500">
            <th className="px-3 py-2">#</th>
            <th className="px-3 py-2">Team</th>
            {isCumulative ? (
              <th className="px-3 py-2 text-right">Points</th>
            ) : (
              <>
                <th className="px-3 py-2 text-right">W</th>
                <th className="px-3 py-2 text-right">L</th>
                <th className="px-3 py-2 text-right">T</th>
                <th className="px-3 py-2 text-right">PF</th>
                <th className="px-3 py-2 text-right">PA</th>
              </>
            )}
          </tr>
        </thead>
        <tbody>
          {state.standings.map((entry) => {
            const team = state.teams.find((t) => t.id === entry.teamId)
            if (!team) return null
            return (
              <tr key={entry.teamId} className="border-b border-zinc-800/50">
                <td className="px-3 py-2 text-zinc-500">{entry.rank}</td>
                <td className={`px-3 py-2 font-medium ${team.isHuman ? 'text-emerald-300' : 'text-zinc-200'}`}>
                  {team.isHuman ? `${team.name} (you)` : team.name}
                </td>
                {isCumulative ? (
                  <td className="px-3 py-2 text-right font-mono text-zinc-300">{entry.pointsFor.toFixed(1)}</td>
                ) : (
                  <>
                    <td className="px-3 py-2 text-right text-zinc-300">{entry.wins}</td>
                    <td className="px-3 py-2 text-right text-zinc-300">{entry.losses}</td>
                    <td className="px-3 py-2 text-right text-zinc-300">{entry.ties}</td>
                    <td className="px-3 py-2 text-right font-mono text-zinc-300">{entry.pointsFor.toFixed(1)}</td>
                    <td className="px-3 py-2 text-right font-mono text-zinc-500">{entry.pointsAgainst?.toFixed(1)}</td>
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
