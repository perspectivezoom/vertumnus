import { marsJobs, type MarsSource } from '@/data/raw/mars/client';
import { type RegionSources, regionSources } from '@/data/regions/crops';

// Stage ①: fetch source data into data/raw/. Needs MARS_API_KEY; nothing else does.
//
//   bun run fetch                every region's crops
//   bun run fetch sfbay          just one region
//   bun run fetch --limit=10     at most 10 requests this run
//   bun run fetch --force        refetch caches that are already good
//
// Only caches that cannot answer what the crop lists ask for are fetched, so this is resumable:
// run it again after a failure, or to pick up newly listed crops, and it continues where it left
// off. `--limit` keeps a large backfill to polite batches. Refetching rewrites `fetchedAt`, so a
// sufficient cache is left alone unless `--force` says otherwise — otherwise every run would
// churn the committed diff.

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

/** This region's crops belonging to one source. Manual ones reach no source and drop out here. */
const marsCrops = (regions: RegionSources[]): MarsSource[] =>
  regions.flatMap((region) => region.crops).filter((crop) => crop.type === 'mars');

// Each source is asked what it would fetch to answer the selected regions, given everything
// every region wants. How crops map onto caches, and whether a committed one is already good
// enough, are its business — this only decides how much of that work to do now.
const jobs = await marsJobs(marsCrops(regionSources), marsCrops(selected));
const pending = jobs.filter((job) => force || job.needed);

/**
 * What the run was asked for, against what it did.
 *
 * Three separate things pull those apart, and reporting one number for all of them has misled
 * before: caches already good enough to skip, caches deferred by `--limit`, and whether running
 * again gets any further. It does only while coverage is deciding — `--force` ignores exactly
 * the state that records progress, so a forced, limited run repeats its first few every time
 * rather than working through the rest.
 */
function summarize(count: { scope: number; pending: number; fetched: number }): string {
  const { scope, pending, fetched } = count;
  if (scope === 0) return 'No caches in scope — nothing to fetch.';

  const parts = [`${scope} cache(s) in scope`];
  if (force) parts.push('cache state ignored (--force)');
  else if (scope > pending) parts.push(`${scope - pending} already sufficient`);
  parts.push(`${fetched} fetched`);

  const deferred = pending - fetched;
  if (deferred > 0) {
    parts.push(
      force
        ? `${deferred} beyond --limit (a forced run restarts from the top, so raise it to reach them)`
        : `${deferred} beyond --limit — run again to continue`
    );
  }
  return `${parts.join(', ')}.`;
}

const batch = pending.slice(0, Math.max(0, limit));
for (const [i, job] of batch.entries()) {
  console.log(`  [${i + 1}/${batch.length}] ${job.label} → ${await job.pull()}`);
  if (i < batch.length - 1) await Bun.sleep(DELAY_MS);
}
console.log(summarize({ scope: jobs.length, pending: pending.length, fetched: batch.length }));

if (batch.length > 0) console.log('\nNow run `bun run regions` to rebuild the region modules.');
