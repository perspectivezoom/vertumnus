import { mkdir } from 'node:fs/promises';

import { pull } from '@/scripts/mars/client';
import {
  cropCachePath,
  type DerivedCrop,
  isDerived,
  regionFilePath,
  renderRegion,
} from '@/scripts/regions/build';
import { regionSources } from '@/scripts/regions/index';

// Regenerate src/data/regions/__generated__/*.ts from the crop lists in scripts/regions/.
//
//   bun run regions                 every region, derived from the committed raw caches
//   bun run regions sfbay           just one region
//   bun run regions --pull          fetch raw caches that are missing (needs MARS_API_KEY)
//   bun run regions --pull --limit=10   ...at most 10 of them this run
//   bun run regions --pull --force  refetch even crops that are already cached
//
// Deriving is offline by default so the everyday run needs no API key and leaves the committed
// caches untouched — refetching would rewrite `fetchedAt` and churn the diff. `--pull` only
// fetches what is missing, so it is resumable: run it again after a failure (or to add newly
// listed crops) and it picks up where it left off. `--limit` keeps a large backfill to polite
// batches rather than hammering the API.

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

/** Refresh a crop's raw cache from its source API. */
function pullCrop(crop: DerivedCrop): Promise<string> {
  switch (crop.type) {
    case 'mars':
      return pull(crop);
  }
}

let budget = limit;
for (const region of selected) {
  if (shouldPull) {
    const pending: DerivedCrop[] = [];
    for (const crop of region.crops.filter(isDerived)) {
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

  const path = regionFilePath(region.id);
  await mkdir(path.slice(0, path.lastIndexOf('/')), { recursive: true });
  await Bun.write(path, await renderRegion(region));
  console.log(`${region.id}: wrote ${region.crops.length} produce → ${path}`);
}
