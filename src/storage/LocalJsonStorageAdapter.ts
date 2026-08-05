import type { LeagueState, LeagueSummary } from '../types'
import type { StorageAdapter } from './StorageAdapter'

const STORAGE_KEY = 'fantasy-league:blob:v1'

interface PersistedBlob {
  leagues: Record<string, LeagueState>
}

function readBlob(): PersistedBlob {
  if (typeof localStorage === 'undefined') return { leagues: {} }
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return { leagues: {} }
  try {
    return JSON.parse(raw) as PersistedBlob
  } catch {
    return { leagues: {} }
  }
}

function writeBlob(blob: PersistedBlob): void {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(blob))
}

/**
 * v1 persistence: one JSON blob for all leagues. A browser has no
 * filesystem, so localStorage stands in for "a JSON file" — the blob is
 * read once into an in-memory cache and mirrored back on every save. v2
 * swaps this class for a DB-backed adapter behind the same
 * StorageAdapter interface; nothing else in the app touches storage
 * directly, so nothing else changes.
 */
export class LocalJsonStorageAdapter implements StorageAdapter {
  private cache: Record<string, LeagueState>

  constructor() {
    this.cache = readBlob().leagues
  }

  async save(leagueId: string, state: LeagueState): Promise<void> {
    this.cache = { ...this.cache, [leagueId]: state }
    writeBlob({ leagues: this.cache })
  }

  async load(leagueId: string): Promise<LeagueState | null> {
    return this.cache[leagueId] ?? null
  }

  async list(): Promise<LeagueSummary[]> {
    return Object.values(this.cache)
      .map((s) => ({
        id: s.id,
        name: s.name,
        sport: s.sport,
        phase: s.phase,
        updatedAt: s.updatedAt,
      }))
      .sort((a, b) => b.updatedAt - a.updatedAt)
  }

  async delete(leagueId: string): Promise<void> {
    const next = { ...this.cache }
    delete next[leagueId]
    this.cache = next
    writeBlob({ leagues: this.cache })
  }
}
