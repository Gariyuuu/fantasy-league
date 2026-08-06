// ============================================================================
// Sports & scoring engines
//
// Every sport is a config object against one of three engines. Adding a
// sport = adding a SportConfig + fixtures, not new engine code.
// ============================================================================

export type EngineType = 'headToHead' | 'rollingPoints' | 'salaryCapField'

export type SportId =
  // Engine A — head-to-head weekly
  | 'nfl'
  | 'cfb'
  | 'epl'
  // Engine B — daily/rolling points
  | 'mlb'
  | 'wnba'
  | 'mls'
  // Engine C — salary-cap field selection
  | 'pga'
  | 'tennis'
  | 'nascar'

export type ScoringPresetId = 'standard' | 'ppr' | 'custom'

export interface ScoringRules {
  id: ScoringPresetId
  label: string
  /** stat key -> points per unit, e.g. { passingYards: 0.04, reception: 1 } */
  weights: Record<string, number>
}

export interface RosterSlotConfig {
  /** slot label, e.g. "QB", "FLEX", "BN", "UTIL" */
  slot: string
  eligiblePositions: string[]
  count: number
  isBench?: boolean
}

export interface DraftConfig {
  type: 'snake' | 'none'
  rounds?: number
  pickTimeSeconds?: number
}

export interface SportConfig {
  id: SportId
  label: string
  engine: EngineType
  season: {
    /** ISO date the season/first slate starts */
    startDate: string
    /** "Week" | "Day" | "Event" — used in UI period labels */
    periodLabel: string
    totalPeriods: number
  }
  /** Real-world calendar window (ISO dates, ~2026) this sport's actual season runs — independent of `season` above, which paces the in-app simulation. Used only to gate whether a sport is selectable at league creation ("opens" automatically once the real season starts). */
  realSeasonWindow: { start: string; end: string }
  positions: string[]
  roster: RosterSlotConfig[]
  /** engine C only: athletes picked per event */
  fieldSize?: number
  /** engine C only: salary budget per event */
  salaryCap?: number
  scoringPresets: Record<ScoringPresetId, ScoringRules>
  draft: DraftConfig
  lineupLock: 'perPlayerGameTime' | 'periodStart'
  /** Single-elimination bracket over the season's final N periods, seeded from final standings. Omit for sports with no bracket (e.g. salary-cap events). teamCount must be a power of 2. */
  playoffs?: {
    teamCount: number
    weeks: number
  }
}

// ============================================================================
// Players & stat generation
// ============================================================================

export interface StatRange {
  mean: number
  floor: number
  ceiling: number
}

/** stat key (e.g. "receptions", "rushingYards") -> per-period distribution */
export type Projection = Record<string, StatRange>

export interface Player {
  id: string
  sport: SportId
  name: string
  positions: string[]
  team: string
  projection: Projection
  status?: 'active' | 'questionable' | 'out' | 'ir'
  /** engine C: salary cost to field this athlete in an event */
  salary?: number
}

export interface StatLine {
  playerId: string
  period: number
  /** raw counting stats — deliberately NOT pre-scored. fantasyPoints is
   * computed on demand from a league's active ScoringRules.weights, so a
   * commissioner scoring edit correctly rescores every box score without
   * needing stat lines to be regenerated. */
  stats: Record<string, number>
}

// ============================================================================
// Rosters & lineups
// ============================================================================

/** week index (engine A), day index (engine B), or event index (engine C) */
export type Period = number

export interface RosterEntry {
  playerId: string
  slot: string
}

export interface Lineup {
  teamId: string
  period: Period
  entries: RosterEntry[]
}

export interface Team {
  id: string
  managerId: string
  name: string
  isHuman: boolean
  roster: string[]
  lineups: Record<Period, Lineup>
  faabBudget?: number
  waiverPriority?: number
  record?: { wins: number; losses: number; ties: number }
  points: number
}

// ============================================================================
// Draft
// ============================================================================

export interface Pick {
  round: number
  overall: number
  teamId: string
  playerId: string
  timestamp: number
  autopick?: boolean
}

export interface DraftState {
  order: string[]
  picks: Pick[]
  currentOverall: number
  clockSeconds: number
  status: 'notStarted' | 'inProgress' | 'complete'
}

// ============================================================================
// Matchups & standings
// ============================================================================

export interface Matchup {
  period: Period
  homeTeamId: string
  awayTeamId: string
  homeScore: number
  awayScore: number
}

export interface StandingsEntry {
  teamId: string
  rank: number
  wins?: number
  losses?: number
  ties?: number
  pointsFor: number
  pointsAgainst?: number
}

export interface PlayoffBracket {
  round: number
  matchups: Matchup[]
}

// ============================================================================
// Waivers & trades
// ============================================================================

