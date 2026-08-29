/**
 * Derive the session browser's data from the published transcript and the git history.
 *
 * `docs/session.jsonl` is 30 MB of log, most of it accounting — token usage, file snapshots, and
 * a second copy of every tool result. What a reader wants is the conversation, which is 1.4 MB of
 * it. This pulls that out and joins it to the commits, so a prompt can be found by what it led to.
 *
 * The join is time: prompts belong to the next commit made after them. That works because the
 * history and the session cover the same 39 days and every commit has prompts behind it — it is
 * a property of how this project was built, checked on every run rather than assumed.
 *
 * Re-run whenever the transcript grows, which includes the commit that files the last batch into
 * topics. So it must be safe to run repeatedly: it reads the curation and never writes it, and
 * anything not yet filed is reported and passed through rather than dropped or guessed at.
 */
import { homedir } from 'node:os';

import { CHAPTERS, COLLECTIONS, THREADS, TOPICS } from '@/data/transcript/curation';

const IN = 'docs/session.jsonl';
const OUT = 'data/transcript/__generated__/transcript.json';

/**
 * One thing Claude did: said something, or reached for a tool.
 *
 * `detail` is the one fact about a call worth reading — which file, which command — and it is a
 * summary rather than the arguments on purpose. The full inputs would take the file from 1.4 MB
 * to 3.6 MB, and the results to 5.3 MB, to fill a panel nobody opens. A line that says
 * `Edit src/lib/season.ts` carries the useful part at a twelfth of the cost.
 */
type Step = { kind: 'text'; text: string } | { kind: 'tool'; name: string; detail: string };

/**
 * One prompt and everything Claude did before the next one.
 *
 * A sequence rather than a reply and a bag of tool names, because that is the shape of the work:
 * 95% of exchanges span more than one assistant message, and in 79% Claude speaks again *after*
 * a tool call. Flattening those into one string loses the order, which is the part that reads as
 * reasoning — checked this, found that, so did the other.
 */
interface Exchange {
  id: string;
  ts: string;
  commit: string;
  prompt: string;
  steps: Step[];
  /** The prompt cut Claude off mid-work. Frequently, though not always, a correction. */
  interrupted: boolean;
}

interface Commit {
  sha: string;
  subject: string;
  date: string;
  exchanges: string[];
}

// ── Reading the log ─────────────────────────────────────────────────────────────────────────

/** The text a human typed, or null for the log's own bookkeeping entries. */
function promptText(entry: Record<string, unknown>): string | null {
  if (entry.type !== 'user' || entry.isSidechain || entry.isMeta) return null;
  const message = entry.message as { content?: unknown } | undefined;
  const content = message?.content;
  const text =
    typeof content === 'string'
      ? content
      : Array.isArray(content)
        ? content
            .filter((b): b is { type: string; text: string } => b?.type === 'text')
            .map((b) => b.text)
            .join('')
        : '';
  if (!text) return null;
  // Interruptions and slash commands are the harness speaking in the user's place.
  if (text.startsWith('[Request interrupted')) return null;
  if (text.startsWith('<command-name>') || text.startsWith('<local-command')) return null;
  return text;
}

/**
 * The one readable fact about a tool call: which file, which command, which pattern.
 *
 * Every tool names its subject differently, so this is a list of the keys that carry one, tried
 * in order of how specific they are. A call with none of them gets an empty string and shows as
 * its bare name, which is honest — some tools genuinely have nothing to say about themselves.
 */
function toolDetail(input: unknown): string {
  if (!input || typeof input !== 'object') return '';
  const fields = input as Record<string, unknown>;
  const path = fields.file_path ?? fields.path ?? fields.notebook_path;
  // Repo-relative where possible, `~` otherwise. Not for privacy — the working directory is all
  // over the prose anyway — but because the interesting half of the path is the end of it.
  if (typeof path === 'string') {
    return path.replace(`${process.cwd()}/`, '').replace(homedir(), '~');
  }
  for (const key of ['command', 'pattern', 'query', 'description'] as const) {
    const value = fields[key];
    if (typeof value === 'string') return value.split('\n')[0]!.slice(0, 100);
  }
  return '';
}

