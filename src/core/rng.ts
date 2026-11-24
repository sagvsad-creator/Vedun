export interface SeededRng {
  readonly seed: number;
  next(): number;
  range(min: number, max: number): number;
  int(min: number, maxInclusive: number): number;
}

export function createRng(seed: number): SeededRng {
  let state = (seed >>> 0) || 1;
  return {
    seed: state,
    next(): number {
      state = (state + 0x6d2b79f5) | 0;
      let t = Math.imul(state ^ (state >>> 15), 1 | state);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
    range(min: number, max: number): number {
      return min + (max - min) * this.next();
    },
    int(min: number, maxInclusive: number): number {
      return Math.floor(this.range(min, maxInclusive + 1));
    },
  };
}

export function parseSeedFromSearch(search: string, fallback = 74129): number {
  const params = new URLSearchParams(search);
  const raw = params.get('seed');
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? (parsed >>> 0) || fallback : fallback;
}
