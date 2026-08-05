import type { Difficulty, Lineup, Player, SportConfig } from '../types'
import { projectedPoints } from './valuation'

const SALARY_CAP_DIFFICULTY_NOISE: Record<Difficulty, number> = { casual: 0.3, normal: 0.14, sharp: 0.04 }

/** One RNG draw per candidate considered — the whole player pool, since there's no pre-existing roster to narrow it down. */
export function requiredSalaryCapDraws(playerPoolSize: number): number {
  return playerPoolSize
}

/**
 * Greedy value-per-dollar selection under a salary cap: not a globally
 * optimal knapsack solve, but the same class of heuristic real DFS
 * "optimize" buttons use, and it's deterministic given noiseDraws.
 *
 * A naive greedy can strand itself: spend most of the cap on a couple of
 * high-value-per-dollar picks, then find nothing left affordable — even
 * the cheapest remaining player costs more than what's left, so the field
 * comes up short. To guarantee a full field, each pick is only accepted if
 * enough budget survives to cover the cheapest *still-unpicked* players for
 * every slot still open after it — recomputed fresh at each step, since
 * the cheapest overall player may itself already be picked by then.
 */
export function buildSalaryCapLineup(
  players: Player[],
  config: SportConfig,
  weights: Record<string, number>,
  period: number,
  teamId: string,
  difficulty: Difficulty,
  noiseDraws: number[],
): Lineup {
  const fieldSize = config.fieldSize ?? 0
  const cap = config.salaryCap ?? Infinity
  const noiseScale = SALARY_CAP_DIFFICULTY_NOISE[difficulty]

  const candidates = players
    .filter((p) => p.salary !== undefined)
    .map((player, i) => {
      const base = projectedPoints(player.projection, weights)
      const u = noiseDraws[i] ?? 0.5
      const perceived = base * (1 + (u - 0.5) * 2 * noiseScale)
      return { player, valuePerDollar: perceived / Math.max(1, player.salary ?? 1) }
    })

  const byValuePerDollar = [...candidates].sort((a, b) => b.valuePerDollar - a.valuePerDollar)
  const picked: typeof candidates = []
  const pickedIds = new Set<string>()
  let remainingBudget = cap

  for (const c of byValuePerDollar) {
    if (picked.length >= fieldSize) break
    const slotsAfterThisPick = fieldSize - picked.length - 1
    const reserveForRemaining = candidates
      .filter((o) => o.player.id !== c.player.id && !pickedIds.has(o.player.id))
      .map((o) => o.player.salary ?? Infinity)
      .sort((a, b) => a - b)
      .slice(0, slotsAfterThisPick)
      .reduce((sum, salary) => sum + salary, 0)

    if ((c.player.salary ?? 0) + reserveForRemaining <= remainingBudget) {
      picked.push(c)
      pickedIds.add(c.player.id)
      remainingBudget -= c.player.salary ?? 0
    }
  }

  // Defensive top-up — shouldn't be needed given the reserve above, but
  // cheap insurance against an edge case in the reserve math.
  if (picked.length < fieldSize) {
    const cheapestAffordable = candidates
      .filter((c) => !pickedIds.has(c.player.id) && (c.player.salary ?? 0) <= remainingBudget)
      .sort((a, b) => (a.player.salary ?? 0) - (b.player.salary ?? 0))
    for (const c of cheapestAffordable) {
      if (picked.length >= fieldSize) break
      picked.push(c)
      remainingBudget -= c.player.salary ?? 0
    }
  }

  return {
    teamId,
    period,
    entries: picked.map((c) => ({ playerId: c.player.id, slot: 'FIELD' })),
  }
}