/** What Claude did in one assistant message, in the order the blocks appear. */
function assistantSteps(entry: Record<string, unknown>): Step[] | null {
  if (entry.type !== 'assistant' || entry.isSidechain) return null;
  const message = entry.message as { content?: unknown } | undefined;
  const content = message?.content;
  if (!Array.isArray(content)) return null;

  const steps: Step[] = [];
  for (const block of content as {
    type?: string;
    text?: string;
    name?: string;
    input?: unknown;
  }[]) {
    if (block.type === 'text' && block.text) steps.push({ kind: 'text', text: block.text });
    if (block.type === 'tool_use' && block.name) {
      steps.push({ kind: 'tool', name: block.name, detail: toolDetail(block.input) });
    }
  }
  return steps;
}

const lines = (await Bun.file(IN).text()).split('\n').filter(Boolean);

// Walk once, in order: each prompt opens an exchange, and everything Claude says until the next
// prompt belongs to it. Interruptions close nothing — they mark the exchange that follows.
const exchanges: Exchange[] = [];
let current: Exchange | null = null;
let pendingInterrupt = false;
for (const line of lines) {
  const entry = JSON.parse(line) as Record<string, unknown>;

  if (entry.type === 'user' && !entry.isSidechain) {
    const message = entry.message as { content?: unknown } | undefined;
    const raw = message?.content;
    const asText = typeof raw === 'string' ? raw : '';
    if (asText.startsWith('[Request interrupted')) pendingInterrupt = true;
  }

  const prompt = promptText(entry);
  if (prompt !== null) {
    current = {
      id: String(entry.uuid),
      ts: String(entry.timestamp),
      commit: '',
      prompt,
      steps: [],
      interrupted: pendingInterrupt,
    };
    pendingInterrupt = false;
    exchanges.push(current);
    continue;
  }

  const steps = assistantSteps(entry);
  if (steps && current) current.steps.push(...steps);
}

// ── Joining to the history ──────────────────────────────────────────────────────────────────

const log = await new Response(
  Bun.spawn(['git', 'log', '--reverse', '--format=%h\t%aI\t%s']).stdout,
).text();
const commits: Commit[] = log
  .trim()
  .split('\n')
  .map((line) => {
    const [sha, date, subject] = line.split('\t');
    return { sha: sha!, date: date!, subject: subject!, exchanges: [] };
  });

for (const exchange of exchanges) {
  const at = Date.parse(exchange.ts);
  const commit = commits.find((c) => Date.parse(c.date) >= at);
  // Work done since the last commit has no commit to belong to yet — the usual state of the tip
  // of the history, and the reason this cannot simply require every exchange to be placed.
  if (!commit) continue;
  exchange.commit = commit.sha;
  commit.exchanges.push(exchange.id);
}

// ── Applying the curation ───────────────────────────────────────────────────────────────────

const known = new Set(commits.map((c) => c.sha));
const filed = new Map<string, string>(); // commit sha -> topic id
for (const topic of TOPICS) {
  for (const sha of topic.commits) {
    if (!known.has(sha)) throw new Error(`Topic "${topic.id}" names unknown commit ${sha}`);
    const already = filed.get(sha);
    if (already) throw new Error(`Commit ${sha} is in both "${already}" and "${topic.id}"`);
    filed.set(sha, topic.id);
  }
}

// Threads may overlap topics and each other, so unlike topics there is nothing to check but
// that the commits exist. What a thread does establish is that its commits are accounted for.
const threaded = new Set<string>();
for (const thread of THREADS) {
  for (const sha of thread.commits) {
    if (!known.has(sha)) throw new Error(`Thread "${thread.id}" names unknown commit ${sha}`);
    threaded.add(sha);
  }
}

