import { create } from 'zustand'
import type {
  Action,
  AIPersona,
  Difficulty,
  LeagueState,
  Lineup,
  Manager,
  Pick,
  Player,
  ScoringPresetId,
  SportId,
  Team,
  TradeOffer,
  TradeResponse,
} from '../types'
import { applyAction, createEmptyLeagueState } from '../engine/reducer'
import type {
  DraftPickPayload,
  DraftStartPayload,
  LeagueCreatePayload,
  LineupSetPayload,
  PeriodAdvancePayload,
  TradeExecutePayload,
  TradeProposePayload,
  TradeRespondPayload,
  WaiverClaimSubmitPayload,
} from '../engine/reducer'
import { buildDraftOrder, draftRounds, isDraftComplete, roundForOverall, teamIdForOverall } from '../engine/draft'
import { rankAvailablePlayers, shortlistDrawCount } from '../engine/valuation'
import { requiredLineupDraws } from '../engine/lineup'
import { requiredSalaryCapDraws } from '../engine/salaryCap'
import { drawUniform } from '../engine/rng'
import { regularSeasonWeeks } from '../engine/playoffs'
import { getSportConfig } from '../config/sports'
import { LocalJsonStorageAdapter } from '../storage/LocalJsonStorageAdapter'
import { SeedDataProvider } from '../data/SeedDataProvider'
import { createManagers, managersFromPersonas } from '../managers/personas'
import { HumanManager } from '../managers/HumanManager'

const storage = new LocalJsonStorageAdapter()
const dataProvider = new SeedDataProvider()

export interface CreateLeagueInput {
  name: string
  humanTeamName: string
  sport: SportId
  scoringPreset: ScoringPresetId
  difficulty: Difficulty
}

interface LeagueStore {
  state: LeagueState | null
  managers: Record<string, Manager>
  leagueSummaries: { id: string; name: string; sport: SportId; phase: LeagueState['phase']; updatedAt: number }[]
  isDrafting: boolean
  currentPickerTeamId: string | null
  draftClockSeconds: number
  isAdvancingWeek: boolean

