/**
 * The session transcript: every prompt and reply that built this project.
 *
 * The whole log at once, in the order it happened. Nothing is selected, filtered or laid out yet
 * — this is the section existing and the data arriving, so that everything after it has something
 * real to be built against rather than a fixture.
 */
import type { Exchange } from '@/data/transcript/schema';
import { type State, useTranscript } from '@/src/components/transcript/useTranscript';

export function Transcript() {
  const state = useTranscript();
  if (state.status !== 'ready') return <Status state={state} />;

  const { data } = state;
  return (
    <div className="flex flex-col gap-6 px-6">
      <header className="flex max-w-[65ch] flex-col gap-2">
        <h1 className="font-poster text-3xl font-bold text-neutral-900">AI transcript</h1>
        <p className="text-[15px] leading-relaxed text-neutral-600">
          Every prompt and reply that built this project, {data.exchanges.length} in all.
        </p>
      </header>

      {/* Stacked below `lg`, where two columns would leave neither readable. */}
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        {/* Empty until the contents land. Scrolls in its own right, since the index will outrun
            the window — and `items-start` above is what stops it being stretched to the
            conversation's height, which would defeat the stickiness. */}
        <aside className="w-full shrink-0 lg:sticky lg:top-6 lg:max-h-[calc(100dvh-3rem)] lg:w-72 lg:overflow-y-auto" />

        {/* `min-w-0` because a flex item's minimum is its content: one unbroken line of log
            output would otherwise widen this column until the page scrolled. */}
        <section className="flex min-w-0 flex-1 flex-col">
          {data.exchanges.map((exchange) => (
            <Turn key={exchange.id} exchange={exchange} />
          ))}
        </section>
      </div>
    </div>
  );
}

/** One prompt, then each thing Claude did about it. */
function Turn({ exchange }: { exchange: Exchange }) {
  return (
    // `break-words` because the log is full of URLs and paths with no spaces in them, and a
    // single one of those is enough to push the whole page sideways.
    <div className="flex flex-col gap-2 border-b border-neutral-200 py-4 break-words">
      <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-neutral-900">
        {exchange.prompt}
      </p>
      {exchange.steps.map((step, n) => (
        // Index as key: steps have no identity of their own and the list never reorders — it is
        // a fixed record of something that already happened.
        <p key={n} className="whitespace-pre-wrap text-sm leading-relaxed text-neutral-600">
          {step.kind === 'text' ? step.text : `${step.name} ${step.detail}`.trim()}
        </p>
      ))}
    </div>
  );
}

/**
 * What there is to show while the transcript is still on its way, or never arrived.
 *
 * Down here rather than in two branches at the top of the section: half a megabyte over a network
 * has to be accounted for, but it is the least interesting thing this file does, and reading it
 * first gave the impression the page was mostly error handling.
 */
function Status({ state }: { state: Exclude<State, { status: 'ready' }> }) {
  if (state.status === 'loading') {
    return <p className="text-sm text-neutral-500">Loading the transcript…</p>;
  }
  return <p className="text-sm text-red-700">The transcript could not be loaded. {state.error}</p>;
}
