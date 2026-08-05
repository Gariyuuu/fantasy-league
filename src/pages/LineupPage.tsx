import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useLeagueStore } from '../store/useLeagueStore'
import { LeagueNav } from '../components/LeagueNav'
import { positionColor } from '../components/draft/positionColors'
import { assignmentsFromLineup, buildOptimalLineup, expandSlotInstances, lineupFromAssignments } from '../engine/lineup'
import { projectedPoints } from '../engine/valuation'

export function LineupPage() {
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

  const instances = useMemo(() => (state ? expandSlotInstances(state.config) : []), [state])

  const defaultLineup = useMemo(() => {
    if (!state || !humanTeam) return null
    const weights = state.config.scoringPresets[state.scoringPreset].weights
    return (
      humanTeam.lineups[state.currentPeriod] ??
      buildOptimalLineup(humanTeam, state.players, state.config, weights, state.currentPeriod, 'sharp', [])
    )
  }, [state, humanTeam])

  const [assignments, setAssignments] = useState<Record<string, string>>({})
  const [savedAt, setSavedAt] = useState<number | null>(null)

  useEffect(() => {
    if (defaultLineup && instances.length > 0) {
      setAssignments(assignmentsFromLineup(defaultLineup, instances))
    }
  }, [defaultLineup, instances])

  if (!state || state.id !== leagueId || !humanTeam) {
    return <div className="flex min-h-svh items-center justify-center text-zinc-500">Loading league…</div>
  }

  const isPlayoffs = state.phase === 'playoffs'
  const isComplete = state.phase === 'complete'
  const currentBracketRound = state.playoffs?.[state.playoffs.length - 1]
  const humanIsAlive =
    !isPlayoffs || !currentBracketRound
      ? true
      : currentBracketRound.matchups.some((m) => m.homeTeamId === humanTeam.id || m.awayTeamId === humanTeam.id)

  if (isComplete || (isPlayoffs && !humanIsAlive)) {
    return (
      <div className="min-h-svh p-6">
        <div className="mx-auto max-w-3xl space-y-4">
          <LeagueNav state={state} />
          <div className="app-card p-6 text-center text-zinc-400">
            {isComplete ? 'The season is over.' : 'Your season is over — you were eliminated from the playoffs.'}{' '}
            <Link to={`/league/${state.id}/season`} className="text-emerald-400 hover:underline">
              View the standings and bracket
            </Link>
            .
          </div>
        </div>
      </div>
    )
  }

  const weights = state.config.scoringPresets[state.scoringPreset].weights

  function handleAssign(slotKey: string, playerId: string) {
    setAssignments((prev) => {
      const next = { ...prev }
      const fromKey = Object.keys(next).find((k) => next[k] === playerId)
      const displaced = next[slotKey]
      if (playerId === '') {
        delete next[slotKey]
      } else {
        next[slotKey] = playerId
      }
      if (fromKey && fromKey !== slotKey) {
        if (displaced) next[fromKey] = displaced
        else delete next[fromKey]
      }
      return next
    })
    setSavedAt(null)
  }

  async function handleSave() {
    const lineup = lineupFromAssignments(humanTeam!.id, state!.currentPeriod, assignments, instances)
    await saveHumanLineup(lineup)
    setSavedAt(Date.now())
  }

  const starterInstances = instances.filter((i) => !i.isBench)
  const benchInstances = instances.filter((i) => i.isBench)
  const allStartersFilled = starterInstances.every((i) => assignments[i.key])

  const rosterOptions = humanTeam.roster
    .map((id) => state.players[id])
    .filter((p) => p !== undefined)
    .sort((a, b) => projectedPoints(b.projection, weights) - projectedPoints(a.projection, weights))

  const renderRow = (inst: (typeof instances)[number]) => {
    const assignedId = assignments[inst.key]
    const assignedPlayer = assignedId ? state.players[assignedId] : null
    const eligibleOptions = inst.isBench
      ? rosterOptions
      : rosterOptions.filter((p) => p.positions.some((pos) => inst.eligiblePositions.includes(pos)))

    return (
      <div key={inst.key} className="flex items-center gap-3 border-b border-zinc-800/50 px-3.5 py-2.5">
        <span className={`w-14 shrink-0 rounded-md border px-1.5 py-0.5 text-center text-[10px] font-bold ${positionColor(inst.slot)}`}>
          {inst.slot}
        </span>
        <select
          value={assignedId ?? ''}
          onChange={(e) => handleAssign(inst.key, e.target.value)}
          className="flex-1 rounded-lg border border-zinc-800 bg-zinc-950/70 px-2.5 py-1.5 text-sm text-zinc-200 focus:border-emerald-500 focus:outline-none"
        >
          <option value="">— Empty —</option>
          {eligibleOptions.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} ({p.positions[0]}, {p.team}) — {projectedPoints(p.projection, weights).toFixed(1)} pts
            </option>
          ))}
        </select>
        {assignedPlayer?.status && assignedPlayer.status !== 'active' && (
          <span className="shrink-0 rounded-full bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-bold uppercase text-amber-300">
            {assignedPlayer.status}
          </span>
        )}
      </div>
    )
  }

  return (
    <div className="min-h-svh p-6">
      <div className="mx-auto max-w-3xl space-y-4">
        <LeagueNav state={state} />

        <div className="app-card flex items-center justify-between px-4 py-3">
          <p className="text-sm text-zinc-400">
            Setting your lineup for {state.config.season.periodLabel} {state.currentPeriod}
          </p>
          <div className="flex items-center gap-3">
            {savedAt && <span className="text-xs font-semibold text-emerald-400">✓ Saved</span>}
            {!allStartersFilled && <span className="text-xs font-semibold text-amber-400">Some starting slots are empty</span>}
            <button type="button" onClick={() => void handleSave()} className="btn-primary text-sm">
              Save Lineup
            </button>
          </div>
        </div>

        <div className="app-card">
          <div className="border-b border-zinc-800/80 px-3.5 py-2.5 text-xs font-bold uppercase tracking-wide text-zinc-500">
            Starters
          </div>
          {starterInstances.map(renderRow)}
        </div>

        <div className="app-card">
          <div className="border-b border-zinc-800/80 px-3.5 py-2.5 text-xs font-bold uppercase tracking-wide text-zinc-500">
            Bench
          </div>
          {benchInstances.map(renderRow)}
        </div>
      </div>
    </div>
  )
}
