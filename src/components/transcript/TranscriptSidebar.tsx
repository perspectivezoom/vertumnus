/**
 * The sidebar: a search box, and the table of contents under it.
 *
 * {@link TranscriptSidebar} decides where the contents are, {@link SidebarContent} what is in
 * them. Two places, because below `lg` there is no column to be one: stacked, the indexes stand
 * between the top of the page and the first exchange, so they fold behind a control that
 * disappears at the breakpoint the layout gains its second column. Search stays outside the fold.
 */
import { useEffect, useRef, useState } from 'react';

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
          // `items-center`, not the `items-baseline` the rows use: an icon has no baseline.
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
 * Collections first, as the way in for someone who knows nothing about the project — hand-picked,
 * where everything below is derived. Then chapters in order, then the threads that cross them.
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
  const pane = { data, weigh: weigher(data), selection, onSelect };
  return (
    <>
      <Collections {...pane} />
      <Chapters {...pane} />
      <Threads {...pane} />
    </>
  );
}

/** The search box. Typing reaches the URL a moment later — see {@link useDebounce}. */
function Find({
  query,
  total,
  onSearch,
}: {
  query: string;
  total: number;
  onSearch: (query: string) => void;
}) {
  const [typed, type] = useDebounce(query, onSearch);
  return (
    <label className="relative mt-1 flex items-center">
      <Search className="pointer-events-none absolute left-2 h-4 w-4 text-neutral-400" />
      <input
        type="search"
        value={typed}
        onChange={(event) => type(event.target.value)}
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
 * Two controls, not one: collapsing them would mean either that you cannot look inside without
 * navigating away, or that you cannot read a chapter whole without its topics unfolding under you.
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

/** Long enough to finish a word, short enough that results feel like they follow the typing. */
const SETTLE = 200;

/**
 * A field that keeps what was typed, and reports it once the typing stops.
 *
 * Bound straight to `value` an input swallows characters, since a write is asynchronous and the
 * field re-renders from a value a keystroke behind. `sent` is what lets `value` still win when it
 * changes for another reason: an echo of our own report is ignored, anything else adopted.
 */
function useDebounce(
  value: string,
  onSettle: (next: string) => void,
): [string, (next: string) => void] {
  const [typed, setTyped] = useState(value);
  const sent = useRef(value);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    if (value !== sent.current) setTyped(value);
  }, [value]);

  // So a pending report cannot land after the field is gone.
  useEffect(() => () => clearTimeout(timer.current), []);

  return [
    typed,
    (next: string) => {
      setTyped(next);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        sent.current = next;
        onSettle(next);
      }, SETTLE);
    },
  ];
}