export interface WaiverClaim {
  id: string
  teamId: string
  addPlayerId: string
  dropPlayerId?: string
  faabBid?: number
  priority?: number
  period: Period
  status: 'pending' | 'won' | 'lost' | 'cancelled'
}

export interface TradeOffer {
  id: string
  fromTeamId: string
  toTeamId: string
  give: string[]
  receive: string[]
  status: 'pending' | 'accepted' | 'declined' | 'countered' | 'cancelled'
  reason?: string
  createdAt: number
  /** Present when status is 'countered' — the terms the responder proposed instead, in the same give/receive convention as this offer. */
  counterOffer?: { give: string[]; receive: string[] }
}

export interface TradeResponse {
  tradeId: string
  decision: 'accept' | 'decline' | 'counter'
  reason: string
  counterOffer?: { give: string[]; receive: string[] }
}

// ============================================================================
// AI managers
// ============================================================================

export interface AIPersona {
  name: string
  avatar: string
  /** 0-1: how far above baseline value the manager reaches */
  aggression: number
  /** 0-1: preference for boom/bust vs. floor players */
  riskTolerance: number
  /** position -> preference multiplier applied to draft value */
  positionBias: Partial<Record<string, number>>
  /** 0-1: required surplus-value premium to accept a trade */
  tradeGreed: number
  /** 0-1: likelihood/size of waiver bids */
  waiverActivity: number
  /** 0-1: how much a run at a position inflates that position's perceived value on this manager's turn */
  runPanic?: number
}

export type Difficulty = 'casual' | 'normal' | 'sharp'

// ============================================================================
// Manager interface — the seam multiplayer will swap on.
//
// AIManager implements this locally. HumanManager (v1) resolves from UI
// input. In v2, RemoteManager resolves from a websocket message. Nothing
// else in the codebase should know the difference.
// ============================================================================

export interface Manager {
  id: string
  makeDraftPick(state: LeagueState, clock: number): Promise<Pick>
  setLineup(state: LeagueState, period: Period): Promise<Lineup>
  respondToTrade(offer: TradeOffer, state: LeagueState): Promise<TradeResponse>
  submitWaiverClaims(state: LeagueState): Promise<WaiverClaim[]>
}

// ============================================================================
// Actions & the reducer
//
// Every state mutation is a serializable action applied through
// applyAction(state, action) -> state. The ordered action log is the
// multiplayer sync primitive and the commissioner undo audit trail.
// ============================================================================

export type ActionType =
  | 'LEAGUE_CREATE'
  | 'DRAFT_START'
  | 'DRAFT_PICK'
  | 'DRAFT_AUTOPICK'
  | 'DRAFT_COMPLETE'
  | 'LINEUP_SET'
  | 'PERIOD_ADVANCE'
  | 'STATLINES_GENERATE'
  | 'WAIVER_CLAIM_SUBMIT'
  | 'WAIVER_PROCESS'
  | 'TRADE_PROPOSE'
  | 'TRADE_RESPOND'
  | 'TRADE_EXECUTE'
  | 'PLAYOFFS_START'
  | 'PLAYOFFS_ADVANCE'
  | 'SCORING_EDIT'
  | 'COMMISSIONER_FORCE_LINEUP'
  | 'COMMISSIONER_UNDO'

export interface Action<TPayload = unknown> {
  type: ActionType
  managerId: string | 'system' | 'commissioner'
  payload: TPayload
  timestamp: number
}

export type LeaguePhase =
  | 'setup'
  | 'predraft'
  | 'drafting'
  | 'regularSeason'
  | 'playoffs'
  | 'complete'

export interface LeagueState {
  id: string
  name: string
  sport: SportId
  config: SportConfig
  scoringPreset: ScoringPresetId
  size: number
  /** scales AI decision noise only — never hides information from AI managers */
  difficulty: Difficulty

  /** deterministic RNG: same seed + same action log = same season */
  seed: number
  rngCursor: number

  phase: LeaguePhase
  currentPeriod: Period

  teams: Team[]
  /** managerId -> persona, or null for the human manager */
  managerPersonas: Record<string, AIPersona | null>

  players: Record<string, Player>
  statLines: StatLine[]

  draft: DraftState
  matchups: Matchup[]
  standings: StandingsEntry[]
  waiverClaims: WaiverClaim[]
  trades: TradeOffer[]
  playoffs?: PlayoffBracket[]
  championTeamId?: string

  actionLog: Action[]
  createdAt: number
  updatedAt: number
}

// ============================================================================
// League summary (for storage list() and the league picker screen)
// ============================================================================

export interface LeagueSummary {
  id: string
  name: string
  sport: SportId
  phase: LeaguePhase
  updatedAt: number
}
