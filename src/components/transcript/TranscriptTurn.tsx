/**
 * One exchange, as a conversation: the prompt, then everything that followed it.
 *
 * Two voices set apart rather than one column of prose, so either side can be skimmed without
 * reading the other. Monospace because it was typed at a terminal, and should read as one.
 *
 * Between Claude's turns sit the tools it reached for, where it reached for them. There are
 * several per prompt, so collapsing them into a footnote would leave a wall of text and a list of
 * verbs in place of a sequence of work.
 */
import { useState } from 'react';

import { ChevronDown } from 'lucide-react';

import type { Exchange, Step } from '@/data/transcript/schema';
import { Density, type Densities, shortId } from '@/src/components/transcript/selection';
import { TranscriptMarkdown } from '@/src/components/transcript/TranscriptMarkdown';

/** Shared so a tool row can indent to exactly where the text in a bubble starts. */
const INSET = 'border px-4';

/** Between bubbles, and between turns, so the boundary between two turns is invisible. */
export const TURN_GAP = 'gap-3';

/** How wide anything in the conversation gets, so the column has one right edge. */
export const TURN_WIDTH = 'max-w-[85%]';

const BUBBLE = `${INSET} ${TURN_WIDTH} rounded-lg py-3 font-mono text-[13px] leading-relaxed break-words`;

/** What one turn shows when the reader has singled it out, whatever the page is set to. */
const WHOLE: Densities = { prompts: Density.Full, responses: Density.Full };

export function TranscriptTurn({
  exchange,
  focused,
  densities,
  highlight = '',
  place = null,
  note = null,
  onOpen,
  onCite,
}: {
  exchange: Exchange;
  focused: boolean;
  densities: Densities;
  /** A query to pick out, when the reader arrived here by searching for it. */
  highlight?: string;
  /** Where this sits in the curation, shown when the surrounding view does not say. */
  place?: string | null;
  /** Why a collection singled this one out, in the curator's voice rather than either speaker's. */
  note?: string | null;
  onOpen: () => void;
  onCite: () => void;
}) {
  // Kept here rather than above or in the URL: it says "that one, though" about this exchange
  // and means nothing to anything else. Changing the density deliberately leaves it alone.
  const [expanded, setExpanded] = useState(false);
  const onToggle = () => setExpanded((was) => !was);

  // At full density the bubbles stay plain text: nothing should invite a click that does nothing.
  const collapsed = densities.prompts !== Density.Full || densities.responses !== Density.Full;
  const shown = expanded ? WHOLE : densities;
  const more = collapsed && (moreThanGist(exchange.steps) || exchange.prompt.length > FITS);
  return (
    // `scroll-mt` so an exchange arrived at by link stops clear of the top of the window rather
    // than flush against it, with no sign of what came before.
    <div
      id={shortId(exchange.id)}
      className={`flex scroll-mt-6 flex-col rounded-lg ${TURN_GAP} ${
        focused ? 'bg-green-100/40 ring-1 ring-green-300' : ''
      }`}
    >
      {/* Right, with the prompt it heads: left it reads as a footnote to the reply above it. */}
      {place && (
        <button
          type="button"
          onClick={onOpen}
          className={`${TURN_WIDTH} self-end px-1 text-right text-[11px] text-neutral-400 hover:text-green-700 hover:underline`}
        >
          {place}
        </button>
      )}
      {/* Each half reads its own density and all nine combinations resolve. Some are of no use
          — hiding the prompts leaves replies to nothing — but a rule with an exception in it is
          harder to hold than one without, and the control simply declines to offer those. */}
      {shown.prompts !== Density.Hidden && (
        <Prompt
          text={exchange.prompt}
          note={note}
          at={exchange.ts}
          short={shown.prompts === Density.Short}
          highlight={highlight}
          onToggle={more ? onToggle : null}
          expanded={expanded}
          onCite={onCite}
        />
      )}
      {shown.responses === Density.Full &&
        exchange.steps.map((step, n) => (
          // Index as key: steps never reorder, being a record of something that already happened.
          <StepOf key={n} step={step} />
        ))}
      {shown.responses === Density.Short && (
        <Gist steps={exchange.steps} highlight={highlight} onToggle={more ? onToggle : null} />
      )}
    </div>
  );
}

