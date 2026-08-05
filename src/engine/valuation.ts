import type { AIPersona, Difficulty, Pick, Player, Projection, SportConfig } from '../types'

function sumProjection(
  projection: Projection,
  weights: Record<string, number>,
  key: 'mean' | 'floor' | 'ceiling',
): number {
  let total = 0
  for (const [stat, range] of Object.entries(projection)) {
    total += range[key] * (weights[stat] ?? 0)
  }
  return total
}

/** Neutral, persona-agnostic projected points — the "true value" shown in best-available lists. */
export function projectedPoints(projection: Projection, weights: Record<string, number>): number {
  return Math.round(sumProjection(projection, weights, 'mean') * 100) / 100
}

export interface RankedPlayer {
  player: Player
  value: number
}

export function rankAvailablePlayers(
  players: Player[],
  draftedIds: ReadonlySet<string>,
  weights: Record<string, number>,
): RankedPlayer[] {
  return players
    .filter((p) => !draftedIds.has(p.id))
    .map((player) => ({ player, value: projectedPoints(player.projection, weights) }))
    .sort((a, b) => b.value - a.value)
}

/**
 * How "hot" a position's run is right now: fraction of the last `window`
 * picks spent on that position. Feeds the runPanic trait.
 */
export function detectPositionRuns(picks: Pick[], players: Record<string, Player>, window = 6): Record<string, number> {
  const recent = picks.slice(-window)
  const counts: Record<string, number> = {}
  for (const pick of recent) {
    const player = players[pick.playerId]
    if (!player) continue
    for (const pos of player.positions) {
      counts[pos] = (counts[pos] ?? 0) + 1
    }
  }
  const intensity: Record<string, number> = {}
  for (const [pos, count] of Object.entries(counts)) {
    intensity[pos] = count / Math.max(1, recent.length)
  }
  return intensity
}

/**
 * Hard minimum per position, counting only slots with exactly one eligible
 * position (QB, K, DST, ...). Shared slots like FLEX are deliberately
 * excluded — they get satisfied opportunistically by RB/WR/TE surplus, so
 * they shouldn't force a reach. Without this floor, pure value-based
 * drafting can leave a team with zero kickers or defenses: those score so
 * few points that they never crack a value shortlist against 264 other
 * undrafted skill players, so nothing else in the algorithm would ever
 * pick one until it's already too late.
 */
export function exclusivePositionMinimums(config: SportConfig): Record<string, number> {
  const minimums: Record<string, number> = {}
  for (const slot of config.roster) {
    if (slot.isBench || slot.eligiblePositions.length !== 1) continue
    const pos = slot.eligiblePositions[0]
    minimums[pos] = (minimums[pos] ?? 0) + slot.count
  }
  return minimums
}

/** Positions this roster hasn't yet met its hard minimum for. */
export function unmetPositionNeeds(roster: string[], players: Record<string, Player>, config: SportConfig): string[] {
  const minimums = exclusivePositionMinimums(config)
  const counts: Record<string, number> = {}
  for (const playerId of roster) {
    for (const pos of players[playerId]?.positions ?? []) {
      counts[pos] = (counts[pos] ?? 0) + 1
    }
  }
  return Object.entries(minimums)
    .filter(([pos, min]) => (counts[pos] ?? 0) < min)
    .map(([pos]) => pos)
}

const DIFFICULTY_NOISE: Record<Difficulty, number> = { casual: 0.35, normal: 0.18, sharp: 0.06 }
export const SHORTLIST_SIZE = 20

/** Single source of truth for how many RNG draws an AI pick consumes, shared by the caller (to charge the league's rngCursor) and choosePersonaPick (to actually draw). */
export function shortlistDrawCount(availableCount: number): number {
  return Math.min(SHORTLIST_SIZE, availableCount)
}

/**
 * Persona-weighted value for one player: blends mean/floor/ceiling by
 * riskTolerance, then applies positionBias and the current run-panic
 * boost. No noise here — noise is applied once, per candidate, in
 * choosePersonaPick, scaled by difficulty.
 */
function personaBaseValue(
  player: Player,
  weights: Record<string, number>,
  persona: AIPersona,
  runIntensity: Record<string, number>,
): number {
  const meanPts = sumProjection(player.projection, weights, 'mean')
  const floorPts = sumProjection(player.projection, weights, 'floor')
  const ceilPts = sumProjection(player.projection, weights, 'ceiling')
  const riskTarget = floorPts + (ceilPts - floorPts) * persona.riskTolerance
  const riskAdjusted = meanPts * 0.6 + riskTarget * 0.4

  const posBias = Math.max(1, ...player.positions.map((pos) => persona.positionBias[pos] ?? 1))
  const runBoost =
    1 + (persona.runPanic ?? 0) * Math.max(0, ...player.positions.map((pos) => runIntensity[pos] ?? 0))

  return riskAdjusted * posBias * runBoost
}

export interface PersonaPickResult {
  player: Player
  drawsUsed: number
}

/**
 * Picks from the top-N true-value shortlist (bounded so a bad roll can
 * never produce a truly bad pick, matching how real drafters behave), with
 * per-candidate perception noise scaled by difficulty and this persona's
 * aggression. Consumes exactly `noiseDraws.length` uniform draws from the
 * caller — the caller is responsible for sourcing those from the league's
 * seeded RNG so the pick stays replayable.
 */
export function choosePersonaPick(
  ranked: RankedPlayer[],
  persona: AIPersona,
  difficulty: Difficulty,
  runIntensity: Record<string, number>,
  weights: Record<string, number>,
  noiseDraws: number[],
): PersonaPickResult {
  const shortlist = ranked.slice(0, Math.min(SHORTLIST_SIZE, ranked.length))
  const noiseScale = DIFFICULTY_NOISE[difficulty] * (0.5 + persona.aggression)

  let best = shortlist[0]
  let bestScore = -Infinity
  shortlist.forEach((entry, i) => {
    const base = personaBaseValue(entry.player, weights, persona, runIntensity)
    const u = noiseDraws[i] ?? 0.5
    const perceived = base * (1 + (u - 0.5) * 2 * noiseScale)
    if (perceived > bestScore) {
      bestScore = perceived
      best = entry
    }
  })

  return { player: best.player, drawsUsed: shortlist.length }
}
