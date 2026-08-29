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
import { TranscriptMarkdown } from '@/src/components/transcript/TranscriptMarkdown';

/** Shared so a tool row can indent to exactly where the text in a bubble starts. */
const INSET = 'border px-4';
const BUBBLE = `${INSET} max-w-[85%] rounded-lg py-3 font-mono text-[13px] leading-relaxed break-words`;

/** Between bubbles, and between turns, so the boundary between two turns is invisible. */
export const TURN_GAP = 'gap-3';

export function TranscriptTurn({ exchange }: { exchange: Exchange }) {
  return (
    <div className={`flex flex-col ${TURN_GAP}`}>
      <Prompt text={exchange.prompt} />
      {exchange.steps.map((step, n) => (
        // Index as key: steps never reorder, being a record of something that already happened.
        <StepOf key={n} step={step} />
      ))}
    </div>
  );
}

/** What the human typed. */
function Prompt({ text }: { text: string }) {
  return (
    <p
      className={`${BUBBLE} self-end rounded-br-sm border border-green-200 bg-green-50/70 whitespace-pre-wrap text-neutral-900`}
    >
      {text}
    </p>
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
      className={`${INSET} flex max-w-[85%] items-baseline gap-2 self-start border-transparent font-mono text-xs text-neutral-400`}
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
