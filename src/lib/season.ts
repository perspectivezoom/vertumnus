/** Canonical 52-week year (ignoring the ISO 53rd week and leap-day drift). */
export const WEEKS_PER_YEAR = 52;

/**
 * Inclusive week bounds. Weeks are 0-based: week 0 is the first week of January.
 *
 * Counting from 0 rather than 1 because a week number is an index and never leaves the program
 * — the poster is a drawing, and the region files under __generated__ are build output, not a
 * published format. So it is indexed the way arrays are: `weeks[w]` is week `w`, rotations are
 * plain modular arithmetic, and no read carries an offset. The date comment beside every
 * generated span is what a human checks, and that is written in calendar terms regardless.
 */
export const MIN_WEEK = 0;
export const MAX_WEEK = WEEKS_PER_YEAR - 1;

/** An array holding one value per week of the year. */
export function byWeek(value = 0): number[] {
  return new Array<number>(WEEKS_PER_YEAR).fill(value);
}

/** Bring a week number back into range, however far outside it has strayed. */
export function wrapWeek(week: number): number {
  return ((week % WEEKS_PER_YEAR) + WEEKS_PER_YEAR) % WEEKS_PER_YEAR;
}

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

/**
 * How strongly a crop is in season, in ascending order.
 *
 * `Uncertain` is the honest middle: weeks a meaningful minority of seasons called best, but not
 * most of them. A harvest does not arrive on the same date twice, so a crop that drifts year to
 * year gets a narrow certain core with uncertain shoulders, while one that lands reliably gets
 * none at all — the width of that band *is* the uncertainty, with no separate confidence number
 * to encode or to read.
 */
export const Level = {
  Available: 'available',
  Uncertain: 'uncertain',
  Peak: 'peak',
} as const;

export type Level = (typeof Level)[keyof typeof Level];

interface Span {
  level: Level;
  from: number;
  to: number;
}

/**
 * Ribbon height per level, as a range; 0 = out of season.
 *
 * The definite levels are a single height. `Uncertain` is drawn as the whole gap between them,
 * because that is literally what it means: in some years the crop has already reached its best
 * by that week, in others it has not. Rendering it as one intermediate height would instead
 * claim a middling harvest that no year actually had.
 */
export const LEVEL_BAND: Record<Level, { lower: number; upper: number }> = {
  [Level.Peak]: { lower: 100, upper: 100 },
  [Level.Uncertain]: { lower: 25, upper: 100 },
  [Level.Available]: { lower: 25, upper: 25 },
};

/** The height a full peak reaches; ribbon heights are drawn as a fraction of this. */
export const PEAK_HEIGHT = LEVEL_BAND[Level.Peak].upper;

/** Length of a span in weeks, wrap-aware (to < from wraps the year end). */
export function spanWidth(from: number, to: number): number {
  return from <= to ? to - from + 1 : WEEKS_PER_YEAR - from + to + 1;
}

/** Week numbers a span covers, wrap-aware. */
export function coveredWeeks(from: number, to: number): number[] {
  const weeks: number[] = [];
  if (from <= to) {
    for (let w = from; w <= to; w++) weeks.push(w);
  } else {
    for (let w = from; w <= MAX_WEEK; w++) weeks.push(w);
    for (let w = MIN_WEEK; w <= to; w++) weeks.push(w);
  }
  return weeks;
}

/**
 * The two curves bounding a produce's season, as {@link byWeek} arrays.
 *
 * `upper` is the season as an early or late year would run it — rising sooner and falling later;
 * `lower` is the part that holds whichever way the year goes. They coincide except across
 * uncertain weeks, so a crop that arrives on schedule every year yields one curve, twice.
 */
export function weeklyBand(spans: Span[]): { lower: number[]; upper: number[] } {
  const lower = byWeek();
  const upper = byWeek();
  for (const s of spans) {
    const band = LEVEL_BAND[s.level];
    for (const w of coveredWeeks(s.from, s.to)) {
      lower[w] = band.lower;
      upper[w] = band.upper;
    }
  }
  return { lower, upper };
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
  return mid > MAX_WEEK ? mid - WEEKS_PER_YEAR : mid;
}
