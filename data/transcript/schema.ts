/**
 * The shape of the derived transcript, declared once for both sides of the file.
 *
 * `bun run transcript` writes it and the session browser fetches it, and until this existed each
 * end declared its own `Exchange` with nothing holding the two together — a field renamed in the
 * generator would have type-checked on both sides and failed silently in the browser.
 *
 * So the writer takes its types from here, which makes a mismatched output a compile error, and
 * the reader parses with the schema, which makes a mismatched *file* a clean failure at the
 * network boundary rather than `undefined` surfacing somewhere deep in a render.
 */
import { z } from 'zod';

import type { Chapter, Highlight, Thread, Topic } from '@/data/transcript/curation';

/**
 * One thing Claude did: said something, or reached for a tool.
 *
 * `detail` is a summary — which file, which command — not the arguments. Carrying the real inputs
 * would take the payload from 1.7 MB to 3.6 MB, and the results to 5.3 MB, to fill a panel that
 * does not exist. The summary is the whole of what is kept.
 */
export const StepSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('text'), text: z.string() }),
  z.object({ kind: z.literal('tool'), name: z.string(), detail: z.string() }),
]);

/**
 * One prompt and everything Claude did before the next one.
 *
 * A sequence, not a prompt-and-reply pair: 95% of exchanges span several assistant messages, and
 * in 79% Claude speaks again after a tool call. The order is the part that reads as reasoning.
 */
export const ExchangeSchema = z.object({
  id: z.string(),
  ts: z.string(),
  /** Short SHA of the commit this work landed in, or '' for work not yet committed. */
  commit: z.string(),
  prompt: z.string(),
  steps: z.array(StepSchema),
  /** The prompt cut Claude off mid-work. Frequently, though not always, a correction. */
  interrupted: z.boolean(),
});

export const CommitSchema = z.object({
  sha: z.string(),
  subject: z.string(),
  date: z.string(),
  exchanges: z.array(z.string()),
});

// Annotated against the curation module's own interfaces rather than restating them: these three
// are hand-authored there, and this is the file that has to agree with that one.
const HighlightSchema: z.ZodType<Highlight> = z.object({
  exchange: z.string(),
  note: z.string(),
});
const TopicSchema: z.ZodType<Topic> = z.object({
  id: z.string(),
  title: z.string(),
  blurb: z.string(),
  commits: z.array(z.string()),
});
const ThreadSchema: z.ZodType<Thread> = z.object({
  id: z.string(),
  title: z.string(),
  blurb: z.string(),
  commits: z.array(z.string()),
});
const ChapterSchema: z.ZodType<Chapter> = z.object({
  id: z.string(),
  title: z.string(),
  blurb: z.string(),
  topics: z.array(z.string()),
});

export const CollectionSchema = z.object({
  title: z.string(),
  blurb: z.string(),
  entries: z.array(HighlightSchema),
});

/** The label and note each of the three indexes introduces itself with. */
const GroupSchema = z.object({ title: z.string(), note: z.string() });

export const TranscriptSchema = z.object({
  groups: z.object({
    chapters: GroupSchema,
    threads: GroupSchema,
    collections: GroupSchema,
  }),
  commits: z.array(CommitSchema),
  exchanges: z.array(ExchangeSchema),
  topics: z.array(TopicSchema),
  threads: z.array(ThreadSchema),
  chapters: z.array(ChapterSchema),
  collections: z.record(z.string(), CollectionSchema),
  /** Commits in no topic and topics in no chapter — the tail of work not yet filed. */
  unfiled: z.object({ commits: z.array(z.string()), topics: z.array(z.string()) }),
});

export type Step = z.infer<typeof StepSchema>;
export type Exchange = z.infer<typeof ExchangeSchema>;
export type Commit = z.infer<typeof CommitSchema>;
export type Collection = z.infer<typeof CollectionSchema>;
export type Transcript = z.infer<typeof TranscriptSchema>;