/** What the human typed, and when — with the curator's reason for it, where there is one. */
function Prompt({
  text,
  note,
  at,
  short,
  highlight,
  expanded,
  onToggle,
  onCite,
}: {
  text: string;
  /** Why a collection singled this exchange out. Inside the bubble for the same reason the
      timestamp is: it belongs to this prompt, and anything loose above it reads as a footnote
      to the reply before. */
  note: string | null;
  at: string;
  short: boolean;
  highlight: string;
  expanded: boolean;
  /** Null where the page is showing everything and there is nothing to open. */
  onToggle: (() => void) | null;
  onCite: () => void;
}) {
  // Clamped rather than truncated, so the whole prompt stays in the page and a browser's own
  // find still reaches it.
  const body = (
    // `line-clamp` sets its own display, so `block` only applies when not clamping: together
    // they cancel and the text runs full length with no sign it was meant not to.
    <span className={`whitespace-pre-wrap ${short ? 'line-clamp-2' : 'block'}`}>
      <Marked text={text} query={highlight} />
    </span>
  );
  return (
    <div
      className={`${BUBBLE} flex flex-col gap-1 self-end rounded-br-sm border-green-200 bg-green-50/70 text-neutral-900`}
    >
      {/* Set in the body face and a size down, so it reads as someone talking about the prompt
          rather than as part of what was typed. Never clamped: it is the reason the exchange is
          on the page at all, and a collapsed one would hide the only thing that explains it. */}
      {note && <p className="font-sans text-xs leading-relaxed text-neutral-500">{note}</p>}
      {/* The text is the control, not a chevron beside it — and a sibling of the timestamp rather
          than its parent, since one button inside another is neither clickable reliably. */}
      {onToggle ? (
        <button type="button" aria-expanded={expanded} onClick={onToggle} className="text-left">
          {body}
        </button>
      ) : (
        body
      )}
      <Stamp at={at} onCite={onCite} />
    </div>
  );
}

/**
 * A reply at a glance: the opening of what Claude said, and what it did.
 *
 * Plain text rather than rendered Markdown. At this size the formatting carries nothing a reader
 * is here for, and parsing every reply to show three lines of it would be the expensive half of
 * the work for the cheap half of the result.
 */
function Gist({
  steps,
  highlight,
  onToggle,
}: {
  steps: readonly Step[];
  highlight: string;
  /** Null when the whole reply already fits, so nothing offers to reveal what is already there. */
  onToggle: (() => void) | null;
}) {
  const texts = steps.filter((step) => step.kind === 'text');
  // The step that matched, not the first: a hit is usually paragraphs in, and opening on an
  // unrelated sentence would look like a miss.
  const needle = highlight.trim().toLowerCase();
  const matched = needle
    ? texts.find((step) => step.text.toLowerCase().includes(needle))
    : undefined;
  const said = matched ?? texts[0];
  const tools = steps.filter((step) => step.kind === 'tool').length;
  if (!said && !tools) return null;

  const body = (
    <>
      {said && (
        // The fade is the signal that the text is cut, so it has to match the bubble beneath it.
        <span className="relative block">
          <span className="line-clamp-3 whitespace-pre-wrap">
            <Marked text={around(said.text, needle)} query={highlight} />
          </span>
          {onToggle && (
            <span className="pointer-events-none absolute inset-x-0 bottom-0 h-5 bg-gradient-to-t from-white to-transparent" />
          )}
        </span>
      )}
      {onToggle ? (
        <span className="flex items-center gap-1 text-xs text-neutral-500 group-hover:text-green-700">
          <ChevronDown className="h-3.5 w-3.5" />
          Show the rest{tools > 0 && ` · ${tools} tool call${tools === 1 ? '' : 's'}`}
        </span>
      ) : (
        tools > 0 && (
          <span className="text-xs text-neutral-400">
            {tools} tool call{tools === 1 ? '' : 's'}
          </span>
        )
      )}
    </>
  );

  const look = `${BUBBLE} flex flex-col gap-1 self-start rounded-bl-sm border-neutral-200 bg-white text-left text-neutral-700`;
  return onToggle ? (
    <button
      type="button"
      aria-expanded={false}
      onClick={onToggle}
      className={`${look} group hover:border-green-300 hover:bg-green-50/20`}
    >
      {body}
    </button>
  ) : (
    <div className={look}>{body}</div>
  );
}

