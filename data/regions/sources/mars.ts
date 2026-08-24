import { cachePath, type MarsSource } from '@/data/raw/mars/client';
import { MARS_REPORTS, type MarsReport } from '@/data/raw/mars/reports';
import { parseCache, rehydrate } from '@/data/raw/format';
import type { GeneratedProduce, Span } from '@/data/regions/render';

/** One reported shipment: the season it belongs to, the week it moved, and how much. */
export interface Sample {
  date: string;
  weight: number;
}

const WEEKS = 52;
const SEASON_FLOOR = 0.25; // below this share of a season's best week the crop is not in season
const PEAK_FRACTION = 0.75; // at or above this share of a season's best week it is peak
const MIN_SEASON_SHARE = 0.1; // a season carrying less than this of the median gets no vote
const MAX_GAP = 3; // an interior gap this short is reporting noise, not a break in the season
const UNCERTAIN_SHARE = 1 / 3; // seasons that must call a week best for it to read as maybe-peak

/** Our poster week for a MM/DD/YYYY date: ceil(dayOfYear / 7), clamped to 1..52. */
export function weekOf(date: string): number {
  const [m, d, y] = date.split('/').map(Number) as [number, number, number];
  const dayOfYear = Math.round((Date.UTC(y, m - 1, d) - Date.UTC(y, 0, 0)) / 86_400_000);
  return Math.min(WEEKS, Math.max(1, Math.ceil(dayOfYear / 7)));
}

/** Shipped weight per week (index 0 unused), one array per season. */
export function weeklyVolumeBySeason(samples: Sample[]): number[][] {
  const bySeason = new Map<number, number[]>();
  for (const { date, weight } of samples) {
    const year = Number(date.split('/')[2]);
    const weeks = bySeason.get(year) ?? new Array<number>(WEEKS + 1).fill(0);
    const week = weekOf(date);
    weeks[week] = (weeks[week] ?? 0) + weight;
    bySeason.set(year, weeks);
  }
  return [...bySeason.entries()].sort(([a], [b]) => a - b).map(([, weeks]) => weeks);
}

/**
 * Decide each week's level by asking every season separately and taking the majority.
 *
 * Seasons shift. Peaches peaked in weeks 21–31, 24–34 and 29–35 across three years — each a
 * clean single peak, but eight weeks apart. Pooling the volume first and thresholding after
 * turns that into a smear with holes where one year is fading and the next has not started;
 * the same arithmetic collapsed tomatoes to a single week. So classify within a season, where
 * "its best week" is meaningful, and only then combine.
 *
 * Counting the votes rather than just checking for a majority gives three bands a shopper can
 * act on: **peak** is "most years this is at its best", **uncertain** is "a fair few years, but
 * not most", **available** is "it ships". A genuine second harvest survives, because it wins
 * its own vote every year; a one-off gap does not.
 */
export function spansFromSeasons(seasons: number[][]): Span[] {
  // A season with barely any data (a stray row or two) would otherwise vote as loudly as a
  // full one, so ignore the ones carrying almost nothing next to their peers.
  const totals = seasons.map((weeks) => weeks.reduce((sum, v) => sum + v, 0));
  const median = [...totals].sort((a, b) => a - b)[Math.floor(totals.length / 2)] ?? 0;
  const voting = seasons.filter((_, i) => (totals[i] ?? 0) >= MIN_SEASON_SHARE * median);
  if (voting.length === 0) return [];

  // Each season's own verdict, per week: 0 out of season, 1 in season, 2 at its best. Note this
  // is a season's ballot, not the poster's three levels — the tally below produces those.
  const majority = Math.ceil(voting.length / 2);
  const levels = voting.map((weeks) => {
    const high = Math.max(0, ...weeks.slice(1, WEEKS + 1));
    return weeks.map((v) =>
      high === 0 || v < SEASON_FLOOR * high ? 0 : v >= PEAK_FRACTION * high ? 2 : 1,
    );
  });

  const peakVotes = (week: number) => levels.filter((s) => (s[week] ?? 0) === 2).length;
  const seasonVotes = (week: number) => levels.filter((s) => (s[week] ?? 0) > 0).length;

  const uncertain = Math.max(1, Math.ceil(UNCERTAIN_SHARE * voting.length));
  const weekly = Array.from({ length: WEEKS + 1 }, (_, week) =>
    week === 0
      ? 0
      : peakVotes(week) >= majority
        ? 3
        : peakVotes(week) >= uncertain
          ? 2
          : seasonVotes(week) >= majority
            ? 1
            : 0,
  );

  // When a crop's peaks never line up — blueberries peaked in weeks 20–22, 24 and 23 across
  // three seasons, overlapping in none — no week wins a majority and the crop comes out with no
  // peak at all. Average the seasons' peaks instead: a best guess sited where they cluster,
  // rather than a band stretched to cover every week any one season ever called its best.
  if (!weekly.includes(3)) {
    const guess = averagePeak(voting, levels);
    if (guess) for (let week = guess.from; week <= guess.to; week++) weekly[week] = 3;
  }

  bridge(weekly, 1); // a short hole inside a season is noise
  bridge(weekly, 3); // ...as is a short dip out of peak
  // The uncertain band is deliberately *not* bridged: it marks where the seasons disagree, so
  // smoothing it erases the signal. Bridging it welded tomatoes' two harvests into one mass.

  const spans: Span[] = [];
  for (let week = 1; week <= WEEKS; week++) {
    const level: Span['level'] | null =
      weekly[week] === 3
        ? 'peak'
        : weekly[week] === 2
          ? 'uncertain'
          : weekly[week] === 1
            ? 'available'
            : null;
    if (!level) continue;
    const last = spans.at(-1);
    if (last && last.level === level && last.to === week - 1) last.to = week;
    else spans.push({ level, from: week, to: week });
  }
  return spans;
}

