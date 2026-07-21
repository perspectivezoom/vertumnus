import { z } from 'zod';

export type Region = z.infer<typeof RegionSchema>;

export const Availability = {
  Available: 'available',
  Peak: 'peak',
} as const;

const MIN_WEEK = 1;
const MAX_WEEK = 52;

const WeekSchema = z.number().int().min(MIN_WEEK).max(MAX_WEEK);

const SourceSchema = z.object({
  title: z.string().min(1),
  url: z.url().nullable(), // null = uncited local knowledge, never a placeholder
});

const SeasonSpanSchema = z.object({
  level: z.enum(Availability),
  from: WeekSchema, // inclusive
  to: WeekSchema, // inclusive; wraps the year when to < from
});

const ProduceSchema = z.object({
  name: z.string().min(1),
  spans: z.array(SeasonSpanSchema).refine(hasNoOverlap, { error: 'week spans overlap' }),
  sources: z.array(SourceSchema).min(1),
});

export const RegionSchema = z.object({
  id: z.string().regex(/^[a-z]+$/), // slug; lowercase a-z only for now, matches file name and URL
  name: z.string().min(1),
  generatedAt: z.iso.datetime(),
  schemaVersion: z.literal(1),
  items: z.array(ProduceSchema),
});

/** True if no two spans cover the same week. */
function hasNoOverlap(spans: z.infer<typeof SeasonSpanSchema>[]): boolean {
  const claimed = new Set<number>();
  for (const span of spans) {
    if (span.from < MIN_WEEK || span.from > MAX_WEEK || span.to < MIN_WEEK || span.to > MAX_WEEK) continue; // out-of-range reported by WeekSchema
    for (const w of weeksCovered(span.from, span.to)) {
      if (claimed.has(w)) return false;
      claimed.add(w);
    }
  }
  return true;
}

/** Week numbers a span covers, handling year-wrap (to < from). */
function weeksCovered(from: number, to: number): number[] {
  const weeks: number[] = [];
  if (from <= to) {
    for (let w = from; w <= to; w++) weeks.push(w);
  } else {
    for (let w = from; w <= MAX_WEEK; w++) weeks.push(w);
    for (let w = MIN_WEEK; w <= to; w++) weeks.push(w);
  }
  return weeks;
}
