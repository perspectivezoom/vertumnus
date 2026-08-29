/**
 * One exchange, as a conversation: the prompt, then everything that followed it.
 *
 * Two voices set apart rather than one column of prose, so either side can be skimmed without
 * reading the other. Monospace because it was typed at a terminal, and should read as one.
 *
 * Between Claude's turns sit the tools it reached for, where it reached for them — 2,877 calls
 * against 558 prompts, so collapsing them into a footnote would leave a wall of text and a list
 * of verbs in place of a sequence of work.
 */
import type { Exchange, Step } from '@/data/transcript/schema';
import { shortId } from '@/src/components/transcript/selection';
import { TranscriptMarkdown } from '@/src/components/transcript/TranscriptMarkdown';

/** Shared so a tool row can indent to exactly where the text in a bubble starts. */
const INSET = 'border px-4';

/** Between bubbles, and between turns, so the boundary between two turns is invisible. */
export const TURN_GAP = 'gap-3';

/** How wide anything in the conversation gets, so the column has one right edge. */
export const TURN_WIDTH = 'max-w-[85%]';

const BUBBLE = `${INSET} ${TURN_WIDTH} rounded-lg py-3 font-mono text-[13px] leading-relaxed break-words`;

export function TranscriptTurn({
  exchange,
  focused,
  onCite,
}: {
  exchange: Exchange;
  focused: boolean;
  onCite: () => void;
}) {
  return (
    // `scroll-mt` so an exchange arrived at by link stops clear of the top of the window rather
    // than flush against it, with no sign of what came before.
    <div
      id={shortId(exchange.id)}
      className={`flex scroll-mt-6 flex-col rounded-lg ${TURN_GAP} ${
        focused ? 'bg-green-100/40 ring-1 ring-green-300' : ''
      }`}
    >
      <Prompt text={exchange.prompt} at={exchange.ts} onCite={onCite} />
      {exchange.steps.map((step, n) => (
        // Index as key: steps never reorder, being a record of something that already happened.
        <StepOf key={n} step={step} />
      ))}
    </div>
  );
}

/** What the human typed, and when. */
function Prompt({ text, at, onCite }: { text: string; at: string; onCite: () => void }) {
  return (
    <div
      className={`${BUBBLE} flex flex-col gap-1 self-end rounded-br-sm border-green-200 bg-green-50/70`}
    >
      <p className="whitespace-pre-wrap text-neutral-900">{text}</p>
      <Stamp at={at} onCite={onCite} />
    </div>
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

/** Dispatches one step to whichever of the two it is. */
function StepOf({ step }: { step: Step }) {
  return step.kind === 'text' ? (
    <Reply text={step.text} />
  ) : (
    <ToolCall name={step.name} detail={step.detail} />
  );
}
