import { serializeCache, toColumnar } from '@/data/raw/format';
import type { FetchJob } from '@/data/raw/source';
import { WEEKS_PER_YEAR } from '@/src/lib/season';

/**
 * New York's harvest chart, read off the published PDF.
 *
 * New York cannot be derived the way California is. Of the 23 AMS movement reports, none covers
 * New York origins — the eastern offices (Philadelphia, Washington) are port terminals reporting
 * arrivals of Chilean and New Zealand fruit, not domestic shipping points, and the only New York
 * fruit and vegetable reports are terminal-market *prices*, which count quotes rather than
 * volume. So this region's seasons come from the state's own published chart instead.
 *
 * The chart draws two bars per crop, harvest and availability, against a twelve-month axis. Its
 * bars are vector art at finer than month resolution — sweet cherries begin on 23 June, cabbage
 * on 9 June — so they are measured rather than transcribed: render the page, find the runs of
 * each bar colour, and read their ends against an axis calibrated on the crops whose
 * availability spans the whole year. Transcribing months would discard that precision and
 * introduce exactly the arithmetic slips this avoids.
 */

export const CHART_URL = 'http://agriculture.ny.gov/harvest-chart';
const PDF_PATH = 'data/raw/nyharvest/chart.pdf';
const CACHE_PATH = 'data/raw/nyharvest/chart.jsonc';

/** The bar colours, sampled from the rendered page. */
const HARVEST = [241, 175, 42]; // distinct from the banner's near-identical [247, 168, 0]
const AVAILABLE = [0, 154, 222];

/**
 * The chart's own row order, which is how a bar finds its crop.
 *
 * The rows carry no machine-readable label, so position is the only join available: the fruits
 * table lists 15 in this order and the vegetables table 38. If the state reissues the chart with
 * a crop added or dropped, this list is what has to move with it — and the mismatch will show as
 * a count error below rather than as silently shifted seasons.
 */
const FRUITS = [
  'Apples',
  'Blackberries',
  'Blueberries',
  'Cantaloupes',
  'Cherries, Sweet',
  'Cherries, Tart',
  'Currants',
  'Grapes',
  'Peaches',
  'Pears',
  'Plums',
  'Prunes',
  'Raspberries',
  'Strawberries',
  'Watermelon'
] as const;

const VEGETABLES = [
  'Asparagus',
  'Beans, Dry',
  'Beans, Lima',
  'Beans, Snap',
  'Beets',
  'Beet Greens',
  'Broccoli',
  'Brussels Sprouts',
  'Cabbage',
  'Carrots',
  'Cauliflower',
  'Celery',
  'Collard Greens',
  'Corn',
  'Cucumbers',
  'Eggplant',
  'Garlic',
  'Herbs',
  'Kale',
  'Leeks',
  'Lettuce',
  'Mustard Greens',
  'Onions',
  'Parsnips',
  'Peas',
  'Peppers',
  'Potatoes',
  'Pumpkins',
  'Radishes',
  'Rhubarb',
  'Spinach',
  'Squash, Summer',
  'Squash, Winter',
  'Swiss Chard',
  'Tomatoes',
  'Turnips',
  'Turnip Greens',
  'Zucchini'
] as const;

/** One bar: a horizontal run of a single colour. */
interface Bar {
  kind: 'harvest' | 'available';
  x0: number;
  x1: number;
  y: number;
  thick: number;
}

/** A crop's two bands, as week ranges. A crop may hold more than one of each. */
export interface ChartRow extends Record<string, unknown> {
  crop: string;
  kind: 'fruit' | 'vegetable';
  harvest: [number, number][];
  available: [number, number][];
}

/** Render a page of the PDF, scrolled to `atEnd` when the table runs past one screen. */
async function renderPage(page: number, atEnd: boolean): Promise<Uint8Array> {
  const view = new Bun.WebView({ width: 1300, height: 1500 });
  await view.navigate(`file://${process.cwd()}/${PDF_PATH}#page=${page}`);
  await Bun.sleep(4000); // the viewer paints asynchronously and offers no ready signal
  if (atEnd) {
    await view.evaluate('window.scrollTo(0, document.body.scrollHeight)');
    await Bun.sleep(1500);
  }
  const shot = await view.screenshot();
  view.close();
  return new Uint8Array(await new Blob([shot]).arrayBuffer());
}

/**
 * Find every bar in a rendered page.
 *
 * Runs in a WebView because that is the only canvas available, and the image is inlined as a
 * data URI rather than loaded from disk — a file:// image taints a file:// canvas, and
 * getImageData on a tainted canvas throws.
 */
