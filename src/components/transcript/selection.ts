/**
 * What the reader is looking through, and everything that follows from it.
 *
 * Every index answers the same two questions — what is this called, and what is in it — so they
 * are one type with a discriminator rather than a parallel path each through the component.
 *
 * The choice lives in the URL rather than in state, because a section of a transcript is a thing
 * worth linking to. So going back in the browser walks back through the reading.
 */
import { useMemo } from 'react';

import { useSearchParams } from 'react-router';

import type { Exchange, Transcript } from '@/data/transcript/schema';

/**
 * The ways in. Chapters and topics are the table of contents; the rest cut across it.
 *
 * Search is one of them rather than a parameter beside them: it answers the same two questions
 * every view does — what is this called, and what is in it — and a second parameter deciding
 * what the pane shows would have to be merged with this one on every write. Its id is whatever
 * was typed, where the others name curation.
 */
export const View = {
  Chapter: 'chapter',
  Topic: 'topic',
  Thread: 'thread',
  Collection: 'collection',
  Search: 'search',
} as const;

export type View = (typeof View)[keyof typeof View];

export interface Selection {
  view: View;
  id: string;
}

/**
 * The query parameters, spelled out.
 *
 * These URLs exist to be pasted into prose, so they are read far more often than typed —
 * `?view=chapter:controls&prompt=2110f39e` explains itself where `?v=…&e=…` does not. `prompt`
 * rather than `exchange` because the id it carries is the prompt's own, and the timestamp that
 * yields the link sits on the prompt.
 */
const VIEW = 'view';
const PROMPT = 'prompt';
const PROMPTS = 'prompts';
const RESPONSES = 'responses';

/**
 * How much of a turn to draw.
 *
 * A property of the reading rather than of any one view: a chapter collapsed to its prompts is
 * the same request as a list of search results, and answering it twice would mean two components
 * that drift. Either half takes any of the three, including combinations the control does not
 * offer — a uniform rule is easier to hold than one carrying an exception.
 */
export const Density = {
  Full: 'full',
  Short: 'short',
  Hidden: 'hidden',
} as const;

export type Density = (typeof Density)[keyof typeof Density];

/** A density if the URL spelled one, or null to let the default stand. */
const density = (raw: string | null): Density | null =>
  (Object.values(Density) as string[]).includes(raw ?? '') ? (raw as Density) : null;

/**
 * Change some parameters and leave the rest alone.
 *
 * There are four now and they are independent — density outlives a change of chapter, and a
 * citation should not reset it. `setParams` replaces the whole query string, so anything not
 * named here would be dropped.
 */
function merge(params: URLSearchParams, changes: Record<string, string | null>): URLSearchParams {
  const next = new URLSearchParams(params);
  for (const [key, value] of Object.entries(changes)) {
    if (value === null) next.delete(key);
    else next.set(key, value);
  }
  return next;
}

export interface Heading {
  title: string;
  /** Every kind carries one except a topic, where it is optional. */
  blurb?: string | undefined;
}

export interface Chosen {
  selection: Selection;
  heading: Heading;
  /** The exchanges the selection covers, in the order that selection presents them. */
  exchanges: Exchange[];
  /** The full id of the exchange a link pointed at, if it pointed at one. */
  focused: string | null;
  select: (next: Selection) => void;
  /** Point the URL at one exchange, and put that URL on the clipboard. */
  cite: (id: string) => void;
  densities: Densities;
  setDensity: (next: Partial<Densities>) => void;
  /** Run a query, and collapse the replies so the hits fit on a screen. */
  search: (query: string) => void;
  /** Leave for an exchange's own topic — how a search hit is followed back into the record. */
  open: (id: string) => void;
}

/** How much of each half of a turn to draw. Always chosen together, so carried together. */
export interface Densities {
  prompts: Density;
  responses: Density;
}

/**
 * How much of an exchange id a citation carries.
 *
 * The ids are UUIDs and a link in prose is meant to be readable. Six characters already separate
 * all 558; eight leaves room to grow without ever having to reissue a link someone published.
 */
export const ID_LENGTH = 8;

export const shortId = (id: string): string => id.slice(0, ID_LENGTH);

/**
 * Everything the URL says about how the transcript is being read, every value resolved.
 *
 * Downstream never sees a missing parameter or an unparsed string, which is why this module is
 * the only one that touches the query string at all.
 */
export interface Reading {
  selection: Selection;
  /** Full id of the cited exchange — the URL carries only the first {@link ID_LENGTH}. */
  cited: string | null;
  densities: Densities;
}

