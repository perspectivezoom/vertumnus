import { z } from 'zod';

import { coveredWeeks, Level, MAX_WEEK, MIN_WEEK, peakMidpoint } from '@/lib/season';

export type Region = z.infer<typeof RegionSchema>;
export type Produce = z.infer<typeof ProduceSchema>;

const WeekSchema = z.number().int().min(MIN_WEEK).max(MAX_WEEK);

const SourceSchema = z.object({
  title: z.string().min(1),
  url: z.url().nullable(), // null = uncited local knowledge, never a placeholder
});

const SeasonSpanSchema = z.object({
  level: z.enum(Level),
  from: WeekSchema, // inclusive
  to: WeekSchema, // inclusive; wraps the year when to < from
});

export const ProduceSchema = z.object({
  name: z.string().min(1),
  spans: z.array(SeasonSpanSchema).refine(hasNoOverlap, { error: 'week spans overlap' }),
  sources: z.array(SourceSchema).min(1),
});

export const RegionSchema = z
  .object({
    id: z.string().regex(/^[a-z]+$/), // slug; lowercase a-z only for now, matches file name and URL
    name: z.string().min(1),
    generatedAt: z.iso.datetime(),
    schemaVersion: z.literal(1),
    items: z.array(ProduceSchema),
  })
  // Items must be authored in ascending peak-midpoint order (the poster's top-left
  // to bottom-right diagonal). We validate that order rather than sorting for them.
  .refine((region) => itemsInPeakOrder(region.items), {
    error: 'items must be ordered by ascending peak midpoint',
    path: ['items'],
  });

/** True if items are in non-decreasing peak-midpoint order (no-peak sorts to the end). */
function itemsInPeakOrder(items: { spans: z.infer<typeof SeasonSpanSchema>[] }[]): boolean {
  const mids = items.map((item) => peakMidpoint(item.spans));
  for (let k = 1; k < mids.length; k++) {
    const prev = mids[k - 1] ?? Number.NEGATIVE_INFINITY;
    const cur = mids[k] ?? Number.POSITIVE_INFINITY;
    if (prev > cur) return false;
  }
  return true;
}

/** True if no two spans cover the same week. */
function hasNoOverlap(spans: z.infer<typeof SeasonSpanSchema>[]): boolean {
  const claimed = new Set<number>();
  for (const span of spans) {
    if (span.from < MIN_WEEK || span.from > MAX_WEEK || span.to < MIN_WEEK || span.to > MAX_WEEK)
      continue; // out-of-range reported by WeekSchema
    for (const w of coveredWeeks(span.from, span.to)) {
      if (claimed.has(w)) return false;
      claimed.add(w);
    }
  }
  return true;
}
