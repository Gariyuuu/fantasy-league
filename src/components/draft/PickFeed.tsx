import { useEffect, useRef } from 'react'
import type { LeagueState } from '../../types'
import { positionColor } from './positionColors'

interface Props {
  state: LeagueState
}

export function PickFeed({ state }: Props) {
  const picks = [...state.draft.picks].reverse()
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }, [state.draft.picks.length])

  return (
    <div className="flex h-full flex-col rounded-lg border border-zinc-800 bg-zinc-900">
      <div className="flex items-center justify-between border-b border-zinc-800 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
        <span>Pick feed</span>
        <span className="font-mono normal-case text-zinc-600">{picks.length} picks</span>
      </div>
      <div ref={scrollRef} className="flex-1 space-y-1 overflow-y-auto p-2">
        {picks.length === 0 && <p className="p-2 text-xs text-zinc-600">No picks yet.</p>}
        {picks.map((pick, i) => {
          const player = state.players[pick.playerId]
          const team = state.teams.find((t) => t.id === pick.teamId)
          const persona = team ? state.managerPersonas[team.managerId] : null
          return (
            <div
              key={pick.overall}
              className={`flex items-center gap-2 rounded px-2 py-1.5 text-xs ${i === 0 ? 'animate-pick-flash-in' : ''}`}
            >
              <span className="w-8 shrink-0 font-mono text-zinc-600">{pick.overall + 1}.</span>
              <span
                className={`shrink-0 rounded border px-1 py-0.5 text-[10px] font-semibold ${positionColor(player?.positions[0] ?? '')}`}
              >
                {player?.positions[0]}
              </span>
              <span className="flex-1 truncate text-zinc-200">{player?.name}</span>
              <span className="shrink-0 truncate text-zinc-500">
                {persona?.avatar ?? '🧑'} {team?.isHuman ? `${team.name} (you)` : team?.name}
              </span>
              {pick.autopick && (
                <span className="shrink-0 rounded bg-amber-500/20 px-1 text-[9px] text-amber-300">AUTO</span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
