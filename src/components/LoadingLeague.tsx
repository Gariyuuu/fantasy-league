import { ThinkingOrb } from 'thinking-orbs'

export function LoadingLeague() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-3 text-zinc-500">
      <ThinkingOrb state="working" size={20} aria-label="Loading league" />
      <span>Loading league…</span>
    </div>
  )
}
