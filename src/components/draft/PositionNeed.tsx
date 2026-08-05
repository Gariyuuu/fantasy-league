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
    <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-3">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">Your roster needs</p>
      <div className="flex flex-wrap gap-1.5">
        {positions.map((pos) => {
          const drafted = draftedByPos[pos]
          const needed = startersByPos[pos]
          const filled = drafted >= needed
          return (
            <span
              key={pos}
              className={`rounded border px-2 py-1 text-[11px] font-medium ${
                filled ? 'border-zinc-700 bg-zinc-800 text-zinc-400' : positionColor(pos)
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
