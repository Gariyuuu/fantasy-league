import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useLeagueStore } from '../store/useLeagueStore'
import { LeagueNav } from '../components/LeagueNav'
import { projectedPoints } from '../engine/valuation'
import { LeagueBackdrop } from '../components/LeagueBackdrop'
import { FIELD_NOUN, SPORT_ICONS } from '../components/sportMeta'
import { LiveScoresTicker } from '../components/LiveScoresTicker'
import { LoadingLeague } from '../components/LoadingLeague'

export function EventLobbyPage() {
  const { leagueId } = useParams<{ leagueId: string }>()
  const state = useLeagueStore((s) => s.state)
  const loadLeague = useLeagueStore((s) => s.loadLeague)
  const saveHumanLineup = useLeagueStore((s) => s.saveHumanLineup)

  useEffect(() => {
    if (leagueId && state?.id !== leagueId) {
      void loadLeague(leagueId)
    }
  }, [leagueId, state?.id, loadLeague])

  const humanTeam = state?.teams.find((t) => t.isHuman)
  const fieldSize = state?.config.fieldSize ?? 0
  const cap = state?.config.salaryCap ?? 0

  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [savedAt, setSavedAt] = useState<number | null>(null)

  useEffect(() => {
    if (!state || !humanTeam) return
    const existing = humanTeam.lineups[state.currentPeriod]
    setSelected(new Set(existing?.entries.map((e) => e.playerId) ?? []))
  }, [state, humanTeam])

  const weights = state?.config.scoringPresets[state.scoringPreset].weights ?? {}
  const golfers = useMemo(() => {
    if (!state) return []
    return Object.values(state.players)
      .map((p) => ({ player: p, value: projectedPoints(p.projection, weights) }))
      .sort((a, b) => b.value - a.value)
  }, [state, weights])

  if (!state || state.id !== leagueId || !humanTeam) {
    return <LoadingLeague />
  }

  const spent = [...selected].reduce((sum, id) => sum + (state.players[id]?.salary ?? 0), 0)
  const remaining = cap - spent

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        if (next.size >= fieldSize) return prev
        const salary = state!.players[id]?.salary ?? 0
        if (salary > remaining) return prev
        next.add(id)
      }
      return next
    })
    setSavedAt(null)
  }

  async function handleSave() {
    await saveHumanLineup({
      teamId: humanTeam!.id,
      period: state!.currentPeriod,
      entries: [...selected].map((playerId) => ({ playerId, slot: 'FIELD' })),
    })
    setSavedAt(Date.now())
  }

  return (
    <LeagueBackdrop sport={state.sport} className="p-6">
      <div className="mx-auto max-w-3xl space-y-4">
        <LeagueNav state={state} />

        <LiveScoresTicker sport={state.sport} />

        <div className="app-card flex items-center justify-between px-4 py-3">
          <div className="text-sm text-zinc-400">
            {SPORT_ICONS[state.sport]} {state.config.season.periodLabel} {state.currentPeriod} — pick {fieldSize}{' '}
            {FIELD_NOUN[state.sport] ?? 'players'} under the salary cap
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="stat-number text-zinc-300">
              {selected.size}/{fieldSize} picked
            </span>
            <span className={`stat-number ${remaining < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
              ${remaining.toLocaleString()} left of ${cap.toLocaleString()}
            </span>
            {savedAt && <span className="text-xs font-semibold text-emerald-400">✓ Saved</span>}
            <button
              type="button"
              disabled={selected.size !== fieldSize}
              onClick={() => void handleSave()}
              className="btn-primary px-4 py-2 text-sm"
            >
              Save Field
            </button>
          </div>
        </div>

        <div className="app-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800/80 text-left text-xs font-bold uppercase tracking-wide text-zinc-500">
                <th className="px-3 py-2.5"></th>
                <th className="px-3 py-2.5">Name</th>
                <th className="px-3 py-2.5 text-right">Salary</th>
                <th className="px-3 py-2.5 text-right">Proj.</th>
              </tr>
            </thead>
            <tbody>
              {golfers.map(({ player, value }) => {
                const isSelected = selected.has(player.id)
                const salary = player.salary ?? 0
                const disabled = !isSelected && (selected.size >= fieldSize || salary > remaining)
                return (
                  <tr
                    key={player.id}
                    className={`cursor-pointer border-b border-zinc-800/50 transition-colors ${isSelected ? 'bg-emerald-500/10' : 'hover:bg-zinc-800/40'} ${disabled ? 'opacity-40' : ''}`}
                    onClick={() => !disabled && toggle(player.id)}
                  >
                    <td className="px-3 py-2">
                      <input type="checkbox" checked={isSelected} disabled={disabled} onChange={() => toggle(player.id)} className="accent-emerald-500" />
                    </td>
                    <td className="px-2 py-2 font-semibold text-zinc-200">{player.name}</td>
                    <td className="px-2 py-2 text-right font-mono font-bold text-zinc-400">${salary.toLocaleString()}</td>
                    <td className="px-2 py-2 text-right font-mono font-bold text-zinc-400">{value.toFixed(1)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </LeagueBackdrop>
  )
}
