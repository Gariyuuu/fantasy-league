import type { LeagueState } from '../../types'
import { roundForOverall } from '../../engine/draft'

interface Props {
  state: LeagueState
  currentPickerTeamId: string | null
  draftClockSeconds: number
  isHumanTurn: boolean
}

export function DraftClockBar({ state, currentPickerTeamId, draftClockSeconds, isHumanTurn }: Props) {
  const team = state.teams.find((t) => t.id === currentPickerTeamId)
  const persona = team ? state.managerPersonas[team.managerId] : null
  const teamCount = state.draft.order.length || state.teams.length
  const round = roundForOverall(state.draft.currentOverall, teamCount)
  const pickInRound = (state.draft.currentOverall % teamCount) + 1
  const pickTime = state.config.draft.pickTimeSeconds ?? 60
  const isUrgent = draftClockSeconds <= 5
  const urgency = isUrgent ? 'text-red-400' : draftClockSeconds <= pickTime * 0.3 ? 'text-amber-400' : 'text-emerald-400'
  const barColor = isUrgent ? 'bg-red-500' : draftClockSeconds <= pickTime * 0.3 ? 'bg-amber-500' : 'bg-emerald-500'
  const elapsedRatio = Math.min(1, Math.max(0, 1 - draftClockSeconds / pickTime))

  const glowClass = isHumanTurn ? (isUrgent ? 'animate-clock-glow-urgent' : 'animate-clock-glow') : ''

  return (
    <div
      className={`overflow-hidden rounded-2xl border backdrop-blur-sm transition-colors ${
        isHumanTurn
          ? 'border-emerald-500/60 bg-gradient-to-b from-emerald-500/10 to-zinc-900/70'
          : 'border-zinc-800/80 bg-zinc-900/70'
      } ${glowClass}`}
    >
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Round {round} · Pick {pickInRound}
          </p>
          <p className="mt-1 flex items-center gap-2 text-lg font-bold text-zinc-100">
            <span className="text-2xl">{persona?.avatar ?? '🧑'}</span>
            {isHumanTurn ? (
              <span className="gradient-text">You're on the clock!</span>
            ) : (
              <>{team ? team.name : '—'} is on the clock</>
            )}
          </p>
        </div>
        <div className={`stat-number text-5xl ${urgency}`}>{String(Math.max(0, draftClockSeconds)).padStart(2, '0')}s</div>
      </div>
      <div className="h-1.5 w-full bg-zinc-800/80">
        <div
          className={`h-full ${barColor} transition-[width] duration-1000 ease-linear`}
          style={{ width: `${elapsedRatio * 100}%` }}
        />
      </div>
    </div>
  )
}
