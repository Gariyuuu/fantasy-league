import type { LeaguePhase, SportId } from '../types'

export const SPORT_ICONS: Record<SportId, string> = {
  nfl: '🏈',
  cfb: '🏈',
  epl: '⚽',
  mlb: '⚾',
  wnba: '🏀',
  nba: '🏀',
  mls: '⚽',
  pga: '⛳',
  tennis: '🎾',
  nascar: '🏁',
}

/** Noun for engine C's "pick N ___" field-selection copy, per sport. */
export const FIELD_NOUN: Partial<Record<SportId, string>> = {
  pga: 'golfers',
  tennis: 'players',
  nascar: 'drivers',
}

export function phaseBadgeClass(phase: LeaguePhase): string {
  switch (phase) {
    case 'predraft':
      return 'bg-amber-500/15 text-amber-300 border-amber-500/30'
    case 'drafting':
      return 'bg-sky-500/15 text-sky-300 border-sky-500/30 animate-pulse'
    case 'regularSeason':
      return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
    case 'playoffs':
      return 'bg-violet-500/15 text-violet-300 border-violet-500/30'
    case 'complete':
      return 'bg-amber-400/15 text-amber-200 border-amber-400/30'
    default:
      return 'bg-zinc-500/15 text-zinc-300 border-zinc-500/30'
  }
}

export function phaseLabelText(phase: LeaguePhase): string {
  switch (phase) {
    case 'predraft':
      return 'Predraft'
    case 'drafting':
      return 'Drafting'
    case 'regularSeason':
      return 'In Season'
    case 'playoffs':
      return 'Playoffs'
    case 'complete':
      return 'Complete'
    default:
      return phase
  }
}
