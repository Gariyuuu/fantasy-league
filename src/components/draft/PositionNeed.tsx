import type { LeagueState, Team } from '../../types'
import { positionColor } from './positionColors'

interface Props {
  state: LeagueState
  team: Team
}

export function PositionNeed({ state, team }: Props) {
  const positions = state.config.positions
  const draftedByPos = Object.fromEntries(
    positions.map((pos) => [pos, team.roster.filter((id) => state.players[id]?.positions.includes(pos)).length]),
  )
  const startersByPos = Object.fromEntries(
    positions.map((pos) => [
      pos,
      state.config.roster
        .filter((slot) => !slot.isBench && slot.eligiblePositions.includes(pos))
        .reduce((sum, slot) => sum + slot.count, 0),
    ]),
  )

  return (
    <div className="app-card p-4">
      <p className="mb-2.5 text-xs font-bold uppercase tracking-wide text-zinc-500">Your roster needs</p>
      <div className="flex flex-wrap gap-1.5">
        {positions.map((pos) => {
          const drafted = draftedByPos[pos]
          const needed = startersByPos[pos]
          const filled = drafted >= needed
          return (
            <span
              key={pos}
              className={`rounded-lg border px-2.5 py-1.5 text-[11px] font-bold ${
                filled ? 'border-zinc-700 bg-zinc-800/60 text-zinc-400' : `${positionColor(pos)} shadow-sm`
              }`}
            >
              {pos} {drafted}/{needed}
            </span>
          )
        })}
      </div>
    </div>
  )
}
