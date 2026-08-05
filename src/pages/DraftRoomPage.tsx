import { useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useLeagueStore } from '../store/useLeagueStore'
import { DraftClockBar } from '../components/draft/DraftClockBar'
import { BestAvailableList } from '../components/draft/BestAvailableList'
import { PickFeed } from '../components/draft/PickFeed'
import { RosterGrid } from '../components/draft/RosterGrid'
import { PositionNeed } from '../components/draft/PositionNeed'
import { draftRounds } from '../engine/draft'
import { SPORT_ICONS } from '../components/sportMeta'
import { LeagueBackdrop } from '../components/LeagueBackdrop'

export function DraftRoomPage() {
  const { leagueId } = useParams<{ leagueId: string }>()
  const state = useLeagueStore((s) => s.state)
  const loadLeague = useLeagueStore((s) => s.loadLeague)
  const startDraft = useLeagueStore((s) => s.startDraft)
  const submitHumanPick = useLeagueStore((s) => s.submitHumanPick)
  const currentPickerTeamId = useLeagueStore((s) => s.currentPickerTeamId)
  const draftClockSeconds = useLeagueStore((s) => s.draftClockSeconds)
  const isDrafting = useLeagueStore((s) => s.isDrafting)

  useEffect(() => {
    if (leagueId && state?.id !== leagueId) {
      void loadLeague(leagueId)
    }
  }, [leagueId, state?.id, loadLeague])

  if (!state || state.id !== leagueId) {
    return (
      <div className="flex min-h-svh items-center justify-center text-zinc-500">Loading league…</div>
    )
  }

  const humanTeam = state.teams.find((t) => t.isHuman)
  const isHumanTurn = isDrafting && humanTeam !== undefined && currentPickerTeamId === humanTeam.id
  const totalPicks = state.teams.length * draftRounds(state.config)
  const picksMade = state.draft.picks.length

  return (
    <LeagueBackdrop sport={state.sport} className="p-6 text-zinc-200">
      <div className="mx-auto max-w-7xl space-y-4">
        <div className="app-card flex items-center justify-between px-5 py-3.5">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{SPORT_ICONS[state.sport]}</span>
            <div>
              <h1 className="text-lg font-bold text-zinc-50">{state.name}</h1>
              <p className="text-xs uppercase tracking-wide text-zinc-500">
                {state.config.label} · <span className="text-emerald-400">{state.phase}</span>
              </p>
            </div>
          </div>
          {state.draft.status !== 'notStarted' && (
            <div className="flex items-center gap-2 text-xs text-zinc-500">
              <span className="stat-number text-sm text-zinc-300">
                Pick {Math.min(picksMade + 1, totalPicks)} / {totalPicks}
              </span>
              <div className="h-1.5 w-32 overflow-hidden rounded-full bg-zinc-800">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-sky-400 transition-[width] duration-500"
                  style={{ width: `${(picksMade / totalPicks) * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {state.phase === 'predraft' && (
          <div className="app-card-glow flex flex-col items-center justify-center gap-4 py-24">
            <span className="text-5xl">{SPORT_ICONS[state.sport]}</span>
            <p className="text-lg text-zinc-300">8 managers are ready. Start the snake draft when you are.</p>
            <button type="button" onClick={() => void startDraft()} className="btn-primary px-8 py-3.5 text-base">
              Start Draft
            </button>
          </div>
        )}

        {(state.phase === 'drafting' || state.phase === 'regularSeason') && humanTeam && (
          <>
            <DraftClockBar
              state={state}
              currentPickerTeamId={currentPickerTeamId}
              draftClockSeconds={draftClockSeconds}
              isHumanTurn={isHumanTurn}
            />

            {state.phase === 'regularSeason' && (
              <div className="app-card flex items-center justify-between border-emerald-500/30 bg-gradient-to-r from-emerald-500/10 to-transparent px-4 py-3 text-sm text-emerald-300">
                <span>🎉 Draft complete. Final rosters below — set your lineup and play out the season.</span>
                <Link to={`/league/${state.id}/season`} className="btn-primary px-3.5 py-1.5 text-sm">
                  Go to Season Dashboard
                </Link>
              </div>
            )}

            <div className="grid grid-cols-12 gap-4">
              <div className="col-span-3 space-y-4">
                <PositionNeed state={state} team={humanTeam} />
              </div>
              <div className="col-span-5 h-[520px]">
                <BestAvailableList state={state} humanTeam={humanTeam} isHumanTurn={isHumanTurn} onDraft={submitHumanPick} />
              </div>
              <div className="col-span-4 h-[520px]">
                <PickFeed state={state} />
              </div>
            </div>

            <RosterGrid state={state} currentPickerTeamId={currentPickerTeamId} />
          </>
        )}
      </div>
    </LeagueBackdrop>
  )
}
