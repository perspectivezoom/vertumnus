import { describe, expect, test } from 'bun:test';

import { regionFilePath, renderRegion } from '@/data/regions/build';
import { regionSources } from '@/data/regions/crops';

/**
 * The committed region modules are build output. This regenerates them from the crop lists and
 * the committed raw caches — no network — and checks the result byte for byte, so a stale
 * commit fails CI rather than quietly shipping data nothing produces any more.
 *
 * On failure: run `bun run regions` and commit the result.
 */
describe('generated region data is up to date', () => {
  for (const region of regionSources) {
    test(`${region.id} matches ${regionFilePath(region.id)}`, async () => {
      const committed = await Bun.file(regionFilePath(region.id)).text();
      expect(await renderRegion(region)).toBe(committed);
    });
  }
});
