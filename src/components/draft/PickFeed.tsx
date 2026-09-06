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
    <div className="app-card flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-zinc-800/80 px-3.5 py-2.5 text-xs font-bold uppercase tracking-wide text-zinc-500">
        <span className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" /> Pick feed
        </span>
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
              className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs ${team?.isHuman ? 'bg-emerald-500/[0.06]' : ''} ${i === 0 ? 'animate-pick-flash-in' : ''}`}
            >
              <span className="w-8 shrink-0 font-mono text-zinc-600">{pick.overall + 1}.</span>
              <span
                className={`shrink-0 rounded-md border px-1 py-0.5 text-xs font-bold ${positionColor(player?.positions[0] ?? '')}`}
              >
                {player?.positions[0]}
              </span>
              <span className="flex-1 truncate font-medium text-zinc-200">{player?.name}</span>
              <span className="shrink-0 truncate text-zinc-500">
                {persona?.avatar ?? '🧑'} {team?.isHuman ? `${team.name} (you)` : team?.name}
              </span>
              {pick.autopick && (
                <span className="shrink-0 rounded-full bg-amber-500/20 px-1.5 text-xs font-bold text-amber-300">AUTO</span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
