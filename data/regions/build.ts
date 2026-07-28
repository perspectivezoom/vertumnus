import { mkdir } from 'node:fs/promises';

import { type Crop, type RegionSources, regionSources } from '@/data/regions/crops';
import { type Produce, renderRegionFile } from '@/data/regions/render';
import { buildMarsProduce } from '@/data/regions/sources/mars';

// Stage ②: build data/regions/__generated__/ from the crop lists and the committed raw caches.
// Offline — it reads data/raw/ and never touches the network, so it needs no API key.
//
//   bun run regions              every region
//   bun run regions sfbay        just one
//
// tests/generatedRegions.test.ts calls renderRegion() and compares against the committed
// output, so a stale commit fails CI.

/** Where a region's generated module lives. Everything under __generated__ is output. */
export function regionFilePath(regionId: string): string {
  return `data/regions/__generated__/${regionId}.ts`;
}

/** Build one crop's produce entry from its cached raw data. */
async function buildCrop(crop: Crop): Promise<Produce> {
  switch (crop.type) {
    case 'mars':
      return { ...(await buildMarsProduce(crop)), generated: true };
    case 'manual': {
      const { name, color, spans, sources } = crop;
      return { name, color, generated: false, spans, sources };
    }
  }
}

/**
 * Render a region's module from its crop list, reading only committed caches — no network.
 * Both the build and the test that guards the committed output call this, so what CI compares
 * is exactly what `bun run regions` writes.
 */
export async function renderRegion(region: RegionSources): Promise<string> {
  const produce: Produce[] = [];
  for (const crop of region.crops) produce.push(await buildCrop(crop));
  return renderRegionFile(region, produce);
}

if (import.meta.main) {
  const [wanted] = Bun.argv.slice(2).filter((arg) => !arg.startsWith('--'));
  const selected = wanted ? regionSources.filter((r) => r.id === wanted) : regionSources;
  if (selected.length === 0) {
    console.error(
      `Unknown region '${wanted}'. Known: ${regionSources.map((r) => r.id).join(', ')}`,
    );
    process.exit(1);
  }

  for (const region of selected) {
    const path = regionFilePath(region.id);
    await mkdir(path.slice(0, path.lastIndexOf('/')), { recursive: true });
    await Bun.write(path, await renderRegion(region));
    console.log(`${region.id}: ${region.crops.length} produce → ${path}`);
  }
}
