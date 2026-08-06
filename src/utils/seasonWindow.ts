import type { SportConfig } from '../types'

/** Handles windows that cross a calendar year boundary (e.g. NFL Sep -> Feb). */
export function isInSeasonNow(config: SportConfig, now: Date = new Date()): boolean {
  const { start, end } = config.realSeasonWindow
  const today = now.toISOString().slice(0, 10)
  if (start <= end) return today >= start && today <= end
  return today >= start || today <= end
}

export function formatSeasonOpensLabel(config: SportConfig, now: Date = new Date()): string {
  if (isInSeasonNow(config, now)) return 'In season now'
  const start = new Date(`${config.realSeasonWindow.start}T00:00:00`)
  return `Opens ${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
}