/**
 * The mean of each season's peak, as a single span — the best guess when they never overlap.
 *
 * Averaging the starts and the ends separately keeps the guess about as long as a typical
 * season's peak, so a crop whose harvest merely drifts year to year still reads as a peak of
 * plausible length, placed where those years centre.
 */
function averagePeak(voting: number[][], levels: number[][]): { from: number; to: number } | null {
  const runs = voting
    .map((weeks, i) => bestPeakRun(weeks, levels[i] ?? []))
    .filter((run) => run !== null);
  if (runs.length === 0) return null;
  const mean = (ns: number[]) => ns.reduce((sum, n) => sum + n, 0) / ns.length;
  return {
    from: Math.round(mean(runs.map((run) => run.from))),
    to: Math.round(mean(runs.map((run) => run.to))),
  };
}

/**
 * The run of peak weeks around a season's single busiest week; null if it never shipped.
 *
 * Anchoring on the busiest week rather than taking first-peak to last-peak matters for a crop
 * with two harvests, where the latter would return one run spanning the quiet middle.
 */
function bestPeakRun(weeks: number[], levels: number[]): { from: number; to: number } | null {
  let best = 0;
  for (let week = 1; week <= WEEKS; week++) {
    if ((weeks[week] ?? 0) > (weeks[best] ?? 0)) best = week;
  }
  if (best === 0) return null;
  let from = best;
  let to = best;
  while (from > 1 && levels[from - 1] === 2) from -= 1;
  while (to < WEEKS && levels[to + 1] === 2) to += 1;
  return { from, to };
}

/**
 * Raise runs shorter than MAX_GAP that sit between two weeks already at `level`.
 *
 * Seasons rarely align exactly, so a consensus can dip for a week or two mid-season purely
 * because the years disagree there. Bridging those keeps a season whole while leaving a
 * genuine second harvest — separated by many weeks — as two distinct spans.
 */
function bridge(weekly: number[], level: number): void {
  let run = 0;
  for (let week = 1; week <= WEEKS + 1; week++) {
    if ((weekly[week] ?? 0) >= level) {
      if (run > 0 && run <= MAX_GAP && week - run - 1 >= 1) {
        for (let w = week - run; w < week; w++) weekly[w] = level;
      }
      run = 0;
    } else run += 1;
  }
}

/**
 * Derive peak/available week spans from a commodity's cached raw data, counting only shipments
 * from the source's own districts.
 *
 * Strawberries make the stakes concrete: statewide the peak lands seven weeks before
 * Salinas-Watsonville's own crop, because the southern districts out-ship it and harvest first.
 *
 * The cache is keyed by origin rather than by region, so it is shared by every region drawing
 * on the same state. Narrowing here rather than at fetch time keeps it that way, and makes a
 * region's reach a rebuild instead of a refetch.
 */
export async function deriveSeason(src: MarsSource): Promise<Span[]> {
  const all = rehydrate(parseCache(await Bun.file(cachePath(src)).text()));
  const rows = all.filter((row) =>
    src.districts.some((d) => String(row.district ?? '').startsWith(d)),
  );
  if (rows.length === 0) {
    throw new Error(
      `${src.commodity}: nothing ships from ${src.districts.join(', ')} — it grows too far ` +
        `away to reach this region's markets. Drop it from the crop list.`,
    );
  }
  const report: MarsReport = MARS_REPORTS[src.report];
  const { volumeField } = report;
  if (!volumeField) throw new Error(`${src.report} reports no shipped volume`);
  const samples: Sample[] = rows.map((row) => ({
    // The period the shipment moved in, not when the report was published: a report dated
    // 2 Jan can cover 31 Dec, which would otherwise open a phantom season in the new year.
    date: String(row.report_begin_date),
    weight: Number(row[volumeField]) || 0,
  }));
  return spansFromSeasons(weeklyVolumeBySeason(samples));
}

export interface MarsCrop extends MarsSource {
  type: 'mars';
  name: string; // produce name as it appears on the poster
  color: string; // ribbon color
  /** Whether the poster shows this crop unless a URL says otherwise. See Produce.default. */
  default: boolean;
}

/**
 * Build a crop's produce entry from its committed raw cache — no network. Refreshing the
 * cache is a separate, opt-in step (see {@link pull}).
 */
export async function buildMarsProduce(crop: MarsCrop): Promise<GeneratedProduce> {
  const path = cachePath(crop);
  if (!(await Bun.file(path).exists())) {
    throw new Error(`No raw cache at ${path} — re-run with --pull (needs MARS_API_KEY).`);
  }
  const spans = await deriveSeason(crop);
  const years = `${Math.min(...crop.years)}–${Math.max(...crop.years)}`;
  return {
    name: crop.name,
    color: crop.color,
    spans,
    sources: [
      {
        // Short enough to set as fine print, and deliberately naming neither the report nor the
        // cache: those differ per crop, so including them would give the poster a separate
        // credit line for every commodity. The crop list and the raw cache hold that detail.
        credit: `USDA AMS Market News shipment volumes, ${years} · ${crop.districts.map(districtLabel).join(', ')}`,
        url: 'https://www.ams.usda.gov/market-news/fruits-vegetables',
      },
    ],
  };
}

/** 'SALINAS-WATSONVILLE CALIFORNIA' → 'Salinas-Watsonville', for setting rather than matching. */
function districtLabel(district: string): string {
  return district
    .replace(/\s+CALIFORNIA$/, '')
    .replace(/\b\w+/g, (word) => word[0] + word.slice(1).toLowerCase());
}
