/**
 * The sidebar: a search box, and the table of contents under it.
 *
 * Two jobs, and the split below follows them. {@link TranscriptSidebar} decides where the contents
 * are — which is two different places, since above `lg` they are simply the column, and below it
 * there is no column to be. Stacked, the three indexes are some 900px of navigation standing
 * between the top of the page and the first exchange, nearly two screens on the narrowest phone
 * we support, so they fold into a card whose lid disappears at the same breakpoint the layout
 * gains its second column. {@link SidebarContent} is what is in them, and knows none of that.
 *
 * Search stays outside the fold: one row, and the thing most likely to be wanted on a small
 * screen.
 */
import { useState } from 'react';

import { ChevronDown, ChevronRight, Search } from 'lucide-react';

import type { Transcript } from '@/data/transcript/schema';
import { type Selection, View } from '@/src/components/transcript/selection';

export function TranscriptSidebar({
  data,
  selection,
  onSelect,
  onSearch,
}: {
  data: Transcript;
  /** Null when the URL named something that does not exist: nothing here is current. */
  selection: Selection | null;
  onSelect: (next: Selection) => void;
  onSearch: (query: string) => void;
}) {
  // Only consulted below `lg`, where the indexes are folded away; above it they are the column.
  const [open, setOpen] = useState(false);
  return (
    // Clear of the scrollbar this pane grows when a chapter is opened, which would otherwise
    // sit on top of the counts.
    <nav className="flex flex-col pr-3">
      <Find
        query={selection?.view === View.Search ? selection.id : ''}
        total={data.exchanges.length}
        onSearch={onSearch}
      />
      <div className="mt-3 rounded-md border border-neutral-300 bg-white lg:mt-0 lg:rounded-none lg:border-0 lg:bg-transparent">
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((was) => !was)}
          // `items-center`, not the `items-baseline` every row in the contents uses: a chevron is
          // an icon with no baseline to sit on, and lines up against the text's instead.
          className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm text-neutral-700 lg:hidden ${
            open ? 'border-b border-neutral-200' : ''
          }`}
        >
          Table of contents
          <ChevronDown className={`h-4 w-4 text-neutral-400 ${open ? 'rotate-180' : ''}`} />
        </button>
        <div className={`flex-col px-2 pb-2 ${open ? 'flex' : 'hidden'} lg:flex lg:px-0 lg:pb-0`}>
          <SidebarContent
            data={data}
            selection={selection}
            // Choosing something is done with the contents, so on a phone they get out of the way.
            onSelect={(next) => {
              setOpen(false);
              onSelect(next);
            }}
          />
        </div>
      </div>
    </nav>
  );
}

/**
 * The three indexes: what this session was, at a glance and then in detail.
 *
 * Collections come first because they are the way in for someone who knows nothing about the
 * project: hand-picked, and saying so, where everything below is derived. Chapters run in order,
 * so reading them top to bottom is reading the project in order. Threads gather work picked up and
 * put down across months, which chapters cannot hold.
 */
function SidebarContent({
  data,
  selection,
  onSelect,
}: {
  data: Transcript;
  selection: Selection | null;
  onSelect: (next: Selection) => void;
}) {
  // Built once here rather than per index, since all three count in the same unit.
  const pane = { data, weigh: weigher(data), selection, onSelect };
  return (
    <>
      <Collections {...pane} />
      <Chapters {...pane} />
      <Threads {...pane} />
    </>
  );
}

/** The search box, which selects a view like every other control in this pane. */
function Find({
  query,
  total,
  onSearch,
}: {
  query: string;
  total: number;
  onSearch: (query: string) => void;
}) {
  return (
    <label className="relative mt-1 flex items-center">
      <Search className="pointer-events-none absolute left-2 h-4 w-4 text-neutral-400" />
      <input
        type="search"
        value={query}
        onChange={(event) => onSearch(event.target.value)}
        placeholder={`Search ${total} exchanges`}
        className="w-full rounded-md border border-neutral-300 bg-white py-1.5 pr-2 pl-8 text-sm placeholder:text-neutral-400 focus:border-green-600 focus:outline-none"
      />
    </label>
  );
}

// ── The three indexes ───────────────────────────────────────────────────────────────────────

/** How many exchanges a run of commits accounts for — what every count here is counted in. */
type Weigh = (commits: readonly string[]) => number;

/** What each index needs to draw itself and report a choice. */
interface Pane {
  data: Transcript;
  weigh: Weigh;
  selection: Selection | null;
  onSelect: (next: Selection) => void;
}

function Chapters({ data, weigh, selection, onSelect }: Pane) {
  // Opens to whichever chapter the selection is in, so arriving by link shows where you are.
  const containing = data.chapters.find((c) =>
    selection?.view === View.Topic ? c.topics.includes(selection.id) : c.id === selection?.id,
  );
  const [open, setOpen] = useState<string | null>(containing?.id ?? null);
  return (
    <Group {...data.groups.chapters}>
      {data.chapters.map((chapter) => {
        const expanded = open === chapter.id;
        return (
          <div key={chapter.id} className="flex flex-col">
            <Expander
              title={chapter.title}
              count={weigh(commitsOf(data, chapter.id))}
              expanded={expanded}
              active={selection?.view === View.Chapter && selection.id === chapter.id}
              onToggle={() => setOpen(expanded ? null : chapter.id)}
              onSelect={() => onSelect({ view: View.Chapter, id: chapter.id })}
            />
            {expanded && (
              <div className="ml-[1.15rem] flex flex-col border-l border-neutral-200 pl-1">
                {chapter.topics.map((id) => {
                  const topic = data.topics.find((t) => t.id === id);
                  return topic ? (
                    <Entry
                      key={id}
                      title={topic.title}
                      count={weigh(topic.commits)}
                      muted
                      active={selection?.view === View.Topic && selection.id === id}
                      onSelect={() => onSelect({ view: View.Topic, id })}
                    />
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

function Threads({ data, weigh, selection, onSelect }: Pane) {
  return (
    <Group {...data.groups.threads}>
      {data.threads.map((thread) => (
        <Entry
          key={thread.id}
          title={thread.title}
          count={weigh(thread.commits)}
          active={selection?.view === View.Thread && selection.id === thread.id}
          onSelect={() => onSelect({ view: View.Thread, id: thread.id })}
        />
      ))}
    </Group>
  );
}

function Collections({ data, selection, onSelect }: Pane) {
  return (
    <Group {...data.groups.collections}>
      {Object.entries(data.collections).map(([id, collection]) => (
        <Entry
          key={id}
          title={collection.title}
          count={collection.entries.length}
          active={selection?.view === View.Collection && selection.id === id}
          onSelect={() => onSelect({ view: View.Collection, id })}
        />
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
  note: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col">
      <h2 className="px-2 pt-5 pb-1 text-[11px] font-semibold tracking-wider text-neutral-400 uppercase">
        {title}
      </h2>
      <p className="px-2 pb-1 text-[11px] leading-snug text-neutral-400">{note}</p>
      {children}
    </section>
  );
}

/** A named thing, how much of the session it accounts for, and a way to go there. */
function Entry({
  title,
  count,
  muted,
  active,
  onSelect,
}: {
  title: string;
  count: number;
  muted?: boolean;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button type="button" onClick={onSelect} className={row(active, muted)}>
      <span>{title}</span>
      <Count n={count} />
    </button>
  );
}

/**
 * An entry that also opens to reveal what it contains.
 *
 * Two controls, not one: the chevron opens the chapter and the label selects it. Collapsing them
 * would mean either that you cannot look inside without navigating away, or that you cannot read
 * a chapter whole without its topics unfolding underneath you.
 */
function Expander({
  title,
  count,
  expanded,
  active,
  onToggle,
  onSelect,
}: {
  title: string;
  count: number;
  expanded: boolean;
  active: boolean;
  onToggle: () => void;
  onSelect: () => void;
}) {
  const Chevron = expanded ? ChevronDown : ChevronRight;
  return (
    <span className={`${row(active)} w-full`}>
      <button
        type="button"
        aria-expanded={expanded}
        aria-label={`${expanded ? 'Collapse' : 'Expand'} ${title}`}
        onClick={onToggle}
        className="-m-1 shrink-0 self-center p-1 text-neutral-400 hover:text-neutral-700"
      >
        <Chevron className="h-3.5 w-3.5" />
      </button>
      <button type="button" onClick={onSelect} className="flex-1 text-left">
        {title}
      </button>
      <Count n={count} />
    </span>
  );
}

const ROW = 'flex items-baseline gap-2 rounded px-2 py-1 text-left text-sm';

/** Every row in the pane, tinted by whether it is the one being read. */
function row(active: boolean, muted = false): string {
  const tone = active
    ? 'bg-green-50 text-green-900'
    : `${muted ? 'text-neutral-500' : 'text-neutral-700'} hover:bg-neutral-100`;
  return `${ROW} w-full justify-between ${tone}`;
}

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
