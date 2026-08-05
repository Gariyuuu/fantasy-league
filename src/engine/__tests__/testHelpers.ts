import { applyAction, createEmptyLeagueState } from '../reducer'
import type { DraftPickPayload, DraftStartPayload, LeagueCreatePayload, LineupSetPayload, PeriodAdvancePayload } from '../reducer'
import type { Action, LeagueState, Pick, SportId } from '../../types'
import { getSportConfig } from '../../config/sports'
import { createManagers, managersFromPersonas } from '../../managers/personas'
import { HumanManager } from '../../managers/HumanManager'
import { buildDraftOrder, draftRounds, isDraftComplete, teamIdForOverall } from '../draft'
import { rankAvailablePlayers, shortlistDrawCount } from '../valuation'
import { requiredLineupDraws } from '../lineup'
import { requiredSalaryCapDraws } from '../salaryCap'
import { regularSeasonWeeks } from '../playoffs'
import { drawUniform } from '../rng'
import { SeedDataProvider } from '../../data/SeedDataProvider'
import '../../fixtures/nfl/players'
import '../../fixtures/mlb/players'
import '../../fixtures/pga/players'

/** Just LEAGUE_CREATE, for engine C sports which have no draft — mirrors createLeague() + the reducer's skip-draft branch. */
export async function createLeagueOnly(seed: number, sport: SportId): Promise<LeagueState> {
  const config = getSportConfig(sport)
  const provider = new SeedDataProvider()
  const players = await provider.getPlayers(sport)
  const playersById = Object.fromEntries(players.map((p) => [p.id, p]))
  const { personas } = createManagers()
  const teams = Object.entries(personas).map(([managerId, persona], i) => ({
    id: `team-${i + 1}`,
    managerId,
    name: persona ? persona.name : 'Human',
    isHuman: persona === null,
    roster: [],
    lineups: {},
    faabBudget: 100,
    waiverPriority: i + 1,
    record: { wins: 0, losses: 0, ties: 0 },
    points: 0,
  }))

  return applyAction(createEmptyLeagueState('test-league', seed), {
    type: 'LEAGUE_CREATE',
    managerId: 'system',
    timestamp: 1,
    payload: {
      name: 'Test League',
      config,
      scoringPreset: 'standard',
      difficulty: 'normal',
      teams,
      players: playersById,
      managerPersonas: personas,
    },
  } as Action<LeagueCreatePayload>)
}

/**
 * Mirrors the store's draft turn loop, minus timers and persistence, so the
 * core draft logic (reducer, valuation, snake order, Manager
 * implementations) is testable without mounting React or waiting on
 * wall-clock delays. The human seat auto-picks best-available so the whole
 * draft runs synchronously. Shared by draftFlow.test.ts and
 * seasonSim.test.ts — not itself a .test.ts file, so vitest won't try to
 * run it (and importing it doesn't re-register another file's tests).
 */
export async function simulateDraft(seed: number, sport: SportId = 'nfl'): Promise<LeagueState> {
  const config = getSportConfig(sport)
  const provider = new SeedDataProvider()
  const players = await provider.getPlayers(sport)
  const playersById = Object.fromEntries(players.map((p) => [p.id, p]))
  const { managers, personas } = createManagers()
  const teams = Object.entries(personas).map(([managerId, persona], i) => ({
    id: `team-${i + 1}`,
    managerId,
    name: persona ? persona.name : 'Human',
    isHuman: persona === null,
    roster: [],
    lineups: {},
    faabBudget: 100,
    waiverPriority: i + 1,
    record: { wins: 0, losses: 0, ties: 0 },
    points: 0,
  }))

  let state = applyAction(createEmptyLeagueState('test-league', seed), {
    type: 'LEAGUE_CREATE',
    managerId: 'system',
    timestamp: 1,
    payload: {
      name: 'Test League',
      config,
      scoringPreset: 'standard',
      difficulty: 'normal',
      teams,
      players: playersById,
      managerPersonas: personas,
    },
  } as Action<LeagueCreatePayload>)

  const { order, drawsUsed } = buildDraftOrder(
    teams.map((t) => t.id),
    state.seed,
    state.rngCursor,
  )
  state = applyAction(state, {
    type: 'DRAFT_START',
    managerId: 'system',
    timestamp: 2,
    payload: { order, rngDraws: drawsUsed },
  } as Action<DraftStartPayload>)

  const rounds = draftRounds(config)
  const teamCount = order.length

  while (!isDraftComplete(state.draft, teamCount, rounds)) {
    const teamId = teamIdForOverall(state.draft.order, state.draft.currentOverall)
    const team = state.teams.find((t) => t.id === teamId)
    if (!team) throw new Error('missing team')
    const manager = managers[team.managerId]

    let pick: Pick
    let rngDraws = 0
    if (team.isHuman) {
      const human = manager as HumanManager
      const pickPromise = human.makeDraftPick(state)
      const weights = state.config.scoringPresets[state.scoringPreset].weights
      const draftedIds = new Set(state.draft.picks.map((p) => p.playerId))
      const ranked = rankAvailablePlayers(Object.values(state.players), draftedIds, weights)
      human.submitDraftPick(ranked[0].player.id)
      pick = await pickPromise
    } else {
      const draftedIds = new Set(state.draft.picks.map((p) => p.playerId))
      const availableCount = Object.keys(state.players).length - draftedIds.size
      rngDraws = shortlistDrawCount(availableCount)
      pick = await manager.makeDraftPick(state, 60)
    }

    state = applyAction(state, {
      type: 'DRAFT_PICK',
      managerId: manager.id,
      timestamp: Date.now(),
      payload: { pick, rngDraws },
    } as Action<DraftPickPayload>)
  }

  state = applyAction(state, {
    type: 'DRAFT_COMPLETE',
    managerId: 'system',
    timestamp: Date.now(),
    payload: {},
  })

  return state
}

