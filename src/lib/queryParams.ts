import { useSyncExternalStore } from 'react';

import { z } from 'zod';

import { DEFAULT_PAPER, UNITS } from '@/lib/paper';

const QUERY_CHANGE_EVENT = 'vertumnus:querychange';

/**
 * A URL boolean flag: `?x=true|1|yes|on` → true, a present non-truthy value → false,
 * and an absent param falls back to `whenAbsent` (the declared default).
 */
function flagParam(whenAbsent: boolean) {
  return z
    .enum(['1', 'true', 'yes', 'on'])
    .transform(() => true)
    .catch(false) // present but not truthy (e.g. ?x=false)
    .default(whenAbsent); // absent
}

/** A positive-number URL param that falls back to `whenAbsent` when absent or invalid.
 * (`z.number()` already rejects NaN/Infinity in zod v4, so no `.finite()` is needed.) */
function numberParam(whenAbsent: number) {
  return z.coerce.number().positive().catch(whenAbsent).default(whenAbsent);
}

const QueryParamsSchema = z.object({
  hideBanner: flagParam(false),
  w: numberParam(DEFAULT_PAPER.w),
  h: numberParam(DEFAULT_PAPER.h),
  unit: z.enum(UNITS).catch(DEFAULT_PAPER.unit).default(DEFAULT_PAPER.unit),
});

export type QueryParams = z.infer<typeof QueryParamsSchema>;

function parseParams(search: string): QueryParams {
  return QueryParamsSchema.parse(Object.fromEntries(new URLSearchParams(search)));
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener('popstate', onChange);
  window.addEventListener(QUERY_CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener('popstate', onChange);
    window.removeEventListener(QUERY_CHANGE_EVENT, onChange);
  };
}

/** Reactive, zod-parsed view of the URL query params, with defaults applied. */
export function useQueryParams(): QueryParams {
  const search = useSyncExternalStore(
    subscribe,
    () => window.location.search,
    () => '',
  );
  return parseParams(search);
}

/** Set (or, with `null`, remove) one or more query params in a single history update. */
export function setQueryParams(updates: Partial<Record<keyof QueryParams, string | null>>): void {
  const url = new URL(window.location.href);
  for (const [key, value] of Object.entries(updates)) {
    if (value == null) url.searchParams.delete(key);
    else url.searchParams.set(key, value);
  }
  window.history.replaceState(null, '', url);
  window.dispatchEvent(new Event(QUERY_CHANGE_EVENT));
}
