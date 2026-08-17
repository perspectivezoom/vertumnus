/**
 * One fetch a source says it wants to make. This is the whole contract with stage ①.
 *
 * A source works out for itself which crops share a cache, how to widen a request so one file
 * answers every region reading it, and whether what is already committed will do. Stage ① only
 * sequences: honour the run's budget, space the requests, report progress. Adding a source
 * should not mean teaching the CLI a new vocabulary.
 */
export interface FetchJob {
  /** What to call it in progress output. */
  label: string;
  /** False when the committed cache already answers this; skipped unless the run forces it. */
  needed: boolean;
  /** Fetch and rewrite the cache; returns the path written. */
  pull(): Promise<string>;
}
