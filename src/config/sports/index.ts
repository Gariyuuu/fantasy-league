import type { SportConfig, SportId } from '../../types'
import { nflConfig } from './nfl'
import { cfbConfig } from './cfb'
import { eplConfig } from './epl'
import { mlbConfig } from './mlb'
import { wnbaConfig } from './wnba'
import { mlsConfig } from './mls'
import { pgaConfig } from './pga'
import { tennisConfig } from './tennis'
import { nascarConfig } from './nascar'

/**
 * Registry of sport configs selectable at league creation. Adding a sport
 * later = adding a SportConfig + fixtures here, not new engine code — true
 * for engine A/B sports (NFL, MLB). Engine C (PGA) needed a little genuine
 * engine code too (salary-cap selection, no-draft startup) since its data
 * model is inherently different, not just a config knob.
 */
export const sportConfigs: Partial<Record<SportId, SportConfig>> = {
  nfl: nflConfig,
  cfb: cfbConfig,
  epl: eplConfig,
  mlb: mlbConfig,
  wnba: wnbaConfig,
  mls: mlsConfig,
  pga: pgaConfig,
  tennis: tennisConfig,
  nascar: nascarConfig,
}

export function getSportConfig(sport: SportId): SportConfig {
  const config = sportConfigs[sport]
  if (!config) throw new Error(`No SportConfig registered for "${sport}" yet`)
  return config
}
