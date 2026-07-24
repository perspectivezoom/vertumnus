import { type GeneratedProduce, updateRegionFile } from '@/scripts/lib/regionFile';
import { pull } from '@/scripts/mars/client';
import { buildMarsProduce } from '@/scripts/mars/produce';
import { type Crop, regionSources } from '@/scripts/regions/index';

// Regenerate the `generated: true` produce entries in src/data/regions/*.ts.
//
//   bun run regions                 every region, derived from the committed raw caches
//   bun run regions sfbay           just one region
//   bun run regions --pull          refetch the raw caches first (needs MARS_API_KEY)
//
// Deriving is offline by default so the everyday run needs no API key and leaves the
// committed caches untouched — refetching would rewrite `fetchedAt` and churn the diff.

const args = Bun.argv.slice(2);
const shouldPull = args.includes('--pull');
const [wanted] = args.filter((arg) => !arg.startsWith('--'));

const selected = wanted ? regionSources.filter((region) => region.id === wanted) : regionSources;
if (selected.length === 0) {
  const known = regionSources.map((region) => region.id).join(', ');
  console.error(`Unknown region '${wanted}'. Known regions: ${known}`);
  process.exit(1);
}

/** Refresh a crop's raw cache from its source API. */
function pullCrop(crop: Crop): Promise<string> {
  switch (crop.type) {
    case 'mars':
      return pull(crop);
  }
}

/** Build a crop's produce entry from its cached raw data. */
function buildCrop(crop: Crop): Promise<GeneratedProduce> {
  switch (crop.type) {
    case 'mars':
      return buildMarsProduce(crop);
  }
}

for (const region of selected) {
  if (shouldPull) {
    for (const crop of region.crops) console.log(`  pulled ${crop.name} → ${await pullCrop(crop)}`);
  }
  const produce = await Promise.all(region.crops.map(buildCrop));
  await updateRegionFile(region.id, produce);

  console.log(`${region.id}:`);
  for (const item of produce) {
    const spans = item.spans.map((s) => `${s.level} ${s.from}-${s.to}`).join(', ');
    console.log(`  ${item.name}: ${spans}`);
  }
}
