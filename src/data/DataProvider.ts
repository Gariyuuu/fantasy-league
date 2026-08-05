import type { Player, Projection, SportId, StatLine } from '../types'

/**
 * Players, schedules, and stat generation for a sport all come through
 * this interface. v1: SeedDataProvider, reading local fixtures. v2: swap
 * in a live-API-backed provider behind the same interface — no fetch
 * calls anywhere else in the app.
 */
export interface DataProvider {
  getPlayers(sport: SportId): Promise<Player[]>
  getProjection(sport: SportId, playerId: string): Promise<Projection>
  /**
   * Samples raw counting stats per player from their projection ranges
   * using the supplied uniform-random draws (already advanced from league
   * RNG state by the caller, so results stay reproducible from the seed).
   * Scoring those stats into fantasy points is the season-sim engine's
   * job, not the data provider's — see engine/scoring.ts.
   */
  generateStatLines(
    sport: SportId,
    period: number,
    players: Player[],
    draws: number[],
  ): StatLine[]

  /** How many RNG draws generateStatLines will consume for this player set — callers use this to size their draw. */
  requiredDrawCount(players: Player[]): number
}
