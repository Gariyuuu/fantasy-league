import type {
  Action,
  AIPersona,
  Difficulty,
  LeagueState,
  Lineup,
  Matchup,
  Pick,
  Player,
  ScoringPresetId,
  SportConfig,
  StatLine,
  Team,
  TradeOffer,
  TradeResponse,
  WaiverClaim,
} from '../types'
import { buildOptimalLineup } from './lineup'
import { matchupsForPeriod } from './schedule'
import { computeCumulativeStandings, computeStandings } from './standings'
import { scoreStatLine } from './scoring'
import { processWaivers } from './waivers'
import { buildBracketRound, matchWinner, nextRoundPairings, seedPlayoffBracket } from './playoffs'

/**
 * Bootstraps an empty shell state. This is *not* itself logged as an action
 * — it's the substrate LEAGUE_CREATE is applied to. Everything after this
 * point flows through applyAction so the action log is a complete history.
 */
export function createEmptyLeagueState(id: string, seed: number): LeagueState {
  const now = Date.now()
  return {
    id,
    name: '',
    sport: 'nfl',
    config: undefined as unknown as SportConfig,
    scoringPreset: 'standard',
    size: 0,
    difficulty: 'normal',
    seed,
    rngCursor: 0,
    phase: 'setup',
    currentPeriod: 0,
    teams: [],
    managerPersonas: {},
    players: {},
    statLines: [],
    draft: {
      order: [],
      picks: [],
      currentOverall: 0,
      clockSeconds: 0,
      status: 'notStarted',
    },
    matchups: [],
    standings: [],
    waiverClaims: [],
    trades: [],
    actionLog: [],
    createdAt: now,
    updatedAt: now,
  }
}

export interface LeagueCreatePayload {
  name: string
  config: SportConfig
  scoringPreset: ScoringPresetId
  difficulty: Difficulty
  teams: Team[]
  players: Record<string, Player>
  managerPersonas: Record<string, AIPersona | null>
}

export interface DraftStartPayload {
  order: string[]
  rngDraws: number
}

export interface DraftPickPayload {
  pick: Pick
  rngDraws: number
}

export interface LineupSetPayload {
  teamId: string
  lineup: Lineup
  rngDraws: number
}

export interface PeriodAdvancePayload {
  statLines: StatLine[]
  rngDraws: number
}

export interface WaiverClaimSubmitPayload {
  claim: WaiverClaim
}

export interface TradeProposePayload {
  offer: TradeOffer
}

export interface TradeRespondPayload {
  response: TradeResponse
}

export interface TradeExecutePayload {
  tradeId: string
}

/**
 * applyAction is the ONLY place LeagueState is allowed to change. It is
 * pure: given the same (state, action) it always returns the same next
 * state, and it never mutates its inputs. This is what makes the action
 * log replayable and what will let v2 run the identical function
 * server-side.
 */
export function applyAction(state: LeagueState, action: Action): LeagueState {
  const withLog: LeagueState = {
    ...state,
    actionLog: [...state.actionLog, action],
    updatedAt: action.timestamp,
  }

  switch (action.type) {
    case 'LEAGUE_CREATE':
      return handleLeagueCreate(withLog, action as Action<LeagueCreatePayload>)
    case 'DRAFT_START':
      return handleDraftStart(withLog, action as Action<DraftStartPayload>)
    case 'DRAFT_PICK':
    case 'DRAFT_AUTOPICK':
      return handleDraftPick(withLog, action as Action<DraftPickPayload>)
    case 'DRAFT_COMPLETE':
      return handleDraftComplete(withLog)
    case 'LINEUP_SET':
      return handleLineupSet(withLog, action as Action<LineupSetPayload>)
    case 'PERIOD_ADVANCE':
      return handleAdvancePeriod(withLog, action as Action<PeriodAdvancePayload>)
    case 'WAIVER_CLAIM_SUBMIT':
      return handleWaiverClaimSubmit(withLog, action as Action<WaiverClaimSubmitPayload>)
    case 'WAIVER_PROCESS':
      return handleWaiverProcess(withLog)
    case 'TRADE_PROPOSE':
      return handleTradePropose(withLog, action as Action<TradeProposePayload>)
    case 'TRADE_RESPOND':
      return handleTradeRespond(withLog, action as Action<TradeRespondPayload>)
    case 'TRADE_EXECUTE':
      return handleTradeExecute(withLog, action as Action<TradeExecutePayload>)
    case 'PLAYOFFS_START':
      return handlePlayoffsStart(withLog)
    case 'PLAYOFFS_ADVANCE':
      return handlePlayoffsAdvance(withLog)

    // Commissioner handlers land in a later step. Each adds one case here
    // — the engine grows by extension, not by touching what already works.
    default:
      throw new Error(`applyAction: no handler implemented yet for "${action.type}"`)
  }
}

