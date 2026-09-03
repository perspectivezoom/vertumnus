/**
 * The session transcript: every prompt and reply that built this project.
 *
 * Split in two on purpose. `Transcript` is the route, and its whole job is that the transcript
 * either arrived or did not. `Panes` is the section itself, and takes the data as an ordinary
 * prop — so nothing below here carries a maybe-loaded transcript around, or re-proves it arrived.
 */
import { useEffect } from 'react';

import type { Transcript as Session } from '@/data/transcript/schema';
import { TranscriptSidebar } from '@/src/components/transcript/TranscriptSidebar';
import { TranscriptTurn, TURN_GAP, TURN_WIDTH } from '@/src/components/transcript/TranscriptTurn';
import {
  type Chosen,
  type Selection,
  shortId,
  useSelection,
  View,
} from '@/src/components/transcript/selection';
import { present } from '@/src/lib/invariant';
import { TranscriptDensity } from '@/src/components/transcript/TranscriptDensity';
import { type State, useTranscript } from '@/src/components/transcript/useTranscript';
import { useTitle } from '@/src/lib/title';
import { SECTIONS } from '@/src/lib/routes';

export function Transcript() {
  useTitle(SECTIONS.transcript.title);
  const state = useTranscript();
  return state.status === 'ready' ? <Panes data={state.data} /> : <Status state={state} />;
}

/**
 * The two panes: the table of contents, and whatever it is pointing at.
 *
 * The layout stands whether or not the URL named something real, so a stale link still leaves the
 * contents to navigate out by. Only the right pane changes, which is why the narrowing happens at
 * that boundary rather than as optional access threaded through here.
 */
function Panes({ data }: { data: Session }) {
  const chosen = useSelection(data);

  return (
    // Below `lg` this is one stacked column rather than two, so the same breakpoint takes the
    // gutters and the masthead down: 48px of margin is an eighth of the narrowest phone, and a
    // landscape viewport is 375px tall in total.
    <div className="flex flex-col gap-4 px-4 lg:gap-6 lg:px-6">
      <header className="flex max-w-[65ch] flex-col gap-2">
        <h1 className="font-poster text-2xl font-bold text-neutral-900 lg:text-3xl">
          AI transcript
        </h1>
        <p className="text-[15px] leading-relaxed text-neutral-600">
          Every prompt and reply that built this project. {data.exchanges.length} Claude Opus 5
          prompts.
        </p>
      </header>

      {/* Stacked below `lg`, where two columns would leave neither readable. */}
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        {/* Scrolls in its own right, since the index outruns the window — and `items-start`
            above is what stops it being stretched to the conversation's height, which would
            defeat the stickiness. */}
        <aside className="w-full shrink-0 lg:sticky lg:top-6 lg:max-h-[calc(100dvh-3rem)] lg:w-72 lg:overflow-y-auto">
          <TranscriptSidebar
            data={data}
            selection={chosen.status === 'ok' ? chosen.selection : null}
            onSelect={chosen.select}
            onSearch={chosen.search}
          />
        </aside>

        {/* `min-w-0` because a flex item's minimum is its content: one unbroken line of log
            output would otherwise widen this column until the page scrolled. */}
        <section className={`flex min-w-0 flex-1 flex-col ${TURN_GAP} py-2`}>
          {chosen.status === 'ok' ? (
            <Conversation data={data} chosen={chosen} />
          ) : (
            <Broken message={chosen.message} />
          )}
        </section>
      </div>
    </div>
  );
}

/** Whatever the reader chose, once it is known to be something. */
function Conversation({
  data,
  chosen,
}: {
  data: Session;
  chosen: Extract<Chosen, { status: 'ok' }>;
}) {
  const {
    selection,
    heading,
    exchanges,
    notes,
    focused,
    densities,
    setDensity,
    cite,
    open,
    select,
  } = chosen;
  const searching = selection.view === View.Search;

  // Scrolls after the exchanges are on the page, which is why it is an effect and not part of
  // resolving the citation: the element a link names does not exist until its topic has rendered.
  useEffect(() => {
    if (!focused) return;
    document.getElementById(shortId(focused))?.scrollIntoView({ block: 'start' });
  }, [focused, exchanges]);

  return (
    <>
      <div className={`flex ${TURN_WIDTH} flex-col gap-1 pb-2`}>
        <h2 className="text-lg font-semibold text-neutral-900">{heading.title}</h2>
        <p className="text-sm text-neutral-500">
          {exchanges.length} {searching ? 'match' : 'exchange'}
          {exchanges.length === 1 ? '' : searching ? 'es' : 's'}
        </p>
        {heading.blurb && (
          <p className="text-sm leading-relaxed text-neutral-600">{heading.blurb}</p>
        )}
        <TranscriptDensity densities={densities} onChange={setDensity} />
      </div>
      {exchanges.map((exchange) => (
        <TranscriptTurn
          key={exchange.id}
          exchange={exchange}
          focused={exchange.id === focused}
          densities={densities}
          highlight={searching ? selection.id : ''}
          place={searching ? placeOf(data, exchange) : null}
          note={notes.get(exchange.id) ?? null}
          onOpen={() => open(exchange.id)}
          onCite={() => cite(exchange.id)}
        />
      ))}
      <Ending data={data} selection={selection} onSelect={select} />
    </>
  );
}

