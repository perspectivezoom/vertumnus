import type { Span } from '@/scripts/lib/regionFile';
import { cachePath, type MarsSource } from '@/scripts/mars/client';
import { parseCache, rehydrate } from '@/scripts/mars/columnar';

const WEEKS = 52;
const PEAK_FRACTION = 0.5; // a week counts as peak at >= 50% of the busiest week's listings

/** Our poster week for a MM/DD/YYYY date: ceil(dayOfYear / 7), clamped to 1..52. */
export function weekOf(date: string): number {
  const [m, d, y] = date.split('/').map(Number) as [number, number, number];
  const dayOfYear = Math.round((Date.UTC(y, m - 1, d) - Date.UTC(y, 0, 0)) / 86_400_000);
  return Math.min(WEEKS, Math.max(1, Math.ceil(dayOfYear / 7)));
}

/** Tally listings per week (index 0 unused) across every cached season. */
export function countByWeek(dates: string[]): number[] {
  const counts = new Array<number>(WEEKS + 1).fill(0);
  for (const date of dates) {
    const week = weekOf(date);
    counts[week] = (counts[week] ?? 0) + 1;
  }
  return counts;
}

/**
 * Classify weekly listing counts into peak/available spans: weeks at or above
 * PEAK_FRACTION of the busiest week are peak, any other reported week is available, and
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
  return spansFromCounts(countByWeek(rows.map((row) => String(row.report_date))));
}
