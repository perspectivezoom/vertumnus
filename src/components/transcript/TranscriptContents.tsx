/**
 * The table of contents: what this session was, at a glance and then in detail.
 *
 * Three indexes over the same 558 exchanges. Chapters run in order, so reading the list top to
 * bottom is reading the project in order. Threads gather work that was picked up and put down
 * across months, which a chronological chapter cannot hold. Collections are hand-picked, and say
 * so — everything else here is derived, and a reader should know which is which.
 */
import { useState } from 'react';

import { ChevronDown, ChevronRight } from 'lucide-react';

import type { Transcript } from '@/data/transcript/schema';

/** How many exchanges a run of commits accounts for — what every count here is counted in. */
type Weigh = (commits: readonly string[]) => number;

export function TranscriptContents({ data }: { data: Transcript }) {
  const weigh = weigher(data);
  return (
    // Clear of the scrollbar this pane grows when a chapter is opened, which would otherwise
    // sit on top of the counts.
    <nav className="flex flex-col pr-3">
      <Chapters data={data} weigh={weigh} />
      <Threads data={data} weigh={weigh} />
      <Collections data={data} />
    </nav>
  );
}

// ── The three indexes ───────────────────────────────────────────────────────────────────────

function Chapters({ data, weigh }: { data: Transcript; weigh: Weigh }) {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <Group title="Chapters" note="Strictly chronological roughly grouped by topic.">
      {data.chapters.map((chapter) => {
        const expanded = open === chapter.id;
        return (
          <div key={chapter.id} className="flex flex-col">
            <Expander
              title={chapter.title}
              count={weigh(commitsOf(data, chapter.id))}
              expanded={expanded}
              onToggle={() => setOpen(expanded ? null : chapter.id)}
            />
            {expanded && (
              <div className="ml-[1.15rem] flex flex-col border-l border-neutral-200 pl-1">
                {chapter.topics.map((id) => {
                  const topic = data.topics.find((t) => t.id === id);
                  return topic ? (
                    <Entry key={id} title={topic.title} count={weigh(topic.commits)} muted />
                  ) : null;
                })}
              </div>
            )}
          </div>
        );
      })}
    </Group>
  );
}

function Threads({ data, weigh }: { data: Transcript; weigh: Weigh }) {
  return (
    <Group title="Threads" note="Work performed at multiple times across chapters.">
      {data.threads.map((thread) => (
        <Entry key={thread.id} title={thread.title} count={weigh(thread.commits)} />
      ))}
    </Group>
  );
}

function Collections({ data }: { data: Transcript }) {
  return (
    <Group title="Collections" note="Interesting topics to highlight.">
      {Object.entries(data.collections).map(([id, collection]) => (
        <Entry key={id} title={collection.title} count={collection.entries.length} />
      ))}
    </Group>
  );
}

// ── The pieces they are all made of ─────────────────────────────────────────────────────────

function Group({
  title,
  note,
  children,
}: {
  title: string;
  note?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col">
      <h2 className="px-2 pt-5 pb-1 text-[11px] font-semibold tracking-wider text-neutral-400 uppercase">
        {title}
      </h2>
      {note && <p className="px-2 pb-1 text-[11px] leading-snug text-neutral-400">{note}</p>}
      {children}
    </section>
  );
}

/** A named thing and how much of the session it accounts for. */
function Entry({ title, count, muted }: { title: string; count: number; muted?: boolean }) {
  return (
    <p className={`${ROW} ${muted ? 'text-neutral-500' : 'text-neutral-700'}`}>
      <span>{title}</span>
      <Count n={count} />
    </p>
  );
}

/** An entry that opens to reveal what it contains. */
function Expander({
  title,
  count,
  expanded,
  onToggle,
}: {
  title: string;
  count: number;
  expanded: boolean;
  onToggle: () => void;
}) {
  const Chevron = expanded ? ChevronDown : ChevronRight;
  return (
    <button type="button" aria-expanded={expanded} onClick={onToggle} className={`${ROW} w-full`}>
      <span className="flex items-baseline gap-1 text-neutral-700">
        <Chevron className="h-3.5 w-3.5 shrink-0 self-center text-neutral-400" />
        {title}
      </span>
      <Count n={count} />
    </button>
  );
}

const ROW = 'flex items-baseline justify-between gap-2 rounded px-2 py-1 text-left text-sm';

function Count({ n }: { n: number }) {
  return <span className="text-[11px] text-neutral-400 tabular-nums">{n}</span>;
}

// ── Reading the data ────────────────────────────────────────────────────────────────────────

function weigher(data: Transcript): Weigh {
  const sizes = new Map(data.commits.map((c) => [c.sha, c.exchanges.length]));
  return (commits) => commits.reduce((total, sha) => total + (sizes.get(sha) ?? 0), 0);
}

/** Every commit a chapter covers, by way of its topics. */
function commitsOf(data: Transcript, chapter: string): string[] {
  const found = data.chapters.find((c) => c.id === chapter);
  return found?.topics.flatMap((t) => data.topics.find((x) => x.id === t)?.commits ?? []) ?? [];
}
