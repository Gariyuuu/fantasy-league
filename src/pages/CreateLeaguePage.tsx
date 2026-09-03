import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLeagueStore } from '../store/useLeagueStore'
import { sportConfigs } from '../config/sports'
import { SPORT_ICONS } from '../components/sportMeta'
import { isInSeasonNow, formatSeasonOpensLabel } from '../utils/seasonWindow'
import type { Difficulty, ScoringPresetId, SportId } from '../types'

const ALL_SPORTS: { id: SportId; label: string; engine: string }[] = [
  { id: 'nfl', label: 'NFL', engine: 'Head-to-head weekly' },
  { id: 'cfb', label: 'College Football', engine: 'Head-to-head weekly' },
  { id: 'epl', label: 'Soccer (EPL)', engine: 'Head-to-head weekly' },
  { id: 'mlb', label: 'MLB', engine: 'Daily rolling points' },
  { id: 'wnba', label: 'WNBA', engine: 'Daily rolling points' },
  { id: 'nba', label: 'NBA', engine: 'Daily rolling points' },
  { id: 'mls', label: 'MLS', engine: 'Daily rolling points' },
  { id: 'pga', label: 'PGA Tour', engine: 'Salary-cap field' },
  { id: 'tennis', label: 'Tennis', engine: 'Salary-cap field' },
  { id: 'nascar', label: 'NASCAR Cup', engine: 'Salary-cap field' },
]

function isSelectable(id: SportId): boolean {
  const config = sportConfigs[id]
  return Boolean(config) && isInSeasonNow(config!)
}

const DEFAULT_SPORT: SportId = ALL_SPORTS.find((s) => isSelectable(s.id))?.id ?? 'nfl'

export function CreateLeaguePage() {
  const navigate = useNavigate()
  const createLeague = useLeagueStore((s) => s.createLeague)
  const [name, setName] = useState('My League')
  const [humanTeamName, setHumanTeamName] = useState('My Team')
  const [sport, setSport] = useState<SportId>(DEFAULT_SPORT)
  const [scoringPreset, setScoringPreset] = useState<ScoringPresetId>('standard')
  const [difficulty, setDifficulty] = useState<Difficulty>('normal')
  const [isCreating, setIsCreating] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setIsCreating(true)
    const id = await createLeague({ name, humanTeamName, sport, scoringPreset, difficulty })
    // Engine C has no draft — it opens straight to the season dashboard,
    // same landing spot other engines reach after their draft completes.
    const skipsDraft = sportConfigs[sport]?.draft.type === 'none'
    navigate(skipsDraft ? `/league/${id}/season` : `/league/${id}/draft`)
  }

  const inputClass =
    'w-full rounded-xl border border-input bg-zinc-900/70 px-3.5 py-2.5 text-zinc-100 placeholder:text-zinc-600 transition-colors focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20'

  return (
    <div className="min-h-svh p-8">
      <div className="mx-auto max-w-xl">
        <h1 className="mb-1 text-3xl font-black tracking-tight">
          <span className="gradient-text">Create League</span>
        </h1>
        <p className="mb-6 text-sm text-zinc-500">Pick a sport, name your team, and go.</p>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="app-card grid grid-cols-2 gap-4 p-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-400" htmlFor="league-name">
                League name
              </label>
              <input id="league-name" value={name} onChange={(e) => setName(e.target.value)} className={inputClass} required />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-400" htmlFor="team-name">
                Your team name
              </label>
              <input
                id="team-name"
                value={humanTeamName}
                onChange={(e) => setHumanTeamName(e.target.value)}
                className={inputClass}
                required
              />
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-zinc-400">
              Sport <span className="text-zinc-600">— options open automatically when that sport's real season starts</span>
            </p>
            <div className="grid grid-cols-3 gap-2.5">
              {ALL_SPORTS.map((s) => {
                const config = sportConfigs[s.id]
                const available = Boolean(config) && isInSeasonNow(config!)
                const selected = sport === s.id
                const statusLabel = !config ? 'Coming soon' : formatSeasonOpensLabel(config)
                return (
                  <button
                    type="button"
                    key={s.id}
                    disabled={!available}
                    onClick={() => setSport(s.id)}
                    className={`rounded-xl border p-3 text-left text-sm transition-all ${
                      selected
                        ? 'border-emerald-500 bg-gradient-to-b from-emerald-500/15 to-emerald-500/5 text-emerald-300 shadow-lg shadow-emerald-500/10'
                        : available
                          ? 'border-zinc-800 bg-zinc-900/70 text-zinc-200 hover:-translate-y-0.5 hover:border-zinc-700 hover:bg-zinc-900'
                          : 'cursor-not-allowed border-zinc-900 bg-zinc-950/50 text-zinc-700'
                    }`}
                  >
                    <div className="mb-1 text-xl">{SPORT_ICONS[s.id]}</div>
                    <div className="font-semibold">{s.label}</div>
                    <div className={`text-xs ${available ? 'font-semibold text-emerald-400' : 'opacity-70'}`}>{statusLabel}</div>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="app-card grid grid-cols-2 gap-4 p-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-400" htmlFor="scoring">
                Scoring
              </label>
              <select id="scoring" value={scoringPreset} onChange={(e) => setScoringPreset(e.target.value as ScoringPresetId)} className={inputClass}>
                <option value="standard">Standard</option>
                <option value="ppr">PPR</option>
                <option value="custom">Custom</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-400" htmlFor="difficulty">
                AI difficulty
              </label>
              <select id="difficulty" value={difficulty} onChange={(e) => setDifficulty(e.target.value as Difficulty)} className={inputClass}>
                <option value="casual">Casual</option>
                <option value="normal">Normal</option>
                <option value="sharp">Sharp</option>
              </select>
            </div>
          </div>

          <p className="flex items-center gap-1.5 text-xs text-zinc-500">
            <span>👥</span> 8-team league: you + 7 AI managers.
          </p>

          <button type="submit" disabled={isCreating} className="btn-primary w-full text-base">
            {isCreating ? 'Creating…' : 'Create League'}
          </button>
        </form>
      </div>
    </div>
  )
}