/**
 * What to change about the reading. Omitting a field leaves it alone; `null` clears it.
 *
 * The two differ for the view: clearing lets the default answer, where naming the opening chapter
 * writes an opinion into the URL that the reader never expressed.
 */
export type Changes = Partial<{
  selection: Selection | null;
  cited: string | null;
  densities: Densities;
}>;

export function useSelection(data: Transcript): Chosen {
  const [reading, write] = useReading(data);
  const { selection, cited, densities } = reading;
  const base = defaults(data).densities;

  // Filtering runs over all 558 exchanges, so it is memoised on the selection's contents rather
  // than its identity — the parsed selection is a fresh object on every render.
  const exchanges = useMemo(
    () => exchangesOf(data, selection),
    [data, selection.view, selection.id],
  );

  return {
    selection,
    heading: headingOf(data, selection),
    exchanges,
    focused: cited,
    densities,
    setDensity: (next) => void write({ densities: { ...densities, ...next } }),
    // Choosing a view clears the citation under it, but not how the reader was reading.
    select: (next) => void write({ selection: next, cited: null }),
    search: (query) =>
      void write(
        query
          ? // Collapsed, because a hundred hits shown whole is the log again with gaps in it.
            // Short rather than hidden: most queries match something Claude said.
            {
              selection: { view: View.Search, id: query },
              cited: null,
              densities: { ...densities, responses: Density.Short },
            }
          : // Leaving says nothing about density: this collapsed it, but what the reader had
            // before is recorded nowhere, and restoring a guess could undo a deliberate choice.
            { selection: null, cited: null },
      ),
    // Expanded, unlike leaving a search: following a hit is asking to read the thing, and a
    // collapsed reply is the one state in which that cannot be done.
    open: (id) =>
      void write({ selection: homeOf(data, id) ?? opening(data), cited: id, densities: base }),
    cite: (id) => {
      // The view is written explicitly even though it has not changed: it may have been implicit,
      // and a pasted link should reopen the surroundings the citer was in rather than resolve to
      // the exchange's own topic and lose a thread or collection they had chosen.
      const next = write({ selection, cited: id });
      const url = new URL(window.location.href);
      url.search = next.toString();
      void navigator.clipboard?.writeText(url.toString());
    },
  };
}

/**
 * The reading with nothing in the URL at all: the opening chapter, nothing cited, everything
 * drawn in full.
 *
 * A function rather than a constant because one of the three depends on the transcript — where
 * it begins is whichever chapter the curation put first.
 */
function defaults(data: Transcript): Reading {
  return {
    selection: opening(data),
    cited: null,
    densities: { prompts: Density.Full, responses: Density.Full },
  };
}

/**
 * The URL as typed values, and a way to write them back.
 *
 * Each parameter is read as an override of {@link defaults}, and written by omitting anything
 * that equals its default — one rule and its exact inverse, in one place. Before this they sat
 * in different functions, absent meaning full in one and full meaning omit in the other, with
 * nothing keeping the two in step.
 *
 * `write` returns the parameters it set, because citing needs the resulting URL and not only the
 * navigation to it.
 */
function useReading(data: Transcript): [Reading, (changes: Changes) => URLSearchParams] {
  const [params, setParams] = useSearchParams();
  const base = defaults(data);

  const short = params.get(PROMPT);
  const cited = (short && data.exchanges.find((e) => shortId(e.id) === short)?.id) || base.cited;

  // The one parameter whose fallback is a resolution rather than a default: a citation with no
  // view of its own opens the topic it belongs to, so a link lands somewhere rather than on an
  // exchange with no surroundings.
  const selection =
    parseSelection(params.get(VIEW)) ?? (cited ? homeOf(data, cited) : null) ?? base.selection;

  const reading: Reading = {
    selection,
    cited,
    densities: {
      prompts: density(params.get(PROMPTS)) ?? base.densities.prompts,
      responses: density(params.get(RESPONSES)) ?? base.densities.responses,
    },
  };

  const write = (changes: Changes) => {
    const next = merge(params, {
      ...('selection' in changes && {
        [VIEW]: changes.selection ? toParam(changes.selection) : null,
      }),
      ...('cited' in changes && { [PROMPT]: changes.cited ? shortId(changes.cited) : null }),
      ...(changes.densities && {
        [PROMPTS]: unless(changes.densities.prompts, base.densities.prompts),
        [RESPONSES]: unless(changes.densities.responses, base.densities.responses),
      }),
    });
    // Replaced rather than pushed: a history entry per click would bury wherever the reader
    // came in from.
    setParams(next, { replace: true });
    return next;
  };

  return [reading, write];
}

