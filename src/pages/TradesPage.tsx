import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useLeagueStore } from '../store/useLeagueStore'
import { LeagueNav } from '../components/LeagueNav'
import { positionColor } from '../components/draft/positionColors'
import { projectedPoints } from '../engine/valuation'
import type { TradeResponse } from '../types'

export function TradesPage() {
  const { leagueId } = useParams<{ leagueId: string }>()
  const state = useLeagueStore((s) => s.state)
  const loadLeague = useLeagueStore((s) => s.loadLeague)
  const proposeTrade = useLeagueStore((s) => s.proposeTrade)
  const acceptCounterOffer = useLeagueStore((s) => s.acceptCounterOffer)

  const [targetTeamId, setTargetTeamId] = useState<string | null>(null)
  const [give, setGive] = useState<Set<string>>(new Set())
  const [receive, setReceive] = useState<Set<string>>(new Set())
  const [lastResponse, setLastResponse] = useState<TradeResponse | null>(null)
  const [isProposing, setIsProposing] = useState(false)

  useEffect(() => {
    if (leagueId && state?.id !== leagueId) {
      void loadLeague(leagueId)
    }
  }, [leagueId, state?.id, loadLeague])

  const humanTeam = state?.teams.find((t) => t.isHuman)
  const targetTeam = state?.teams.find((t) => t.id === targetTeamId)
  const weights = state?.config.scoringPresets[state.scoringPreset].weights ?? {}

  const value = (id: string) => (state ? projectedPoints(state.players[id].projection, weights) : 0)
  const giveValue = useMemo(() => [...give].reduce((s, id) => s + value(id), 0), [give, state])
  const receiveValue = useMemo(() => [...receive].reduce((s, id) => s + value(id), 0), [receive, state])

  if (!state || state.id !== leagueId || !humanTeam) {
    return <div className="flex min-h-svh items-center justify-center text-zinc-500">Loading league…</div>
  }

  function toggle(set: Set<string>, setSet: (s: Set<string>) => void, id: string) {
    const next = new Set(set)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSet(next)
  }

  function selectTarget(teamId: string) {
    setTargetTeamId(teamId)
    setGive(new Set())
    setReceive(new Set())
    setLastResponse(null)
  }

  async function handlePropose() {
    if (!targetTeamId || give.size === 0 || receive.size === 0) return
    setIsProposing(true)
    try {
      const response = await proposeTrade({ toTeamId: targetTeamId, give: [...give], receive: [...receive] })
      setLastResponse(response)
      if (response.decision === 'accept') {
        setGive(new Set())
        setReceive(new Set())
      }
    } finally {
      setIsProposing(false)
    }
  }

  async function handleAcceptCounter(tradeId: string) {
    setIsProposing(true)
    try {
      const response = await acceptCounterOffer(tradeId)
      setLastResponse(response)
    } finally {
      setIsProposing(false)
    }
  }

  const aiTeams = state.teams.filter((t) => !t.isHuman)
  const history = [...state.trades].sort((a, b) => b.createdAt - a.createdAt)

  const renderRoster = (roster: string[], selected: Set<string>, onToggle: (id: string) => void) => (
    <div className="max-h-80 overflow-y-auto">
      {roster.map((id) => {
        const player = state.players[id]
        if (!player) return null
        return (
          <label
            key={id}
            className="flex cursor-pointer items-center gap-2 border-b border-zinc-800/50 px-3 py-2 text-sm hover:bg-zinc-800/40"
          >
            <input type="checkbox" checked={selected.has(id)} onChange={() => onToggle(id)} className="accent-emerald-500" />
            <span className={`rounded border px-1.5 py-0.5 text-[10px] font-semibold ${positionColor(player.positions[0])}`}>
              {player.positions[0]}
            </span>
            <span className="flex-1 text-zinc-200">{player.name}</span>
            <span className="font-mono text-xs text-zinc-500">{value(id).toFixed(1)}</span>
          </label>
        )
      })}
    </div>
  )

  return (
    <div className="min-h-svh p-6">
      <div className="mx-auto max-w-4xl space-y-4">
        <LeagueNav state={state} />

        <div className="app-card p-3.5">
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-zinc-500">Trade with</p>
          <div className="flex flex-wrap gap-2">
            {aiTeams.map((team) => {
              const persona = state.managerPersonas[team.managerId]
              return (
                <button
                  key={team.id}
                  type="button"
                  onClick={() => selectTarget(team.id)}
                  className={`rounded-xl border px-3 py-1.5 text-sm font-semibold transition-all ${
                    targetTeamId === team.id
                      ? 'border-emerald-500 bg-gradient-to-b from-emerald-500/15 to-emerald-500/5 text-emerald-300 shadow-md shadow-emerald-500/10'
                      : 'border-zinc-800 text-zinc-300 hover:-translate-y-0.5 hover:border-zinc-700'
                  }`}
                >
                  {persona?.avatar} {team.name}
                </button>
              )
            })}
          </div>
        </div>

        {targetTeam && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div className="app-card">
                <div className="border-b border-zinc-800/80 px-3.5 py-2.5 text-xs font-bold uppercase tracking-wide text-zinc-500">
                  You give <span className="text-zinc-300">({giveValue.toFixed(1)} pts)</span>
                </div>
                {renderRoster(humanTeam.roster, give, (id) => toggle(give, setGive, id))}
              </div>
              <div className="app-card">
                <div className="border-b border-zinc-800/80 px-3.5 py-2.5 text-xs font-bold uppercase tracking-wide text-zinc-500">
                  You receive <span className="text-zinc-300">({receiveValue.toFixed(1)} pts)</span>
                </div>
                {renderRoster(targetTeam.roster, receive, (id) => toggle(receive, setReceive, id))}
              </div>
            </div>

            <button
              type="button"
              disabled={give.size === 0 || receive.size === 0 || isProposing}
              onClick={() => void handlePropose()}
              className="btn-primary w-full text-base"
            >
              {isProposing ? 'Proposing…' : 'Propose Trade'}
            </button>

            {lastResponse && (
              <div
                className={`app-card px-4 py-3.5 text-sm ${
                  lastResponse.decision === 'accept'
                    ? 'border-emerald-500/30 bg-gradient-to-r from-emerald-500/10 to-transparent text-emerald-200'
                    : lastResponse.decision === 'counter'
                      ? 'border-amber-500/30 bg-gradient-to-r from-amber-500/10 to-transparent text-amber-200'
                      : 'border-rose-500/30 bg-gradient-to-r from-rose-500/10 to-transparent text-rose-200'
                }`}
              >
                <p className="font-bold capitalize">{lastResponse.decision}</p>
                <p className="mt-1 text-zinc-300">{lastResponse.reason}</p>
                {lastResponse.decision === 'counter' && (
                  <button
                    type="button"
                    onClick={() => void handleAcceptCounter(lastResponse.tradeId)}
                    className="mt-2.5 rounded-lg bg-gradient-to-r from-amber-500 to-amber-400 px-3.5 py-1.5 text-xs font-bold text-zinc-950 shadow-md shadow-amber-500/20 transition-all hover:brightness-110"
                  >
                    Accept Counter
                  </button>
                )}
              </div>
            )}
          </>
        )}

        {history.length > 0 && (
          <div className="app-card">
            <div className="border-b border-zinc-800/80 px-3.5 py-2.5 text-xs font-bold uppercase tracking-wide text-zinc-500">
              Trade history
            </div>
            <div className="divide-y divide-zinc-800/50">
              {history.map((offer) => {
                const to = state.teams.find((t) => t.id === offer.toTeamId)
                return (
                  <div key={offer.id} className="px-3.5 py-2.5 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-300">
                        You ↔ {to?.name}: give {offer.give.map((id) => state.players[id]?.name).join(', ')} for{' '}
                        {offer.receive.map((id) => state.players[id]?.name).join(', ')}
                      </span>
                      <span className="text-xs font-bold uppercase text-zinc-500">{offer.status}</span>
                    </div>
                    {offer.reason && <p className="mt-0.5 text-xs text-zinc-500">{offer.reason}</p>}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
