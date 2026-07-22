import { test } from 'bun:test';

import { z } from 'zod';

import { regions } from '@/data/regions';
import { testRegion } from '@/data/testRegion';
import { RegionSchema } from '@/data/types';

test('all region data conforms to the schema', () => {
  // parse (not safeParse) so a failure throws the ZodError with full detail.
  z.array(RegionSchema).parse([...regions, testRegion]);
});