/** A value to write, or null to leave it out because it is what absence already means. */
const unless = (value: Density, fallback: Density): string | null =>
  value === fallback ? null : value;

/**
 * Every exchange whose prompt or reply contains the query, in the order they happened.
 *
 * Substring matching over 1.5 MB measures in single-digit milliseconds, so an index would be
 * machinery in front of something already imperceptible.
 */
export function matching(data: Transcript, query: string): Exchange[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return [];
  return data.exchanges.filter(
    (e) =>
      e.prompt.toLowerCase().includes(needle) ||
      e.steps.some((s) => s.kind === 'text' && s.text.toLowerCase().includes(needle)),
  );
}

/** The topic an exchange belongs to, by way of the commit its work landed in. */
function homeOf(data: Transcript, id: string): Selection | null {
  const exchange = data.exchanges.find((e) => e.id === id);
  if (!exchange) return null;
  const topic = data.topics.find((t) => t.commits.includes(exchange.commit));
  return topic ? { view: View.Topic, id: topic.id } : null;
}

// ── Reading a selection out of the URL, and back into it ────────────────────────────────────

/** `?view=topic:banner` — one parameter, rather than four that must never be set at once. */
export function parseSelection(raw: string | null): Selection | null {
  const [view, ...rest] = (raw ?? '').split(':');
  const id = rest.join(':');
  if (!id) return null;
  return (Object.values(View) as string[]).includes(view ?? '') ? { view: view as View, id } : null;
}

export const toParam = (selection: Selection): string => `${selection.view}:${selection.id}`;

/**
 * Where a reader lands having chosen nothing: the beginning.
 *
 * Total rather than nullable. A transcript with no chapters at all would give an id matching
 * nothing and an empty pane, which is the right outcome for a curation the build already
 * complained about — and it saves every caller a branch for a case that cannot occur.
 */
export const opening = (data: Transcript): Selection => ({
  view: View.Chapter,
  id: data.chapters[0]?.id ?? '',
});

// ── Resolving it against the data ───────────────────────────────────────────────────────────

/**
 * The commits a selection covers — none for the two that are not runs of history: a collection
 * cites exchanges directly, and a search matches them wherever they fell.
 */
export function commitsOf(data: Transcript, selection: Selection): string[] {
  switch (selection.view) {
    case View.Search:
      return [];
    case View.Chapter: {
      const chapter = data.chapters.find((c) => c.id === selection.id);
      return chapter?.topics.flatMap((id) => topicCommits(data, id)) ?? [];
    }
    case View.Topic:
      return topicCommits(data, selection.id);
    case View.Thread:
      return data.threads.find((t) => t.id === selection.id)?.commits ?? [];
    case View.Collection:
      return [];
  }
}

const topicCommits = (data: Transcript, id: string): string[] =>
  data.topics.find((t) => t.id === id)?.commits ?? [];

export function headingOf(data: Transcript, selection: Selection): Heading {
  switch (selection.view) {
    case View.Search:
      return { title: `Search: ${selection.id}` };
    case View.Chapter: {
      const chapter = data.chapters.find((c) => c.id === selection.id);
      return { title: chapter?.title ?? selection.id, blurb: chapter?.blurb };
    }
    case View.Topic: {
      const topic = data.topics.find((t) => t.id === selection.id);
      return { title: topic?.title ?? selection.id, blurb: topic?.blurb };
    }
    case View.Thread: {
      const thread = data.threads.find((t) => t.id === selection.id);
      return { title: thread?.title ?? selection.id, blurb: thread?.blurb };
    }
    case View.Collection: {
      const collection = data.collections[selection.id];
      return { title: collection?.title ?? selection.id, blurb: collection?.blurb };
    }
  }
}

export function exchangesOf(data: Transcript, selection: Selection): Exchange[] {
  if (selection.view === View.Search) return matching(data, selection.id);
  if (selection.view === View.Collection) {
    // A collection keeps the order it was written in rather than the order things happened: the
    // sequence is the curator's argument, not a chronology.
    const entries = data.collections[selection.id]?.entries ?? [];
    const byId = new Map(data.exchanges.map((e) => [e.id, e]));
    return entries.map((entry) => byId.get(entry.exchange)).filter((e) => e !== undefined);
  }
  const wanted = new Set(commitsOf(data, selection));
  return data.exchanges.filter((e) => wanted.has(e.commit));
}
