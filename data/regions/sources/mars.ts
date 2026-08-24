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
const PEAK_SHARE = 0.5; // the busiest weeks carrying this much of a season are its peak
const SEASON_SHARE = 0.9; // ...and carrying this much, its season; the rest is trickle
const MIN_SEASON_SHARE = 0.1; // a season carrying less than this of the median gets no vote
const MAX_GAP = 4; // an interior gap this short is reporting noise, not a break in the season
const PEAK_GAP = 2; // a dip this short inside a peak is the seasons disagreeing, not a second crop
const UNCERTAIN_SHARE = 1 / 3; // seasons that must call a week best for it to read as maybe-peak

/** A week's standing, ranked so that `bridge` can raise everything below a level. */
const OUT = 0;
const AVAILABLE = 1;
const UNCERTAIN = 2;
const PEAK = 3;
const LEVELS = [null, 'available', 'uncertain', 'peak'] as const;

/** One season's answer for every week: which it calls its best, and which it ships at all. */
interface Ballot {
  weeks: number[]; // that season's shipped weight per week, which the sets index into
  peak: Set<number>;
  season: Set<number>; // contains `peak` — 90% of a harvest includes the busiest 50%
}

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
 * Seasons shift — a crop can peak weeks apart from one year to the next. Pooling every year's
 * volume together and classifying afterwards turns that drift into a smear, with holes where
 * one year is fading and the next has not started. So each season answers for itself, over its
 * own harvest, and only then do the answers combine.
 *
 * A season's two bands are volume shares (see {@link topWeeksCarrying}): its peak is the busiest
 * weeks shipping half that year's crop, its season the weeks shipping 90%, and the remaining
 * tenth is the trickle California ships year-round.
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

  const ballots: Ballot[] = voting.map((weeks) => ({
    weeks,
    peak: topWeeksCarrying(weeks, PEAK_SHARE),
    season: topWeeksCarrying(weeks, SEASON_SHARE),
  }));

  const majority = Math.ceil(voting.length / 2);
  const maybe = Math.max(1, Math.ceil(UNCERTAIN_SHARE * voting.length));
  const peakVotes = (week: number) => ballots.filter((b) => b.peak.has(week)).length;
  const seasonVotes = (week: number) => ballots.filter((b) => b.season.has(week)).length;

  const weekly = Array.from({ length: WEEKS + 1 }, (_, week) => {
    if (week === 0) return OUT;
    if (peakVotes(week) >= majority) return PEAK;
    if (peakVotes(week) >= maybe) return UNCERTAIN;
    return seasonVotes(week) >= majority ? AVAILABLE : OUT;
  });

  // A crop whose harvest lands somewhere different every year can have no week win a majority,
  // leaving it with no peak at all and sorting it to the end of the poster. Average the seasons'
  // peaks instead: a guess sited where they cluster, rather than a band stretched to cover every
  // week any one season ever called its best.
  if (!weekly.includes(PEAK)) {
    const guess = averagePeak(ballots);
    if (guess) for (let week = guess.from; week <= guess.to; week++) weekly[week] = PEAK;
  }

  // Peak is bridged more tightly than availability, and uncertainty not at all: a wide bridge
  // across a peak would weld a twice-harvested crop into one mass, while uncertainty is the
  // record of where seasons disagree, so smoothing it would erase the signal itself.
  bridge(weekly, AVAILABLE, MAX_GAP);
  bridge(weekly, PEAK, PEAK_GAP);

  const spans: Span[] = [];
  for (let week = 1; week <= WEEKS; week++) {
    const level = LEVELS[weekly[week] ?? OUT];
    if (!level) continue;
    const last = spans.at(-1);
    if (last && last.level === level && last.to === week - 1) last.to = week;
    else spans.push({ level, from: week, to: week });
  }
  return anchorUncertain(spans);
}

/**
 * Demote uncertainty that touches no peak.
 *
 * The pale band on the poster is drawn as the gap between an early curve and a late one — it
 * says "in some years the peak reached this far", which only means something as the edge of a
 * peak. Voting can also raise a week in the middle of a tail, where a couple of seasons happened
 * to ship well; that renders as a spike floating clear of the ridge, promising abundance that
 * the weeks around it do not have. Those weeks still ship, so they read as available.
 */
