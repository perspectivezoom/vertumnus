/**
 * The session transcript: every prompt and reply that built this project.
 *
 * Split in two on purpose. `Transcript` is the route, and its whole job is that the transcript
 * either arrived or did not. `Panes` is the section itself, and takes the data as an ordinary
 * prop — so nothing below here carries a maybe-loaded transcript around, or re-proves it arrived.
 */
import type { Transcript as Session } from '@/data/transcript/schema';
import { TranscriptContents } from '@/src/components/transcript/TranscriptContents';
import { TranscriptTurn, TURN_GAP, TURN_WIDTH } from '@/src/components/transcript/TranscriptTurn';
import { useSelection } from '@/src/components/transcript/selection';
import { type State, useTranscript } from '@/src/components/transcript/useTranscript';

export function Transcript() {
  const state = useTranscript();
  return state.status === 'ready' ? <Panes data={state.data} /> : <Status state={state} />;
}

/** The two panes: the table of contents, and whatever it is pointing at. */
function Panes({ data }: { data: Session }) {
  const { selection, heading, exchanges, select } = useSelection(data);

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
        {/* Scrolls in its own right, since the index outruns the window — and `items-start`
            above is what stops it being stretched to the conversation's height, which would
            defeat the stickiness. */}
        <aside className="w-full shrink-0 lg:sticky lg:top-6 lg:max-h-[calc(100dvh-3rem)] lg:w-72 lg:overflow-y-auto">
          <TranscriptContents data={data} selection={selection} onSelect={select} />
        </aside>

        {/* `min-w-0` because a flex item's minimum is its content: one unbroken line of log
            output would otherwise widen this column until the page scrolled. */}
        <section className={`flex min-w-0 flex-1 flex-col ${TURN_GAP} py-2`}>
          <div className={`flex ${TURN_WIDTH} flex-col gap-1 pb-2`}>
            <h2 className="text-lg font-semibold text-neutral-900">{heading.title}</h2>
            <p className="text-sm text-neutral-500">
              {exchanges.length} exchange{exchanges.length === 1 ? '' : 's'}
            </p>
            {heading.blurb && (
              <p className="text-sm leading-relaxed text-neutral-600">{heading.blurb}</p>
            )}
          </div>
          {exchanges.map((exchange) => (
            <TranscriptTurn key={exchange.id} exchange={exchange} />
          ))}
        </section>
      </div>
    </div>
  );
}

/**
 * What there is to show while the transcript is still on its way, or never arrived.
 *
 * Down here rather than above the section: half a megabyte over a network has to be accounted
 * for, but it is the least interesting thing this file does.
 */
function Status({ state }: { state: Exclude<State, { status: 'ready' }> }) {
  if (state.status === 'loading') {
    return <p className="text-sm text-neutral-500">Loading the transcript…</p>;
  }
  return <p className="text-sm text-red-700">The transcript could not be loaded. {state.error}</p>;
}