/**
 * What sits at the bottom of a section.
 *
 * Chapters run in order, so the useful thing at the end of one is the next one — the transcript
 * can be read straight through without going back up to the contents. Every other view gathers
 * exchanges from across the project and has no next, so it only says that it has ended.
 */
function Ending({
  data,
  selection,
  onSelect,
}: {
  data: Session;
  selection: Selection;
  onSelect: (next: Selection) => void;
}) {
  switch (selection.view) {
    case View.Chapter:
      return <Onward neighbours={chapterNeighbours(data, selection.id)} onSelect={onSelect} />;
    case View.Topic:
      return <Onward neighbours={topicNeighbours(data, selection.id)} onSelect={onSelect} />;
    case View.Search:
      return <Close>End of results</Close>;
    // A collection or a thread gathers exchanges from across the project; there is nothing after
    // it to go to, and any view added later will want this rather than a way on.
    default:
      return <Close>End of section</Close>;
  }
}

const END = `mt-4 flex ${TURN_WIDTH} border-t border-neutral-200 pt-4 text-sm`;

/** A section with nothing after it: centred, since there is no direction to point in. */
function Close({ children }: { children: React.ReactNode }) {
  return <p className={`${END} justify-center text-neutral-400`}>{children}</p>;
}

/** The way on, for the two views that run in order. */
function Onward({
  neighbours,
  onSelect,
}: {
  neighbours: Neighbours;
  onSelect: (next: Selection) => void;
}) {
  const { previous, next } = neighbours;
  // Back to the top: the reader is at the foot of one section and wants the head of the next.
  const go = (to: Selection) => {
    onSelect(to);
    window.scrollTo({ top: 0 });
  };
  const WAY = 'max-w-[45%] text-green-700 hover:text-green-900 hover:underline';
  return (
    <nav className={`${END} items-start justify-between gap-6`}>
      {previous ? (
        <button type="button" onClick={() => go(previous.selection)} className={`${WAY} text-left`}>
          ← {previous.label}
        </button>
      ) : (
        <span />
      )}
      {next && (
        <button type="button" onClick={() => go(next.selection)} className={`${WAY} text-right`}>
          {next.label} →
        </button>
      )}
    </nav>
  );
}

/** Somewhere to go, and what to call it — not a {@link Step}, which is a piece of a reply. */
interface Neighbour {
  selection: Selection;
  label: string;
}

interface Neighbours {
  previous: Neighbour | null;
  next: Neighbour | null;
}

function chapterNeighbours(data: Session, id: string): Neighbours {
  const at = data.chapters.findIndex((c) => c.id === id);
  const step = (n: number): Neighbour | null => {
    const chapter = data.chapters[n];
    return chapter
      ? { selection: { view: View.Chapter, id: chapter.id }, label: chapter.title }
      : null;
  };
  return { previous: step(at - 1), next: step(at + 1) };
}

/**
 * Topics walk the whole sequence rather than stopping at their chapter's edge, which is why each
 * is labelled with the chapter it belongs to: reading past the last topic of one chapter is
 * reading into the next, and the label is what says so.
 */
function topicNeighbours(data: Session, id: string): Neighbours {
  const order = data.chapters.flatMap((c) => c.topics);
  const at = order.indexOf(id);
  const step = (n: number): Neighbour | null => {
    const topic = order[n];
    return topic
      ? { selection: { view: View.Topic, id: topic }, label: placeOfTopic(data, topic) }
      : null;
  };
  return { previous: step(at - 1), next: step(at + 1) };
}

/**
 * Where an exchange sits, as far as the curation knows.
 *
 * Everything committed has a chapter and a topic; only the tail newer than the last curated
 * commit is unfiled, and it files itself on the next refresh.
 */
function placeOf(data: Session, exchange: { commit: string }): string {
  const topic = data.topics.find((t) => t.commits.includes(exchange.commit));
  return topic ? placeOfTopic(data, topic.id) : 'Not yet filed';
}

/** A topic named by where it sits: its chapter, then itself. */
function placeOfTopic(data: Session, id: string): string {
  const topic = present(
    data.topics.find((t) => t.id === id),
    `No topic called ${id}, which the contents named.`,
  );
  const chapter = present(
    data.chapters.find((c) => c.topics.includes(id)),
    `Topic ${id} is in no chapter, which the generator does not allow.`,
  );
  return `${chapter.title} › ${topic.title}`;
}

/** A URL that names something this transcript does not have. */
function Broken({ message }: { message: string }) {
  return (
    <div className={`flex ${TURN_WIDTH} flex-col gap-2`}>
      <h2 className="text-lg font-semibold text-neutral-900">Nothing to show</h2>
      <p className="text-sm leading-relaxed text-neutral-600">{message}</p>
      <p className="text-sm text-neutral-500">
        The link may be out of date. Pick something from the table of contents to start reading.
      </p>
    </div>
  );
}

/**
 * What there is to show while the transcript is still on its way, or never arrived.
 *
 * Down here rather than above the section: megabytes over a network have to be accounted for,
 * but it is the least interesting thing this file does.
 */
function Status({ state }: { state: Exclude<State, { status: 'ready' }> }) {
  if (state.status === 'loading') {
    return <p className="text-sm text-neutral-500">Loading the transcript…</p>;
  }
  return <p className="text-sm text-red-700">The transcript could not be loaded. {state.error}</p>;
}