function anchorUncertain(spans: Span[]): Span[] {
  const anchored = spans.map((span, i) => {
    if (span.level !== 'uncertain') return span;
    const before = spans[i - 1];
    const after = spans[i + 1];
    const touchesPeak =
      (before?.level === 'peak' && before.to === span.from - 1) ||
      (after?.level === 'peak' && after.from === span.to + 1);
    return touchesPeak ? span : { ...span, level: 'available' as const };
  });

  const merged: Span[] = [];
  for (const span of anchored) {
    const last = merged.at(-1);
    if (last && last.level === span.level && last.to === span.from - 1) last.to = span.to;
    else merged.push({ ...span });
  }
  return merged;
}

/**
 * The mean of each season's peak, as a single span — the best guess when they never overlap.
 *
 * Averaging the starts and the ends separately keeps the guess about as long as a typical
 * season's peak, so a crop whose harvest merely drifts year to year still reads as a peak of
 * plausible length, placed where those years centre.
 */
function averagePeak(ballots: Ballot[]): { from: number; to: number } | null {
  const runs = ballots.map(bestPeakRun).filter((run) => run !== null);
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
function bestPeakRun({ weeks, peak }: Ballot): { from: number; to: number } | null {
  let best = 0;
  for (let week = 1; week <= WEEKS; week++) {
    if ((weeks[week] ?? 0) > (weeks[best] ?? 0)) best = week;
  }
  if (best === 0) return null;
  let from = best;
  let to = best;
  while (from > 1 && peak.has(from - 1)) from -= 1;
  while (to < WEEKS && peak.has(to + 1)) to += 1;
  return { from, to };
}

/**
 * Raise runs no longer than `maxGap` that sit between two weeks already at `level`.
 *
 * Seasons rarely align exactly, so a consensus can dip for a week or two mid-season purely
 * because the years disagree there. Bridging those keeps a season whole while leaving a
 * genuine second harvest — separated by many weeks — as two distinct spans.
 */
function bridge(weekly: number[], level: number, maxGap: number): void {
  let run = 0;
  for (let week = 1; week <= WEEKS + 1; week++) {
    if ((weekly[week] ?? 0) >= level) {
      if (run > 0 && run <= maxGap && week - run - 1 >= 1) {
        for (let w = week - run; w < week; w++) weekly[w] = level;
      }
      run = 0;
    } else run += 1;
  }
}

/**
 * The busiest weeks that together carry `share` of a season's shipped weight.
 *
 * A share of the harvest, rather than a fraction of the season's tallest week: that denominator
 * would be shape-dependent, since sweet corn's best week is four times a typical shipping week
 * and tomatoes' is under twice, so one threshold asks far more of a spiky crop than a flat one.
 * A share asks both the same question, and says what a shopper means — the peak is the stretch
 * that ships half the crop.
 *
 * Taking a set of weeks rather than a window is what lets a twice-harvested crop come back as
 * two runs, with no special case for it.
 */
function topWeeksCarrying(weeks: number[], share: number): Set<number> {
  const shipped = weeks
    .map((weight, week) => ({ weight, week }))
    .slice(1, WEEKS + 1)
    .filter((entry) => entry.weight > 0)
    .sort((a, b) => b.weight - a.weight);
  const total = shipped.reduce((sum, entry) => sum + entry.weight, 0);
  const picked = new Set<number>();
  let carried = 0;
  let least = Number.POSITIVE_INFINITY;
  for (const { weight, week } of shipped) {
    // Keep going past the share while weeks are still tied with the last one taken. Without
    // this a crop harvested twice in equal measure would have its peak decided by sort order:
    // half the volume is reached partway through the first harvest, and the second — just as
    // busy — would be cut off mid-tie and never appear.
    if (carried >= share * total && weight < least) break;
    picked.add(week);
    carried += weight;
    least = weight;
  }
  return picked;
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
