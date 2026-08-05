const POSITION_COLORS: Record<string, string> = {
  QB: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
  RB: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  WR: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  TE: 'bg-violet-500/15 text-violet-300 border-violet-500/30',
  K: 'bg-zinc-500/15 text-zinc-300 border-zinc-500/30',
  DST: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
}

export function positionColor(pos: string): string {
  return POSITION_COLORS[pos] ?? 'bg-zinc-500/15 text-zinc-300 border-zinc-500/30'
}