function handleLeagueCreate(
  state: LeagueState,
  action: Action<LeagueCreatePayload>,
): LeagueState {
  const { name, config, scoringPreset, difficulty, teams, players, managerPersonas } = action.payload

  // Engine C has no draft — there's no roster to build, just a fresh
  // salary-cap field picked each event — so skip predraft/drafting
  // entirely and open straight to event 1.
  const skipsDraft = config.draft.type === 'none'

  return {
    ...state,
    name,
    sport: config.id,
    config,
    scoringPreset,
    difficulty,
    size: teams.length,
    teams,
    players,
    managerPersonas,
    phase: skipsDraft ? 'regularSeason' : 'predraft',
    currentPeriod: skipsDraft ? 1 : state.currentPeriod,
  }
}

function handleDraftStart(state: LeagueState, action: Action<DraftStartPayload>): LeagueState {
  const { order, rngDraws } = action.payload
  return {
    ...state,
    phase: 'drafting',
    rngCursor: state.rngCursor + rngDraws,
    draft: {
      ...state.draft,
      order,
      status: 'inProgress',
      currentOverall: 0,
      clockSeconds: state.config.draft.pickTimeSeconds ?? 60,
    },
  }
}

function handleDraftPick(state: LeagueState, action: Action<DraftPickPayload>): LeagueState {
  const { pick, rngDraws } = action.payload
  const teams = state.teams.map((team) =>
    team.id === pick.teamId ? { ...team, roster: [...team.roster, pick.playerId] } : team,
  )
  return {
    ...state,
    teams,
    rngCursor: state.rngCursor + rngDraws,
    draft: {
      ...state.draft,
      picks: [...state.draft.picks, pick],
      currentOverall: state.draft.currentOverall + 1,
    },
  }
}

function handleDraftComplete(state: LeagueState): LeagueState {
  // Seed a sensible week-1 lineup for every team so the season dashboard
  // and standings are meaningful even if a manager never touches the
  // lineup editor. Noise-free (empty draws array) since this is a
  // one-time default, not a per-period AI decision.
  const weights = state.config.scoringPresets[state.scoringPreset].weights
  const teams = state.teams.map((team) => {
    const lineup = buildOptimalLineup(team, state.players, state.config, weights, 1, state.difficulty, [])
    return { ...team, lineups: { ...team.lineups, 1: lineup } }
  })

  return {
    ...state,
    teams,
    phase: 'regularSeason',
    currentPeriod: 1,
    draft: { ...state.draft, status: 'complete' },
  }
}

function handleLineupSet(state: LeagueState, action: Action<LineupSetPayload>): LeagueState {
  const { teamId, lineup, rngDraws } = action.payload
  const teams = state.teams.map((team) =>
    team.id === teamId ? { ...team, lineups: { ...team.lineups, [lineup.period]: lineup } } : team,
  )
  return { ...state, teams, rngCursor: state.rngCursor + rngDraws }
}

/** A team's lineup for `period`, carrying forward the most recent prior lineup if the manager never set one for this period. */
function resolveLineupForPeriod(team: Team, period: number): Lineup | null {
  if (team.lineups[period]) return team.lineups[period]
  for (let p = period - 1; p >= 1; p--) {
    if (team.lineups[p]) return { ...team.lineups[p], period }
  }
  return null
}

