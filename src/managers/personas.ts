import type { AIPersona, Manager } from '../types'
import { AIManager } from './AIManager'
import { HumanManager } from './HumanManager'

export const HUMAN_MANAGER_ID = 'human'

/**
 * Seven distinct drafting strategies. Required by spec: at least one that
 * reaches for a favorite position (Ace), one strict best-player-available
 * (Ice), one that panics on positional runs (Blitz).
 */
export const AI_PERSONAS: AIPersona[] = [
  {
    name: 'Ice Callahan',
    avatar: '🧊',
    aggression: 0.2,
    riskTolerance: 0.5,
    positionBias: {},
    tradeGreed: 0.3,
    waiverActivity: 0.4,
    runPanic: 0.1,
  },
  {
    name: 'Blitz Okafor',
    avatar: '🚨',
    aggression: 0.6,
    riskTolerance: 0.5,
    positionBias: {},
    tradeGreed: 0.4,
    waiverActivity: 0.6,
    runPanic: 0.9,
  },
  {
    name: 'Ace Delgado',
    avatar: '🎯',
    aggression: 0.7,
    riskTolerance: 0.55,
    positionBias: { WR: 1.5 },
    tradeGreed: 0.5,
    waiverActivity: 0.5,
    runPanic: 0.2,
  },
  {
    name: 'Gramps Renwick',
    avatar: '👴',
    aggression: 0.5,
    riskTolerance: 0.3,
    positionBias: { RB: 1.4 },
    tradeGreed: 0.6,
    waiverActivity: 0.3,
    runPanic: 0.3,
  },
  {
    name: 'Nova Sharpton',
    avatar: '💥',
    aggression: 0.55,
    riskTolerance: 0.9,
    positionBias: {},
    tradeGreed: 0.3,
    waiverActivity: 0.7,
    runPanic: 0.2,
  },
  {
    name: 'Rook Voss',
    avatar: '🛡️',
    aggression: 0.3,
    riskTolerance: 0.15,
    positionBias: {},
    tradeGreed: 0.4,
    waiverActivity: 0.4,
    runPanic: 0.15,
  },
  {
    name: 'Chaos Marchetti',
    avatar: '🎲',
    aggression: 0.95,
    riskTolerance: 0.6,
    positionBias: { TE: 1.2, QB: 1.2 },
    tradeGreed: 0.2,
    waiverActivity: 0.9,
    runPanic: 0.5,
  },
]

export interface ManagerSet {
  managers: Record<string, Manager>
  personas: Record<string, AIPersona | null>
}

/** Fresh managers + personas for a brand-new league. */
export function createManagers(): ManagerSet {
  const managers: Record<string, Manager> = { [HUMAN_MANAGER_ID]: new HumanManager(HUMAN_MANAGER_ID) }
  const personas: Record<string, AIPersona | null> = { [HUMAN_MANAGER_ID]: null }
  AI_PERSONAS.forEach((persona, i) => {
    const id = `ai-${i + 1}`
    managers[id] = new AIManager(id, persona)
    personas[id] = persona
  })
  return { managers, personas }
}

/** Rebuilds manager instances from a loaded league's stored personas (e.g. after a page reload). */
export function managersFromPersonas(personas: Record<string, AIPersona | null>): Record<string, Manager> {
  const managers: Record<string, Manager> = {}
  for (const [id, persona] of Object.entries(personas)) {
    managers[id] = persona ? new AIManager(id, persona) : new HumanManager(id)
  }
  return managers
}