const WHEN = new Intl.DateTimeFormat(undefined, {
  day: 'numeric',
  month: 'short',
  hour: 'numeric',
  minute: '2-digit',
});

/**
 * When the prompt was sent, and the handle the exchange is cited by.
 *
 * The timestamp is the link, the way it is everywhere else a conversation is published. It is
 * more discoverable than an icon that appears on hover, and it earns its place twice: even for a
 * reader who never copies it, when something was said is part of the record.
 *
 * It is only a handle, though — the id in the URL is the exchange's own, not the time. Two
 * prompts a second apart would share a minute, and a published link has to stay pointing at what
 * it pointed at.
 */
function Stamp({ at, onCite }: { at: string; onCite: () => void }) {
  const when = new Date(at);
  return (
    <button
      type="button"
      onClick={onCite}
      title={`${when.toLocaleString()} — copy a link to this exchange`}
      className="self-end font-mono text-[11px] text-green-800/45 hover:text-green-800 hover:underline"
    >
      {WHEN.format(when)}
    </button>
  );
}

/** What Claude wrote back, in the Markdown it was written in. */
function Reply({ text }: { text: string }) {
  return (
    // No `whitespace-pre-wrap` here, unlike the prompt: the renderer owns the line breaks, and
    // preserving the source's own would double every blank line between paragraphs.
    <div
      className={`${BUBBLE} self-start rounded-bl-sm border border-neutral-200 bg-white text-neutral-700`}
    >
      <TranscriptMarkdown text={text} />
    </div>
  );
}

/**
 * A tool Claude reached for, and the one fact worth reading about it.
 *
 * Deliberately not a bubble: a tool call is not speech, and the same shape would make a run of
 * eight read as eight remarks.
 */
function ToolCall({ name, detail }: { name: string; detail: string }) {
  return (
    // A bubble's inset with the border made transparent, so the text starts where theirs does.
    <p
      className={`${INSET} ${TURN_WIDTH} flex items-baseline gap-2 self-start border-transparent font-mono text-xs text-neutral-400`}
    >
      <span className="shrink-0 font-medium text-neutral-500">{name}</span>
      {detail && <span className="truncate">{detail}</span>}
    </p>
  );
}

/** How much of the surrounding text a collapsed reply carries, either side of the match. */
const CONTEXT = 160;

/**
 * Roughly what fits in the clamp before anything is hidden.
 *
 * Deliberately a low estimate: offering to open onto the same text is a smaller fault than
 * hiding a control that would have revealed more.
 */
const FITS = 240;

/**
 * Whether opening this turn would show anything its gist does not.
 *
 * The fourth reason is the one that is not a fact about the steps: a short paragraph with a code
 * fence in it looks nothing like the same paragraph as plain text.
 */
function moreThanGist(steps: readonly Step[]): boolean {
  const texts = steps.filter((step) => step.kind === 'text');
  if (texts.length > 1) return true;
  if (steps.some((step) => step.kind === 'tool')) return true;
  const only = texts[0];
  return only ? only.text.length > FITS || MARKDOWN.test(only.text) : false;
}

const MARKDOWN = /```|^\s*[-*]\s|^\s*\d+\.\s|\*\*|`[^`]+`|^#{1,6}\s|\|/m;

/** The passage around the match, so three clamped lines are the three that matter. */
function around(text: string, needle: string): string {
  const at = needle ? text.toLowerCase().indexOf(needle) : -1;
  if (at <= CONTEXT) return text;
  return `…${text.slice(at - CONTEXT)}`;
}

/** The query picked out wherever it occurs, so a hit is visible without hunting for it. */
function Marked({ text, query }: { text: string; query: string }) {
  const needle = query.trim();
  if (!needle) return text;
  const parts = text.split(new RegExp(`(${needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
  return parts.map((part, n) =>
    part.toLowerCase() === needle.toLowerCase() ? (
      <mark key={n} className="rounded bg-green-200/70 text-neutral-900">
        {part}
      </mark>
    ) : (
      part
    ),
  );
}

/** Dispatches one step to whichever of the two it is. */
function StepOf({ step }: { step: Step }) {
  return step.kind === 'text' ? (
    <Reply text={step.text} />
  ) : (
    <ToolCall name={step.name} detail={step.detail} />
  );
}
