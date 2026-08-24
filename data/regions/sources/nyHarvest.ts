import { parseCache, rehydrate } from '@/data/raw/format';
import { CHART_URL } from '@/data/raw/nyharvest/client';
import type { GeneratedProduce, Span } from '@/data/regions/render';
import { byWeek, Level, MAX_WEEK, MIN_WEEK, WEEKS_PER_YEAR } from '@/src/lib/season';

const CACHE_PATH = 'data/raw/nyharvest/chart.jsonc';

/** A week counts as covered once the bar spans at least half of it. */
const COVERED = 0.5;

/** A week's standing, ranked so a harvest bar can overwrite an availability one. */
const OUT = 0;
const AVAILABLE = 1;
const PEAK = 2;
const LEVELS = [null, Level.Available, Level.Peak] as const;

/**
 * Build a crop's season from New York's published harvest chart.
 *
 * Two bands come off the chart and both map straight onto the poster: its *harvest period* is
 * the peak, its *availability period* is what merely ships. Where they differ, the difference is
 * storage — apples are picked into December and sold all year from controlled atmosphere, so
 * they carry a long thin tail either side of a solid autumn. Sweet corn has no such gap, and
 * that absence is the useful part.
 *
 * **Nothing here is ever uncertain.** The Bay Area's pale band comes from six seasons of
 * shipment volume disagreeing with each other; a chart states one season, so there is no spread
 * to draw. The chart does note that harvest can run a week to ten days early in a warm year, but
 * that slop is neither measured nor uniform across crops, and rendering it as a fixed shoulder
 * would claim a precision the source does not have. New York's ribbons are therefore hard-edged
 * — which reads as more definite than the Bay Area's, when in truth it is simply less measured.
 */
export function buildNyProduce(crop: NyHarvestCrop, rows: ChartRow[]): GeneratedProduce {
  const row = rows.find((r) => r.crop === crop.chartRow);
  if (!row) {
    throw new Error(
      `${crop.name}: the chart has no row '${crop.chartRow}' — check data/raw/nyharvest/chart.jsonc`,
    );
  }
  return {
    name: crop.name,
    color: crop.color,
    spans: spansFrom(row),
    sources: [
      {
        credit: 'New York State Department of Agriculture and Markets harvest chart',
        url: CHART_URL,
      },
    ],
  };
}

/** Paint both bands onto the year, then read off the runs. */
function spansFrom(row: ChartRow): Span[] {
  const weekly = byWeek(OUT);
  const paint = (bands: [number, number][], level: number) => {
    for (const [from, to] of bands) {
      for (let week = MIN_WEEK; week <= MAX_WEEK; week++) {
        // The bar covers [from, to); this week is [week, week + 1).
        const overlap = Math.min(to, week + 1) - Math.max(from, week);
        if (overlap >= COVERED) weekly[week] = Math.max(weekly[week] ?? OUT, level);
      }
    }
  };
  paint(row.available, AVAILABLE);
  paint(row.harvest, PEAK); // harvest sits inside availability, and outranks it

  const spans: Span[] = [];
  for (let week = MIN_WEEK; week <= MAX_WEEK; week++) {
    const level = LEVELS[weekly[week] ?? OUT];
    if (!level) continue;
    const last = spans.at(-1);
    if (last && last.level === level && last.to === week - 1) last.to = week;
    else spans.push({ level, from: week, to: week });
  }
  return joinAcrossNewYear(spans);
}

/**
 * Fuse the runs at either end of the year into the one span they are.
 *
 * The chart draws a season that crosses the New Year as two bars, one at each edge — pears run
 * August to December and again January to March. Read left to right they come back as two runs
 * that never meet, so they are rejoined here into the `to < from` form the schema describes.
 * (The MARS derivation reaches the same form by a different road: it works in season
 * coordinates throughout and only returns to the calendar at the end.)
 */
function joinAcrossNewYear(spans: Span[]): Span[] {
  const first = spans[0];
  const last = spans.at(-1);
  if (spans.length < 2 || !first || !last) return spans;
  if (first.from !== MIN_WEEK || last.to !== MAX_WEEK || first.level !== last.level) return spans;
  return [...spans.slice(1, -1), { level: last.level, from: last.from, to: first.to }];
}

/** One crop's row as measured from the chart; weeks are fractional, and 0-based. */
export interface ChartRow {
  crop: string;
  kind: 'fruit' | 'vegetable';
  harvest: [number, number][];
  available: [number, number][];
}

/** Read the committed chart readings. One file answers every New York crop. */
export async function readChart(): Promise<ChartRow[]> {
  const file = Bun.file(CACHE_PATH);
  if (!(await file.exists())) {
    throw new Error(`No chart readings at ${CACHE_PATH} — run \`bun run fetch ny\`.`);
  }
  return rehydrate(parseCache(await file.text())) as unknown as ChartRow[];
}

export interface NyHarvestCrop {
  type: 'nyHarvest';
  name: string; // as the poster says it
  /** The chart's own row name, which is how the reading is found. Often the same as `name`. */
  chartRow: string;
  color: string;
  default: boolean;
}

/** Weeks in the year, re-exported so the crop list can talk about the axis it lands on. */
export { WEEKS_PER_YEAR };
