/**
 * What the reader is looking through, and everything that follows from it.
 *
 * All four indexes answer the same two questions — what is this called, and what is in it — so
 * they are one type with a discriminator rather than four parallel paths through the component.
 *
 * The choice lives in the URL rather than in state, because a section of a transcript is a thing
 * worth linking to. So going back in the browser walks back through the reading.
 */
import { useMemo } from 'react';

import { useSearchParams } from 'react-router';

import type { Exchange, Transcript } from '@/data/transcript/schema';

/** The four ways in. Chapters and topics are the table of contents; the other two cut across it. */
export const View = {
  Chapter: 'chapter',
  Topic: 'topic',
  Thread: 'thread',
  Collection: 'collection',
} as const;

export type View = (typeof View)[keyof typeof View];

export interface Selection {
  view: View;
  id: string;
}

/**
 * The two query parameters, spelled out.
 *
 * These URLs exist to be pasted into prose, so they are read far more often than they are typed
 * — `?view=chapter:controls&prompt=2110f39e` explains itself where `?v=…&e=…` does not, at the
 * cost of thirteen characters. `prompt` rather than `exchange` because the id it carries is the
 * prompt's own, and the timestamp that yields the link sits on the prompt.
 */
const VIEW = 'view';
const PROMPT = 'prompt';

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
}

/**
 * How much of an exchange id a citation carries.
 *
 * The ids are UUIDs and a link in prose is meant to be readable. Six characters already separate
 * all 558; eight leaves room to grow without ever having to reissue a link someone published.
 */
export const ID_LENGTH = 8;

export const shortId = (id: string): string => id.slice(0, ID_LENGTH);

export function useSelection(data: Transcript): Chosen {
  const [params, setParams] = useSearchParams();

  const cited = params.get(PROMPT);
  const focused = cited ? (data.exchanges.find((e) => shortId(e.id) === cited)?.id ?? null) : null;

  // An unreadable or absent parameter opens at the beginning rather than failing: these URLs get
  // typed by hand and pasted into prose, and a broken one should still show the transcript. A
  // citation with no view of its own opens the topic it belongs to, so the link lands somewhere
  // rather than on an exchange with no surroundings.
  const selection =
    parseSelection(params.get(VIEW)) ?? (focused ? homeOf(data, focused) : null) ?? opening(data);

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
    focused,
    // Replace rather than push: choosing a chapter is moving around one page, and stacking a
    // history entry per click would bury whatever the reader was on before they arrived.
    select: (next) => setParams({ [VIEW]: toParam(next) }, { replace: true }),
    cite: (id) => {
      // The view is kept alongside the citation, so a pasted link reopens the same surroundings
      // the citer was looking at rather than resolving to the topic and losing a thread or
      // collection they had chosen.
      const next = { [VIEW]: toParam(selection), [PROMPT]: shortId(id) };
      setParams(next, { replace: true });
      const url = new URL(window.location.href);
      url.search = new URLSearchParams(next).toString();
      void navigator.clipboard?.writeText(url.toString());
    },
  };
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

/** The commits a selection covers. A collection cites exchanges directly, so it covers none. */
export function commitsOf(data: Transcript, selection: Selection): string[] {
  switch (selection.view) {
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