async function barsIn(png: Uint8Array): Promise<Bar[]> {
  const script = `
    window.bars = null;
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = img.width; c.height = img.height;
      const g = c.getContext('2d');
      g.drawImage(img, 0, 0);
      const { data, width, height } = g.getImageData(0, 0, c.width, c.height);
      const near = (i, q) =>
        Math.abs(data[i] - q[0]) < 24 && Math.abs(data[i+1] - q[1]) < 24 && Math.abs(data[i+2] - q[2]) < 24;
      const HARVEST = ${JSON.stringify(HARVEST)}, AVAILABLE = ${JSON.stringify(AVAILABLE)};
      const runs = [];
      for (let y = 0; y < height; y++) {
        let kind = null, start = -1;
        for (let x = 0; x <= width; x++) {
          const i = (y * width + x) * 4;
          const k = x === width ? null : near(i, HARVEST) ? 'harvest' : near(i, AVAILABLE) ? 'available' : null;
          if (k !== kind) {
            if (kind && x - start > 20) runs.push({ y, kind, x0: start, x1: x - 1 });
            kind = k; start = x;
          }
        }
      }
      // A bar is several scanlines of the same run; fold them into one.
      const bars = [];
      for (const r of runs) {
        const open = bars.find((b) => b.kind === r.kind && Math.abs(b.x0 - r.x0) < 12
          && Math.abs(b.x1 - r.x1) < 12 && r.y - b.yEnd <= 2);
        if (open) { open.yEnd = r.y; open.thick++; }
        else bars.push({ kind: r.kind, x0: r.x0, x1: r.x1, y: r.y, yEnd: r.y, thick: 1 });
      }
      window.bars = JSON.stringify(bars.filter((b) => b.thick >= 3 && b.thick < 30));
    };
    img.src = 'data:image/png;base64,${Buffer.from(png).toString('base64')}';
  `;
  // Base64 rather than a percent-encoded data URL: the script carries quotes and braces that
  // would otherwise have to survive two levels of escaping intact.
  const page = Buffer.from(`<script>${script}</script>`).toString('base64');
  const view = new Bun.WebView({ width: 400, height: 300 });
  await view.navigate(`data:text/html;base64,${page}`);
  await Bun.sleep(5000);
  const raw = await view.evaluate('window.bars');
  view.close();
  if (!raw) throw new Error('bar extraction produced nothing — did the page render?');
  return JSON.parse(String(raw)) as Bar[];
}

/** Group bars into table rows and convert their ends to weeks. */
function rowsFrom(bars: Bar[]): { harvest: [number, number][]; available: [number, number][] }[] {
  // Crops whose availability runs the whole year — apples, herbs, potatoes — fix the axis.
  const widest = bars
    .filter((b) => b.kind === 'available')
    .sort((a, b) => b.x1 - b.x0 - (a.x1 - a.x0))[0];
  if (!widest) throw new Error('no availability bar to calibrate the year against');
  const week = (x: number) => ((x - widest.x0) / (widest.x1 - widest.x0)) * WEEKS_PER_YEAR;

  const rows = new Map<number, Bar[]>();
  // The legend swatches sit left of the table entirely, so they fall outside the year.
  for (const bar of bars.filter((b) => week(b.x0) > -1).sort((a, b) => a.y - b.y)) {
    const row = [...rows.keys()].find((y) => Math.abs(y - bar.y) < 30);
    if (row === undefined) rows.set(bar.y, [bar]);
    else rows.get(row)!.push(bar);
  }
  const ends = (group: Bar[], kind: Bar['kind']) =>
    group
      .filter((b) => b.kind === kind)
      .sort((a, b) => a.x0 - b.x0)
      .map((b): [number, number] => [+week(b.x0).toFixed(2), +week(b.x1).toFixed(2)]);
  return [...rows.values()].map((group) => ({
    harvest: ends(group, 'harvest'),
    available: ends(group, 'available')
  }));
}

function header(): string[] {
  return [
    'New York harvest and availability, read from the published chart alongside this file.',
    'Regenerate with `bun run fetch`; the PDF is the cache, this is what was measured from it.',
    '',
    `Source: NYS Department of Agriculture and Markets, ${CHART_URL}`,
    '"From A(pples) to Z(ucchini), your guide to New York\'s produce".',
    '',
    'Weeks are 0-based and fractional, because the chart is: its bars are vector art at finer',
    'than month resolution, so they are measured against an axis calibrated on the crops whose',
    "availability spans the whole year. `harvest` is the state's harvest period, `available`",
    'its availability period — the gap between them is storage, which is why apples carry one',
    'and sweet corn does not.',
    '',
    'The chart itself notes these periods are approximate: harvest may begin a week to ten days',
    'earlier in a warm year, and a cool spring delays maturity.'
  ];
}

/** Download the chart, measure its bars, and rewrite both the PDF and the readings. */
async function pull(): Promise<string> {
  const res = await fetch(CHART_URL);
  if (!res.ok) throw new Error(`${CHART_URL}: HTTP ${res.status}`);
  await Bun.write(PDF_PATH, await res.arrayBuffer());

  // Fruits fit one screen; the vegetables table runs past it and needs scrolling to its end.
  const fruits = rowsFrom(await barsIn(await renderPage(1, false))).slice(0, FRUITS.length);
  const vegetables = rowsFrom(await barsIn(await renderPage(2, true))).slice(0, VEGETABLES.length);
  if (fruits.length !== FRUITS.length || vegetables.length !== VEGETABLES.length) {
    throw new Error(
      `chart has ${fruits.length} fruit and ${vegetables.length} vegetable rows, expected ` +
        `${FRUITS.length} and ${VEGETABLES.length} — the published chart's rows have changed.`
    );
  }

  const rows: ChartRow[] = [
    ...FRUITS.map((crop, i) => ({ crop, kind: 'fruit' as const, ...fruits[i]! })),
    ...VEGETABLES.map((crop, i) => ({ crop, kind: 'vegetable' as const, ...vegetables[i]! }))
  ];
  const meta = { url: CHART_URL, fetchedAt: new Date().toISOString() };
  await Bun.write(CACHE_PATH, serializeCache(header(), meta, toColumnar(rows)));
  await Bun.$`bunx oxfmt ${CACHE_PATH}`.quiet(); // oxfmt owns the layout, as it does for MARS
  return CACHE_PATH;
}

/** The one fetch this source ever makes: the chart covers every crop at once. */
export async function nyHarvestJobs(wanted: boolean): Promise<FetchJob[]> {
  if (!wanted) return [];
  const have = await Bun.file(CACHE_PATH).exists();
  return [{ label: 'NY harvest chart', needed: !have, pull }];
}
