import type { Span } from '@/scripts/lib/regionFile';
import { cachePath, type MarsSource } from '@/scripts/mars/client';
import { parseCache, rehydrate } from '@/scripts/mars/columnar';
import { MARS_REPORTS, type MarsReport } from '@/scripts/mars/reports';

const WEEKS = 52;
const SEASON_FLOOR = 0.25; // below this share of the crop's best week it is not in season
const PEAK_FRACTION = 0.75; // at or above this share it is peak

/** One reported observation: when it was reported, and how much was shipped. */
export interface Sample {
  date: string;
  weight: number;
}

/** Our poster week for a MM/DD/YYYY date: ceil(dayOfYear / 7), clamped to 1..52. */
export function weekOf(date: string): number {
  const [m, d, y] = date.split('/').map(Number) as [number, number, number];
  const dayOfYear = Math.round((Date.UTC(y, m - 1, d) - Date.UTC(y, 0, 0)) / 86_400_000);
  return Math.min(WEEKS, Math.max(1, Math.ceil(dayOfYear / 7)));
}

/** Total shipped weight per week (index 0 unused), summed over every cached season. */
export function weeklyVolume(samples: Sample[]): number[] {
  const weeks = new Array<number>(WEEKS + 1).fill(0);
  for (const { date, weight } of samples) {
    const week = weekOf(date);
    weeks[week] = (weeks[week] ?? 0) + weight;
  }
  return weeks;
}

/**
 * Classify weekly shipped volume into peak/available spans, merging contiguous weeks of the
 * same level.
 *
 * Deliberately naive: both cut-offs are shares of the crop's own best week, with no smoothing
 * or cross-season weighting. The floor matters because California ships a trickle of many
 * crops year-round, and treating any non-zero week as "available" put berries in season in
 * January; 25% is the rule used by the published strawberry curve this was checked against.
 *
 * Crops this does not describe well are left out of the region's list rather than patched
 * around — every attempt to rescue them (smoothing, recurrence filters, contrast-relative
 * thresholds) distorted the crops that already worked. Weeks 1..52 only, so a season crossing
 * the new year yields two spans rather than one wrapping span.
 */
export function spansFromVolume(volume: number[]): Span[] {
  const high = Math.max(0, ...volume.slice(1, WEEKS + 1));
  if (high === 0) return [];
  const levelAt = (v: number): Span['level'] | null =>
    v < SEASON_FLOOR * high ? null : v >= PEAK_FRACTION * high ? 'peak' : 'available';

  const spans: Span[] = [];
  for (let week = 1; week <= WEEKS; week++) {
    const level = levelAt(volume[week] ?? 0);
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
  const report: MarsReport = MARS_REPORTS[src.report];
  const { volumeField } = report;
  if (!volumeField) throw new Error(`${src.report} reports no shipped volume`);
  const samples: Sample[] = rows.map((row) => ({
    date: String(row.report_date),
    weight: Number(row[volumeField]) || 0,
  }));
  return spansFromVolume(weeklyVolume(samples));
}
