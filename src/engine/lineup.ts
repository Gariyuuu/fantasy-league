import type { Difficulty, Lineup, Player, RosterEntry, RosterSlotConfig, SportConfig, Team } from '../types'
import { projectedPoints } from './valuation'

const LINEUP_DIFFICULTY_NOISE: Record<Difficulty, number> = { casual: 0.25, normal: 0.1, sharp: 0.02 }

export function requiredLineupDraws(config: SportConfig): number {
  return config.roster.reduce((sum, slot) => sum + slot.count, 0)
}

/**
 * Greedy slot-priority assignment: fill the most position-restrictive
 * slots first (fewest eligible positions) with the highest perceived-value
 * eligible player left, then bench whoever's left. Not a globally optimal
 * assignment, but it's the same heuristic real fantasy "optimize" buttons
 * use and it's close enough for v1. Passing an empty noiseDraws array
 * yields the pure, noise-free optimal lineup — used for the draft-complete
 * default and the lineup editor's initial suggestion.
 */
export function buildOptimalLineup(
  team: Team,
  players: Record<string, Player>,
  config: SportConfig,
  weights: Record<string, number>,
  period: number,
  difficulty: Difficulty,
  noiseDraws: number[],
): Lineup {
  const noiseScale = LINEUP_DIFFICULTY_NOISE[difficulty]
  const perceivedValue = new Map<string, number>()
  team.roster.forEach((playerId, i) => {
    const player = players[playerId]
    if (!player) return
    const base = projectedPoints(player.projection, weights)
    const u = noiseDraws[i] ?? 0.5
    perceivedValue.set(playerId, base * (1 + (u - 0.5) * 2 * noiseScale))
  })

  const starterSlots = config.roster.filter((s) => !s.isBench).sort((a, b) => a.eligiblePositions.length - b.eligiblePositions.length)
  const benchSlots = config.roster.filter((s) => s.isBench)
  const available = new Set(team.roster.filter((id) => players[id]))
  const entries: RosterEntry[] = []

  const fillSlot = (slot: RosterSlotConfig, eligibleOnly: boolean) => {
    for (let i = 0; i < slot.count; i++) {
      const candidates = [...available].filter(
        (id) => !eligibleOnly || players[id].positions.some((pos) => slot.eligiblePositions.includes(pos)),
      )
      if (candidates.length === 0) continue
      candidates.sort((a, b) => (perceivedValue.get(b) ?? 0) - (perceivedValue.get(a) ?? 0))
      const chosen = candidates[0]
      entries.push({ playerId: chosen, slot: slot.slot })
      available.delete(chosen)
    }
  }

  for (const slot of starterSlots) fillSlot(slot, true)
  for (const slot of benchSlots) fillSlot(slot, false)

  return { teamId: team.id, period, entries }
}

export interface SlotInstance {
  /** unique per instance, e.g. "RB-0", "RB-1", "BN-0" — RosterSlotConfig.count > 1 slots share a label but need distinct UI keys */
  key: string
  slot: string
  eligiblePositions: string[]
  isBench: boolean
}

export function expandSlotInstances(config: SportConfig): SlotInstance[] {
  const instances: SlotInstance[] = []
  for (const slotConfig of config.roster) {
    for (let i = 0; i < slotConfig.count; i++) {
      instances.push({
        key: `${slotConfig.slot}-${i}`,
        slot: slotConfig.slot,
        eligiblePositions: slotConfig.eligiblePositions,
        isBench: Boolean(slotConfig.isBench),
      })
    }
  }
  return instances
}

/** Distributes a Lineup's entries into slot-instance keys, in array order — matches how buildOptimalLineup fills instances of the same slot label sequentially. */
export function assignmentsFromLineup(lineup: Lineup, instances: SlotInstance[]): Record<string, string> {
  const queues: Record<string, string[]> = {}
  for (const entry of lineup.entries) {
    ;(queues[entry.slot] ??= []).push(entry.playerId)
  }
  const assignments: Record<string, string> = {}
  for (const inst of instances) {
    const next = queues[inst.slot]?.shift()
    if (next) assignments[inst.key] = next
  }
  return assignments
}

export function lineupFromAssignments(
  teamId: string,
  period: number,
  assignments: Record<string, string>,
  instances: SlotInstance[],
): Lineup {
  return {
    teamId,
    period,
    entries: instances
      .filter((inst) => assignments[inst.key])
      .map((inst) => ({ playerId: assignments[inst.key], slot: inst.slot })),
  }
}
