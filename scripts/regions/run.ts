import { cachePath, pull } from '@/scripts/mars/client';
import { type GeneratedProduce, updateRegionFile } from '@/scripts/lib/regionFile';
import { buildMarsProduce } from '@/scripts/mars/produce';
import { type Crop, regionSources } from '@/scripts/regions/index';

// Regenerate the `generated: true` produce entries in src/data/regions/*.ts.
//
//   bun run regions                 every region, derived from the committed raw caches
//   bun run regions sfbay           just one region
//   bun run regions --pull          fetch raw caches that are missing (needs MARS_API_KEY)
//   bun run regions --pull --limit=10   ...at most 10 of them this run
//   bun run regions --pull --force  refetch even crops that are already cached
//
// Deriving is offline by default so the everyday run needs no API key and leaves the
// committed caches untouched — refetching would rewrite `fetchedAt` and churn the diff.
// `--pull` only fetches what is missing, so it is resumable: run it again after a failure
// (or to add newly listed crops) and it picks up where it left off. `--limit` keeps a large
// backfill to polite batches rather than hammering the API.

const PULL_DELAY_MS = 500; // spacing between requests, to stay well inside any rate limit

const args = Bun.argv.slice(2);
const shouldPull = args.includes('--pull');
const force = args.includes('--force');
const limitArg = args.find((arg) => arg.startsWith('--limit='));
const limit = limitArg ? Number(limitArg.split('=')[1]) : Infinity;
const [wanted] = args.filter((arg) => !arg.startsWith('--'));

const selected = wanted ? regionSources.filter((region) => region.id === wanted) : regionSources;
if (selected.length === 0) {
  const known = regionSources.map((region) => region.id).join(', ');
  console.error(`Unknown region '${wanted}'. Known regions: ${known}`);
  process.exit(1);
}

/** Crops a source derives. Manual ones are declared only so the crop list stays complete. */
type DerivedCrop = Exclude<Crop, { type: 'manual' }>;
const isDerived = (crop: Crop): crop is DerivedCrop => crop.type !== 'manual';

/** Refresh a crop's raw cache from its source API. */
function pullCrop(crop: DerivedCrop): Promise<string> {
  switch (crop.type) {
    case 'mars':
      return pull(crop);
  }
}

/** Build a crop's produce entry from its cached raw data. */
function buildCrop(crop: DerivedCrop): Promise<GeneratedProduce> {
  switch (crop.type) {
    case 'mars':
      return buildMarsProduce(crop);
  }
}

/** Where a crop's raw cache lives, so we can tell what still needs fetching. */
function cropCachePath(crop: DerivedCrop): string {
  switch (crop.type) {
    case 'mars':
      return cachePath(crop);
  }
}

let budget = limit;
for (const region of selected) {
  const derived = region.crops.filter(isDerived);

  if (shouldPull) {
    const pending: DerivedCrop[] = [];
    for (const crop of derived) {
      if (force || !(await Bun.file(cropCachePath(crop)).exists())) pending.push(crop);
    }
    const batch = pending.slice(0, Math.max(0, budget));
    budget -= batch.length;
    console.log(`${region.id}: ${pending.length} crop(s) need data, pulling ${batch.length}`);
    for (const [i, crop] of batch.entries()) {
      console.log(`  [${i + 1}/${batch.length}] ${crop.name} → ${await pullCrop(crop)}`);
      if (i < batch.length - 1) await Bun.sleep(PULL_DELAY_MS);
    }
    if (pending.length > batch.length) {
      console.log(`  ${pending.length - batch.length} still missing — run again to continue`);
    }
  }

  const cached = derived.filter((crop) => Bun.file(cropCachePath(crop)).size > 0);
  const produce = await Promise.all(cached.map(buildCrop));
  // The crop list is comprehensive, so it doubles as the set of entries the region file may
  // keep — anything else has been retired and the writer drops it.
  const known = new Set(region.crops.map((crop) => crop.name));
  await updateRegionFile(region.id, produce, known);

  console.log(`${region.id}:`);
  for (const item of produce) {
    const spans = item.spans.map((s) => `${s.level} ${s.from}-${s.to}`).join(', ');
    console.log(`  ${item.name}: ${spans}`);
  }
}
