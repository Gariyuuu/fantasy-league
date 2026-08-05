import type { LeagueState } from '../../types'
import { draftRounds, roundForOverall } from '../../engine/draft'
import { positionColor } from './positionColors'

interface Props {
  state: LeagueState
  currentPickerTeamId: string | null
}

export function RosterGrid({ state, currentPickerTeamId }: Props) {
  const rounds = draftRounds(state.config)
  const orderedTeams = state.draft.order.length
    ? state.draft.order.map((id) => state.teams.find((t) => t.id === id)).filter((t) => t !== undefined)
    : state.teams
  const teamCount = orderedTeams.length || 1

  const pickAt = (teamId: string, round: number) =>
    state.draft.picks.find((p) => p.teamId === teamId && roundForOverall(p.overall, teamCount) === round)

  return (
    <div className="app-card max-h-[420px] overflow-auto">
      <table className="w-full min-w-[900px] text-xs">
        <thead className="sticky top-0 z-10 bg-zinc-900/95 backdrop-blur-sm">
          <tr className="border-b border-zinc-800/80">
            {orderedTeams.map((team) => {
              const persona = state.managerPersonas[team.managerId]
              const isOnClock = team.id === currentPickerTeamId
              return (
                <th
                  key={team.id}
                  className={`px-2 py-2.5 text-left font-bold transition-colors ${
                    team.isHuman ? 'text-emerald-300' : 'text-zinc-400'
                  } ${isOnClock ? 'bg-emerald-500/10' : ''}`}
                >
                  <span className="mr-1">{persona?.avatar ?? '🧑'}</span>
                  {team.isHuman ? `${team.name} (you)` : team.name}
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rounds }, (_, i) => i + 1).map((round) => (
            <tr key={round} className="border-b border-zinc-800/50">
              {orderedTeams.map((team) => {
                const pick = pickAt(team.id, round)
                const player = pick ? state.players[pick.playerId] : null
                const isOnClock = team.id === currentPickerTeamId
                return (
                  <td key={team.id} className={`px-2 py-1.5 transition-colors ${isOnClock ? 'bg-emerald-500/[0.06]' : ''}`}>
                    {player ? (
                      <div className="flex items-center gap-1">
                        <span
                          className={`rounded border px-1 py-0.5 text-[9px] font-semibold ${positionColor(player.positions[0])}`}
                        >
                          {player.positions[0]}
                        </span>
                        <span className="truncate text-zinc-300">{player.name}</span>
                      </div>
                    ) : (
                      <span className="text-zinc-700">—</span>
                    )}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
