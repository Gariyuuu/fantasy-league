import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useLeagueStore } from '../store/useLeagueStore'

export function HomePage() {
  const leagueSummaries = useLeagueStore((s) => s.leagueSummaries)
  const refreshLeagueList = useLeagueStore((s) => s.refreshLeagueList)

  useEffect(() => {
    void refreshLeagueList()
  }, [refreshLeagueList])

  return (
    <div className="min-h-svh bg-zinc-950 p-8 text-zinc-200">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-zinc-50">Fantasy League</h1>
          <Link
            to="/create"
            className="rounded-md bg-emerald-500 px-4 py-2 text-sm font-medium text-zinc-950 hover:bg-emerald-400"
          >
            + New League
          </Link>
        </div>

        {leagueSummaries.length === 0 ? (
          <p className="text-sm text-zinc-500">No leagues yet. Create one to get started.</p>
        ) : (
          <ul className="space-y-2">
            {leagueSummaries.map((league) => (
              <li key={league.id}>
                <Link
                  to={
                    league.phase === 'predraft' || league.phase === 'drafting'
                      ? `/league/${league.id}/draft`
                      : `/league/${league.id}/season`
                  }
                  className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3 hover:border-zinc-700"
                >
                  <div>
                    <p className="font-medium text-zinc-100">{league.name}</p>
                    <p className="text-xs uppercase tracking-wide text-zinc-500">
                      {league.sport} · {league.phase}
                    </p>
                  </div>
                  <span className="text-xs text-zinc-600">{new Date(league.updatedAt).toLocaleString()}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
