import type { Span } from '@/scripts/lib/regionFile';
import { cachePath, type MarsSource } from '@/scripts/mars/client';
import { parseCache, rehydrate } from '@/scripts/mars/columnar';

const WEEKS = 52;
const PEAK_FRACTION = 0.5; // a week counts as peak at >= 50% of the busiest week's listings
const MIN_YEARS = 2; // a week must recur in this many seasons to count as in-season

/** Our poster week for a MM/DD/YYYY date: ceil(dayOfYear / 7), clamped to 1..52. */
export function weekOf(date: string): number {
  const [m, d, y] = date.split('/').map(Number) as [number, number, number];
  const dayOfYear = Math.round((Date.UTC(y, m - 1, d) - Date.UTC(y, 0, 0)) / 86_400_000);
  return Math.min(WEEKS, Math.max(1, Math.ceil(dayOfYear / 7)));
}

/**
 * Score each week (index 0 unused) from 0..1 by how strongly the crop was listed, averaged
 * across the cached seasons.
 *
 * Two corrections matter here, both learned from real data:
 *
 * - **Normalize per season before averaging.** Reporting volume varies wildly year to year
 *   (cherries ran 18–20 listings/day in 2023 but 1–6 in 2024), so summing raw counts lets the
 *   busiest year dictate the shape — one year was 93% of a week's total, hiding another year's
 *   genuine taper. Scaling each season to its own peak gives every season an equal vote.
 * - **Require a week to recur in MIN_YEARS seasons.** Terminal data carries stray one-off
 *   quotes far outside a crop's season, which would otherwise become spurious spans. Real
 *   seasonality repeats annually; noise does not. Recurrence separates them without a
 *   magnitude cutoff, which would instead erase genuine low-volume shoulder weeks.
 */
export function scoreByWeek(dates: string[]): number[] {
  const bySeason = new Map<number, number[]>();
  for (const date of dates) {
    const year = Number(date.split('/')[2]);
    const weeks = bySeason.get(year) ?? new Array<number>(WEEKS + 1).fill(0);
    const week = weekOf(date);
    weeks[week] = (weeks[week] ?? 0) + 1;
    bySeason.set(year, weeks);
  }

  const seasons = [...bySeason.values()];
  // With only one season cached there is nothing to corroborate against, so accept every week.
  const required = Math.min(MIN_YEARS, Math.max(1, seasons.length));

  const peaks = seasons.map((weeks) => Math.max(...weeks));
  const scores = new Array<number>(WEEKS + 1).fill(0);
  for (let week = 1; week <= WEEKS; week++) {
    const present = seasons.filter((weeks) => (weeks[week] ?? 0) > 0).length;
    if (present < required) continue;
    const total = seasons.reduce((sum, weeks, i) => {
      const peak = peaks[i] ?? 0;
      return peak > 0 ? sum + (weeks[week] ?? 0) / peak : sum;
    }, 0);
    scores[week] = total / seasons.length;
  }
  return scores;
}

/**
 * Classify weekly season scores into peak/available spans: weeks at or above
 * PEAK_FRACTION of the strongest week are peak, any other reported week is available, and
 * contiguous weeks of the same level merge. Weeks 1..52 only — a season crossing the new
 * year yields two spans rather than one wrapping span.
 */
export function spansFromCounts(counts: number[]): Span[] {
  const max = Math.max(0, ...counts);
  const levelAt = (count: number): Span['level'] | null =>
    count === 0 ? null : count >= PEAK_FRACTION * max ? 'peak' : 'available';

  const spans: Span[] = [];
  for (let week = 1; week <= WEEKS; week++) {
    const level = levelAt(counts[week] ?? 0);
    if (!level) continue;
    const last = spans.at(-1);
    if (last && last.level === level && last.to === week - 1) last.to = week;
    else spans.push({ level, from: week, to: week });
  }
  return spans;
}

/** Derive peak/available week spans from a commodity's cached raw data. */
export async function deriveSeason(src: MarsSource): Promise<Span[]> {
  const rows = rehydrate(parseCache(await Bun.file(cachePath(src)).text()));
  return spansFromCounts(scoreByWeek(rows.map((row) => String(row.report_date))));
}