  refreshLeagueList(): Promise<void>
  createLeague(input: CreateLeagueInput): Promise<string>
  loadLeague(id: string): Promise<void>
  startDraft(): Promise<void>
  submitHumanPick(playerId: string): void
  saveHumanLineup(lineup: Lineup): Promise<void>
  advanceWeek(): Promise<void>
  submitHumanWaiverClaim(input: { addPlayerId: string; dropPlayerId?: string; faabBid: number }): Promise<void>
  proposeTrade(input: { toTeamId: string; give: string[]; receive: string[] }): Promise<TradeResponse>
  acceptCounterOffer(tradeId: string): Promise<TradeResponse | null>
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** Races a human's pending draft pick against a per-second countdown, resolving null on timeout. */
function raceHumanPick(
  manager: HumanManager,
  state: LeagueState,
  pickTimeSeconds: number,
  onTick: (secondsLeft: number) => void,
): Promise<Pick | null> {
  return new Promise((resolve) => {
    let secondsLeft = pickTimeSeconds
    onTick(secondsLeft)
    const interval = setInterval(() => {
      secondsLeft -= 1
      onTick(Math.max(0, secondsLeft))
      if (secondsLeft <= 0) {
        clearInterval(interval)
        resolve(null)
      }
    }, 1000)

    manager.makeDraftPick(state).then((pick) => {
      clearInterval(interval)
      resolve(pick)
    })
  })
}

function buildTeams(humanTeamName: string, personas: Record<string, AIPersona | null>): Team[] {
  return Object.entries(personas).map(([managerId, persona], i) => ({
    id: `team-${i + 1}`,
    managerId,
    name: persona ? persona.name : humanTeamName,
    isHuman: persona === null,
    roster: [],
    lineups: {},
    faabBudget: 100,
    waiverPriority: i + 1,
    record: { wins: 0, losses: 0, ties: 0 },
    points: 0,
  }))
}

export const useLeagueStore = create<LeagueStore>((set, get) => ({
  state: null,
  managers: {},
  leagueSummaries: [],
  isDrafting: false,
  currentPickerTeamId: null,
  draftClockSeconds: 0,
  isAdvancingWeek: false,

  async refreshLeagueList() {
    const summaries = await storage.list()
    set({ leagueSummaries: summaries })
  },

  async createLeague(input) {
    const config = getSportConfig(input.sport)
    const players = await dataProvider.getPlayers(input.sport)
    const playersById = Object.fromEntries(players.map((p) => [p.id, p]))
    const { managers, personas } = createManagers()
    const teams = buildTeams(input.humanTeamName, personas)

    const id = crypto.randomUUID()
    const seed = Math.floor(Math.random() * 2 ** 31)
    const action: Action<LeagueCreatePayload> = {
      type: 'LEAGUE_CREATE',
      managerId: 'system',
      timestamp: Date.now(),
      payload: {
        name: input.name,
        config,
        scoringPreset: input.scoringPreset,
        difficulty: input.difficulty,
        teams,
        players: playersById,
        managerPersonas: personas,
      },
    }
    const state = applyAction(createEmptyLeagueState(id, seed), action)
    await storage.save(id, state)
    set({ state, managers })
    await get().refreshLeagueList()
    return id
  },

  async loadLeague(id) {
    const state = await storage.load(id)
    if (!state) throw new Error(`No league found with id "${id}"`)
    set({ state, managers: managersFromPersonas(state.managerPersonas) })

    // A page reload mid-draft leaves no turn loop running (it's only ever
    // started from the "Start Draft" click) — resume it so the draft
    // doesn't appear stuck. isDrafting guards against a double-resume if
    // this fires more than once in quick succession.
    if (state.phase === 'drafting' && !get().isDrafting) {
      void runDraftLoop(set, get)
    }
  },

  async startDraft() {
    const state = get().state
    if (!state || state.phase !== 'predraft' || get().isDrafting) return

    const teamIds = state.teams.map((t) => t.id)
    const { order, drawsUsed } = buildDraftOrder(teamIds, state.seed, state.rngCursor)
    const action: Action<DraftStartPayload> = {
      type: 'DRAFT_START',
      managerId: 'system',
      timestamp: Date.now(),
      payload: { order, rngDraws: drawsUsed },
    }
    const next = applyAction(state, action)
    await storage.save(next.id, next)
    set({ state: next })

    void runDraftLoop(set, get)
  },

  submitHumanPick(playerId) {
    const human = Object.values(get().managers).find((m): m is HumanManager => m instanceof HumanManager)
    human?.submitDraftPick(playerId)
  },

  async saveHumanLineup(lineup) {
    const state = get().state
    if (!state) return
    const action: Action<LineupSetPayload> = {
      type: 'LINEUP_SET',
      managerId: 'human',
      timestamp: Date.now(),
      payload: { teamId: lineup.teamId, lineup, rngDraws: 0 },
    }
    const next = applyAction(state, action)
    await storage.save(next.id, next)
    set({ state: next })
  },

  async submitHumanWaiverClaim(input) {
    const state = get().state
    const humanTeam = state?.teams.find((t) => t.isHuman)
    if (!state || !humanTeam) return
    const claim = {
      id: `waiver-${humanTeam.id}-${state.currentPeriod}`,
      teamId: humanTeam.id,
      addPlayerId: input.addPlayerId,
      dropPlayerId: input.dropPlayerId,
      faabBid: input.faabBid,
      period: state.currentPeriod,
      status: 'pending' as const,
    }
    const action: Action<WaiverClaimSubmitPayload> = {
      type: 'WAIVER_CLAIM_SUBMIT',
      managerId: 'human',
      timestamp: Date.now(),
      payload: { claim },
    }
    const next = applyAction(state, action)
    await storage.save(next.id, next)
    set({ state: next })
  },

  async proposeTrade(input) {
    const state = get().state
    const humanTeam = state?.teams.find((t) => t.isHuman)
    if (!state || !humanTeam) throw new Error('proposeTrade: no active league or human team')
    const offer: TradeOffer = {
      id: crypto.randomUUID(),
      fromTeamId: humanTeam.id,
      toTeamId: input.toTeamId,
      give: input.give,
      receive: input.receive,
      status: 'pending',
      createdAt: Date.now(),
    }
    return runTradeOffer(offer, set, get)
  },

  async acceptCounterOffer(tradeId) {
    const state = get().state
    if (!state) return null
    const original = state.trades.find((t) => t.id === tradeId)
    if (!original || original.status !== 'countered' || !original.counterOffer) return null

    const offer: TradeOffer = {
      id: crypto.randomUUID(),
      fromTeamId: original.fromTeamId,
      toTeamId: original.toTeamId,
      give: original.counterOffer.give,
      receive: original.counterOffer.receive,
      status: 'pending',
      createdAt: Date.now(),
    }
    return runTradeOffer(offer, set, get)
  },

  async advanceWeek() {
    if (get().isAdvancingWeek) return
    set({ isAdvancingWeek: true })
    try {
      const withOffers = get().state
      if (!withOffers) return
      const period = withOffers.currentPeriod
      const isPlayoffs = withOffers.phase === 'playoffs'

      // In playoffs, only teams still alive in the current bracket round
      // need a lineup or count toward stat generation — everyone else's
      // season is already over. Waivers are skipped entirely in the
      // playoffs (rosters lock for bracket integrity, a common
      // commissioner rule) rather than modeled as a per-league toggle.
      const aliveTeamIds =
        isPlayoffs && withOffers.playoffs?.length
          ? new Set(withOffers.playoffs[withOffers.playoffs.length - 1].matchups.flatMap((m) => [m.homeTeamId, m.awayTeamId]))
          : new Set(withOffers.teams.map((t) => t.id))

      // Waivers don't apply to engine C — there's no persistent roster to
      // add/drop from, just a fresh field picked each event.
      if (!isPlayoffs && withOffers.config.engine !== 'salaryCapField') {
        // Waivers process first, as a full FAAB batch: every AI team
        // submits at most one claim, then WAIVER_PROCESS resolves all of
        // this period's pending claims (the human's included) together.
        for (const team of withOffers.teams) {
          if (team.isHuman) continue
          const current = get().state
          if (!current) return
          const manager = get().managers[team.managerId]
          const claims = await manager.submitWaiverClaims(current)
          for (const claim of claims) {
            const action: Action<WaiverClaimSubmitPayload> = {
              type: 'WAIVER_CLAIM_SUBMIT',
              managerId: manager.id,
              timestamp: Date.now(),
              payload: { claim },
            }
            const next = applyAction(get().state ?? current, action)
            await storage.save(next.id, next)
            set({ state: next })
          }
        }
        const beforeProcess = get().state
        if (beforeProcess && beforeProcess.waiverClaims.some((c) => c.status === 'pending' && c.period === period)) {
          const processAction: Action<Record<string, never>> = {
            type: 'WAIVER_PROCESS',
            managerId: 'system',
            timestamp: Date.now(),
            payload: {},
          }
          const next = applyAction(beforeProcess, processAction)
          await storage.save(next.id, next)
          set({ state: next })
        }
      }

      // AI teams recompute their lineup for this period. The human's
      // lineup is whatever's already saved (or the reducer's
      // carry-forward fallback if they never touched it).
      for (const team of get().state?.teams ?? []) {
        if (team.isHuman || !aliveTeamIds.has(team.id)) continue
        const current = get().state
        if (!current) return
        const manager = get().managers[team.managerId]
        const draws =
          current.config.engine === 'salaryCapField'
            ? requiredSalaryCapDraws(Object.keys(current.players).length)
            : requiredLineupDraws(current.config)
        const lineup = await manager.setLineup(current, period)
        const action: Action<LineupSetPayload> = {
          type: 'LINEUP_SET',
          managerId: manager.id,
          timestamp: Date.now(),
          payload: { teamId: team.id, lineup, rngDraws: draws },
        }
        const next = applyAction(current, action)
        await storage.save(next.id, next)
        set({ state: next })
      }

      const afterLineups = get().state
      if (!afterLineups) return
      // Engine C has no persistent roster — the "field" for this period is
      // whatever's in each team's current lineup, not team.roster.
      const aliveTeams = afterLineups.teams.filter((t) => aliveTeamIds.has(t.id))
      const rosteredIds =
        afterLineups.config.engine === 'salaryCapField'
          ? [...new Set(aliveTeams.flatMap((t) => t.lineups[period]?.entries.map((e) => e.playerId) ?? []))]
          : [...new Set(aliveTeams.flatMap((t) => t.roster))]
      const players = rosteredIds
        .map((id) => afterLineups.players[id])
        .filter((p): p is Player => p !== undefined)
      const drawCount = dataProvider.requiredDrawCount(players)
      const { values } = drawUniform(afterLineups.seed, afterLineups.rngCursor, drawCount)
      const statLines = dataProvider.generateStatLines(afterLineups.sport, period, players, values)

      const advanceAction: Action<PeriodAdvancePayload> = {
        type: 'PERIOD_ADVANCE',
        managerId: 'system',
        timestamp: Date.now(),
        payload: { statLines, rngDraws: drawCount },
      }
      const advanced = applyAction(afterLineups, advanceAction)
      await storage.save(advanced.id, advanced)
      set({ state: advanced })

      // Phase transition: the regular season just ended and this sport
      // has a bracket configured -> seed it. Or a playoff round just
      // finished -> resolve it (advances the bracket, or crowns a
      // champion and marks the league complete).
      if (isPlayoffs) {
        const playoffsAdvanceAction: Action<Record<string, never>> = {
          type: 'PLAYOFFS_ADVANCE',
          managerId: 'system',
          timestamp: Date.now(),
          payload: {},
        }
        const next = applyAction(advanced, playoffsAdvanceAction)
        await storage.save(next.id, next)
        set({ state: next })
      } else if (advanced.currentPeriod > regularSeasonWeeks(advanced.config)) {
        // Regular season just ended. A bracket is configured -> seed it.
        // Otherwise (rolling-points / salary-cap leagues have none) the
        // season is simply over — PLAYOFFS_ADVANCE with no bracket present
        // crowns the standings leader and marks the league complete.
        const finalizeAction: Action<Record<string, never>> = advanced.config.playoffs
          ? { type: 'PLAYOFFS_START', managerId: 'system', timestamp: Date.now(), payload: {} }
          : { type: 'PLAYOFFS_ADVANCE', managerId: 'system', timestamp: Date.now(), payload: {} }
        const next = applyAction(advanced, finalizeAction)
        await storage.save(next.id, next)
        set({ state: next })
      }
    } finally {
      set({ isAdvancingWeek: false })
    }
  },
}))

/** Propose -> AI evaluates -> respond -> (if accepted) execute, all in one shot. Shared by proposeTrade() and acceptCounterOffer(). */
async function runTradeOffer(
  offer: TradeOffer,
  set: (partial: Partial<LeagueStore>) => void,
  get: () => LeagueStore,
): Promise<TradeResponse> {
  const proposeAction: Action<TradeProposePayload> = {
    type: 'TRADE_PROPOSE',
    managerId: 'human',
    timestamp: Date.now(),
    payload: { offer },
  }
  let state = get().state
  if (!state) throw new Error('runTradeOffer: no active league')
  state = applyAction(state, proposeAction)
  await storage.save(state.id, state)
  set({ state })

  const toTeam = state.teams.find((t) => t.id === offer.toTeamId)
  if (!toTeam) throw new Error(`runTradeOffer: no team found for id "${offer.toTeamId}"`)
  const manager = get().managers[toTeam.managerId]
  const response = await manager.respondToTrade(offer, state)

  const respondAction: Action<TradeRespondPayload> = {
    type: 'TRADE_RESPOND',
    managerId: manager.id,
    timestamp: Date.now(),
    payload: { response },
  }
  state = applyAction(state, respondAction)
  await storage.save(state.id, state)
  set({ state })

  if (response.decision === 'accept') {
    const executeAction: Action<TradeExecutePayload> = {
      type: 'TRADE_EXECUTE',
      managerId: 'system',
      timestamp: Date.now(),
      payload: { tradeId: offer.id },
    }
    state = applyAction(state, executeAction)
    await storage.save(state.id, state)
    set({ state })
  }

  return response
}

async function runDraftLoop(
  set: (partial: Partial<LeagueStore>) => void,
  get: () => LeagueStore,
): Promise<void> {
  set({ isDrafting: true })

  while (true) {
    const state = get().state
    if (!state) break
    const teamCount = state.draft.order.length
    const rounds = draftRounds(state.config)
    if (isDraftComplete(state.draft, teamCount, rounds)) break

    const teamId = teamIdForOverall(state.draft.order, state.draft.currentOverall)
    const team = state.teams.find((t) => t.id === teamId)
    if (!team) throw new Error(`runDraftLoop: no team found for id "${teamId}"`)
    const manager = get().managers[team.managerId]
    const pickTimeSeconds = state.config.draft.pickTimeSeconds ?? 60

    set({ currentPickerTeamId: teamId, draftClockSeconds: pickTimeSeconds })

    let pick: Pick
    let actionType: 'DRAFT_PICK' | 'DRAFT_AUTOPICK' = 'DRAFT_PICK'
    let rngDraws = 0

    if (team.isHuman) {
      const humanManager = manager as HumanManager
      const result = await raceHumanPick(humanManager, state, pickTimeSeconds, (secondsLeft) =>
        set({ draftClockSeconds: secondsLeft }),
      )
      if (result) {
        pick = result
      } else {
        humanManager.cancelPendingDraftPick()
        const weights = state.config.scoringPresets[state.scoringPreset].weights
        const draftedIds = new Set(state.draft.picks.map((p) => p.playerId))
        const ranked = rankAvailablePlayers(Object.values(state.players), draftedIds, weights)
        const top = ranked[0]
        pick = {
          round: roundForOverall(state.draft.currentOverall, teamCount),
          overall: state.draft.currentOverall,
          teamId,
          playerId: top.player.id,
          timestamp: Date.now(),
          autopick: true,
        }
        actionType = 'DRAFT_AUTOPICK'
      }
    } else {
      // Cosmetic delay so AI picks read as live rather than instant — does
      // not affect the deterministic decision itself, only when the UI
      // sees it resolve.
      await delay(600 + Math.random() * 900)
      const draftedIds = new Set(state.draft.picks.map((p) => p.playerId))
      const availableCount = Object.keys(state.players).length - draftedIds.size
      rngDraws = shortlistDrawCount(availableCount)
      pick = await manager.makeDraftPick(state, pickTimeSeconds)
    }

    const action: Action<DraftPickPayload> = {
      type: actionType,
      managerId: manager.id,
      timestamp: Date.now(),
      payload: { pick, rngDraws },
    }
    const next = applyAction(get().state ?? state, action)
    await storage.save(next.id, next)
    set({ state: next })
  }

  const finalState = get().state
  if (finalState) {
    const completeAction: Action<Record<string, never>> = {
      type: 'DRAFT_COMPLETE',
      managerId: 'system',
      timestamp: Date.now(),
      payload: {},
    }
    const finished = applyAction(finalState, completeAction)
    await storage.save(finished.id, finished)
    set({ state: finished })
  }

  set({ isDrafting: false, currentPickerTeamId: null, draftClockSeconds: 0 })
}
