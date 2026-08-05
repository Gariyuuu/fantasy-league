// Deterministic RNG. A league's `seed` never changes; `rngCursor` counts how
// many values have been drawn. Reconstructing generator(seed) and fast-
// forwarding to `cursor` always yields the same next value — so
// (seed, actionLog) fully determines a season, and replay/debugging just
// means re-running the log.

/** mulberry32 — small, fast, good-enough distribution for gameplay RNG. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return function () {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function createSeededRng(seed: number, cursor = 0): () => number {
  const gen = mulberry32(seed)
  for (let i = 0; i < cursor; i++) gen()
  return gen
}

export interface RngDraw<T> {
  values: T[]
  nextCursor: number
}

/** Draw `count` uniform [0,1) values starting at `fromCursor`. */
export function drawUniform(
  seed: number,
  fromCursor: number,
  count: number,
): RngDraw<number> {
  const gen = createSeededRng(seed, fromCursor)
  const values = Array.from({ length: count }, () => gen())
  return { values, nextCursor: fromCursor + count }
}

export function uniformInRange(u: number, min: number, max: number): number {
  return min + u * (max - min)
}

export function pickIndex(u: number, length: number): number {
  return Math.min(length - 1, Math.floor(u * length))
}

/**
 * Box-Muller transform: two uniforms -> one standard-normal value. Used to
 * sample stat lines from a player's { mean, floor, ceiling } projection.
 */
export function standardNormal(u1: number, u2: number): number {
  const eps = 1e-12
  const r = Math.sqrt(-2 * Math.log(Math.max(u1, eps)))
  return r * Math.cos(2 * Math.PI * u2)
}

/**
 * Shuffle via Fisher-Yates using a stream of uniforms. Consumes
 * `items.length - 1` draws. Returns a new array; does not mutate input.
 */
export function shuffle<T>(items: T[], draws: number[]): T[] {
  const result = items.slice()
  for (let i = result.length - 1; i > 0; i--) {
    const u = draws[result.length - 1 - i] ?? Math.random()
    const j = Math.floor(u * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}
