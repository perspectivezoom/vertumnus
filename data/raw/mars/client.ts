import { mkdir } from 'node:fs/promises';

import { type CacheMeta, parseCache, serializeCache, toColumnar } from '@/data/raw/format';
import { MARS_REPORTS, type MarsReport, type MarsReportId } from '@/data/raw/mars/reports';
import type { FetchJob } from '@/data/raw/source';

const API_BASE = 'https://marsapi.ams.usda.gov/services/v1.2';

export interface MarsSource {
  report: MarsReportId; // which movement report carries this commodity (see MARS_REPORTS)
  commodity: string; // MARS commodity name
  years: number[]; // seasons to span in a single request
  /**
   * Growing districts whose shipments count, as exact MARS district names.
   *
   * A movement report covers a whole state, and the districts within one are staggered by
   * hundreds of miles, so pooling them answers "when is the state shipping this" rather than
   * "when is it good at my market". Which districts are near enough is regional knowledge, so
   * a region's crop list supplies this — see the factories in data/regions/crops/.
   */
  districts: string[];
}

/** What a MARS cache records beyond the universal fields: what was asked for, and how narrowed. */
export interface MarsCacheMeta extends CacheMeta {
  years: number[];
  commodity: string;
  /** Growing districts this cache was narrowed to — everything else was never fetched. */
  districts: string[];
}

/**
 * Combine two sources that share a cache into one that satisfies both.
 *
 * Caches are keyed by where produce grows rather than by who reads them, so two regions can
 * want the same file with different reach. Fetching the union means neither is short a district.
 */
function merge(a: MarsSource, b: MarsSource): MarsSource {
  return { ...a, districts: [...new Set([...a.districts, ...b.districts])].sort() };
}

/** True if the committed cache was already narrowed widely enough to answer `src`. */
async function covers(src: MarsSource): Promise<boolean> {
  const file = Bun.file(cachePath(src));
  if (!(await file.exists())) return false;
  const cached = new Set(parseCache<MarsCacheMeta>(await file.text()).districts ?? []);
  return src.districts.every((d) => cached.has(d));
}

/**
 * The fetches needed to answer `wanted`, one per cache.
 *
 * `all` is every MARS source anywhere; `wanted` is the subset this run cares about. Both are
 * required because a cache is keyed by where produce grows rather than by who reads it, so a
 * run scoped to one region must still fetch the union every region wants from a shared file —
 * otherwise it writes something complete for itself and short for its neighbour. Callers say
 * which caches to touch, never what to ask for them.
 */
export async function marsJobs(all: MarsSource[], wanted: MarsSource[]): Promise<FetchJob[]> {
  const byPath = new Map<string, MarsSource>();
  for (const src of all) {
    const path = cachePath(src);
    const seen = byPath.get(path);
    byPath.set(path, seen ? merge(seen, src) : src);
  }
  const touched = new Set(wanted.map(cachePath));
  const jobs: FetchJob[] = [];
  for (const [path, src] of byPath) {
    if (!touched.has(path)) continue;
    jobs.push({ label: src.commodity, needed: !(await covers(src)), pull: () => pull(src) });
  }
  return jobs;
}

/** Path of the raw cache for a source (origin comes from its report). */
export function cachePath(src: MarsSource): string {
  const { origin } = MARS_REPORTS[src.report];
  // MARS commodity names carry spaces, commas and parentheses ("Peppers, Bell Type"), so they
  // cannot go straight into a filename. camelCase rather than hyphens, to match how the rest of
  // the repo names things — and derived from the commodity, not from whatever the poster calls
  // the crop, so a cache is named for what was actually fetched.
  const slug = src.commodity
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
    .map((word, i) => (i === 0 ? word : word[0]!.toUpperCase() + word.slice(1)))
    .join('');
  return `data/raw/mars/${origin}/${slug}.jsonc`;
}

function header(report: string): string[] {
  return [
    'Raw USDA AMS Market News data — cached so this auth-walled source is reproducible',
    'and never needs refetching. Regenerate with `bun run fetch`.',
    '',
    `Source: ${report}, narrowed to the districts in \`districts\` below. Each row is a shipment,`,
    '`1 lb units` is its weight — summing that per week gives the season, and where it peaks.',
    '',
    'Columnar layout to dedupe JSON keys: `constants` = columns identical across all rows;',
    '`fields` = the varying columns; each `rows` entry is values aligned to `fields`.',
    'Rehydrate: Object.fromEntries(fields.map((f, i) => [f, row[i]])). No columns dropped.',
    'Formatted by oxfmt (trailingComma is off here so it stays valid strict JSON).',
    '',
    'Reproduce (free MARS API key: https://mymarketnews.ams.usda.gov/mymarketnews-api):',
    '  curl -u "$MARS_API_KEY:" "<url>"'
  ];
}

/** Fetch a commodity's movement data and (re)write its columnar raw cache; returns the path. */
async function pull(src: MarsSource): Promise<string> {
  const key = Bun.env.MARS_API_KEY;
  if (!key) {
    throw new Error(
      'Set MARS_API_KEY — free key at https://mymarketnews.ams.usda.gov/mymarketnews-api'
    );
  }
  const report: MarsReport = MARS_REPORTS[src.report];
  const from = `01/01/${Math.min(...src.years)}`;
  const to = `12/31/${Math.max(...src.years)}`;
  // The commodity is quoted because MARS reads a bare comma as a value separator, so
  // 'Peppers, Bell Type' would filter for "Peppers" OR " Bell Type" and match nothing.
  // Quotes make it a literal; the `;` and `=` separators stay unencoded.
  const commodity = encodeURIComponent(`"${src.commodity}"`);
  // Districts are OR'd by a bare comma, so quote and encode each one but leave the commas raw.
  // Filtering here rather than after the fact halves what we fetch and commit.
  const district = src.districts.map((d) => encodeURIComponent(`"${d}"`)).join(',');
  const query = `commodity=${commodity};district=${district};report_begin_date=${from}:${to}`;
  const url = `${API_BASE}/reports/${report.slug}/Report%20Details?q=${query}`;

  const res = await fetch(url, { headers: { authorization: `Basic ${btoa(`${key}:`)}` } });
  if (!res.ok) throw new Error(`${src.commodity}: HTTP ${res.status}`);
  const body = (await res.json()) as { results?: Record<string, unknown>[] };
  // Origins are labelled by sub-region ('California-Central', 'California-South') and the API
  // can only match them exactly, so narrow to locally grown rows here instead.
  const rows = (body.results ?? []).filter((row) =>
    String(row.origin ?? '').startsWith(report.originPrefix)
  );
  if (rows.length === 0) throw new Error(`${src.commodity}: no rows from ${src.report}`);

  const meta: MarsCacheMeta = {
    url,
    fetchedAt: new Date().toISOString(),
    years: src.years,
    commodity: src.commodity,
    districts: src.districts
  };
  const path = cachePath(src);
  await mkdir(path.slice(0, path.lastIndexOf('/')), { recursive: true });
  await Bun.write(
    path,
    serializeCache(header(`${report.name} (${src.report})`), meta, toColumnar(rows))
  );
  await Bun.$`bunx oxfmt ${path}`.quiet(); // oxfmt owns the layout; keeps the cache canonical
  return path;
}
