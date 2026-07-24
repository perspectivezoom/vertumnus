import { useCallback } from 'react';

import { useParams, useSearchParams } from 'react-router';
import { z } from 'zod';

import { defaultRegion, regions } from '@/src/data/regions';
import { type Region, RegionSchema } from '@/src/data/types';
import { DEFAULT_PAPER, UNITS } from '@/src/lib/paper';

// --- Query params (paper size + banner) ---

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

function parseParams(params: URLSearchParams): QueryParams {
  return QueryParamsSchema.parse(Object.fromEntries(params));
}

/** Reactive, zod-parsed view of the URL query params (React Router owns history). */
export function useQueryParams(): QueryParams {
  const [searchParams] = useSearchParams();
  return parseParams(searchParams);
}

/**
 * Returns a setter that adds/removes query params (a `null` value removes the key),
 * as a single `replace` navigation through React Router — the path is left untouched.
 */
export function useSetQueryParams(): (
  updates: Partial<Record<keyof QueryParams, string | null>>,
) => void {
  const [, setSearchParams] = useSearchParams();
  return useCallback(
    (updates) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          for (const [key, value] of Object.entries(updates)) {
            if (value == null) next.delete(key);
            else next.set(key, value);
          }
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );
}

// --- Path param (region) ---

/** Resolve a region id from the path to a validated region, defaulting when unknown or absent. */
function resolveRegion(id: string | undefined): Region {
  const raw = regions.find((region) => region.id === id) ?? defaultRegion;
  return RegionSchema.parse(raw);
}

/** The region named by the current `/:region` path segment (the default region at "/"). */
export function useRegion(): Region {
  return resolveRegion(useParams().region);
}
