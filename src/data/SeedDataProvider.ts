import type { DataProvider } from './DataProvider'
import type { Player, Projection, SportId, StatLine } from '../types'
import { standardNormal } from '../engine/rng'

interface FixtureSet {
  players: Player[]
}

/**
 * Fixture files (step 2: NFL, later: MLB, PGA, ...) call registerFixtures()
 * when imported. Keeping this as a registry rather than static imports lets
 * the provider compile before any fixtures exist and lets each sport's
 * fixtures live in their own file under src/fixtures/<sport>/.
 */
const fixtureRegistry: Partial<Record<SportId, FixtureSet>> = {}

export function registerFixtures(sport: SportId, fixtures: FixtureSet): void {
  fixtureRegistry[sport] = fixtures
}

export class SeedDataProvider implements DataProvider {
  async getPlayers(sport: SportId): Promise<Player[]> {
    const fixtures = fixtureRegistry[sport]
    if (!fixtures) {
      throw new Error(`SeedDataProvider: no fixtures registered for sport "${sport}" yet`)
    }
    return fixtures.players
  }

  async getProjection(sport: SportId, playerId: string): Promise<Projection> {
    const players = await this.getPlayers(sport)
    const player = players.find((p) => p.id === playerId)
    if (!player) {
      throw new Error(`SeedDataProvider: unknown player "${playerId}" for sport "${sport}"`)
    }
    return player.projection
  }

  requiredDrawCount(players: Player[]): number {
    return players.reduce((sum, p) => sum + Object.keys(p.projection).length * 2, 0)
  }

  /** Samples each stat category from a normal-ish curve fit to its { floor, mean, ceiling }. */
  generateStatLines(
    _sport: SportId,
    period: number,
    players: Player[],
    draws: number[],
  ): StatLine[] {
    let cursor = 0
    return players.map((player) => {
      const stats: Record<string, number> = {}
      for (const [statKey, range] of Object.entries(player.projection)) {
        const u1 = draws[cursor++]
        const u2 = draws[cursor++]
        const z = standardNormal(u1, u2)
        const { mean, floor: lo, ceiling: hi } = range
        const spread = (z >= 0 ? hi - mean : mean - lo) * 0.5
        stats[statKey] = Math.max(0, Math.round((mean + z * spread) * 100) / 100)
      }
      return { playerId: player.id, period, stats }
    })
  }
}