function scoreLineup(
  lineup: Lineup | null,
  config: SportConfig,
  statLinesByPlayer: Map<string, StatLine>,
  weights: Record<string, number>,
): number {
  if (!lineup) return 0
  const benchSlots = new Set(config.roster.filter((s) => s.isBench).map((s) => s.slot))
  let total = 0
  for (const entry of lineup.entries) {
    if (benchSlots.has(entry.slot)) continue
    const line = statLinesByPlayer.get(entry.playerId)
    if (line) total += scoreStatLine(line, weights)
  }
  return Math.round(total * 100) / 100
}

function handleAdvancePeriod(state: LeagueState, action: Action<PeriodAdvancePayload>): LeagueState {
  const { statLines, rngDraws } = action.payload
  const period = state.currentPeriod
  const weights = state.config.scoringPresets[state.scoringPreset].weights
  const statLinesByPlayer = new Map(statLines.map((s) => [s.playerId, s]))

  const withResults =
    state.config.engine === 'headToHead'
      ? applyHeadToHeadPeriod(state, period, statLinesByPlayer, weights)
      : applyCumulativePeriod(state, period, statLinesByPlayer, weights)

  return {
    ...withResults,
    statLines: [...state.statLines, ...statLines],
    rngCursor: state.rngCursor + rngDraws,
    currentPeriod: state.currentPeriod + 1,
  }
}

/** Weekly head-to-head box scores, standings, and (during playoffs) bracket progression. Engine A. */
function applyHeadToHeadPeriod(
  state: LeagueState,
  period: number,
  statLinesByPlayer: Map<string, StatLine>,
  weights: Record<string, number>,
): LeagueState {
  const isPlayoffs = state.phase === 'playoffs'
  const currentRound = isPlayoffs && state.playoffs ? state.playoffs[state.playoffs.length - 1] : undefined
  const pairings: [string, string][] = currentRound
    ? currentRound.matchups.map((m) => [m.homeTeamId, m.awayTeamId])
    : matchupsForPeriod(state.draft.order.length ? state.draft.order : state.teams.map((t) => t.id), period)

  const newMatchups: Matchup[] = pairings.map(([homeId, awayId]) => {
    const homeTeam = state.teams.find((t) => t.id === homeId)
    const awayTeam = state.teams.find((t) => t.id === awayId)
    if (!homeTeam || !awayTeam) throw new Error(`PERIOD_ADVANCE: missing team for matchup pairing`)
    return {
      period,
      homeTeamId: homeId,
      awayTeamId: awayId,
      homeScore: scoreLineup(resolveLineupForPeriod(homeTeam, period), state.config, statLinesByPlayer, weights),
      awayScore: scoreLineup(resolveLineupForPeriod(awayTeam, period), state.config, statLinesByPlayer, weights),
    }
  })

  const matchups = [...state.matchups, ...newMatchups]

  // Standings freeze once playoffs start — the bracket determines the
  // rest of the season from here, not the regular-season ladder.
  let standings = state.standings
  let teams = state.teams
  if (!isPlayoffs) {
    standings = computeStandings(state.teams, matchups)
    teams = state.teams.map((team) => {
      const entry = standings.find((s) => s.teamId === team.id)
      return {
        ...team,
        points: entry?.pointsFor ?? team.points,
        record: { wins: entry?.wins ?? 0, losses: entry?.losses ?? 0, ties: entry?.ties ?? 0 },
      }
    })
  }

  const playoffs = currentRound
    ? state.playoffs?.map((round, i) => (i === (state.playoffs?.length ?? 0) - 1 ? { ...round, matchups: newMatchups } : round))
    : state.playoffs

  return { ...state, teams, matchups, standings, playoffs }
}

/**
 * No opponent, no matchups — every team just scores its own period lineup
 * (a daily roster for engine B, or that event's salary-cap field for
 * engine C) and adds it to a running total. Standings are a pure
 * leaderboard on that total. Engines B and C.
 */
function applyCumulativePeriod(
  state: LeagueState,
  period: number,
  statLinesByPlayer: Map<string, StatLine>,
  weights: Record<string, number>,
): LeagueState {
  const teams = state.teams.map((team) => {
    const lineup = resolveLineupForPeriod(team, period)
    const periodScore = scoreLineup(lineup, state.config, statLinesByPlayer, weights)
    return { ...team, points: Math.round((team.points + periodScore) * 100) / 100 }
  })
  const standings = computeCumulativeStandings(teams)
  return { ...state, teams, standings }
}