const topicIds = new Set(TOPICS.map((t) => t.id));
const inChapter = new Map<string, string>();
for (const chapter of CHAPTERS) {
  for (const id of chapter.topics) {
    if (!topicIds.has(id)) throw new Error(`Chapter "${chapter.id}" names unknown topic ${id}`);
    const already = inChapter.get(id);
    if (already) throw new Error(`Topic ${id} is in both "${already}" and "${chapter.id}"`);
    inChapter.set(id, chapter.id);
  }
}

/**
 * Chapters read in order and their lengths are comparable, which is the whole point of the table
 * of contents — and that only holds while each is an unbroken run of the history. Checked rather
 * than trusted, because the natural way to file a new commit is by what it is about, and doing
 * that a few times silently turns the chapters back into themes that overlap by months.
 *
 * Commits belonging to a thread and no topic are transparent here: upkeep sits inside whatever
 * chapter it happened during without splitting it.
 */
const sequence = commits.map((c) => c.sha).filter((sha) => filed.has(sha));
let cursor = 0;
for (const chapter of CHAPTERS) {
  for (const id of chapter.topics) {
    const topic = TOPICS.find((t) => t.id === id)!;
    for (const sha of topic.commits) {
      if (sequence[cursor] !== sha) {
        const found = commits.find((c) => c.sha === sequence[cursor]);
        throw new Error(
          `Chapters must be contiguous runs of history. Expected ${sha} at position ${cursor} ` +
            `(topic "${id}", chapter "${chapter.id}") but the history has ${sequence[cursor]}` +
            (found ? ` — "${found.subject}"` : ''),
        );
      }
      cursor++;
    }
  }
}

const exchangeIds = new Set(exchanges.map((e) => e.id));
for (const [name, collection] of Object.entries(COLLECTIONS)) {
  for (const entry of collection.entries) {
    if (!exchangeIds.has(entry.exchange)) {
      throw new Error(`Collection "${name}" cites unknown exchange ${entry.exchange}`);
    }
  }
}

// A commit belongs to the narrative (a topic) or is upkeep outside it (a thread alone). Only a
// commit in neither is unaccounted for, and that is what wants reporting.
const unfiledCommits = commits.filter((c) => !filed.has(c.sha) && !threaded.has(c.sha));
const unfiledTopics = TOPICS.filter((t) => !inChapter.has(t.id));
const orphanExchanges = exchanges.filter((e) => !e.commit);

// ── Writing ─────────────────────────────────────────────────────────────────────────────────

const payload = {
  commits,
  exchanges,
  topics: TOPICS,
  threads: THREADS,
  chapters: CHAPTERS,
  collections: COLLECTIONS,
  unfiled: {
    commits: unfiledCommits.map((c) => c.sha),
    topics: unfiledTopics.map((t) => t.id),
  },
};

const json = JSON.stringify(payload);
await Bun.write(OUT, json);

console.log(`${OUT}: ${(json.length / 1024 / 1024).toFixed(2)} MB`);
console.log(`  ${exchanges.length} exchanges across ${commits.length} commits`);
console.log(`  ${TOPICS.length} topics, ${THREADS.length} threads, ${CHAPTERS.length} chapters`);
if (orphanExchanges.length) {
  console.log(`  ${orphanExchanges.length} exchange(s) after the last commit — not yet filed`);
}
if (unfiledCommits.length) {
  console.log(`\n  ${unfiledCommits.length} commit(s) not in any topic:`);
  for (const c of unfiledCommits) console.log(`    ${c.sha}  ${c.subject}`);
}
if (unfiledTopics.length) {
  console.log(`\n  ${unfiledTopics.length} topic(s) not in any chapter:`);
  for (const t of unfiledTopics) console.log(`    ${t.id}`);
}
