import type { ReactNode } from 'react'
import type { SportId } from '../types'
import nflBg from '../assets/backgrounds/nfl-stadium.jpg'
import cfbBg from '../assets/backgrounds/cfb-stadium.jpg'
import eplBg from '../assets/backgrounds/epl-stadium.jpg'
import mlbBg from '../assets/backgrounds/mlb-stadium.jpg'
import wnbaBg from '../assets/backgrounds/wnba-arena.jpg'
import nbaBg from '../assets/backgrounds/nba-arena.jpg'
import mlsBg from '../assets/backgrounds/mls-stadium.jpg'
import pgaBg from '../assets/backgrounds/pga-course.jpg'
import tennisBg from '../assets/backgrounds/tennis-court.jpg'
import nascarBg from '../assets/backgrounds/nascar-track.jpg'

/** Real venue photography per sport (Wikimedia Commons, freely licensed). */
const SPORT_BACKGROUNDS: Partial<Record<SportId, string>> = {
  nfl: nflBg,
  cfb: cfbBg,
  epl: eplBg,
  mlb: mlbBg,
  wnba: wnbaBg,
  nba: nbaBg,
  mls: mlsBg,
  pga: pgaBg,
  tennis: tennisBg,
  nascar: nascarBg,
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
