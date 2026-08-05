import { NavLink, Link } from 'react-router-dom'
import type { LeagueState } from '../types'
import { SPORT_ICONS } from './sportMeta'

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
    `rounded-lg px-3 py-1.5 text-sm font-semibold transition-all ${
      isActive
        ? 'bg-gradient-to-r from-emerald-500 to-emerald-400 text-zinc-950 shadow-md shadow-emerald-500/25'
        : 'text-zinc-400 hover:bg-zinc-800/80 hover:text-zinc-100'
    }`

  const hasDraft = state.config.draft.type !== 'none'
  const hasRosterMechanics = state.config.engine !== 'salaryCapField'

  return (
    <div className="app-card flex items-center justify-between px-5 py-3.5">
      <Link to="/" className="flex items-center gap-3">
        <span className="text-2xl">{SPORT_ICONS[state.sport]}</span>
        <div>
          <h1 className="text-lg font-bold text-zinc-50">{state.name}</h1>
          <p className="text-xs uppercase tracking-wide text-zinc-500">
            {state.config.label} · <span className="text-emerald-400">{phaseLabel(state)}</span>
          </p>
        </div>
      </Link>
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
