import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useLeagueStore } from '../store/useLeagueStore'
import { LeagueNav } from '../components/LeagueNav'
import { positionColor } from '../components/draft/positionColors'
import { projectedPoints } from '../engine/valuation'

const TABS = ['ALL', 'QB', 'RB', 'WR', 'TE', 'K', 'DST'] as const

export function WaiversPage() {
  const { leagueId } = useParams<{ leagueId: string }>()
  const state = useLeagueStore((s) => s.state)
  const loadLeague = useLeagueStore((s) => s.loadLeague)
  const submitHumanWaiverClaim = useLeagueStore((s) => s.submitHumanWaiverClaim)

  const [tab, setTab] = useState<(typeof TABS)[number]>('ALL')
  const [selectedAddId, setSelectedAddId] = useState<string | null>(null)
  const [dropId, setDropId] = useState<string>('')
  const [bid, setBid] = useState(1)
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    if (leagueId && state?.id !== leagueId) {
      void loadLeague(leagueId)
    }
  }, [leagueId, state?.id, loadLeague])

  const humanTeam = state?.teams.find((t) => t.isHuman)

  const freeAgents = useMemo(() => {
    if (!state) return []
    const rostered = new Set(state.teams.flatMap((t) => t.roster))
    const weights = state.config.scoringPresets[state.scoringPreset].weights
    const all = Object.values(state.players)
      .filter((p) => !rostered.has(p.id))
      .map((player) => ({ player, value: projectedPoints(player.projection, weights) }))
      .sort((a, b) => b.value - a.value)
    const filtered = tab === 'ALL' ? all : all.filter((r) => r.player.positions.includes(tab))
    return tab === 'ALL' ? filtered.slice(0, 50) : filtered
  }, [state, tab])

  if (!state || state.id !== leagueId || !humanTeam) {
    return <div className="flex min-h-svh items-center justify-center bg-zinc-950 text-zinc-500">Loading league…</div>
  }

  const pendingClaim = state.waiverClaims.find(
    (c) => c.teamId === humanTeam.id && c.status === 'pending' && c.period === state.currentPeriod,
  )
  const claimHistory = state.waiverClaims
    .filter((c) => c.teamId === humanTeam.id && c.status !== 'pending')
    .sort((a, b) => b.period - a.period)

  async function handleSubmit() {
    if (!selectedAddId) return
    await submitHumanWaiverClaim({ addPlayerId: selectedAddId, dropPlayerId: dropId || undefined, faabBid: bid })
    setSubmitted(true)
    setSelectedAddId(null)
  }

  return (
    <div className="min-h-svh bg-zinc-950 p-6 text-zinc-200">
      <div className="mx-auto max-w-4xl space-y-4">
        <LeagueNav state={state} />

        <div className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm">
          <span className="text-zinc-400">
            FAAB budget: <span className="font-mono text-zinc-100">${humanTeam.faabBudget ?? 0}</span>
          </span>
          {pendingClaim && (
            <span className="text-amber-300">
              Pending claim: {state.players[pendingClaim.addPlayerId]?.name} for ${pendingClaim.faabBid} — processes when
              you advance the week
            </span>
          )}
        </div>

        {selectedAddId && (
          <div className="space-y-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4">
            <p className="text-sm text-emerald-200">
              Claiming <span className="font-semibold">{state.players[selectedAddId]?.name}</span>
            </p>
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <label className="mb-1 block text-xs text-zinc-400">Drop (optional)</label>
                <select
                  value={dropId}
                  onChange={(e) => setDropId(e.target.value)}
                  className="w-full rounded border border-zinc-800 bg-zinc-900 px-2 py-1.5 text-sm text-zinc-200"
                >
                  <option value="">— Keep full roster —</option>
                  {humanTeam.roster.map((id) => (
                    <option key={id} value={id}>
                      {state.players[id]?.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-zinc-400">FAAB bid</label>
                <input
                  type="number"
                  min={0}
                  max={humanTeam.faabBudget ?? 0}
                  value={bid}
                  onChange={(e) => setBid(Number(e.target.value))}
                  className="w-24 rounded border border-zinc-800 bg-zinc-900 px-2 py-1.5 text-sm text-zinc-200"
                />
              </div>
              <button
                type="button"
                onClick={() => void handleSubmit()}
                className="rounded bg-emerald-500 px-4 py-1.5 text-sm font-semibold text-zinc-950 hover:bg-emerald-400"
              >
                Submit Claim
              </button>
              <button
                type="button"
                onClick={() => setSelectedAddId(null)}
                className="rounded border border-zinc-700 px-3 py-1.5 text-sm text-zinc-300"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
        {submitted && !selectedAddId && <p className="text-xs text-emerald-400">Claim submitted.</p>}

        <div className="rounded-lg border border-zinc-800 bg-zinc-900">
          <div className="flex gap-1 border-b border-zinc-800 p-2">
            {TABS.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={`rounded px-2 py-1 text-xs font-medium ${
                  tab === t ? 'bg-emerald-500 text-zinc-950' : 'text-zinc-400 hover:bg-zinc-800'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
          <table className="w-full text-sm">
            <tbody>
              {freeAgents.map(({ player, value }) => (
                <tr key={player.id} className="border-b border-zinc-800/60 hover:bg-zinc-800/40">
                  <td className="px-3 py-2">
                    <span className={`rounded border px-1.5 py-0.5 text-[10px] font-semibold ${positionColor(player.positions[0])}`}>
                      {player.positions[0]}
                    </span>
                  </td>
                  <td className="px-2 py-2 font-medium text-zinc-200">{player.name}</td>
                  <td className="px-2 py-2 text-xs text-zinc-500">{player.team}</td>
                  <td className="px-2 py-2 text-right font-mono text-xs text-zinc-400">{value.toFixed(1)}</td>
                  <td className="px-3 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedAddId(player.id)
                        setSubmitted(false)
                      }}
                      className="rounded bg-zinc-800 px-2 py-1 text-[11px] font-semibold text-zinc-200 hover:bg-zinc-700"
                    >
                      Claim
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {claimHistory.length > 0 && (
          <div className="rounded-lg border border-zinc-800 bg-zinc-900">
            <div className="border-b border-zinc-800 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Claim history
            </div>
            <div className="divide-y divide-zinc-800/50">
              {claimHistory.map((c) => (
                <div key={c.id} className="flex items-center justify-between px-3 py-2 text-sm">
                  <span className="text-zinc-300">
                    {state.players[c.addPlayerId]?.name}{' '}
                    {c.dropPlayerId && <span className="text-zinc-600">(dropped {state.players[c.dropPlayerId]?.name})</span>}
                  </span>
                  <span className={`text-xs font-semibold ${c.status === 'won' ? 'text-emerald-400' : 'text-zinc-500'}`}>
                    ${c.faabBid} · {c.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
