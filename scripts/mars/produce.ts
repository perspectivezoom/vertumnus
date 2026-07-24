import type { GeneratedProduce } from '@/scripts/lib/regionFile';
import { cachePath, type MarsSource } from '@/scripts/mars/client';
import { MARS_REPORTS } from '@/scripts/mars/reports';
import { deriveSeason } from '@/scripts/mars/season';

export interface MarsCrop extends MarsSource {
  type: 'mars';
  name: string; // produce name as it appears on the poster
  color: string; // ribbon color
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
  const report = MARS_REPORTS[crop.report];
  const years = `${Math.min(...crop.years)}–${Math.max(...crop.years)}`;
  return {
    name: crop.name,
    color: crop.color,
    spans,
    sources: [
      {
        title:
          `USDA AMS Market News — ${report.name} (${crop.report}), ${years} seasons; ` +
          `peak derived from weekly listing density (raw cache: ${cachePath(crop)})`,
        url: 'https://www.ams.usda.gov/market-news/fruits-vegetables',
      },
    ],
  };
}
