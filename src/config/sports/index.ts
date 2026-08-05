import type { SportConfig, SportId } from '../../types'
import { nflConfig } from './nfl'
import { mlbConfig } from './mlb'
import { pgaConfig } from './pga'

/**
 * Registry of sport configs selectable at league creation. Adding a sport
 * later = adding a SportConfig + fixtures here, not new engine code — true
 * for engine A/B sports (NFL, MLB). Engine C (PGA) needed a little genuine
 * engine code too (salary-cap selection, no-draft startup) since its data
 * model is inherently different, not just a config knob.
 */
export const sportConfigs: Partial<Record<SportId, SportConfig>> = {
  nfl: nflConfig,
  mlb: mlbConfig,
  pga: pgaConfig,
}

export function getSportConfig(sport: SportId): SportConfig {
  const config = sportConfigs[sport]
  if (!config) throw new Error(`No SportConfig registered for "${sport}" yet`)
  return config
}
