import { useEffect, useState } from 'react'
import type { SportId } from '../types'
import { fetchLiveScores, type LiveScoresResult } from '../utils/liveScores'

const REFRESH_MS = 60_000

interface Props {
  sport: SportId
}

/**
 * Real, live scores for today's actual games in this sport — pulled from
 * ESPN's public scoreboard API client-side. This reflects the real world,
 * not the league's own simulated season: the fantasy engine here still
 * resolves via seeded projections, this is just "what's actually happening
 * in {sport} right now" for context. Fails silently (no scores shown)
 * rather than surfacing errors, since ESPN's API is unofficial/best-effort.
 */
export function LiveScoresTicker({ sport }: Props) {
  const [result, setResult] = useState<LiveScoresResult | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    setResult(null)
    setFailed(false)

    async function load() {
      try {
        const data = await fetchLiveScores(sport)
        if (!cancelled) setResult(data)
      } catch {
        if (!cancelled) setFailed(true)
      }
    }

    void load()
    const interval = setInterval(load, REFRESH_MS)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [sport])

  if (failed) return null
  if (!result || result.events.length === 0) return null

  return (
    <div className="app-card px-4 py-3">
      <div className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-zinc-500">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-rose-500" />
        Live from the real {sport.toUpperCase()} today
      </div>
      <div className="flex gap-3 overflow-x-auto pb-1">
        {result.kind === 'matchups'
          ? result.events.map((ev) => (
              <div
                key={ev.id}
                className="flex min-w-[180px] shrink-0 flex-col gap-1 rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2"
              >
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold text-zinc-200">{ev.awayTeam}</span>
                  <span className="stat-number text-zinc-300">{ev.awayScore}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold text-zinc-200">{ev.homeTeam}</span>
                  <span className="stat-number text-zinc-300">{ev.homeScore}</span>
                </div>
                <span className={`text-[10px] font-bold uppercase ${ev.isLive ? 'text-rose-400' : 'text-zinc-600'}`}>
                  {ev.statusDetail}
                </span>
              </div>
            ))
          : result.events.map((ev) => (
              <div
                key={ev.id}
                className="flex min-w-[220px] shrink-0 flex-col gap-1 rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2"
              >
                <span className="text-sm font-semibold text-zinc-200">{ev.name}</span>
                <span className={`text-[10px] font-bold uppercase ${ev.isLive ? 'text-rose-400' : 'text-zinc-600'}`}>
                  {ev.statusDetail}
                </span>
                {ev.topCompetitors.map((c) => (
                  <div key={c.name} className="flex items-center justify-between text-xs text-zinc-400">
                    <span>{c.name}</span>
                    <span className="stat-number">{c.score}</span>
                  </div>
                ))}
              </div>
            ))}
      </div>
    </div>
  )
}
