import { beforeAll, describe, expect, it } from 'vitest'
import { SeedDataProvider } from '../SeedDataProvider'
import { getSportConfig } from '../../config/sports'
import { scoreStatLine } from '../../engine/scoring'
import { drawUniform } from '../../engine/rng'
import '../../fixtures/nfl/players'

const provider = new SeedDataProvider()

beforeAll(async () => {
  // fixtures/nfl/players registers on import above
})

describe('NFL fixtures', () => {
  it('loads a full, realistic-sized player pool', async () => {
    const players = await provider.getPlayers('nfl')
    expect(players.length).toBeGreaterThanOrEqual(300)
  })

  it('covers every roster-eligible position with enough depth for an 8-team league', async () => {
    const players = await provider.getPlayers('nfl')
    const config = getSportConfig('nfl')
    for (const pos of config.positions) {
      const count = players.filter((p) => p.positions.includes(pos)).length
      expect(count, `position ${pos}`).toBeGreaterThanOrEqual(32)
    }
  })

  it('has no duplicate player ids or names', async () => {
    const players = await provider.getPlayers('nfl')
    expect(new Set(players.map((p) => p.id)).size).toBe(players.length)
    expect(new Set(players.map((p) => p.name)).size).toBe(players.length)
  })

  it('generates deterministic stat lines from the same seed/cursor', async () => {
    const players = (await provider.getPlayers('nfl')).slice(0, 20)
    const drawCount = provider.requiredDrawCount(players)
    const { values } = drawUniform(2026, 0, drawCount)

    const linesA = provider.generateStatLines('nfl', 1, players, values)
    const linesB = provider.generateStatLines('nfl', 1, players, values)
    expect(linesA).toEqual(linesB)
  })

  it('scores QB stat lines differently under standard vs. PPR for a receiving player', async () => {
    const players = await provider.getPlayers('nfl')
    const wr = players.find((p) => p.positions.includes('WR'))!
    const drawCount = provider.requiredDrawCount([wr])
    const { values } = drawUniform(1, 0, drawCount)
    const [line] = provider.generateStatLines('nfl', 1, [wr], values)

    const config = getSportConfig('nfl')
    const standard = scoreStatLine(line, config.scoringPresets.standard.weights)
    const ppr = scoreStatLine(line, config.scoringPresets.ppr.weights)

    // PPR adds 1 point per reception on top of standard, so it should never
    // score lower, and strictly higher whenever the sampled line has catches.
    expect(ppr).toBeGreaterThanOrEqual(standard)
    if (line.stats.receptions > 0) {
      expect(ppr).toBeGreaterThan(standard)
    }
  })
})