/**
 * Advances one period: every AI team recomputes its lineup, stat lines are
 * generated for the alive rostered pool, PERIOD_ADVANCE scores matchups,
 * then a PLAYOFFS_START/PLAYOFFS_ADVANCE phase transition fires if this
 * period crossed into or through the bracket. Mirrors the store's
 * advanceWeek(), minus persistence. `skipTeamIds` lets a test deliberately
 * withhold a lineup update to exercise the carry-forward fallback.
 */
export async function simulateWeek(state: LeagueState, skipTeamIds: string[] = []): Promise<LeagueState> {
  let current = state
  const period = current.currentPeriod
  const isPlayoffs = current.phase === 'playoffs'
  const managers = managersFromPersonas(current.managerPersonas)

  const aliveTeamIds =
    isPlayoffs && current.playoffs?.length
      ? new Set(current.playoffs[current.playoffs.length - 1].matchups.flatMap((m) => [m.homeTeamId, m.awayTeamId]))
      : new Set(current.teams.map((t) => t.id))

  for (const team of current.teams) {
    if (team.isHuman || skipTeamIds.includes(team.id) || !aliveTeamIds.has(team.id)) continue
    const manager = managers[team.managerId]
    const draws =
      current.config.engine === 'salaryCapField'
        ? requiredSalaryCapDraws(Object.keys(current.players).length)
        : requiredLineupDraws(current.config)
    const lineup = await manager.setLineup(current, period)
    current = applyAction(current, {
      type: 'LINEUP_SET',
      managerId: manager.id,
      timestamp: Date.now(),
      payload: { teamId: team.id, lineup, rngDraws: draws },
    } as Action<LineupSetPayload>)
  }

  const provider = new SeedDataProvider()
  const aliveTeams = current.teams.filter((t) => aliveTeamIds.has(t.id))
  const rosteredIds =
    current.config.engine === 'salaryCapField'
      ? [...new Set(aliveTeams.flatMap((t) => t.lineups[period]?.entries.map((e) => e.playerId) ?? []))]
      : [...new Set(aliveTeams.flatMap((t) => t.roster))]
  const players = rosteredIds.map((id) => current.players[id]).filter((p) => p !== undefined)
  const drawCount = provider.requiredDrawCount(players)
  const { values } = drawUniform(current.seed, current.rngCursor, drawCount)
  const statLines = provider.generateStatLines(current.sport, period, players, values)

  current = applyAction(current, {
    type: 'PERIOD_ADVANCE',
    managerId: 'system',
    timestamp: Date.now(),
    payload: { statLines, rngDraws: drawCount },
  } as Action<PeriodAdvancePayload>)

  if (isPlayoffs) {
    current = applyAction(current, { type: 'PLAYOFFS_ADVANCE', managerId: 'system', timestamp: Date.now(), payload: {} })
  } else if (current.currentPeriod > regularSeasonWeeks(current.config)) {
    // Bracket configured -> seed it. Otherwise (rolling-points / salary-cap
    // leagues have none) PLAYOFFS_ADVANCE with no bracket present just
    // crowns the standings leader and marks the league complete.
    current = current.config.playoffs
      ? applyAction(current, { type: 'PLAYOFFS_START', managerId: 'system', timestamp: Date.now(), payload: {} })
      : applyAction(current, { type: 'PLAYOFFS_ADVANCE', managerId: 'system', timestamp: Date.now(), payload: {} })
  }

  return current
}

/** Plays out every remaining period until the league reaches 'complete'. Safety-capped so a bug can't hang the test suite in an infinite loop. */
export async function simulateSeasonToCompletion(state: LeagueState): Promise<LeagueState> {
  let current = state
  let iterations = 0
  while (current.phase !== 'complete') {
    if (++iterations > 60) throw new Error('simulateSeasonToCompletion: exceeded safety cap without reaching "complete"')
    current = await simulateWeek(current)
  }
  return current
}
