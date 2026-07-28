import { test } from 'bun:test';

import { z } from 'zod';

import { regions } from '@/data/regions';
import { RegionSchema } from '@/data/regions/schema';

test('all region data conforms to the schema', () => {
  // parse (not safeParse) so a failure throws the ZodError with full detail.
  z.array(RegionSchema).parse(regions);
});
