import type { LeagueState, LeagueSummary } from '../types'

/**
 * The only interface the rest of the app talks to for persistence.
 * v1: LocalJsonStorageAdapter (browser). v2: swap in a DB-backed
 * implementation behind this same interface — nothing else changes.
 */
export interface StorageAdapter {
  save(leagueId: string, state: LeagueState): Promise<void>
  load(leagueId: string): Promise<LeagueState | null>
  list(): Promise<LeagueSummary[]>
  delete(leagueId: string): Promise<void>
}
