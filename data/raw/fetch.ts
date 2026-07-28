import { cachePath, pull } from '@/data/raw/mars/client';
import { type Crop, regionSources } from '@/data/regions/crops';

// Stage ①: fetch source data into data/raw/. Needs MARS_API_KEY; nothing else does.
//
//   bun run fetch                every region's crops
//   bun run fetch sfbay          just one region
//   bun run fetch --limit=10     at most 10 requests this run
//   bun run fetch --force        refetch crops that are already cached
//
// Only missing caches are fetched, so this is resumable: run it again after a failure, or to
// pick up newly listed crops, and it continues where it left off. `--limit` keeps a large
// backfill to polite batches. Refetching rewrites `fetchedAt`, so a cached crop is left alone
// unless `--force` says otherwise — otherwise every run would churn the committed diff.

const DELAY_MS = 500; // spacing between requests, to stay well inside any rate limit

const args = Bun.argv.slice(2);
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

/** Crops a source fetches. Manual ones carry their own spans and need no cache. */
type DerivedCrop = Exclude<Crop, { type: 'manual' }>;

function cacheFor(crop: DerivedCrop): string {
  switch (crop.type) {
    case 'mars':
      return cachePath(crop);
  }
}

function fetchCrop(crop: DerivedCrop): Promise<string> {
  switch (crop.type) {
    case 'mars':
      return pull(crop);
  }
}

let budget = limit;
for (const region of selected) {
  const pending: DerivedCrop[] = [];
  for (const crop of region.crops) {
    if (crop.type === 'manual') continue;
    if (force || !(await Bun.file(cacheFor(crop)).exists())) pending.push(crop);
  }

  const batch = pending.slice(0, Math.max(0, budget));
  budget -= batch.length;
  console.log(`${region.id}: ${pending.length} crop(s) need data, fetching ${batch.length}`);
  for (const [i, crop] of batch.entries()) {
    console.log(`  [${i + 1}/${batch.length}] ${crop.name} → ${await fetchCrop(crop)}`);
    if (i < batch.length - 1) await Bun.sleep(DELAY_MS);
  }
  if (pending.length > batch.length) {
    console.log(`  ${pending.length - batch.length} still missing — run again to continue`);
  }
}

console.log('\nNow run `bun run regions` to rebuild the region modules.');
