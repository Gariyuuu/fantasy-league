import type { DraftState, SportConfig } from '../types'
import { drawUniform, shuffle } from './rng'

export interface DraftOrderResult {
  order: string[]
  drawsUsed: number
}

/** Randomizes draft order from the league's seeded RNG at the given cursor. */
export function buildDraftOrder(teamIds: string[], seed: number, fromCursor: number): DraftOrderResult {
  const { values } = drawUniform(seed, fromCursor, Math.max(0, teamIds.length - 1))
  return { order: shuffle(teamIds, values), drawsUsed: values.length }
}

/** Snake draft: round N reverses order if N is even (1-indexed). */
export function roundForOverall(overall: number, teamCount: number): number {
  return Math.floor(overall / teamCount) + 1
}

export function teamIdForOverall(order: string[], overall: number): string {
  const teamCount = order.length
  const round = roundForOverall(overall, teamCount)
  const posInRound = overall % teamCount
  const reversed = round % 2 === 0
  return reversed ? order[teamCount - 1 - posInRound] : order[posInRound]
}

export function isDraftComplete(draft: DraftState, teamCount: number, rounds: number): boolean {
  return draft.currentOverall >= teamCount * rounds
}

/** Falls back to full roster size (bench included) if a sport config doesn't pin down a round count. */
export function draftRounds(config: SportConfig): number {
  return config.draft.rounds ?? config.roster.reduce((sum, slot) => sum + slot.count, 0)
}
