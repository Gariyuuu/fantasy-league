import type { StatLine } from '../types'

/**
 * Pure dot-product of raw stats against a scoring preset's weights. Kept
 * separate from stat generation so a commissioner scoring edit rescores
 * every existing box score on read, with nothing to regenerate.
 */
export function scoreStatLine(statLine: StatLine, weights: Record<string, number>): number {
  let points = 0
  for (const [statKey, value] of Object.entries(statLine.stats)) {
    points += value * (weights[statKey] ?? 0)
  }
  return Math.round(points * 100) / 100
}
