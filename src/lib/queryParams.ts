import { useSyncExternalStore } from 'react';

import { z } from 'zod';

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

const QueryParamsSchema = z.object({
  hideBanner: flagParam(false),
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

/** Set (or, with `null`, remove) a query param, then notify subscribers. */
export function setQueryParam(key: keyof QueryParams, value: string | null): void {
  const url = new URL(window.location.href);
  if (value === null) url.searchParams.delete(key);
  else url.searchParams.set(key, value);
  window.history.replaceState(null, '', url);
  window.dispatchEvent(new Event(QUERY_CHANGE_EVENT));
}
