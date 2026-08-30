/**
 * Fetching the transcript, once, for whoever asks first.
 *
 * Megabytes of JSON that never change between deploys, so it is cached in a module-level promise
 * rather than in state: navigating within the section, or away and back, must not refetch it. The
 * browser's own HTTP cache would mostly handle a repeat, but not two components mounting at once.
 */
import { useEffect, useState } from 'react';

// Imported as a file, so what arrives here is the URL the bundler emitted it at rather than the
// whole parsed transcript. Letting the bundler own it is also what makes this work in dev, where
// there is no dist directory and a hand-built path would 404 into the SPA's HTML fallback.
import emitted from '@/data/transcript/__generated__/transcript.json' with { type: 'file' };
import { type Transcript, TranscriptSchema } from '@/data/transcript/schema';

// TypeScript resolves a `.json` import to its parsed contents and has no notion of the import
// attribute, so it believes this is the whole transcript. At runtime Bun hands over the URL it
// emitted the file at. The cast is the one place those two views have to be reconciled.
const url = emitted as unknown as string;

async function fetchTranscript(): Promise<Transcript> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${response.status} fetching the transcript`);
  // Parsed rather than asserted. This is the one place the generator's output and the reader's
  // expectations meet across a network, and the check costs single-digit milliseconds against a
  // download orders of magnitude slower. A bad file fails here, with a message, instead of surfacing as
  // an undefined halfway through a render.
  return TranscriptSchema.parse(await response.json());
}

let pending: Promise<Transcript> | null = null;

async function load(): Promise<Transcript> {
  pending ??= fetchTranscript();
  try {
    return await pending;
  } catch (error) {
    // Forget a failed attempt, so a remount retries rather than replaying the rejection forever
    // — this is a network fetch on a page someone may have opened on a train.
    pending = null;
    throw error;
  }
}

export type State =
  | { status: 'loading' }
  | { status: 'ready'; data: Transcript }
  | { status: 'failed'; error: string };

export function useTranscript(): State {
  const [state, setState] = useState<State>({ status: 'loading' });

  useEffect(() => {
    // Guards against setting state on a component that has since unmounted — React does not
    // cancel a fetch for us, and this one takes long enough that leaving is a real possibility.
    let live = true;

    const run = async () => {
      try {
        const data = await load();
        if (live) setState({ status: 'ready', data });
      } catch (error) {
        if (live) setState({ status: 'failed', error: String(error) });
      }
    };
    void run();

    return () => {
      live = false;
    };
  }, []);

  return state;
}
