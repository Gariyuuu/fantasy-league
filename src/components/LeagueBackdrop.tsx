import type { ReactNode } from 'react'
import type { SportId } from '../types'
import nflBg from '../assets/backgrounds/nfl-stadium.jpg'
import mlbBg from '../assets/backgrounds/mlb-stadium.jpg'
import pgaBg from '../assets/backgrounds/pga-course.jpg'

/** Real venue photography per sport (Wikimedia Commons, freely licensed). Add an entry here as each new sport ships its own background. */
const SPORT_BACKGROUNDS: Partial<Record<SportId, string>> = {
  nfl: nflBg,
  mlb: mlbBg,
  pga: pgaBg,
}

interface Props {
  sport: SportId
  className?: string
  children: ReactNode
}

/** Wraps league-scoped pages in that sport's real venue photo, scrimmed dark enough that the existing card UI stays fully readable on top. */
export function LeagueBackdrop({ sport, className = '', children }: Props) {
  const bg = SPORT_BACKGROUNDS[sport]
  return (
    <div
      className={`min-h-svh bg-cover bg-center bg-fixed ${className}`}
      style={
        bg
          ? { backgroundImage: `linear-gradient(to bottom, rgba(5,7,13,0.88), rgba(5,7,13,0.95)), url(${bg})` }
          : undefined
      }
    >
      {children}
    </div>
  )
}
