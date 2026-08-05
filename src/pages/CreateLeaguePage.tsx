import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLeagueStore } from '../store/useLeagueStore'
import { sportConfigs } from '../config/sports'
import type { Difficulty, ScoringPresetId, SportId } from '../types'

const ALL_SPORTS: { id: SportId; label: string; engine: string }[] = [
  { id: 'nfl', label: 'NFL', engine: 'Head-to-head weekly' },
  { id: 'cfb', label: 'College Football', engine: 'Head-to-head weekly' },
  { id: 'epl', label: 'Soccer (EPL)', engine: 'Head-to-head weekly' },
  { id: 'mlb', label: 'MLB', engine: 'Daily rolling points' },
  { id: 'wnba', label: 'WNBA', engine: 'Daily rolling points' },
  { id: 'mls', label: 'MLS', engine: 'Daily rolling points' },
  { id: 'pga', label: 'PGA Tour', engine: 'Salary-cap field' },
  { id: 'tennis', label: 'Tennis', engine: 'Salary-cap field' },
  { id: 'nascar', label: 'NASCAR Cup', engine: 'Salary-cap field' },
]

export function CreateLeaguePage() {
  const navigate = useNavigate()
  const createLeague = useLeagueStore((s) => s.createLeague)
  const [name, setName] = useState('My League')
  const [humanTeamName, setHumanTeamName] = useState('My Team')
  const [sport, setSport] = useState<SportId>('nfl')
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

  return (
    <div className="min-h-svh bg-zinc-950 p-8 text-zinc-200">
      <div className="mx-auto max-w-xl">
        <h1 className="mb-6 text-2xl font-semibold text-zinc-50">Create League</h1>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="mb-1 block text-sm text-zinc-400" htmlFor="league-name">
              League name
            </label>
            <input
              id="league-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-zinc-100 focus:border-emerald-500 focus:outline-none"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-zinc-400" htmlFor="team-name">
              Your team name
            </label>
            <input
              id="team-name"
              value={humanTeamName}
              onChange={(e) => setHumanTeamName(e.target.value)}
              className="w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-zinc-100 focus:border-emerald-500 focus:outline-none"
              required
            />
          </div>

          <div>
            <p className="mb-2 block text-sm text-zinc-400">Sport (in season now)</p>
            <div className="grid grid-cols-3 gap-2">
              {ALL_SPORTS.map((s) => {
                const available = Boolean(sportConfigs[s.id])
                const selected = sport === s.id
                return (
                  <button
                    type="button"
                    key={s.id}
                    disabled={!available}
                    onClick={() => setSport(s.id)}
                    className={`rounded-md border px-3 py-2 text-left text-sm ${
                      selected
                        ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300'
                        : available
                          ? 'border-zinc-800 bg-zinc-900 text-zinc-200 hover:border-zinc-700'
                          : 'cursor-not-allowed border-zinc-900 bg-zinc-950 text-zinc-700'
                    }`}
                  >
                    <div className="font-medium">{s.label}</div>
                    <div className="text-xs opacity-70">{available ? s.engine : 'Coming soon'}</div>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm text-zinc-400" htmlFor="scoring">
                Scoring
              </label>
              <select
                id="scoring"
                value={scoringPreset}
                onChange={(e) => setScoringPreset(e.target.value as ScoringPresetId)}
                className="w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-zinc-100"
              >
                <option value="standard">Standard</option>
                <option value="ppr">PPR</option>
                <option value="custom">Custom</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm text-zinc-400" htmlFor="difficulty">
                AI difficulty
              </label>
              <select
                id="difficulty"
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as Difficulty)}
                className="w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-zinc-100"
              >
                <option value="casual">Casual</option>
                <option value="normal">Normal</option>
                <option value="sharp">Sharp</option>
              </select>
            </div>
          </div>

          <p className="text-xs text-zinc-500">8-team league: you + 7 AI managers.</p>

          <button
            type="submit"
            disabled={isCreating}
            className="w-full rounded-md bg-emerald-500 px-4 py-2 font-medium text-zinc-950 hover:bg-emerald-400 disabled:opacity-50"
          >
            {isCreating ? 'Creating…' : 'Create League'}
          </button>
        </form>
      </div>
    </div>
  )
}
