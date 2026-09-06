import { useMemo, useState } from 'react'
import type { LeagueState, Team } from '../../types'
import { rankAvailablePlayers, unmetPositionNeeds } from '../../engine/valuation'
import { positionColor } from './positionColors'

interface Props {
  state: LeagueState
  humanTeam: Team | undefined
  isHumanTurn: boolean
  onDraft: (playerId: string) => void
}

export function BestAvailableList({ state, humanTeam, isHumanTurn, onDraft }: Props) {
  const tabs = useMemo(() => ['ALL', ...state.config.positions], [state.config.positions])
  const [tab, setTab] = useState<string>('ALL')
  const [search, setSearch] = useState('')

  const needs = useMemo(
    () => new Set(humanTeam ? unmetPositionNeeds(humanTeam.roster, state.players, state.config) : []),
    [humanTeam, state.players, state.config],
  )

  const ranked = useMemo(() => {
    const weights = state.config.scoringPresets[state.scoringPreset].weights
    const draftedIds = new Set(state.draft.picks.map((p) => p.playerId))
    const all = rankAvailablePlayers(Object.values(state.players), draftedIds, weights)
    const byTab = tab === 'ALL' ? all : all.filter((r) => r.player.positions.includes(tab))
    const query = search.trim().toLowerCase()
    const bySearch = query ? byTab.filter((r) => r.player.name.toLowerCase().includes(query)) : byTab
    return tab === 'ALL' && !query ? bySearch.slice(0, 50) : bySearch
  }, [state.draft.picks.length, state.players, state.config, state.scoringPreset, tab, search])

  return (
    <div className="app-card flex h-full flex-col">
      <div className="space-y-2 border-b border-zinc-800/80 p-2.5">
        <div className="flex flex-wrap gap-1">
          {tabs.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
                tab === t
                  ? 'bg-gradient-to-r from-emerald-500 to-emerald-400 text-zinc-950 shadow-md shadow-emerald-500/20'
                  : 'text-zinc-400 hover:bg-zinc-800'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search players…"
          className="w-full rounded-lg border border-input bg-zinc-950/70 px-2.5 py-1.5 text-xs text-zinc-200 placeholder:text-zinc-600 focus:border-emerald-500 focus:outline-none"
        />
      </div>
      <div className="flex-1 overflow-y-auto">
        <table className="w-full text-sm">
          <tbody>
            {ranked.map(({ player, value }) => {
              const isNeed = player.positions.some((pos) => needs.has(pos))
              return (
                <tr
                  key={player.id}
                  className={`border-b border-zinc-800/60 transition-colors hover:bg-zinc-800/40 ${isNeed ? 'bg-emerald-500/[0.05]' : ''}`}
                >
                  <td className="px-3 py-2">
                    <span
                      className={`rounded-md border px-1.5 py-0.5 text-xs font-bold ${positionColor(player.positions[0])}`}
                    >
                      {player.positions[0]}
                    </span>
                  </td>
                  <td className="px-2 py-2 font-semibold text-zinc-200">
                    {player.name}
                    {isNeed && (
                      <span className="ml-1.5 rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-xs font-bold text-emerald-400">
                        NEED
                      </span>
                    )}
                  </td>
                  <td className="px-2 py-2 text-xs text-zinc-500">{player.team}</td>
                  <td className="px-2 py-2 text-right font-mono text-xs font-bold text-zinc-400">{value.toFixed(1)}</td>
                  <td className="px-3 py-2 text-right">
                    <button
                      type="button"
                      disabled={!isHumanTurn}
                      onClick={() => onDraft(player.id)}
                      className="rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-400 px-2.5 py-1 text-xs font-bold text-zinc-950 shadow-sm shadow-emerald-500/20 transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:from-zinc-800 disabled:to-zinc-800 disabled:text-zinc-600 disabled:shadow-none"
                    >
                      Draft
                    </button>
                  </td>
                </tr>
              )
            })}
            {ranked.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-xs text-zinc-600">
                  No players match.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