/** Upsert: a team may only have one pending claim per period — resubmitting replaces it rather than stacking. */
function handleWaiverClaimSubmit(state: LeagueState, action: Action<WaiverClaimSubmitPayload>): LeagueState {
  const { claim } = action.payload
  const waiverClaims = state.waiverClaims.filter(
    (c) => !(c.teamId === claim.teamId && c.period === claim.period && c.status === 'pending'),
  )
  return { ...state, waiverClaims: [...waiverClaims, claim] }
}

function handleWaiverProcess(state: LeagueState): LeagueState {
  const { teams, claims } = processWaivers(state)
  return { ...state, teams, waiverClaims: claims }
}

function handleTradePropose(state: LeagueState, action: Action<TradeProposePayload>): LeagueState {
  return { ...state, trades: [...state.trades, action.payload.offer] }
}

const TRADE_STATUS_BY_DECISION: Record<TradeResponse['decision'], TradeOffer['status']> = {
  accept: 'accepted',
  decline: 'declined',
  counter: 'countered',
}

function handleTradeRespond(state: LeagueState, action: Action<TradeRespondPayload>): LeagueState {
  const { response } = action.payload
  const trades = state.trades.map((offer) =>
    offer.id === response.tradeId
      ? {
          ...offer,
          status: TRADE_STATUS_BY_DECISION[response.decision],
          reason: response.reason,
          counterOffer: response.counterOffer,
        }
      : offer,
  )
  return { ...state, trades }
}

function handleTradeExecute(state: LeagueState, action: Action<TradeExecutePayload>): LeagueState {
  const offer = state.trades.find((t) => t.id === action.payload.tradeId)
  if (!offer) throw new Error(`TRADE_EXECUTE: no trade found with id "${action.payload.tradeId}"`)

  const teams = state.teams.map((team) => {
    if (team.id === offer.fromTeamId) {
      return { ...team, roster: team.roster.filter((id) => !offer.give.includes(id)).concat(offer.receive) }
    }
    if (team.id === offer.toTeamId) {
      return { ...team, roster: team.roster.filter((id) => !offer.receive.includes(id)).concat(offer.give) }
    }
    return team
  })
  return { ...state, teams }
}

function handlePlayoffsStart(state: LeagueState): LeagueState {
  const teamCount = state.config.playoffs?.teamCount ?? 0
  const pairings = seedPlayoffBracket(state.standings, teamCount)
  const bracket = buildBracketRound(1, state.currentPeriod, pairings)
  return { ...state, phase: 'playoffs', playoffs: [bracket] }
}

function handlePlayoffsAdvance(state: LeagueState): LeagueState {
  const brackets = state.playoffs ?? []
  const current = brackets[brackets.length - 1]

  if (!current) {
    // No bracket for this sport — a cumulative-leaderboard engine (B/C),
    // or a head-to-head league with no playoffs configured. The season
    // just ends; the standings leader (win-loss ladder or cumulative
    // points, whichever this league uses) is champion.
    return { ...state, phase: 'complete', championTeamId: state.standings[0]?.teamId }
  }

  if (current.matchups.length === 1) {
    return { ...state, phase: 'complete', championTeamId: matchWinner(current.matchups[0]) }
  }

  const nextBracket = buildBracketRound(current.round + 1, state.currentPeriod, nextRoundPairings(current))
  return { ...state, playoffs: [...brackets, nextBracket] }
}

/**
 * Rebuilds state from scratch by replaying the action log minus its last
 * entry. This is the commissioner "undo" primitive: because applyAction is
 * pure and RNG is cursor-based, replaying a prefix of the log deterministically
 * reproduces everything that followed.
 */
export function undoLastAction(
  emptyState: LeagueState,
  fullLog: Action[],
): LeagueState {
  const prefix = fullLog.slice(0, -1)
  return prefix.reduce(applyAction, emptyState)
}
