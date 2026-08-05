import { NavLink } from 'react-router-dom'
import type { LeagueState } from '../types'

interface Props {
  state: LeagueState
}

function phaseLabel(state: LeagueState): string {
  if (state.phase === 'regularSeason') return `${state.config.season.periodLabel} ${state.currentPeriod}`
  if (state.phase === 'playoffs') {
    const currentRound = state.playoffs?.[state.playoffs.length - 1]
    return currentRound?.matchups.length === 1 ? 'Championship' : `Playoffs — Round ${currentRound?.round ?? 1}`
  }
  if (state.phase === 'complete') return 'Season complete'
  return state.phase
}

export function LeagueNav({ state }: Props) {
  const tabClass = ({ isActive }: { isActive: boolean }) =>
    `rounded px-3 py-1.5 text-sm font-medium ${
      isActive ? 'bg-emerald-500 text-zinc-950' : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
    }`

  const hasDraft = state.config.draft.type !== 'none'
  const hasRosterMechanics = state.config.engine !== 'salaryCapField'

  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-xl font-semibold text-zinc-50">{state.name}</h1>
        <p className="text-xs uppercase tracking-wide text-zinc-500">
          {state.config.label} · {phaseLabel(state)}
        </p>
      </div>
      {(state.phase === 'regularSeason' || state.phase === 'playoffs' || state.phase === 'complete') && (
        <nav className="flex gap-1">
          <NavLink to={`/league/${state.id}/${hasRosterMechanics ? 'lineup' : 'event'}`} className={tabClass}>
            {hasRosterMechanics ? 'Lineup' : 'Event Lobby'}
          </NavLink>
          <NavLink to={`/league/${state.id}/season`} className={tabClass}>
            Season
          </NavLink>
          {hasRosterMechanics && (
            <>
              <NavLink to={`/league/${state.id}/waivers`} className={tabClass}>
                Waivers
              </NavLink>
              <NavLink to={`/league/${state.id}/trades`} className={tabClass}>
                Trades
              </NavLink>
            </>
          )}
          {hasDraft && (
            <NavLink to={`/league/${state.id}/draft`} className={tabClass}>
              Draft Recap
            </NavLink>
          )}
        </nav>
      )}
    </div>
  )
}
