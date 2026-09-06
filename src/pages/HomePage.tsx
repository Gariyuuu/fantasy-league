import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useLeagueStore } from '../store/useLeagueStore'
import { SPORT_ICONS, phaseBadgeClass, phaseLabelText } from '../components/sportMeta'

export function HomePage() {
  const leagueSummaries = useLeagueStore((s) => s.leagueSummaries)
  const refreshLeagueList = useLeagueStore((s) => s.refreshLeagueList)

  useEffect(() => {
    void refreshLeagueList()
  }, [refreshLeagueList])

  return (
    <div className="min-h-svh p-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-10 flex items-center justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-3xl font-black tracking-tight">
              <span className="text-3xl">🏆</span>
              <span className="gradient-text">Fantasy League</span>
            </h1>
            <p className="mt-1 text-sm text-zinc-500">Draft, manage, and win — solo against 7 AI managers.</p>
          </div>
          <Link to="/create" className="btn-primary">
            + New League
          </Link>
        </div>

        {leagueSummaries.length === 0 ? (
          <div className="app-card flex flex-col items-center gap-3 px-6 py-16 text-center">
            <span className="text-4xl">🏈</span>
            <p className="text-zinc-400">No leagues yet. Create one to get started.</p>
            <Link to="/create" className="btn-primary mt-2">
              Create Your First League
            </Link>
          </div>
        ) : (
          <ul className="space-y-3">
            {leagueSummaries.map((league) => (
              <li key={league.id}>
                <Link
                  to={
                    league.phase === 'predraft' || league.phase === 'drafting'
                      ? `/league/${league.id}/draft`
                      : `/league/${league.id}/season`
                  }
                  className="app-card group flex items-center justify-between px-5 py-4 transition-all hover:-translate-y-0.5 hover:border-emerald-500/40 hover:shadow-emerald-500/10"
                >
                  <div className="flex items-center gap-4">
                    <span className="text-2xl">{SPORT_ICONS[league.sport]}</span>
                    <div>
                      <p className="font-semibold text-zinc-100 group-hover:text-emerald-300">{league.name}</p>
                      <p className="text-xs uppercase tracking-wide text-zinc-500">{league.sport}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${phaseBadgeClass(league.phase)}`}>
                      {phaseLabelText(league.phase)}
                    </span>
                    <span className="hidden text-xs text-zinc-600 sm:inline">
                      {new Date(league.updatedAt).toLocaleDateString()}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
