import { type Produce, renderRegionFile } from '@/scripts/lib/regionFile';
import { cachePath } from '@/scripts/mars/client';
import { buildMarsProduce } from '@/scripts/mars/produce';
import type { Crop, RegionSources } from '@/scripts/regions/index';

/** Where a region's generated module lives. Everything under here is output — never edit it. */
export function regionFilePath(regionId: string): string {
  return `src/data/regions/__generated__/${regionId}.ts`;
}

/** Crops a source derives. Manual ones carry their own spans and need no cache. */
export type DerivedCrop = Exclude<Crop, { type: 'manual' }>;
export const isDerived = (crop: Crop): crop is DerivedCrop => crop.type !== 'manual';

/** Where a crop's raw cache lives, so we can tell what still needs fetching. */
export function cropCachePath(crop: DerivedCrop): string {
  switch (crop.type) {
    case 'mars':
      return cachePath(crop);
  }
}

/** Build a crop's produce entry from its cached raw data. */
async function buildDerived(crop: DerivedCrop): Promise<Produce> {
  switch (crop.type) {
    case 'mars':
      return { ...(await buildMarsProduce(crop)), generated: true };
  }
}

/**
 * Render a region's module from its crop list, reading only committed caches — no network.
 *
 * Both the writer and the test that guards the committed output call this, so what CI compares
 * is exactly what `bun run regions` would write.
 */
export async function renderRegion(region: RegionSources): Promise<string> {
  const produce: Produce[] = [];
  for (const crop of region.crops) {
    if (isDerived(crop)) produce.push(await buildDerived(crop));
    else {
      const { name, color, spans, sources } = crop;
      produce.push({ name, color, generated: false, spans, sources });
    }
  }
  return renderRegionFile(region, produce);
}
