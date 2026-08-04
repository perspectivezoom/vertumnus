/** Canonical 52-week year (ignoring the ISO 53rd week and leap-day drift). */
export const WEEKS_PER_YEAR = 52;

/** Inclusive 1-based week bounds. */
export const MIN_WEEK = 1;
export const MAX_WEEK = WEEKS_PER_YEAR;

export const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

export const Level = {
  Available: 'available',
  Peak: 'peak',
} as const;

export type Level = (typeof Level)[keyof typeof Level];

interface Span {
  level: Level;
  from: number;
  to: number;
}

/** Relative volume weight per availability level; 0 = out of season. */
export const LEVEL_WEIGHT: Record<Level, number> = {
  [Level.Peak]: 100,
  [Level.Available]: 25,
};

/** Length of a span in weeks, wrap-aware (to < from wraps the year end). */
export function spanWidth(from: number, to: number): number {
  return from <= to ? to - from + 1 : WEEKS_PER_YEAR - from + 1 + to;
}

/** Week numbers (1..52) a span covers, wrap-aware. */
export function coveredWeeks(from: number, to: number): number[] {
  const weeks: number[] = [];
  if (from <= to) {
    for (let w = from; w <= to; w++) weeks.push(w);
  } else {
    for (let w = from; w <= WEEKS_PER_YEAR; w++) weeks.push(w);
    for (let w = 1; w <= to; w++) weeks.push(w);
  }
  return weeks;
}

/** Per-week weight (0 / 25 / 100), index 0 = week 1. */
export function weeklyWeights(spans: Span[]): number[] {
  const weights = new Array<number>(WEEKS_PER_YEAR).fill(0);
  for (const s of spans) {
    for (const w of coveredWeeks(s.from, s.to)) weights[w - 1] = LEVEL_WEIGHT[s.level];
  }
  return weights;
}

/**
 * Midpoint week of the earliest peak span; Infinity if the produce never peaks.
 *
 * This orders the poster, so it answers "when does this arrive at its best?" — the earliest
 * peak, not the longest one. A crop with two harvests belongs beside the others sharing its
 * first, rather than being placed by whichever of its peaks happens to run longer.
 */
export function peakMidpoint(spans: Span[]): number {
  const first = spans.find((s) => s.level === Level.Peak);
  if (!first) return Number.POSITIVE_INFINITY;
  const mid = first.from + (spanWidth(first.from, first.to) - 1) / 2;
  return mid > WEEKS_PER_YEAR ? mid - WEEKS_PER_YEAR : mid;
}
