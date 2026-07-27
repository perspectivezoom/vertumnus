import { mkdir } from 'node:fs/promises';

import { type CacheMeta, serializeCache, toColumnar } from '@/scripts/mars/columnar';
import { MARS_REPORTS, type MarsReport, type MarsReportId } from '@/scripts/mars/reports';

const API_BASE = 'https://marsapi.ams.usda.gov/services/v1.2';

export interface MarsSource {
  report: MarsReportId; // which movement report carries this commodity (see MARS_REPORTS)
  commodity: string; // MARS commodity name
  years: number[]; // seasons to span in a single request
}

/** Path of the raw cache for a source (origin comes from its report). */
export function cachePath(src: MarsSource): string {
  const { origin } = MARS_REPORTS[src.report];
  // MARS commodity names carry spaces, commas and parentheses ("Peppers, Bell Type"), so
  // slugify rather than lowercasing them straight into a filename.
  const slug = src.commodity
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return `src/data/raw/mars/${origin}/${slug}.jsonc`;
}

function header(report: string): string[] {
  return [
    'Raw USDA AMS Market News data — cached so this auth-walled source is reproducible',
    'and never needs refetching. Regenerate via the owning region trigger (scripts/regions/*).',
    '',
    `Source: ${report}, narrowed to California-grown rows. Each row is one shipment, and`,
    '`1 lb units` is its weight — summing that per week gives the season, and where it peaks.',
    '',
    'Columnar layout to dedupe JSON keys: `constants` = columns identical across all rows;',
    '`fields` = the varying columns; each `rows` entry is values aligned to `fields`.',
    'Rehydrate: Object.fromEntries(fields.map((f, i) => [f, row[i]])). No columns dropped.',
    'Formatted by oxfmt (trailingComma is off here so it stays valid strict JSON).',
    '',
    'Reproduce (free MARS API key: https://mymarketnews.ams.usda.gov/mymarketnews-api):',
    '  curl -u "$MARS_API_KEY:" "<url>"',
  ];
}

/** Fetch a commodity's movement data and (re)write its columnar raw cache; returns the path. */
export async function pull(src: MarsSource): Promise<string> {
  const key = Bun.env.MARS_API_KEY;
  if (!key) {
    throw new Error(
      'Set MARS_API_KEY — free key at https://mymarketnews.ams.usda.gov/mymarketnews-api',
    );
  }
  const report: MarsReport = MARS_REPORTS[src.report];
  const from = `01/01/${Math.min(...src.years)}`;
  const to = `12/31/${Math.max(...src.years)}`;
  // The commodity is quoted because MARS reads a bare comma as a value separator, so
  // 'Peppers, Bell Type' would filter for "Peppers" OR " Bell Type" and match nothing.
  // Quotes make it a literal; the `;` and `=` separators stay unencoded.
  const commodity = encodeURIComponent(`"${src.commodity}"`);
  const query = `commodity=${commodity};report_begin_date=${from}:${to}`;
  const url = `${API_BASE}/reports/${report.slug}/Report%20Details?q=${query}`;

  const res = await fetch(url, { headers: { authorization: `Basic ${btoa(`${key}:`)}` } });
  if (!res.ok) throw new Error(`${src.commodity}: HTTP ${res.status}`);
  const body = (await res.json()) as { results?: Record<string, unknown>[] };
  // Origins are labelled by sub-region ('California-Central', 'California-South') and the API
  // can only match them exactly, so narrow to locally grown rows here instead.
  const rows = (body.results ?? []).filter((row) =>
    String(row.origin ?? '').startsWith(report.originPrefix),
  );
  if (rows.length === 0) throw new Error(`${src.commodity}: no rows from ${src.report}`);

  const meta: CacheMeta = {
    url,
    fetchedAt: new Date().toISOString(),
    years: src.years,
    commodity: src.commodity,
  };
  const path = cachePath(src);
  await mkdir(path.slice(0, path.lastIndexOf('/')), { recursive: true });
  await Bun.write(
    path,
    serializeCache(header(`${report.name} (${src.report})`), meta, toColumnar(rows)),
  );
  await Bun.$`bunx oxfmt ${path}`.quiet(); // oxfmt owns the layout; keeps the cache canonical
  return path;
}
