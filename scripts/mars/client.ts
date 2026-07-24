import { mkdir } from 'node:fs/promises';

import { type CacheMeta, serializeCache, toColumnar } from '@/scripts/mars/columnar';
import { MARS_REPORTS, type MarsReportId } from '@/scripts/mars/reports';

const API_BASE = 'https://marsapi.ams.usda.gov/services/v1.2';

export interface MarsSource {
  report: MarsReportId; // which shipping-point report to pull (see MARS_REPORTS)
  commodity: string; // MARS commodity name
  years: number[]; // seasons to span in a single request
}

/** Path of the raw cache for a source (origin comes from its report). */
export function cachePath(src: MarsSource): string {
  const { origin } = MARS_REPORTS[src.report];
  return `src/data/raw/mars/${origin}/${src.commodity.toLowerCase()}.jsonc`;
}

function header(report: string): string[] {
  return [
    'Raw USDA AMS Market News data — cached so this auth-walled source is reproducible',
    'and never needs refetching. Regenerate via the owning region trigger (scripts/regions/*).',
    '',
    `Source: ${report}. A California commodity appears here only while actively shipping`,
    'from CA districts, so the span of report_date values is a week-level season signal;',
    'supply_tone_comments + listing density mark peak.',
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

/** Fetch a commodity's shipping-point data and (re)write its columnar raw cache; returns the path. */
export async function pull(src: MarsSource): Promise<string> {
  const key = Bun.env.MARS_API_KEY;
  if (!key) {
    throw new Error(
      'Set MARS_API_KEY — free key at https://mymarketnews.ams.usda.gov/mymarketnews-api',
    );
  }
  const report = MARS_REPORTS[src.report];
  const from = `01/01/${Math.min(...src.years)}`;
  const to = `12/31/${Math.max(...src.years)}`;
  const query = `commodity=${src.commodity};report_begin_date=${from}:${to}`;
  const url = `${API_BASE}/reports/${report.slug}/Report%20Details?q=${query}`;

  const res = await fetch(url, { headers: { authorization: `Basic ${btoa(`${key}:`)}` } });
  if (!res.ok) throw new Error(`${src.commodity}: HTTP ${res.status}`);
  const body = (await res.json()) as { results?: Record<string, unknown>[] };
  const rows = body.results ?? [];

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
